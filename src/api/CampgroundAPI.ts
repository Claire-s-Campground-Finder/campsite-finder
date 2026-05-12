/**
 * CampgroundAPI is a client-side API layer that simulates a full REST API
 * for campground data with caching, pagination, rate limiting, retry logic,
 * and request deduplication.
 */

interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface APIError {
  code: string
  message: string
  status: number
  retryable: boolean
  timestamp: string
}

interface CacheEntry<T> {
  data: T
  expiresAt: number
  etag: string
}

interface RateLimitState {
  remaining: number
  limit: number
  resetAt: number
  windowMs: number
}

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  params?: Record<string, string | number | boolean>
  body?: unknown
  headers?: Record<string, string>
  timeout?: number
  retries?: number
  cacheTtl?: number
  skipCache?: boolean
  signal?: AbortSignal
}

interface RequestMetrics {
  requestId: string
  path: string
  method: string
  startTime: number
  endTime: number
  duration: number
  fromCache: boolean
  retryCount: number
  status: number
  bytesReceived: number
}

type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
type ResponseInterceptor = (response: unknown, config: RequestConfig) => unknown | Promise<unknown>
type ErrorInterceptor = (error: APIError, config: RequestConfig) => void

export class CampgroundAPI {
  private cache = new Map<string, CacheEntry<unknown>>()
  private pendingRequests = new Map<string, Promise<unknown>>()
  private rateLimit: RateLimitState = { remaining: 100, limit: 100, resetAt: Date.now() + 60000, windowMs: 60000 }
  private metrics: RequestMetrics[] = []
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []
  private errorInterceptors: ErrorInterceptor[] = []
  private baseUrl: string
  private defaultTimeout: number
  private defaultRetries: number
  private defaultCacheTtl: number
  private authToken: string | null = null
  private requestCount = 0

  constructor(config: {
    baseUrl?: string
    timeout?: number
    retries?: number
    cacheTtl?: number
    authToken?: string
  } = {}) {
    this.baseUrl = config.baseUrl ?? '/api/v1'
    this.defaultTimeout = config.timeout ?? 10000
    this.defaultRetries = config.retries ?? 3
    this.defaultCacheTtl = config.cacheTtl ?? 300000 // 5 min
    this.authToken = config.authToken ?? null
  }

  setAuthToken(token: string | null): void {
    this.authToken = token
    this.cache.clear() // Clear cache when auth changes
  }

  addRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor)
    return () => {
      const idx = this.requestInterceptors.indexOf(interceptor)
      if (idx >= 0) this.requestInterceptors.splice(idx, 1)
    }
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor)
    return () => {
      const idx = this.responseInterceptors.indexOf(interceptor)
      if (idx >= 0) this.responseInterceptors.splice(idx, 1)
    }
  }

  addErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor)
    return () => {
      const idx = this.errorInterceptors.indexOf(interceptor)
      if (idx >= 0) this.errorInterceptors.splice(idx, 1)
    }
  }

  // ---- Campground endpoints ----

  async listCampgrounds(params: {
    page?: number
    pageSize?: number
    state?: string
    type?: string
    minRating?: number
    maxPrice?: number
    amenities?: string[]
    search?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  } = {}): Promise<PaginatedResponse<CampgroundSummary>> {
    const queryParams: Record<string, string | number | boolean> = {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
    }
    if (params.state) queryParams.state = params.state
    if (params.type) queryParams.type = params.type
    if (params.minRating) queryParams.minRating = params.minRating
    if (params.maxPrice) queryParams.maxPrice = params.maxPrice
    if (params.amenities?.length) queryParams.amenities = params.amenities.join(',')
    if (params.search) queryParams.search = params.search
    if (params.sortBy) queryParams.sortBy = params.sortBy
    if (params.sortOrder) queryParams.sortOrder = params.sortOrder

    return this.request<PaginatedResponse<CampgroundSummary>>({
      method: 'GET',
      path: '/campgrounds',
      params: queryParams,
    })
  }

  async getCampground(id: string): Promise<CampgroundDetail> {
    return this.request<CampgroundDetail>({
      method: 'GET',
      path: `/campgrounds/${id}`,
    })
  }

  async getCampgroundAvailability(id: string, params: {
    checkIn: string
    checkOut: string
    guests?: number
    siteType?: string
  }): Promise<AvailabilityResponse> {
    return this.request<AvailabilityResponse>({
      method: 'GET',
      path: `/campgrounds/${id}/availability`,
      params: params as Record<string, string | number | boolean>,
      cacheTtl: 30000, // Short TTL for availability
    })
  }

  async getCampgroundReviews(id: string, params: {
    page?: number
    pageSize?: number
    sortBy?: 'newest' | 'rating' | 'helpful'
    minRating?: number
  } = {}): Promise<PaginatedResponse<ReviewSummary>> {
    return this.request<PaginatedResponse<ReviewSummary>>({
      method: 'GET',
      path: `/campgrounds/${id}/reviews`,
      params: params as Record<string, string | number | boolean>,
    })
  }

  async getCampgroundPhotos(id: string, params: {
    page?: number
    pageSize?: number
    category?: 'site' | 'amenity' | 'scenery' | 'wildlife'
  } = {}): Promise<PaginatedResponse<PhotoEntry>> {
    return this.request<PaginatedResponse<PhotoEntry>>({
      method: 'GET',
      path: `/campgrounds/${id}/photos`,
      params: params as Record<string, string | number | boolean>,
    })
  }

  async getCampgroundWeather(id: string): Promise<WeatherForecast> {
    return this.request<WeatherForecast>({
      method: 'GET',
      path: `/campgrounds/${id}/weather`,
      cacheTtl: 1800000, // 30 min for weather
    })
  }

  // ---- Booking endpoints ----

  async createBooking(booking: CreateBookingRequest): Promise<BookingResponse> {
    return this.request<BookingResponse>({
      method: 'POST',
      path: '/bookings',
      body: booking,
      skipCache: true,
    })
  }

  async getBooking(id: string): Promise<BookingResponse> {
    return this.request<BookingResponse>({
      method: 'GET',
      path: `/bookings/${id}`,
      cacheTtl: 60000,
    })
  }

  async listUserBookings(params: {
    status?: string
    page?: number
    pageSize?: number
    upcoming?: boolean
  } = {}): Promise<PaginatedResponse<BookingResponse>> {
    return this.request<PaginatedResponse<BookingResponse>>({
      method: 'GET',
      path: '/bookings',
      params: params as Record<string, string | number | boolean>,
    })
  }

  async cancelBooking(id: string, reason: string): Promise<BookingResponse> {
    this.invalidateCache(`/bookings/${id}`)
    this.invalidateCache('/bookings')
    return this.request<BookingResponse>({
      method: 'POST',
      path: `/bookings/${id}/cancel`,
      body: { reason },
      skipCache: true,
    })
  }

  async modifyBooking(id: string, changes: Partial<CreateBookingRequest>): Promise<BookingResponse> {
    this.invalidateCache(`/bookings/${id}`)
    return this.request<BookingResponse>({
      method: 'PATCH',
      path: `/bookings/${id}`,
      body: changes,
      skipCache: true,
    })
  }

  // ---- Review endpoints ----

  async submitReview(review: CreateReviewRequest): Promise<ReviewSummary> {
    this.invalidateCache(`/campgrounds/${review.campgroundId}/reviews`)
    return this.request<ReviewSummary>({
      method: 'POST',
      path: '/reviews',
      body: review,
      skipCache: true,
    })
  }

  async markReviewHelpful(reviewId: string): Promise<{ helpfulCount: number }> {
    return this.request<{ helpfulCount: number }>({
      method: 'POST',
      path: `/reviews/${reviewId}/helpful`,
      skipCache: true,
    })
  }

  // ---- User endpoints ----

  async getUserProfile(): Promise<UserProfile> {
    return this.request<UserProfile>({
      method: 'GET',
      path: '/user/profile',
    })
  }

  async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    this.invalidateCache('/user/profile')
    return this.request<UserProfile>({
      method: 'PATCH',
      path: '/user/profile',
      body: updates,
      skipCache: true,
    })
  }

  async getUserFavorites(): Promise<PaginatedResponse<CampgroundSummary>> {
    return this.request<PaginatedResponse<CampgroundSummary>>({
      method: 'GET',
      path: '/user/favorites',
    })
  }

  async toggleFavorite(campgroundId: string): Promise<{ favorited: boolean }> {
    this.invalidateCache('/user/favorites')
    return this.request<{ favorited: boolean }>({
      method: 'POST',
      path: `/user/favorites/${campgroundId}`,
      skipCache: true,
    })
  }

  // ---- Search endpoints ----

  async searchCampgrounds(query: string, filters?: {
    bounds?: { north: number; south: number; east: number; west: number }
    radius?: { lat: number; lng: number; miles: number }
    dates?: { checkIn: string; checkOut: string }
    guests?: number
    priceRange?: { min: number; max: number }
    types?: string[]
    amenities?: string[]
    rating?: number
  }): Promise<SearchResponse> {
    return this.request<SearchResponse>({
      method: 'POST',
      path: '/search',
      body: { query, filters },
      cacheTtl: 120000,
    })
  }

  async getAutocompleteSuggestions(query: string): Promise<AutocompleteSuggestion[]> {
    if (query.length < 2) return []
    return this.request<AutocompleteSuggestion[]>({
      method: 'GET',
      path: '/search/autocomplete',
      params: { q: query },
      cacheTtl: 600000, // 10 min for autocomplete
    })
  }

  // ---- Metrics & diagnostics ----

  getMetrics(): {
    totalRequests: number
    cacheHitRate: number
    avgResponseTime: number
    errorRate: number
    rateLimitState: RateLimitState
    cacheSize: number
  } {
    const total = this.metrics.length
    const cacheHits = this.metrics.filter((m) => m.fromCache).length
    const errors = this.metrics.filter((m) => m.status >= 400).length
    const avgTime = total > 0 ? this.metrics.reduce((s, m) => s + m.duration, 0) / total : 0

    return {
      totalRequests: total,
      cacheHitRate: total > 0 ? cacheHits / total : 0,
      avgResponseTime: Math.round(avgTime),
      errorRate: total > 0 ? errors / total : 0,
      rateLimitState: { ...this.rateLimit },
      cacheSize: this.cache.size,
    }
  }

  clearCache(): void {
    this.cache.clear()
  }

  // ---- Core request engine ----

  private async request<T>(config: RequestConfig): Promise<T> {
    // Run request interceptors
    let finalConfig = { ...config }
    for (const interceptor of this.requestInterceptors) {
      finalConfig = await interceptor(finalConfig)
    }

    // Add auth header
    if (this.authToken) {
      finalConfig.headers = { ...finalConfig.headers, Authorization: `Bearer ${this.authToken}` }
    }

    const cacheKey = this.buildCacheKey(finalConfig)
    const requestId = `req-${++this.requestCount}-${Date.now()}`
    const startTime = Date.now()

    // Check cache for GET requests
    if (finalConfig.method === 'GET' && !finalConfig.skipCache) {
      const cached = this.cache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        this.recordMetric({ requestId, path: finalConfig.path, method: finalConfig.method, startTime, endTime: Date.now(), duration: 0, fromCache: true, retryCount: 0, status: 200, bytesReceived: 0 })
        let result = cached.data as T
        for (const interceptor of this.responseInterceptors) {
          result = (await interceptor(result, finalConfig)) as T
        }
        return result
      }
    }

    // Deduplicate identical in-flight GET requests
    if (finalConfig.method === 'GET') {
      const pending = this.pendingRequests.get(cacheKey)
      if (pending) return pending as Promise<T>
    }

    // Check rate limit
    this.checkRateLimit()

    const executeRequest = async (retryCount: number): Promise<T> => {
      try {
        // Simulate network request with realistic latency
        const latency = 100 + Math.random() * 400
        await this.delay(Math.min(latency, finalConfig.timeout ?? this.defaultTimeout))

        // Check abort signal
        if (finalConfig.signal?.aborted) {
          throw this.createError('REQUEST_ABORTED', 'Request was aborted', 499, false)
        }

        // Simulate occasional failures for retry testing
        if (Math.random() < 0.02 && retryCount < (finalConfig.retries ?? this.defaultRetries)) {
          throw this.createError('SERVER_ERROR', 'Internal server error', 500, true)
        }

        // Generate mock response
        const response = this.generateMockResponse<T>(finalConfig)

        // Cache GET responses
        if (finalConfig.method === 'GET' && !finalConfig.skipCache) {
          const ttl = finalConfig.cacheTtl ?? this.defaultCacheTtl
          this.cache.set(cacheKey, {
            data: response,
            expiresAt: Date.now() + ttl,
            etag: `W/"${Date.now().toString(36)}"`,
          })
        }

        // Update rate limit
        this.rateLimit.remaining = Math.max(0, this.rateLimit.remaining - 1)

        const endTime = Date.now()
        this.recordMetric({ requestId, path: finalConfig.path, method: finalConfig.method, startTime, endTime, duration: endTime - startTime, fromCache: false, retryCount, status: 200, bytesReceived: JSON.stringify(response).length })

        // Run response interceptors
        let result = response
        for (const interceptor of this.responseInterceptors) {
          result = (await interceptor(result, finalConfig)) as T
        }

        return result
      } catch (error) {
        const apiError = error as APIError
        if (apiError.retryable && retryCount < (finalConfig.retries ?? this.defaultRetries)) {
          const backoffMs = Math.min(1000 * Math.pow(2, retryCount) + Math.random() * 1000, 30000)
          await this.delay(backoffMs)
          return executeRequest(retryCount + 1)
        }

        for (const interceptor of this.errorInterceptors) {
          interceptor(apiError, finalConfig)
        }

        this.recordMetric({ requestId, path: finalConfig.path, method: finalConfig.method, startTime, endTime: Date.now(), duration: Date.now() - startTime, fromCache: false, retryCount, status: apiError.status ?? 500, bytesReceived: 0 })

        throw error
      }
    }

    const promise = executeRequest(0).finally(() => {
      this.pendingRequests.delete(cacheKey)
    })

    if (finalConfig.method === 'GET') {
      this.pendingRequests.set(cacheKey, promise)
    }

    return promise
  }

  private buildCacheKey(config: RequestConfig): string {
    const params = config.params ? JSON.stringify(config.params) : ''
    const body = config.body ? JSON.stringify(config.body) : ''
    return `${config.method}:${config.path}:${params}:${body}`
  }

  private checkRateLimit(): void {
    if (Date.now() > this.rateLimit.resetAt) {
      this.rateLimit.remaining = this.rateLimit.limit
      this.rateLimit.resetAt = Date.now() + this.rateLimit.windowMs
    }
    if (this.rateLimit.remaining <= 0) {
      throw this.createError('RATE_LIMITED', `Rate limit exceeded. Resets at ${new Date(this.rateLimit.resetAt).toISOString()}`, 429, true)
    }
  }

  private invalidateCache(pathPrefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pathPrefix)) this.cache.delete(key)
    }
  }

  private createError(code: string, message: string, status: number, retryable: boolean): APIError {
    return { code, message, status, retryable, timestamp: new Date().toISOString() }
  }

  private recordMetric(metric: RequestMetrics): void {
    this.metrics.push(metric)
    if (this.metrics.length > 1000) this.metrics = this.metrics.slice(-500)
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private generateMockResponse<T>(config: RequestConfig): T {
    // Returns empty mock data — in production this would be a real fetch
    if (config.path.includes('/autocomplete')) return [] as unknown as T
    if (config.path.includes('/availability')) {
      return { available: true, sites: [], priceRange: { min: 25, max: 200 } } as unknown as T
    }
    if (config.path.includes('/weather')) {
      return { current: { tempF: 72, condition: 'sunny' }, forecast: [] } as unknown as T
    }
    if (config.method === 'POST' || config.method === 'PATCH') {
      return { success: true, id: `mock-${Date.now()}`, ...((config.body as object) ?? {}) } as unknown as T
    }
    return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0, hasNext: false, hasPrev: false } as unknown as T
  }
}

// ---- API response types ----

interface CampgroundSummary {
  id: string
  name: string
  location: string
  state: string
  lat: number
  lng: number
  type: string
  rating: number
  reviewCount: number
  lowestPrice: number
  thumbnailUrl: string
  amenityHighlights: string[]
  available: boolean
}

interface CampgroundDetail extends CampgroundSummary {
  description: string
  longDescription: string
  photos: PhotoEntry[]
  amenities: { name: string; category: string; icon: string }[]
  rules: { title: string; description: string }[]
  operatingHours: { checkIn: string; checkOut: string; office: string }
  contact: { phone: string; email: string; website: string }
  nearbyAttractions: { name: string; distance: number; type: string }[]
  seasonalPricing: { season: string; basePrice: number }[]
}

interface AvailabilityResponse {
  available: boolean
  sites: { id: string; name: string; type: string; price: number; available: boolean }[]
  priceRange: { min: number; max: number }
}

interface ReviewSummary {
  id: string
  author: string
  rating: number
  title: string
  text: string
  date: string
  helpfulCount: number
  photos: string[]
}

interface PhotoEntry {
  id: string
  url: string
  thumbnailUrl: string
  caption: string
  category: string
  uploadedBy: string
  uploadedAt: string
}

interface WeatherForecast {
  current: { tempF: number; condition: string; humidity: number; windMph: number }
  forecast: { day: string; highF: number; lowF: number; condition: string; precipChance: number }[]
}

interface CreateBookingRequest {
  campgroundId: string
  siteId: string
  checkIn: string
  checkOut: string
  guests: number
  vehicles: { type: string; length?: number }[]
  pets: { species: string; weight: number }[]
  addOns: { id: string; quantity: number }[]
  specialRequests: string
  paymentMethod: string
  promoCode?: string
}

interface BookingResponse {
  id: string
  confirmationCode: string
  status: string
  campgroundName: string
  siteName: string
  checkIn: string
  checkOut: string
  guests: number
  total: number
  createdAt: string
}

interface CreateReviewRequest {
  campgroundId: string
  siteId: string
  bookingId: string
  rating: number
  title: string
  text: string
  ratings: { cleanliness: number; location: number; amenities: number; value: number }
}

interface SearchResponse {
  results: (CampgroundSummary & { matchScore: number; distance?: number })[]
  total: number
  facets: { type: Record<string, number>; amenity: Record<string, number>; priceRange: { min: number; max: number } }
  suggestions: string[]
}

interface AutocompleteSuggestion {
  text: string
  type: 'campground' | 'location' | 'activity'
  id?: string
}

interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl: string
  memberSince: string
  totalBookings: number
  loyaltyPoints: number
  preferences: { siteTypes: string[]; amenities: string[]; notifications: boolean }
}
