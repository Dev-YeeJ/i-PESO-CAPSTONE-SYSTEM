// Shared query keys for the employer Reviews page and the profile's reputation card.
export const REVIEWS_KEY = ['employer', 'reviews']
export const HIRES_KEY = ['employer', 'hires']

export const reviewsQueryKey = (type, filter = 'all', page = 1) => [...REVIEWS_KEY, type, filter, page]
