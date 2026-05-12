export interface Campsite {
  id: number
  name: string
  location: string
  state: string
  lat: number
  lng: number
  type: 'tent' | 'rv' | 'cabin' | 'glamping'
  rating: number
  reviewCount: number
  pricePerNight: number
  available: boolean
  amenities: string[]
  description: string
  imageUrl: string
  maxGuests: number
  petFriendly: boolean
  checkIn: string
  checkOut: string
}

export interface Filters {
  search: string
  type: string
  minRating: number
  maxPrice: number
  petFriendly: boolean
  sortBy: 'rating' | 'price-low' | 'price-high' | 'name'
}

export interface Review {
  id: number
  campsiteId: number
  author: string
  authorWebsite?: string
  rating: number
  date: string
  text: string
}
