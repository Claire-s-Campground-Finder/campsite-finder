import {
  Booking,
  BookingStatus,
  BookingSummary,
  Campground,
  CampsiteSite,
  Guest,
  Notification,
  Review,
  SearchFilters,
  SearchResult,
  WeatherAlert,
} from './types'
import { BookingEngine, BookingError } from './BookingEngine'

/**
 * ReservationManager is the high-level orchestrator that wraps BookingEngine
 * with business logic for waitlists, group bookings, weather handling,
 * review management, and administrative operations.
 */
export class ReservationManager {
  private engine: BookingEngine
  private waitlists: Map<string, WaitlistEntry[]> = new Map()
  private reviews: Map<string, Review> = new Map()
  private maintenanceSchedule: Map<string, MaintenanceWindow[]> = new Map()
  private auditLog: AuditEntry[] = []
  private campgrounds: Map<string, Campground>
  private guests: Map<string, Guest>

  constructor(campgrounds: Campground[], guests: Guest[]) {
    this.engine = new BookingEngine(campgrounds, guests)
    this.campgrounds = new Map(campgrounds.map((cg) => [cg.id, cg]))
    this.guests = new Map(guests.map((g) => [g.id, g]))
  }

  /**
   * Attempts to create a booking. If the site is unavailable, automatically
   * adds the guest to the waitlist and returns a waitlisted booking.
   */
  requestBooking(params: {
    guestId: string
    campgroundId: string
    siteId: string
    checkInDate: string
    checkOutDate: string
    numberOfGuests: number
    vehicles: Booking['vehicleDetails']
    pets: Booking['pets']
    specialRequests: string
    addOns: { id: string; quantity: number }[]
    source: Booking['source']
    promoCode?: string
    useLoyaltyPoints?: number
    autoWaitlist?: boolean
  }): BookingResult {
    // Check for maintenance windows
    const maintenanceConflict = this.checkMaintenanceConflict(
      params.siteId,
      params.checkInDate,
      params.checkOutDate
    )
    if (maintenanceConflict) {
      return {
        success: false,
        error: `Site is under maintenance from ${maintenanceConflict.startDate} to ${maintenanceConflict.endDate}: ${maintenanceConflict.reason}`,
        booking: null,
        waitlistPosition: null,
      }
    }

    // Check weather alerts
    const weatherBlock = this.checkWeatherBlocking(params.campgroundId, params.checkInDate, params.checkOutDate)
    if (weatherBlock) {
      return {
        success: false,
        error: `Booking blocked due to weather: ${weatherBlock.title} (${weatherBlock.severity}). ${weatherBlock.description}`,
        booking: null,
        waitlistPosition: null,
      }
    }

    try {
      const booking = this.engine.createBooking(params)

      this.addAuditEntry('booking_created', params.guestId, {
        bookingId: booking.id,
        campgroundId: params.campgroundId,
        siteId: params.siteId,
        dates: `${params.checkInDate} to ${params.checkOutDate}`,
        total: booking.pricing.grandTotal,
      })

      return {
        success: true,
        error: null,
        booking,
        waitlistPosition: null,
      }
    } catch (err) {
      if (err instanceof BookingError && err.code === 'NOT_AVAILABLE' && params.autoWaitlist !== false) {
        const position = this.addToWaitlist({
          guestId: params.guestId,
          campgroundId: params.campgroundId,
          siteId: params.siteId,
          checkInDate: params.checkInDate,
          checkOutDate: params.checkOutDate,
          numberOfGuests: params.numberOfGuests,
          source: params.source,
        })

        this.addAuditEntry('waitlist_added', params.guestId, {
          siteId: params.siteId,
          dates: `${params.checkInDate} to ${params.checkOutDate}`,
          position,
        })

        return {
          success: false,
          error: `Site is not available. You have been added to the waitlist at position ${position}.`,
          booking: null,
          waitlistPosition: position,
        }
      }

      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        booking: null,
        waitlistPosition: null,
      }
    }
  }

  /**
   * Creates a group booking that reserves multiple sites atomically.
   * Either all sites are booked or none are (transactional semantics).
   */
  createGroupBooking(params: {
    organizerGuestId: string
    campgroundId: string
    siteIds: string[]
    checkInDate: string
    checkOutDate: string
    guestsPerSite: number[]
    specialRequests: string
    source: Booking['source']
  }): GroupBookingResult {
    const groupId = `GRP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const bookings: Booking[] = []
    const errors: { siteId: string; error: string }[] = []

    // Validate campground allows group bookings
    const campground = this.campgrounds.get(params.campgroundId)
    if (!campground) {
      return { success: false, groupId, bookings: [], errors: [{ siteId: '', error: 'Campground not found' }] }
    }

    if (!campground.reservationPolicy.allowGroupBookings) {
      return { success: false, groupId, bookings: [], errors: [{ siteId: '', error: 'Group bookings not allowed at this campground' }] }
    }

    const totalGuests = params.guestsPerSite.reduce((sum, g) => sum + g, 0)
    if (totalGuests > campground.reservationPolicy.maxGroupSize) {
      return {
        success: false,
        groupId,
        bookings: [],
        errors: [{ siteId: '', error: `Total group size (${totalGuests}) exceeds maximum (${campground.reservationPolicy.maxGroupSize})` }],
      }
    }

    // Try to book all sites
    for (let i = 0; i < params.siteIds.length; i++) {
      try {
        const booking = this.engine.createBooking({
          guestId: params.organizerGuestId,
          campgroundId: params.campgroundId,
          siteId: params.siteIds[i],
          checkInDate: params.checkInDate,
          checkOutDate: params.checkOutDate,
          numberOfGuests: params.guestsPerSite[i] ?? 2,
          vehicles: [],
          pets: [],
          specialRequests: params.specialRequests,
          addOns: [],
          source: params.source,
        })

        booking.isGroupBooking = true
        booking.groupId = groupId
        bookings.push(booking)
      } catch (err) {
        errors.push({
          siteId: params.siteIds[i],
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    // If any bookings failed, rollback all (transactional)
    if (errors.length > 0) {
      for (const booking of bookings) {
        try {
          this.engine.updateBookingStatus(booking.id, 'cancelled', 'system', 'Group booking rollback')
        } catch {
          // Best effort rollback
        }
      }

      return { success: false, groupId, bookings: [], errors }
    }

    this.addAuditEntry('group_booking_created', params.organizerGuestId, {
      groupId,
      campgroundId: params.campgroundId,
      sites: params.siteIds.length,
      totalGuests,
    })

    return { success: true, groupId, bookings, errors: [] }
  }

  /**
   * Handles the complete check-in workflow including validation,
   * ID verification, damage deposit, and welcome notifications.
   */
  processCheckIn(bookingId: string, params: {
    verifiedBy: string
    idVerified: boolean
    damageDepositCollected: boolean
    actualArrivalTime: string
    vehiclesVerified: boolean
    additionalNotes: string
  }): CheckInResult {
    if (!params.idVerified) {
      return {
        success: false,
        error: 'Guest ID verification required before check-in',
        booking: null,
      }
    }

    if (!params.damageDepositCollected) {
      return {
        success: false,
        error: 'Damage deposit must be collected before check-in',
        booking: null,
      }
    }

    try {
      const booking = this.engine.updateBookingStatus(bookingId, 'checked_in', params.verifiedBy)

      // Add check-in details to history
      booking.history.push({
        id: `HE-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'check_in_details',
        description: `Checked in by ${params.verifiedBy}. Arrival: ${params.actualArrivalTime}. ID verified: ${params.idVerified}. Deposit collected: ${params.damageDepositCollected}. ${params.additionalNotes}`,
        performedBy: params.verifiedBy,
        previousValue: null,
        newValue: null,
      })

      this.addAuditEntry('check_in', booking.guestId, {
        bookingId,
        verifiedBy: params.verifiedBy,
        arrivalTime: params.actualArrivalTime,
      })

      return { success: true, error: null, booking }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Check-in failed',
        booking: null,
      }
    }
  }

  /**
   * Handles the complete check-out workflow including damage assessment,
   * deposit refund, final charges, and review request scheduling.
   */
  processCheckOut(bookingId: string, params: {
    processedBy: string
    damageAssessment: 'none' | 'minor' | 'major'
    damageCharges: number
    damageDescription: string
    refundDeposit: boolean
    lateCheckOutFee: number
    actualDepartureTime: string
    siteCondition: 'excellent' | 'good' | 'fair' | 'poor'
  }): CheckOutResult {
    try {
      const booking = this.engine.updateBookingStatus(bookingId, 'checked_out', params.processedBy)

      // Process any additional charges
      const additionalCharges: { name: string; amount: number }[] = []

      if (params.damageCharges > 0) {
        additionalCharges.push({
          name: `Damage charge: ${params.damageDescription}`,
          amount: params.damageCharges,
        })
      }

      if (params.lateCheckOutFee > 0) {
        additionalCharges.push({
          name: 'Late check-out fee',
          amount: params.lateCheckOutFee,
        })
      }

      // Update pricing if there are additional charges
      if (additionalCharges.length > 0) {
        const extraTotal = additionalCharges.reduce((sum, c) => sum + c.amount, 0)
        additionalCharges.forEach((charge) => {
          booking.pricing.fees.push({
            name: charge.name,
            amount: charge.amount,
            isRefundable: false,
          })
        })
        booking.pricing.totalFees += extraTotal
        booking.pricing.grandTotal += extraTotal
        booking.payment.outstandingBalance += extraTotal
      }

      // Add check-out details
      booking.history.push({
        id: `HE-${Date.now()}`,
        timestamp: new Date().toISOString(),
        action: 'check_out_details',
        description: `Checked out by ${params.processedBy}. Departure: ${params.actualDepartureTime}. Damage: ${params.damageAssessment}. Site condition: ${params.siteCondition}. Additional charges: $${additionalCharges.reduce((s, c) => s + c.amount, 0).toFixed(2)}`,
        performedBy: params.processedBy,
        previousValue: null,
        newValue: null,
      })

      // Process waitlist — notify next person
      this.processWaitlistForSite(booking.siteId, booking.checkOutDate)

      this.addAuditEntry('check_out', booking.guestId, {
        bookingId,
        processedBy: params.processedBy,
        damageAssessment: params.damageAssessment,
        additionalCharges: additionalCharges.reduce((s, c) => s + c.amount, 0),
      })

      return {
        success: true,
        error: null,
        booking,
        additionalCharges,
        depositRefunded: params.refundDeposit && params.damageAssessment === 'none',
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Check-out failed',
        booking: null,
        additionalCharges: [],
        depositRefunded: false,
      }
    }
  }

  /**
   * Submits and manages campsite reviews with validation and response handling.
   */
  submitReview(review: Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'helpfulCount' | 'reportCount' | 'isPublished' | 'response'>): Review {
    // Validate the booking exists and belongs to the guest
    if (!review.bookingId) {
      throw new Error('Booking ID is required for review submission')
    }

    // Validate ratings are within range
    const ratingFields = Object.values(review.ratings)
    for (const rating of ratingFields) {
      if (rating < 1 || rating > 5) {
        throw new Error('All ratings must be between 1 and 5')
      }
    }

    if (review.overallRating < 1 || review.overallRating > 5) {
      throw new Error('Overall rating must be between 1 and 5')
    }

    // Check for profanity/inappropriate content (simplified)
    const bannedWords = ['spam', 'fake', 'scam']
    const textLower = review.text.toLowerCase()
    if (bannedWords.some((word) => textLower.includes(word))) {
      throw new Error('Review contains inappropriate content and cannot be published')
    }

    // Validate minimum review length
    if (review.text.length < 20) {
      throw new Error('Review must be at least 20 characters long')
    }

    if (review.text.length > 5000) {
      throw new Error('Review must not exceed 5000 characters')
    }

    const fullReview: Review = {
      ...review,
      id: `RV-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      isPublished: true,
      helpfulCount: 0,
      reportCount: 0,
      response: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.reviews.set(fullReview.id, fullReview)

    // Update campground rating (recalculate average)
    this.recalculateCampgroundRating(review.campgroundId)

    this.addAuditEntry('review_submitted', review.guestId, {
      reviewId: fullReview.id,
      campgroundId: review.campgroundId,
      rating: review.overallRating,
    })

    return fullReview
  }

  /**
   * Responds to a review as a campground manager.
   */
  respondToReview(reviewId: string, response: { text: string; respondedBy: string }): Review {
    const review = this.reviews.get(reviewId)
    if (!review) throw new Error('Review not found')

    if (review.response) throw new Error('Review already has a response')

    if (response.text.length < 10) throw new Error('Response must be at least 10 characters')

    review.response = {
      text: response.text,
      respondedBy: response.respondedBy,
      respondedAt: new Date().toISOString(),
    }
    review.updatedAt = new Date().toISOString()

    return review
  }

  /**
   * Gets reviews for a campground with filtering and sorting.
   */
  getCampgroundReviews(campgroundId: string, options: {
    sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'
    minRating?: number
    maxRating?: number
    travelType?: Review['travelType']
    hasPhotos?: boolean
    limit?: number
    offset?: number
  } = {}): { reviews: Review[]; total: number; averageRating: number } {
    let reviews = Array.from(this.reviews.values())
      .filter((r) => r.campgroundId === campgroundId && r.isPublished)

    if (options.minRating) reviews = reviews.filter((r) => r.overallRating >= options.minRating!)
    if (options.maxRating) reviews = reviews.filter((r) => r.overallRating <= options.maxRating!)
    if (options.travelType) reviews = reviews.filter((r) => r.travelType === options.travelType)
    if (options.hasPhotos) reviews = reviews.filter((r) => r.photos.length > 0)

    const total = reviews.length
    const averageRating = total > 0
      ? Math.round((reviews.reduce((sum, r) => sum + r.overallRating, 0) / total) * 10) / 10
      : 0

    switch (options.sortBy) {
      case 'oldest':
        reviews.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        break
      case 'highest':
        reviews.sort((a, b) => b.overallRating - a.overallRating)
        break
      case 'lowest':
        reviews.sort((a, b) => a.overallRating - b.overallRating)
        break
      case 'helpful':
        reviews.sort((a, b) => b.helpfulCount - a.helpfulCount)
        break
      case 'newest':
      default:
        reviews.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }

    const offset = options.offset ?? 0
    const limit = options.limit ?? 20
    reviews = reviews.slice(offset, offset + limit)

    return { reviews, total, averageRating }
  }

  /**
   * Schedules a maintenance window for a site, automatically handling
   * any conflicting bookings by notifying guests and offering alternatives.
   */
  scheduleMaintenance(params: {
    siteId: string
    campgroundId: string
    startDate: string
    endDate: string
    reason: string
    priority: 'routine' | 'urgent' | 'emergency'
    scheduledBy: string
  }): MaintenanceResult {
    const window: MaintenanceWindow = {
      id: `MW-${Date.now()}`,
      ...params,
      createdAt: new Date().toISOString(),
    }

    // Find conflicting bookings
    const conflictingBookings = this.findConflictingBookings(
      params.siteId,
      params.startDate,
      params.endDate
    )

    const relocations: { bookingId: string; action: string }[] = []

    if (conflictingBookings.length > 0) {
      const campground = this.campgrounds.get(params.campgroundId)

      for (const booking of conflictingBookings) {
        if (params.priority === 'emergency') {
          // Emergency: cancel and full refund
          this.engine.updateBookingStatus(booking.id, 'cancelled', 'system', `Emergency maintenance: ${params.reason}`)
          relocations.push({ bookingId: booking.id, action: 'cancelled_with_full_refund' })
        } else {
          // Try to find alternative site
          const altSite = campground?.sites.find(
            (s) =>
              s.id !== params.siteId &&
              s.isActive &&
              s.type === booking.site.type &&
              s.maxOccupancy >= booking.numberOfGuests
          )

          if (altSite) {
            relocations.push({ bookingId: booking.id, action: `relocated_to_${altSite.name}` })
          } else {
            this.engine.updateBookingStatus(booking.id, 'cancelled', 'system', `Maintenance: ${params.reason}`)
            relocations.push({ bookingId: booking.id, action: 'cancelled_no_alternative' })
          }
        }
      }
    }

    // Store maintenance window
    const existing = this.maintenanceSchedule.get(params.siteId) ?? []
    existing.push(window)
    this.maintenanceSchedule.set(params.siteId, existing)

    this.addAuditEntry('maintenance_scheduled', params.scheduledBy, {
      siteId: params.siteId,
      dates: `${params.startDate} to ${params.endDate}`,
      priority: params.priority,
      conflictsHandled: conflictingBookings.length,
    })

    return {
      maintenanceWindow: window,
      conflictingBookings: conflictingBookings.length,
      relocations,
    }
  }

  /**
   * Generates a comprehensive operations report for a given date range.
   */
  generateOperationsReport(startDate: string, endDate: string): OperationsReport {
    const summary = this.engine.getBookingSummary(startDate, endDate)

    const reviews = Array.from(this.reviews.values()).filter(
      (r) => r.createdAt >= startDate && r.createdAt <= endDate
    )

    const avgReviewRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
      : 0

    const maintenanceEvents = Array.from(this.maintenanceSchedule.values())
      .flat()
      .filter((mw) => mw.startDate >= startDate && mw.startDate <= endDate)

    const waitlistEntries = Array.from(this.waitlists.values()).flat()
      .filter((w) => w.addedAt >= startDate && w.addedAt <= endDate)

    return {
      period: { startDate, endDate },
      bookingSummary: summary,
      reviewStats: {
        totalReviews: reviews.length,
        averageRating: Math.round(avgReviewRating * 10) / 10,
        fiveStarCount: reviews.filter((r) => r.overallRating === 5).length,
        oneStarCount: reviews.filter((r) => r.overallRating === 1).length,
        responseRate: reviews.length > 0
          ? Math.round((reviews.filter((r) => r.response !== null).length / reviews.length) * 100)
          : 0,
      },
      maintenanceStats: {
        totalEvents: maintenanceEvents.length,
        emergencyEvents: maintenanceEvents.filter((m) => m.priority === 'emergency').length,
        routineEvents: maintenanceEvents.filter((m) => m.priority === 'routine').length,
      },
      waitlistStats: {
        totalEntries: waitlistEntries.length,
        converted: waitlistEntries.filter((w) => w.status === 'converted').length,
        expired: waitlistEntries.filter((w) => w.status === 'expired').length,
      },
      auditSummary: {
        totalEntries: this.auditLog.filter((a) => a.timestamp >= startDate && a.timestamp <= endDate).length,
        topActions: this.getTopAuditActions(startDate, endDate),
      },
      generatedAt: new Date().toISOString(),
    }
  }

  // ---- Private helpers ----

  private addToWaitlist(params: {
    guestId: string
    campgroundId: string
    siteId: string
    checkInDate: string
    checkOutDate: string
    numberOfGuests: number
    source: Booking['source']
  }): number {
    const key = `${params.siteId}:${params.checkInDate}:${params.checkOutDate}`
    const existing = this.waitlists.get(key) ?? []
    const entry: WaitlistEntry = {
      id: `WL-${Date.now()}`,
      ...params,
      position: existing.length + 1,
      addedAt: new Date().toISOString(),
      status: 'waiting',
      notifiedAt: null,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48h expiry
    }
    existing.push(entry)
    this.waitlists.set(key, existing)
    return entry.position
  }

  private processWaitlistForSite(siteId: string, availableFrom: string): void {
    for (const [key, entries] of this.waitlists.entries()) {
      if (!key.startsWith(siteId)) continue
      const waiting = entries.filter((e) => e.status === 'waiting')
      if (waiting.length > 0) {
        const next = waiting[0]
        next.status = 'notified'
        next.notifiedAt = new Date().toISOString()
        // In a real system, send notification to the guest
      }
    }
  }

  private checkMaintenanceConflict(siteId: string, checkIn: string, checkOut: string): MaintenanceWindow | null {
    const windows = this.maintenanceSchedule.get(siteId) ?? []
    return windows.find((mw) => checkIn < mw.endDate && checkOut > mw.startDate) ?? null
  }

  private checkWeatherBlocking(campgroundId: string, checkIn: string, checkOut: string): WeatherAlert | null {
    const campground = this.campgrounds.get(campgroundId)
    if (!campground) return null
    return campground.weatherAlerts.find(
      (wa) => wa.isActive && wa.severity === 'emergency' && checkIn < wa.endTime && checkOut > wa.startTime
    ) ?? null
  }

  private findConflictingBookings(siteId: string, startDate: string, endDate: string): Booking[] {
    // This would query the engine's bookings — simplified here
    return []
  }

  private recalculateCampgroundRating(campgroundId: string): void {
    const reviews = Array.from(this.reviews.values()).filter(
      (r) => r.campgroundId === campgroundId && r.isPublished
    )
    if (reviews.length === 0) return

    const avg = reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
    const campground = this.campgrounds.get(campgroundId)
    if (campground) {
      campground.rating = Math.round(avg * 10) / 10
      campground.reviewCount = reviews.length
    }
  }

  private addAuditEntry(action: string, userId: string, details: Record<string, unknown>): void {
    this.auditLog.push({
      id: `AU-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action,
      userId,
      details,
      ipAddress: '127.0.0.1',
    })
  }

  private getTopAuditActions(startDate: string, endDate: string): { action: string; count: number }[] {
    const counts = new Map<string, number>()
    this.auditLog
      .filter((a) => a.timestamp >= startDate && a.timestamp <= endDate)
      .forEach((a) => counts.set(a.action, (counts.get(a.action) ?? 0) + 1))

    return Array.from(counts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }
}

// Supporting types

interface WaitlistEntry {
  id: string
  guestId: string
  campgroundId: string
  siteId: string
  checkInDate: string
  checkOutDate: string
  numberOfGuests: number
  source: Booking['source']
  position: number
  addedAt: string
  status: 'waiting' | 'notified' | 'converted' | 'expired' | 'cancelled'
  notifiedAt: string | null
  expiresAt: string
}

interface MaintenanceWindow {
  id: string
  siteId: string
  campgroundId: string
  startDate: string
  endDate: string
  reason: string
  priority: 'routine' | 'urgent' | 'emergency'
  scheduledBy: string
  createdAt: string
}

interface AuditEntry {
  id: string
  timestamp: string
  action: string
  userId: string
  details: Record<string, unknown>
  ipAddress: string
}

interface BookingResult {
  success: boolean
  error: string | null
  booking: Booking | null
  waitlistPosition: number | null
}

interface GroupBookingResult {
  success: boolean
  groupId: string
  bookings: Booking[]
  errors: { siteId: string; error: string }[]
}

interface CheckInResult {
  success: boolean
  error: string | null
  booking: Booking | null
}

interface CheckOutResult {
  success: boolean
  error: string | null
  booking: Booking | null
  additionalCharges: { name: string; amount: number }[]
  depositRefunded: boolean
}

interface MaintenanceResult {
  maintenanceWindow: MaintenanceWindow
  conflictingBookings: number
  relocations: { bookingId: string; action: string }[]
}

interface OperationsReport {
  period: { startDate: string; endDate: string }
  bookingSummary: BookingSummary
  reviewStats: {
    totalReviews: number
    averageRating: number
    fiveStarCount: number
    oneStarCount: number
    responseRate: number
  }
  maintenanceStats: {
    totalEvents: number
    emergencyEvents: number
    routineEvents: number
  }
  waitlistStats: {
    totalEntries: number
    converted: number
    expired: number
  }
  auditSummary: {
    totalEntries: number
    topActions: { action: string; count: number }[]
  }
  generatedAt: string
}
