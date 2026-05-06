import {
  Booking,
  BookingStatus,
  BookingPricing,
  BookingPayment,
  BookingHistoryEntry,
  BookingAddOn,
  CampsiteSite,
  Campground,
  Guest,
  SeasonType,
  SeasonalPricing,
  SearchFilters,
  SearchResult,
  CancellationPolicy,
  PaymentTransaction,
  VehicleDetail,
  PetDetail,
  BookingSummary,
  Notification,
} from './types'
import { evaluatePromoFormula, lookupPromoFormula } from './PromoFormulaEvaluator'

/**
 * BookingEngine handles all booking lifecycle operations including creation,
 * modification, cancellation, pricing calculation, availability checking,
 * and payment processing for the campsite reservation system.
 */
export class BookingEngine {
  private bookings: Map<string, Booking> = new Map()
  private campgrounds: Map<string, Campground> = new Map()
  private guests: Map<string, Guest> = new Map()
  private notifications: Notification[] = []
  private readonly taxRate = 0.0875
  private readonly serviceFeeRate = 0.05
  private readonly cleaningFeeBase = 25
  private readonly petFeePerNight = 15
  private readonly extraVehicleFee = 10
  private readonly loyaltyPointsPerDollar = 10
  private readonly loyaltyRedemptionRate = 0.01 // 1 cent per point

  constructor(campgrounds: Campground[], guests: Guest[]) {
    campgrounds.forEach((cg) => this.campgrounds.set(cg.id, cg))
    guests.forEach((g) => this.guests.set(g.id, g))
  }

  /**
   * Creates a new booking with full validation, pricing calculation,
   * and availability verification. Returns the created booking or throws
   * an error if validation fails.
   */
  createBooking(params: {
    guestId: string
    campgroundId: string
    siteId: string
    checkInDate: string
    checkOutDate: string
    numberOfGuests: number
    vehicles: VehicleDetail[]
    pets: PetDetail[]
    specialRequests: string
    addOns: { id: string; quantity: number }[]
    source: Booking['source']
    promoCode?: string
    useLoyaltyPoints?: number
  }): Booking {
    // Validate guest exists
    const guest = this.guests.get(params.guestId)
    if (!guest) {
      throw new BookingError('GUEST_NOT_FOUND', `Guest ${params.guestId} not found`)
    }

    // Validate campground exists
    const campground = this.campgrounds.get(params.campgroundId)
    if (!campground) {
      throw new BookingError('CAMPGROUND_NOT_FOUND', `Campground ${params.campgroundId} not found`)
    }

    // Validate site exists in campground
    const site = campground.sites.find((s) => s.id === params.siteId)
    if (!site) {
      throw new BookingError('SITE_NOT_FOUND', `Site ${params.siteId} not found in campground ${campground.name}`)
    }

    // Validate site is active
    if (!site.isActive) {
      throw new BookingError('SITE_INACTIVE', `Site ${site.name} is currently not available for booking`)
    }

    // Validate dates
    const checkIn = new Date(params.checkInDate)
    const checkOut = new Date(params.checkOutDate)
    const now = new Date()

    if (checkIn < now) {
      throw new BookingError('INVALID_DATES', 'Check-in date cannot be in the past')
    }

    if (checkOut <= checkIn) {
      throw new BookingError('INVALID_DATES', 'Check-out date must be after check-in date')
    }

    const numberOfNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))

    // Validate stay length
    if (numberOfNights < site.minimumStay) {
      throw new BookingError('MIN_STAY', `Minimum stay is ${site.minimumStay} nights for this site`)
    }

    if (numberOfNights > site.maximumStay) {
      throw new BookingError('MAX_STAY', `Maximum stay is ${site.maximumStay} nights for this site`)
    }

    // Validate advance booking
    const daysInAdvance = Math.ceil((checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysInAdvance > campground.reservationPolicy.maxAdvanceDays) {
      throw new BookingError('TOO_FAR_ADVANCE', `Bookings can only be made up to ${campground.reservationPolicy.maxAdvanceDays} days in advance`)
    }

    if (!campground.reservationPolicy.allowSameDayBooking && daysInAdvance < 1) {
      throw new BookingError('NO_SAME_DAY', 'Same-day bookings are not allowed at this campground')
    }

    // Validate occupancy
    if (params.numberOfGuests > site.maxOccupancy) {
      throw new BookingError('EXCEEDS_OCCUPANCY', `Site ${site.name} has a maximum occupancy of ${site.maxOccupancy}`)
    }

    // Validate vehicles
    if (params.vehicles.length > site.maxVehicles) {
      throw new BookingError('EXCEEDS_VEHICLES', `Site ${site.name} allows a maximum of ${site.maxVehicles} vehicles`)
    }

    for (const vehicle of params.vehicles) {
      if (vehicle.length > site.maxVehicleLength && site.maxVehicleLength > 0) {
        throw new BookingError('VEHICLE_TOO_LONG', `Vehicle ${vehicle.make} ${vehicle.model} exceeds the maximum length of ${site.maxVehicleLength} feet for site ${site.name}`)
      }
    }

    // Validate pets
    if (params.pets.length > 0 && !site.isPetFriendly) {
      const hasServiceAnimal = params.pets.some((p) => p.isServiceAnimal)
      if (!hasServiceAnimal) {
        throw new BookingError('NO_PETS', `Site ${site.name} does not allow pets. Service animals are exempt.`)
      }
    }

    // Check availability
    if (!this.isSiteAvailable(params.siteId, params.checkInDate, params.checkOutDate)) {
      throw new BookingError('NOT_AVAILABLE', `Site ${site.name} is not available for the selected dates`)
    }

    // Calculate pricing
    const pricing = this.calculatePricing({
      site,
      campground,
      guest,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      numberOfNights,
      numberOfGuests: params.numberOfGuests,
      vehicles: params.vehicles,
      pets: params.pets,
      addOns: params.addOns,
      promoCode: params.promoCode,
      useLoyaltyPoints: params.useLoyaltyPoints,
    })

    // Generate booking
    const bookingId = this.generateId('BK')
    const confirmationCode = this.generateConfirmationCode()

    const booking: Booking = {
      id: bookingId,
      confirmationCode,
      guestId: params.guestId,
      guest,
      campgroundId: params.campgroundId,
      siteId: params.siteId,
      site,
      status: 'pending',
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      numberOfNights,
      numberOfGuests: params.numberOfGuests,
      numberOfVehicles: params.vehicles.length,
      vehicleDetails: params.vehicles,
      pets: params.pets,
      specialRequests: params.specialRequests,
      internalNotes: '',
      pricing,
      payment: {
        status: 'unpaid',
        method: 'credit_card',
        transactions: [],
        totalPaid: 0,
        totalRefunded: 0,
        outstandingBalance: pricing.grandTotal,
      },
      addOns: this.resolveAddOns(params.addOns),
      history: [{
        id: this.generateId('HE'),
        timestamp: new Date().toISOString(),
        action: 'booking_created',
        description: `Booking created for ${numberOfNights} nights at ${site.name}`,
        performedBy: 'system',
        previousValue: null,
        newValue: 'pending',
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmedAt: null,
      checkedInAt: null,
      checkedOutAt: null,
      cancelledAt: null,
      cancellationReason: null,
      isGroupBooking: false,
      groupId: null,
      source: params.source,
      tags: [],
    }

    this.bookings.set(bookingId, booking)

    // Update guest stats
    guest.totalBookings += 1
    guest.totalSpent += pricing.grandTotal

    // Schedule notifications
    this.scheduleBookingNotifications(booking)

    return booking
  }

  /**
   * Calculates detailed pricing for a booking including nightly rates,
   * seasonal adjustments, taxes, fees, discounts, and loyalty redemptions.
   */
  calculatePricing(params: {
    site: CampsiteSite
    campground: Campground
    guest: Guest
    checkInDate: string
    checkOutDate: string
    numberOfNights: number
    numberOfGuests: number
    vehicles: VehicleDetail[]
    pets: PetDetail[]
    addOns: { id: string; quantity: number }[]
    promoCode?: string
    useLoyaltyPoints?: number
  }): BookingPricing {
    const nightlyRates: BookingPricing['nightlyRates'] = []
    const checkIn = new Date(params.checkInDate)

    // Calculate nightly rates based on seasonal pricing
    for (let i = 0; i < params.numberOfNights; i++) {
      const date = new Date(checkIn)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6

      const season = this.getSeasonForDate(dateStr, params.site.seasonalPricing)
      const pricing = params.site.seasonalPricing.find((sp) => sp.season === season)
      const baseRate = pricing?.basePrice ?? 50
      const weekendSurcharge = isWeekend ? (pricing?.weekendSurcharge ?? 0) : 0
      const holidaySurcharge = this.isHoliday(dateStr) ? (pricing?.holidaySurcharge ?? 0) : 0

      nightlyRates.push({
        date: dateStr,
        rate: baseRate + weekendSurcharge + holidaySurcharge,
        season: season,
      })
    }

    const subtotal = nightlyRates.reduce((sum, nr) => sum + nr.rate, 0)

    // Calculate fees
    const fees: BookingPricing['fees'] = []

    // Service fee
    fees.push({
      name: 'Service fee',
      amount: Math.round(subtotal * this.serviceFeeRate * 100) / 100,
      isRefundable: true,
    })

    // Cleaning fee
    fees.push({
      name: 'Cleaning fee',
      amount: this.cleaningFeeBase,
      isRefundable: false,
    })

    // Pet fee
    const nonServicePets = params.pets.filter((p) => !p.isServiceAnimal)
    if (nonServicePets.length > 0) {
      fees.push({
        name: `Pet fee (${nonServicePets.length} pet${nonServicePets.length > 1 ? 's' : ''})`,
        amount: nonServicePets.length * this.petFeePerNight * params.numberOfNights,
        isRefundable: false,
      })
    }

    // Extra vehicle fee
    if (params.vehicles.length > 1) {
      const extraVehicles = params.vehicles.length - 1
      fees.push({
        name: `Additional vehicle fee (${extraVehicles})`,
        amount: extraVehicles * this.extraVehicleFee * params.numberOfNights,
        isRefundable: false,
      })
    }

    // Calculate add-ons
    const resolvedAddOns = this.resolveAddOns(params.addOns)
    const addOnTotal = resolvedAddOns.reduce((sum, ao) => sum + ao.totalPrice, 0)

    // Calculate discounts
    const discounts: BookingPricing['discounts'] = []

    // Long stay discount
    if (params.numberOfNights >= 7) {
      const discountPct = params.numberOfNights >= 30 ? 20 : params.numberOfNights >= 14 ? 15 : 10
      discounts.push({
        name: `Extended stay discount (${discountPct}%)`,
        type: 'percentage',
        value: discountPct,
        amount: Math.round(subtotal * (discountPct / 100) * 100) / 100,
      })
    }

    // Loyalty discount
    if (params.guest.loyaltyTier === 'gold') {
      discounts.push({
        name: 'Gold member discount (5%)',
        type: 'percentage',
        value: 5,
        amount: Math.round(subtotal * 0.05 * 100) / 100,
      })
    } else if (params.guest.loyaltyTier === 'platinum') {
      discounts.push({
        name: 'Platinum member discount (10%)',
        type: 'percentage',
        value: 10,
        amount: Math.round(subtotal * 0.10 * 100) / 100,
      })
    }

    // Promo code discount
    if (params.promoCode) {
      const promoDiscount = this.validatePromoCode(params.promoCode, subtotal)
      if (promoDiscount) {
        discounts.push(promoDiscount)
      }
    }

    // Loyalty points redemption
    let loyaltyRedemption = 0
    if (params.useLoyaltyPoints && params.useLoyaltyPoints > 0) {
      const maxRedeemable = Math.min(params.useLoyaltyPoints, params.guest.loyaltyPoints)
      loyaltyRedemption = Math.round(maxRedeemable * this.loyaltyRedemptionRate * 100) / 100
      if (loyaltyRedemption > 0) {
        discounts.push({
          name: `Loyalty points (${maxRedeemable} pts)`,
          type: 'flat',
          value: maxRedeemable,
          amount: loyaltyRedemption,
        })
      }
    }

    const totalFees = fees.reduce((sum, f) => sum + f.amount, 0)
    const totalDiscount = discounts.reduce((sum, d) => sum + d.amount, 0)
    const taxableAmount = subtotal + totalFees + addOnTotal - totalDiscount

    // Calculate taxes
    const taxes: BookingPricing['taxes'] = [
      {
        name: 'State sales tax',
        rate: this.taxRate,
        amount: Math.round(taxableAmount * this.taxRate * 100) / 100,
      },
      {
        name: 'Tourism levy',
        rate: 0.02,
        amount: Math.round(taxableAmount * 0.02 * 100) / 100,
      },
    ]

    const totalTax = taxes.reduce((sum, t) => sum + t.amount, 0)
    const grandTotal = Math.round((taxableAmount + totalTax) * 100) / 100

    const deposit = params.campground.reservationPolicy.requiresDeposit
      ? Math.round(grandTotal * (params.campground.reservationPolicy.depositPercentage / 100) * 100) / 100
      : 0

    return {
      baseRate: nightlyRates[0]?.rate ?? 0,
      nightlyRates,
      subtotal,
      taxes,
      fees,
      addOnTotal,
      discounts,
      totalTax,
      totalFees,
      totalDiscount,
      grandTotal,
      deposit,
      balanceDue: grandTotal,
      currency: 'USD',
    }
  }

  /**
   * Processes a status transition for a booking with full validation
   * of the state machine rules and side effects.
   */
  updateBookingStatus(bookingId: string, newStatus: BookingStatus, performedBy: string, reason?: string): Booking {
    const booking = this.bookings.get(bookingId)
    if (!booking) {
      throw new BookingError('BOOKING_NOT_FOUND', `Booking ${bookingId} not found`)
    }

    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      pending: ['confirmed', 'cancelled', 'expired', 'waitlisted'],
      confirmed: ['checked_in', 'cancelled', 'no_show'],
      waitlisted: ['confirmed', 'cancelled', 'expired'],
      checked_in: ['checked_out'],
      checked_out: [],
      cancelled: [],
      no_show: [],
      expired: [],
    }

    const allowed = validTransitions[booking.status]
    if (!allowed.includes(newStatus)) {
      throw new BookingError(
        'INVALID_TRANSITION',
        `Cannot transition from ${booking.status} to ${newStatus}. Valid transitions: ${allowed.join(', ')}`
      )
    }

    const previousStatus = booking.status
    booking.status = newStatus
    booking.updatedAt = new Date().toISOString()

    // Handle side effects for each transition
    switch (newStatus) {
      case 'confirmed':
        booking.confirmedAt = new Date().toISOString()
        this.awardLoyaltyPoints(booking.guest, 50, 'Booking confirmed bonus')
        break

      case 'checked_in':
        booking.checkedInAt = new Date().toISOString()
        break

      case 'checked_out':
        booking.checkedOutAt = new Date().toISOString()
        this.awardLoyaltyPoints(
          booking.guest,
          Math.floor(booking.pricing.grandTotal * this.loyaltyPointsPerDollar),
          `Stay at ${booking.site.name}`
        )
        this.scheduleReviewRequest(booking)
        break

      case 'cancelled':
        booking.cancelledAt = new Date().toISOString()
        booking.cancellationReason = reason ?? 'No reason provided'
        this.processRefund(booking)
        break

      case 'no_show':
        // No-show: forfeit deposit, mark as no-show
        this.awardLoyaltyPoints(booking.guest, -100, 'No-show penalty')
        break
    }

    // Add history entry
    booking.history.push({
      id: this.generateId('HE'),
      timestamp: new Date().toISOString(),
      action: `status_changed`,
      description: `Status changed from ${previousStatus} to ${newStatus}${reason ? `: ${reason}` : ''}`,
      performedBy,
      previousValue: previousStatus,
      newValue: newStatus,
    })

    return booking
  }

  /**
   * Modifies an existing booking's dates, guests, or add-ons.
   * Validates the modification against policies and recalculates pricing.
   */
  modifyBooking(bookingId: string, modifications: {
    checkInDate?: string
    checkOutDate?: string
    numberOfGuests?: number
    vehicles?: VehicleDetail[]
    pets?: PetDetail[]
    specialRequests?: string
    addOns?: { id: string; quantity: number }[]
  }): Booking {
    const booking = this.bookings.get(bookingId)
    if (!booking) {
      throw new BookingError('BOOKING_NOT_FOUND', `Booking ${bookingId} not found`)
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      throw new BookingError('CANNOT_MODIFY', `Cannot modify booking in ${booking.status} status`)
    }

    const campground = this.campgrounds.get(booking.campgroundId)
    if (!campground) {
      throw new BookingError('CAMPGROUND_NOT_FOUND', 'Associated campground not found')
    }

    // Check modification deadline
    const checkIn = new Date(booking.checkInDate)
    const now = new Date()
    const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilCheckIn < campground.reservationPolicy.modificationDeadlineHours) {
      throw new BookingError(
        'MODIFICATION_DEADLINE_PASSED',
        `Modifications must be made at least ${campground.reservationPolicy.modificationDeadlineHours} hours before check-in`
      )
    }

    // Store previous values for history
    const previousValues: Record<string, string> = {}
    const newValues: Record<string, string> = {}

    // Apply date modifications
    if (modifications.checkInDate || modifications.checkOutDate) {
      const newCheckIn = modifications.checkInDate ?? booking.checkInDate
      const newCheckOut = modifications.checkOutDate ?? booking.checkOutDate

      // Check availability for new dates (excluding current booking)
      const tempBookings = new Map(this.bookings)
      tempBookings.delete(bookingId)

      const conflicting = Array.from(tempBookings.values()).find(
        (b) =>
          b.siteId === booking.siteId &&
          !['cancelled', 'no_show', 'expired'].includes(b.status) &&
          this.datesOverlap(newCheckIn, newCheckOut, b.checkInDate, b.checkOutDate)
      )

      if (conflicting) {
        throw new BookingError('DATE_CONFLICT', 'The requested dates conflict with another booking')
      }

      previousValues.dates = `${booking.checkInDate} to ${booking.checkOutDate}`
      booking.checkInDate = newCheckIn
      booking.checkOutDate = newCheckOut
      booking.numberOfNights = Math.ceil(
        (new Date(newCheckOut).getTime() - new Date(newCheckIn).getTime()) / (1000 * 60 * 60 * 24)
      )
      newValues.dates = `${newCheckIn} to ${newCheckOut}`
    }

    // Apply guest count modification
    if (modifications.numberOfGuests !== undefined) {
      if (modifications.numberOfGuests > booking.site.maxOccupancy) {
        throw new BookingError('EXCEEDS_OCCUPANCY', `Maximum occupancy is ${booking.site.maxOccupancy}`)
      }
      previousValues.guests = String(booking.numberOfGuests)
      booking.numberOfGuests = modifications.numberOfGuests
      newValues.guests = String(modifications.numberOfGuests)
    }

    // Apply vehicle modifications
    if (modifications.vehicles) {
      previousValues.vehicles = String(booking.numberOfVehicles)
      booking.vehicleDetails = modifications.vehicles
      booking.numberOfVehicles = modifications.vehicles.length
      newValues.vehicles = String(modifications.vehicles.length)
    }

    // Apply pet modifications
    if (modifications.pets) {
      booking.pets = modifications.pets
    }

    // Apply special requests
    if (modifications.specialRequests !== undefined) {
      booking.specialRequests = modifications.specialRequests
    }

    // Recalculate pricing
    booking.pricing = this.calculatePricing({
      site: booking.site,
      campground,
      guest: booking.guest,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      numberOfNights: booking.numberOfNights,
      numberOfGuests: booking.numberOfGuests,
      vehicles: booking.vehicleDetails,
      pets: booking.pets,
      addOns: modifications.addOns ?? booking.addOns.map((ao) => ({ id: ao.id, quantity: ao.quantity })),
    })

    // Update payment balance
    booking.payment.outstandingBalance = booking.pricing.grandTotal - booking.payment.totalPaid

    // Add history entry
    const changeDescription = Object.keys(newValues)
      .map((key) => `${key}: ${previousValues[key]} → ${newValues[key]}`)
      .join(', ')

    booking.history.push({
      id: this.generateId('HE'),
      timestamp: new Date().toISOString(),
      action: 'booking_modified',
      description: `Booking modified: ${changeDescription || 'details updated'}`,
      performedBy: 'guest',
      previousValue: JSON.stringify(previousValues),
      newValue: JSON.stringify(newValues),
    })

    booking.updatedAt = new Date().toISOString()

    return booking
  }

  /**
   * Searches for available campsites matching the given filters.
   * Performs availability checking, pricing estimates, and relevance scoring.
   */
  searchAvailability(filters: SearchFilters): SearchResult[] {
    const results: SearchResult[] = []

    for (const campground of this.campgrounds.values()) {
      // Filter by location/radius
      if (filters.location) {
        const locationMatch =
          campground.address.city.toLowerCase().includes(filters.location.toLowerCase()) ||
          campground.address.state.toLowerCase().includes(filters.location.toLowerCase()) ||
          campground.name.toLowerCase().includes(filters.location.toLowerCase())

        if (!locationMatch) continue
      }

      // Filter by rating
      if (filters.rating && campground.rating < filters.rating) continue

      // Check if campground is open
      if (!campground.isOpen) continue

      // Find available sites
      const availableSites = campground.sites.filter((site) => {
        // Type filter
        if (filters.siteTypes.length > 0 && !filters.siteTypes.includes(site.type)) return false

        // Occupancy check
        if (filters.guests > site.maxOccupancy) return false

        // Amenity filters
        if (filters.accessibility && !site.isAccessible) return false
        if (filters.petFriendly && !site.isPetFriendly) return false
        if (filters.waterfront && !site.isWaterfront) return false
        if (filters.hasHookups && !site.hasPower && !site.hasWater) return false

        // Site must be active
        if (!site.isActive) return false

        // Availability check
        if (filters.checkInDate && filters.checkOutDate) {
          if (!this.isSiteAvailable(site.id, filters.checkInDate, filters.checkOutDate)) return false
        }

        // Price range check
        if (filters.priceRange) {
          const avgPrice = this.estimateAverageNightlyRate(site, filters.checkInDate)
          if (avgPrice < filters.priceRange.min || avgPrice > filters.priceRange.max) return false
        }

        // Amenity filter
        if (filters.amenities.length > 0) {
          const siteAmenityNames = site.amenities.map((a) => a.name.toLowerCase())
          const hasAllAmenities = filters.amenities.every((a) =>
            siteAmenityNames.some((sa) => sa.includes(a.toLowerCase()))
          )
          if (!hasAllAmenities) return false
        }

        return true
      })

      if (availableSites.length === 0) continue

      // Calculate price range
      const prices = availableSites.map((s) => this.estimateAverageNightlyRate(s, filters.checkInDate))
      const lowestPrice = Math.min(...prices)
      const highestPrice = Math.max(...prices)

      // Calculate match score for ranking
      const matchScore = this.calculateMatchScore(campground, availableSites, filters)

      // Determine highlighted amenities
      const allAmenities = new Set<string>()
      availableSites.forEach((s) => s.amenities.forEach((a) => allAmenities.add(a.name)))
      const highlightedAmenities = Array.from(allAmenities).slice(0, 5)

      results.push({
        campground,
        availableSites,
        lowestPrice,
        highestPrice,
        distance: 0, // Would need geocoding service
        matchScore,
        highlightedAmenities,
      })
    }

    // Sort results
    results.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price_asc':
          return a.lowestPrice - b.lowestPrice
        case 'price_desc':
          return b.lowestPrice - a.lowestPrice
        case 'rating':
          return b.campground.rating - a.campground.rating
        case 'popularity':
          return b.campground.reviewCount - a.campground.reviewCount
        case 'distance':
          return a.distance - b.distance
        case 'relevance':
        default:
          return b.matchScore - a.matchScore
      }
    })

    return results
  }

  /**
   * Returns a single booking by its internal id, or null if not found.
   */
  getBooking(bookingId: string): Booking | null {
    return this.bookings.get(bookingId) ?? null
  }

  /**
   * Returns a single booking by its confirmation code, or null if not found.
   */
  getBookingByConfirmationCode(code: string): Booking | null {
    for (const booking of this.bookings.values()) {
      if (booking.confirmationCode === code) return booking
    }
    return null
  }

  /**
   * Generates a booking summary for analytics/reporting.
   */
  getBookingSummary(startDate: string, endDate: string): BookingSummary {
    const bookingsInRange = Array.from(this.bookings.values()).filter((b) => {
      return b.createdAt >= startDate && b.createdAt <= endDate
    })

    const activeBookings = bookingsInRange.filter((b) => ['confirmed', 'checked_in'].includes(b.status))
    const upcomingBookings = bookingsInRange.filter(
      (b) => b.status === 'confirmed' && new Date(b.checkInDate) > new Date()
    )
    const completedBookings = bookingsInRange.filter((b) => b.status === 'checked_out')
    const cancelledBookings = bookingsInRange.filter((b) => b.status === 'cancelled')

    const totalRevenue = completedBookings.reduce((sum, b) => sum + b.pricing.grandTotal, 0)
    const avgStay = completedBookings.length > 0
      ? completedBookings.reduce((sum, b) => sum + b.numberOfNights, 0) / completedBookings.length
      : 0

    // Calculate occupancy rate (simplified)
    const totalSiteNights = Array.from(this.campgrounds.values()).reduce(
      (sum, cg) => sum + cg.totalSites, 0
    ) * 30 // Approximate monthly
    const bookedSiteNights = bookingsInRange.reduce((sum, b) => sum + b.numberOfNights, 0)
    const occupancyRate = totalSiteNights > 0 ? (bookedSiteNights / totalSiteNights) * 100 : 0

    // Top campgrounds
    const campgroundBookingCounts = new Map<string, { name: string; count: number }>()
    bookingsInRange.forEach((b) => {
      const existing = campgroundBookingCounts.get(b.campgroundId)
      const cg = this.campgrounds.get(b.campgroundId)
      if (existing) {
        existing.count += 1
      } else {
        campgroundBookingCounts.set(b.campgroundId, {
          name: cg?.name ?? 'Unknown',
          count: 1,
        })
      }
    })

    const topCampgrounds = Array.from(campgroundBookingCounts.entries())
      .map(([id, data]) => ({ id, name: data.name, bookings: data.count }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10)

    // Monthly revenue
    const monthlyData = new Map<string, { revenue: number; bookings: number }>()
    bookingsInRange.forEach((b) => {
      const month = b.createdAt.slice(0, 7) // YYYY-MM
      const existing = monthlyData.get(month) ?? { revenue: 0, bookings: 0 }
      existing.revenue += b.pricing.grandTotal
      existing.bookings += 1
      monthlyData.set(month, existing)
    })

    const monthlyRevenue = Array.from(monthlyData.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))

    return {
      totalBookings: bookingsInRange.length,
      activeBookings: activeBookings.length,
      upcomingBookings: upcomingBookings.length,
      completedBookings: completedBookings.length,
      cancelledBookings: cancelledBookings.length,
      totalRevenue,
      averageStayLength: Math.round(avgStay * 10) / 10,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      topCampgrounds,
      monthlyRevenue,
    }
  }

  // ---- Private helper methods ----

  private isSiteAvailable(siteId: string, checkIn: string, checkOut: string): boolean {
    for (const booking of this.bookings.values()) {
      if (
        booking.siteId === siteId &&
        !['cancelled', 'no_show', 'expired'].includes(booking.status) &&
        this.datesOverlap(checkIn, checkOut, booking.checkInDate, booking.checkOutDate)
      ) {
        return false
      }
    }
    return true
  }

  private datesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    return startA < endB && endA > startB
  }

  private getSeasonForDate(date: string, pricing: SeasonalPricing[]): SeasonType {
    for (const sp of pricing) {
      if (date >= sp.startDate && date <= sp.endDate) {
        return sp.season
      }
    }
    return 'off_peak'
  }

  private isHoliday(date: string): boolean {
    const holidays = [
      '2026-01-01', '2026-01-19', '2026-02-16', '2026-05-25',
      '2026-07-04', '2026-09-07', '2026-11-26', '2026-11-27',
      '2026-12-24', '2026-12-25', '2026-12-31',
    ]
    return holidays.includes(date)
  }

  private estimateAverageNightlyRate(site: CampsiteSite, checkInDate?: string): number {
    if (site.seasonalPricing.length === 0) return 50
    const season = checkInDate
      ? this.getSeasonForDate(checkInDate, site.seasonalPricing)
      : 'shoulder'
    const pricing = site.seasonalPricing.find((sp) => sp.season === season)
    return pricing?.basePrice ?? 50
  }

  private calculateMatchScore(campground: Campground, sites: CampsiteSite[], filters: SearchFilters): number {
    let score = 0
    score += campground.rating * 20
    score += Math.min(campground.reviewCount, 100)
    score += sites.length * 5
    if (filters.petFriendly && sites.some((s) => s.isPetFriendly)) score += 10
    if (filters.waterfront && sites.some((s) => s.isWaterfront)) score += 15
    if (filters.accessibility && sites.some((s) => s.isAccessible)) score += 10
    return score
  }

  private validatePromoCode(code: string, subtotal: number): BookingPricing['discounts'][0] | null {
    // Static fallback promos (legacy — being migrated to the formula registry).
    const flatPromos: Record<string, { type: 'flat'; value: number }> = {
      SAVE25: { type: 'flat', value: 25 },
      WELCOME50: { type: 'flat', value: 50 },
    }
    const flat = flatPromos[code.toUpperCase()]
    if (flat) {
      return { name: `Promo code ${code.toUpperCase()}`, type: flat.type, value: flat.value, amount: flat.value }
    }

    // Formula-based promos (partner-defined, evaluated at runtime).
    const formula = lookupPromoFormula(code)
    if (!formula) return null
    const amount = evaluatePromoFormula(formula, {
      subtotal,
      numberOfNights: 1,
      guestTier: 'bronze',
    })
    return { name: `Promo code ${code.toUpperCase()}`, type: 'flat', value: amount, amount }
  }

  private resolveAddOns(addOns: { id: string; quantity: number }[]): BookingAddOn[] {
    const catalog: Record<string, Omit<BookingAddOn, 'id' | 'quantity' | 'totalPrice'>> = {
      firewood: { name: 'Firewood Bundle', description: 'Seasoned firewood bundle', unitPrice: 8, category: 'equipment', isPerNight: true },
      ice: { name: 'Bag of Ice', description: '10lb bag of ice', unitPrice: 4, category: 'equipment', isPerNight: false },
      kayak: { name: 'Kayak Rental', description: 'Single kayak full-day rental', unitPrice: 45, category: 'rental', isPerNight: true },
      bike: { name: 'Mountain Bike', description: 'Mountain bike full-day rental', unitPrice: 35, category: 'rental', isPerNight: true },
      breakfast: { name: 'Breakfast Package', description: 'Continental breakfast for 2', unitPrice: 18, category: 'food', isPerNight: true },
      smores: { name: "S'mores Kit", description: 'Complete s\'mores kit for 4', unitPrice: 12, category: 'food', isPerNight: false },
      guided_hike: { name: 'Guided Hike', description: '3-hour guided nature hike', unitPrice: 55, category: 'activity', isPerNight: false },
      stargazing: { name: 'Stargazing Tour', description: 'Evening stargazing with telescope', unitPrice: 30, category: 'activity', isPerNight: false },
    }

    return addOns
      .map((ao) => {
        const item = catalog[ao.id]
        if (!item) return null
        return {
          id: ao.id,
          ...item,
          quantity: ao.quantity,
          totalPrice: item.unitPrice * ao.quantity,
        }
      })
      .filter((ao): ao is BookingAddOn => ao !== null)
  }

  private processRefund(booking: Booking): void {
    const campground = this.campgrounds.get(booking.campgroundId)
    if (!campground || booking.payment.totalPaid === 0) return

    const policy = campground.cancellationPolicy
    const checkIn = new Date(booking.checkInDate)
    const now = new Date()
    const daysUntilCheckIn = Math.ceil((checkIn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    let refundPercentage = 0
    if (daysUntilCheckIn >= policy.fullRefundDays) {
      refundPercentage = 100
    } else if (daysUntilCheckIn >= policy.partialRefundDays) {
      refundPercentage = policy.partialRefundPercentage
    } else {
      refundPercentage = 0
    }

    const refundableAmount = booking.payment.totalPaid
    const refundableFees = booking.pricing.fees.filter((f) => f.isRefundable).reduce((s, f) => s + f.amount, 0)
    const nonRefundableFees = booking.pricing.fees.filter((f) => !f.isRefundable).reduce((s, f) => s + f.amount, 0)

    const refundAmount = Math.round(((refundableAmount - nonRefundableFees) * (refundPercentage / 100)) * 100) / 100

    if (refundAmount > 0) {
      const transaction: PaymentTransaction = {
        id: this.generateId('TX'),
        type: 'refund',
        amount: refundAmount,
        status: 'completed',
        method: booking.payment.method,
        last4: booking.payment.transactions[0]?.last4 ?? '0000',
        processedAt: new Date().toISOString(),
        referenceId: `REF-${booking.confirmationCode}`,
        notes: `${refundPercentage}% refund (${daysUntilCheckIn} days before check-in)`,
      }

      booking.payment.transactions.push(transaction)
      booking.payment.totalRefunded += refundAmount
      booking.payment.status = refundPercentage === 100 ? 'refunded' : 'partially_refunded'
      booking.payment.outstandingBalance = 0
    }
  }

  private awardLoyaltyPoints(guest: Guest, points: number, reason: string): void {
    guest.loyaltyPoints = Math.max(0, guest.loyaltyPoints + points)

    // Check for tier upgrades
    if (guest.loyaltyPoints >= 10000 && guest.loyaltyTier !== 'platinum') {
      guest.loyaltyTier = 'platinum'
    } else if (guest.loyaltyPoints >= 5000 && guest.loyaltyTier === 'bronze') {
      guest.loyaltyTier = 'gold'
    } else if (guest.loyaltyPoints >= 1000 && guest.loyaltyTier === 'bronze') {
      guest.loyaltyTier = 'silver'
    }
  }

  private scheduleBookingNotifications(booking: Booking): void {
    // Confirmation notification
    this.notifications.push({
      id: this.generateId('NT'),
      type: 'booking_confirmation',
      title: 'Booking Confirmed',
      message: `Your reservation at ${booking.site.name} is confirmed! Confirmation: ${booking.confirmationCode}`,
      recipientId: booking.guestId,
      channel: booking.guest.preferences.communicationPreference === 'sms' ? 'sms' : 'email',
      status: 'pending',
      scheduledAt: new Date().toISOString(),
      sentAt: null,
      readAt: null,
      metadata: { bookingId: booking.id, confirmationCode: booking.confirmationCode },
    })

    // Check-in reminder (day before)
    const reminderDate = new Date(booking.checkInDate)
    reminderDate.setDate(reminderDate.getDate() - 1)
    this.notifications.push({
      id: this.generateId('NT'),
      type: 'check_in_reminder',
      title: 'Check-in Tomorrow!',
      message: `Reminder: Your camping trip at ${booking.site.name} starts tomorrow. Check-in time: ${booking.site.campgroundId}`,
      recipientId: booking.guestId,
      channel: 'email',
      status: 'pending',
      scheduledAt: reminderDate.toISOString(),
      sentAt: null,
      readAt: null,
      metadata: { bookingId: booking.id },
    })
  }

  private scheduleReviewRequest(booking: Booking): void {
    const reviewDate = new Date()
    reviewDate.setDate(reviewDate.getDate() + 2)
    this.notifications.push({
      id: this.generateId('NT'),
      type: 'review_request',
      title: 'How was your stay?',
      message: `We hope you enjoyed your stay at ${booking.site.name}! Share your experience to help other campers.`,
      recipientId: booking.guestId,
      channel: 'email',
      status: 'pending',
      scheduledAt: reviewDate.toISOString(),
      sentAt: null,
      readAt: null,
      metadata: { bookingId: booking.id, campgroundId: booking.campgroundId },
    })
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  private generateConfirmationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
  }
}

export class BookingError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'BookingError'
  }
}
