// Shared query keys for the employer Reviews page and the profile's reputation card.
export const REVIEWS_KEY = ['employer', 'reviews']
export const HIRES_KEY = ['employer', 'hires']

// Reviews are one list now (no hiring/working-here split).
export const reviewsQueryKey = (filter = 'all', page = 1) => [...REVIEWS_KEY, filter, page]
