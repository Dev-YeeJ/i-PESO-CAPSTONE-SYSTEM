import { useQuery } from '@tanstack/react-query'
import { publicSiteContentService } from '@/services/siteContentService'
import { LANDING_DEFAULTS, OFFICE_DEFAULTS, withDefaults } from './siteContentDefaults'

/**
 * Landing text, office details and featured FAQs for public pages.
 * Always returns usable values: the built-in defaults while loading or if
 * the API is down, so nothing on the page is ever blank or spinning.
 */
export function useSiteContent() {
  const query = useQuery({
    queryKey: ['site-content'],
    queryFn: publicSiteContentService.get,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  return {
    office: withDefaults(OFFICE_DEFAULTS, query.data?.office),
    landing: withDefaults(LANDING_DEFAULTS, query.data?.landing),
    featuredFaqs: query.data?.featured_faqs ?? [],
    isLoading: query.isLoading,
  }
}

/** Just the office details (footer, legal pages). */
export function useOfficeInfo() {
  return useSiteContent().office
}
