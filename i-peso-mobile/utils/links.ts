// One place for website URLs and for opening a link that came from PESO staff (an announcement's
// call-to-action, an FAQ's link). Staff enter either an i-PESO *web* path ("/seeker/job-fairs")
// or a full https:// link — this decides where each one goes, and never opens anything else.
import { Linking } from 'react-native'
import type { Router } from 'expo-router'

export const IPESO_WEB_URL = 'https://ipeso.website'

/** Policy pages are versioned on the website, so the app opens them there rather than copying the text. */
export const PRIVACY_POLICY_URL = `${IPESO_WEB_URL}/privacy-policy`
export const TERMS_OF_SERVICE_URL = `${IPESO_WEB_URL}/terms-of-service`
export const REVIEW_GUIDELINES_URL = `${IPESO_WEB_URL}/review-guidelines`

/** Website paths the app has its own screen for. */
const APP_SCREENS: Record<string, string> = {
  '/seeker/job-fairs': '/(seeker)/job-fairs',
  '/seeker/government-programs': '/(seeker)/government-programs',
  '/seeker/applications': '/(seeker)/applications',
  '/seeker/job-map': '/(seeker)/job-map',
  '/seeker/profile': '/(seeker)/profile',
}

export const openInBrowser = (url: string) => { Linking.openURL(url).catch(() => undefined) }

/**
 * Opens a staff-entered link: a known web path → the matching app screen; any other "/…" path →
 * that page on ipeso.website; an https:// link → the browser. Anything else is ignored.
 * Returns true when it opened something (callers close their sheet then).
 */
export function openPortalLink(url: string | null | undefined, router: Router): boolean {
  if (!url) return false
  const value = url.trim()

  if (value.startsWith('/') && !value.startsWith('//')) {
    const path = value.split(/[?#]/)[0].replace(/\/+$/, '')
    const screen = APP_SCREENS[path]
    if (screen) {
      router.push(screen as never)
    } else {
      openInBrowser(`${IPESO_WEB_URL}${value}`)
    }
    return true
  }

  if (/^https:\/\//i.test(value)) {
    openInBrowser(value)
    return true
  }

  return false
}
