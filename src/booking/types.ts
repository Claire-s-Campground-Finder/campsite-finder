/** Core booking domain types for the campsite reservation system */

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show'
  | 'waitlisted'
  | 'expired'

export type PaymentStatus =
  | 'unpaid'
  | 'authorized'
  | 'captured'
  | 'refunded'
  | 'partially_refunded'
  | 'failed'
  | 'disputed'

export type PaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'paypal'
  | 'apple_pay'
  | 'google_pay'
  | 'bank_transfer'
  | 'cash_on_arrival'

export type CampsiteType = 'tent' | 'rv' | 'cabin' | 'glamping' | 'treehouse' | 'yurt' | 'van'

export type SeasonType = 'peak' | 'shoulder' | 'off_peak' | 'holiday'

export type AmenityCategory =
  | 'basic'
  | 'comfort'
  | 'recreation'
  | 'safety'
  | 'accessibility'
  | 'premium'

export interface GeoLocation {
  latitude: number
  longitude: number
  elevation: number
  timezone: string
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  county: string
  country: string
}

export interface ContactInfo {
  phone: string
  email: string
  website: string
  emergencyPhone: string
}

export interface OperatingHours {
  checkInStart: string
  checkInEnd: string
  checkOutTime: string
  officeOpen: string
  officeClose: string
  quietHoursStart: string
  quietHoursEnd: string
}

export interface SeasonalPricing {
  season: SeasonType
  startDate: string
  endDate: string
  basePrice: number
  weekendSurcharge: number
  holidaySurcharge: number
  minNights: number
  maxNights: number
}

export interface Amenity {
  id: string
  name: string
  category: AmenityCategory
  description: string
  icon: string
  available: boolean
  additionalCost: number
  requiresReservation: boolean
}

export interface CampsiteSite {
  id: string
  campgroundId: string
  name: string
  type: CampsiteType
  description: string
  maxOccupancy: number
  maxVehicles: number
  maxVehicleLength: number
  isAccessible: boolean
  hasPower: boolean
  hasWater: boolean
  hasSewer: boolean
  hasShade: boolean
  isWaterfront: boolean
  isPetFriendly: boolean
  location: GeoLocation
  amenities: Amenity[]
  photos: CampsitePhoto[]
  seasonalPricing: SeasonalPricing[]
  minimumStay: number
  maximumStay: number
  isActive: boolean
  lastMaintenanceDate: string
  nextMaintenanceDate: string
  siteSize: { width: number; length: number }
  groundType: 'grass' | 'gravel' | 'dirt' | 'sand' | 'paved' | 'wood_platform'
  firepit: boolean
  picnicTable: boolean
  bearBox: boolean
  parkingSpots: number
}

export interface CampsitePhoto {
  id: string
  url: string
  caption: string
  isPrimary: boolean
  uploadedAt: string
  width: number
  height: number
}

export interface Campground {
  id: string
  name: string
  description: string
  longDescription: string
  address: Address
  location: GeoLocation
  contact: ContactInfo
  operatingHours: OperatingHours
  sites: CampsiteSite[]
  amenities: Amenity[]
  rules: CampgroundRule[]
  photos: CampsitePhoto[]
  rating: number
  reviewCount: number
  totalSites: number
  isOpen: boolean
  seasonStart: string
  seasonEnd: string
  reservationPolicy: ReservationPolicy
  cancellationPolicy: CancellationPolicy
  weatherAlerts: WeatherAlert[]
  nearbyAttractions: NearbyAttraction[]
}

export interface CampgroundRule {
  id: string
  category: 'general' | 'pets' | 'fire' | 'noise' | 'vehicles' | 'wildlife'
  title: string
  description: string
  severity: 'info' | 'warning' | 'strict'
}

export interface ReservationPolicy {
  maxAdvanceDays: number
  minAdvanceDays: number
  maxConsecutiveNights: number
  allowSameDayBooking: boolean
  requiresDeposit: boolean
  depositPercentage: number
  allowGroupBookings: boolean
  maxGroupSize: number
  modificationDeadlineHours: number
}

export interface CancellationPolicy {
  fullRefundDays: number
  partialRefundDays: number
  partialRefundPercentage: number
  noRefundDays: number
  weatherExceptionAllowed: boolean
  emergencyExceptionAllowed: boolean
}

export interface WeatherAlert {
  id: string
  type: 'fire_danger' | 'flood' | 'storm' | 'heat' | 'cold' | 'wind' | 'snow'
  severity: 'advisory' | 'watch' | 'warning' | 'emergency'
  title: string
  description: string
  startTime: string
  endTime: string
  affectedAreas: string[]
  isActive: boolean
}

export interface NearbyAttraction {
  id: string
  name: string
  type: 'trail' | 'lake' | 'river' | 'peak' | 'waterfall' | 'viewpoint' | 'town' | 'restaurant'
  distance: number
  distanceUnit: 'miles' | 'km'
  description: string
  difficulty: 'easy' | 'moderate' | 'hard' | 'expert'
  estimatedTime: string
}

export interface Guest {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: Address
  dateOfBirth: string
  emergencyContact: {
    name: string
    phone: string
    relationship: string
  }
  preferences: GuestPreferences
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum'
  loyaltyPoints: number
  totalBookings: number
  totalSpent: number
  memberSince: string
  isVerified: boolean
  notes: string
}

export interface GuestPreferences {
  preferredSiteType: CampsiteType[]
  preferredAmenities: string[]
  dietaryRestrictions: string[]
  accessibilityNeeds: string[]
  communicationPreference: 'email' | 'sms' | 'phone'
  newsletterOptIn: boolean
  marketingOptIn: boolean
  preferredLanguage: string
}

export interface Booking {
  id: string
  confirmationCode: string
  guestId: string
  guest: Guest
  campgroundId: string
  siteId: string
  site: CampsiteSite
  status: BookingStatus
  checkInDate: string
  checkOutDate: string
  numberOfNights: number
  numberOfGuests: number
  numberOfVehicles: number
  vehicleDetails: VehicleDetail[]
  pets: PetDetail[]
  specialRequests: string
  internalNotes: string
  pricing: BookingPricing
  payment: BookingPayment
  addOns: BookingAddOn[]
  history: BookingHistoryEntry[]
  createdAt: string
  updatedAt: string
  confirmedAt: string | null
  checkedInAt: string | null
  checkedOutAt: string | null
  cancelledAt: string | null
  cancellationReason: string | null
  isGroupBooking: boolean
  groupId: string | null
  source: 'website' | 'phone' | 'walk_in' | 'partner' | 'admin'
  tags: string[]
}

export interface VehicleDetail {
  type: 'car' | 'truck' | 'suv' | 'rv' | 'trailer' | 'van' | 'motorcycle'
  make: string
  model: string
  year: number
  licensePlate: string
  state: string
  length: number
}

export interface PetDetail {
  name: string
  species: 'dog' | 'cat' | 'other'
  breed: string
  weight: number
  isServiceAnimal: boolean
  vaccinationCurrent: boolean
}

export interface BookingPricing {
  baseRate: number
  nightlyRates: { date: string; rate: number; season: SeasonType }[]
  subtotal: number
  taxes: { name: string; rate: number; amount: number }[]
  fees: { name: string; amount: number; isRefundable: boolean }[]
  addOnTotal: number
  discounts: { name: string; type: 'percentage' | 'flat'; value: number; amount: number }[]
  totalTax: number
  totalFees: number
  totalDiscount: number
  grandTotal: number
  deposit: number
  balanceDue: number
  currency: string
}

export interface BookingPayment {
  status: PaymentStatus
  method: PaymentMethod
  transactions: PaymentTransaction[]
  totalPaid: number
  totalRefunded: number
  outstandingBalance: number
}

export interface PaymentTransaction {
  id: string
  type: 'charge' | 'refund' | 'authorization' | 'void'
  amount: number
  status: 'pending' | 'completed' | 'failed'
  method: PaymentMethod
  last4: string
  processedAt: string
  referenceId: string
  notes: string
}

export interface BookingAddOn {
  id: string
  name: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  category: 'equipment' | 'activity' | 'food' | 'service' | 'rental'
  isPerNight: boolean
}

export interface BookingHistoryEntry {
  id: string
  timestamp: string
  action: string
  description: string
  performedBy: string
  previousValue: string | null
  newValue: string | null
}

export interface SearchFilters {
  location: string
  checkInDate: string
  checkOutDate: string
  guests: number
  siteTypes: CampsiteType[]
  priceRange: { min: number; max: number }
  rating: number
  amenities: string[]
  accessibility: boolean
  petFriendly: boolean
  waterfront: boolean
  hasHookups: boolean
  instantBook: boolean
  sortBy: 'relevance' | 'price_asc' | 'price_desc' | 'rating' | 'distance' | 'popularity'
  radius: number
  radiusUnit: 'miles' | 'km'
}

export interface SearchResult {
  campground: Campground
  availableSites: CampsiteSite[]
  lowestPrice: number
  highestPrice: number
  distance: number
  matchScore: number
  highlightedAmenities: string[]
}

export interface BookingSummary {
  totalBookings: number
  activeBookings: number
  upcomingBookings: number
  completedBookings: number
  cancelledBookings: number
  totalRevenue: number
  averageStayLength: number
  occupancyRate: number
  topCampgrounds: { id: string; name: string; bookings: number }[]
  monthlyRevenue: { month: string; revenue: number; bookings: number }[]
}

export interface Notification {
  id: string
  type: 'booking_confirmation' | 'check_in_reminder' | 'check_out_reminder' | 'cancellation' | 'payment' | 'weather_alert' | 'promotion' | 'review_request'
  title: string
  message: string
  recipientId: string
  channel: 'email' | 'sms' | 'push' | 'in_app'
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  scheduledAt: string
  sentAt: string | null
  readAt: string | null
  metadata: Record<string, string>
}

export interface Review {
  id: string
  bookingId: string
  guestId: string
  campgroundId: string
  siteId: string
  overallRating: number
  ratings: {
    cleanliness: number
    location: number
    amenities: number
    value: number
    accuracy: number
    communication: number
  }
  title: string
  text: string
  photos: CampsitePhoto[]
  response: {
    text: string
    respondedBy: string
    respondedAt: string
  } | null
  isVerified: boolean
  isPublished: boolean
  helpfulCount: number
  reportCount: number
  createdAt: string
  updatedAt: string
  stayDate: string
  travelType: 'solo' | 'couple' | 'family' | 'friends' | 'group'
  wouldRecommend: boolean
  highlights: string[]
  concerns: string[]
}
