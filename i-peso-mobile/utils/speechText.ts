// Text helpers for ACE's voice features (Listen / text-to-speech).

export type SpokenLanguage = 'en' | 'fil' | 'pag' | 'mixed'

// Common English function words (mirrors the backend's ChatLanguage::ENGLISH_MARKERS).
const ENGLISH = new Set([
  'the', 'is', 'are', 'was', 'what', 'how', 'where', 'when', 'why', 'can', 'could', 'do', 'does',
  'did', 'i', 'my', 'you', 'your', 'for', 'to', 'of', 'and', 'with', 'there', 'any', 'please',
  'need', 'want', 'have', 'has', 'this', 'that', 'will', 'it', 'be', 'an', 'in', 'on', 'or',
])

// Tagalog function words that are not everyday Pangasinan words (mirrors FILIPINO_MARKERS).
const FILIPINO = new Set([
  'ang', 'ng', 'mga', 'po', 'ba', 'ako', 'ikaw', 'kayo', 'ninyo', 'paano', 'saan', 'ano',
  'kailan', 'bakit', 'meron', 'ito', 'iyan', 'yung', 'lang', 'naman', 'pwede', 'puwede',
  'kailangan', 'gusto', 'opo', 'hindi', 'nasaan', 'magkano', 'akin', 'iyong', 'natin', 'tayo',
])

// Pangasinan words that Tagalog does not use. Deliberately short and conservative: it only
// chooses which TTS voice to use (no device ships a Pangasinan voice, so a hit means "tell the
// user, offer the Filipino voice"). It never changes what ACE says.
const PANGASINAN = new Set([
  'ed', 'tan', 'sikato', 'siak', 'sikak', 'sikayo', 'sikami', 'sikatayo', 'antoy', 'iner',
  'diad', 'ditan', 'agto', 'anggapo', 'ompan', 'balet', 'labay', 'nayarin', 'saragto', 'onia',
  'aliwa', 'agew', 'maong', 'manpapasalamat', 'kaslak', 'kanian', 'nengneng', 'ingen', 'saray',
  'ilalo',
])

/** Rough language of a piece of text — for picking a speech voice only. */
export function detectSpokenLanguage(text: string): SpokenLanguage {
  const words = text.toLowerCase().match(/[\p{L}']+/gu) ?? []
  let en = 0
  let fil = 0
  let pag = 0
  for (const word of words) {
    if (PANGASINAN.has(word)) pag += 1
    if (FILIPINO.has(word)) fil += 1
    if (ENGLISH.has(word)) en += 1
  }
  if (pag >= 2 && pag >= fil) return 'pag'
  // Same rule as the backend's ChatLanguage::guessed(): any Tagalog alongside English is Taglish,
  // which the Filipino voice reads far better than an English voice would.
  if (en >= 1 && fil >= 1) return 'mixed'
  if (en >= 2) return 'en'
  return 'fil'
}

/**
 * The words worth saying out loud: drops links, emails, emoji and markdown symbols that a
 * speech engine would read literally ("asterisk", "h t t p s colon…"), and trims to the
 * engine's input limit.
 */
export function textForSpeech(text: string, maxLength = 4000): string {
  const cleaned = text
    .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, '$1') // [label](url) → label
    .replace(/https?:\/\/\S+/g, ' ') // bare URLs
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, ' ') // emails
    .replace(/\p{Extended_Pictographic}/gu, ' ') // emoji
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // markdown headings
    .replace(/^\s*(?:[-*•]|>)\s+/gm, '') // bullets / quotes
    .replace(/[*_`~]+/g, '') // emphasis / code markers
    .replace(/\s*\n+\s*/g, '. ') // line breaks → sentence pauses
    .replace(/\.(\s*\.)+/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1).trimEnd()}…` : cleaned
}
