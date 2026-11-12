// How alike two questions are (0–1). Mirrors ContentInsightService::similarity
// on the backend, so the duplicate warning in the FAQ editor agrees with the
// health check.

const STOPWORDS = new Set([
  'the', 'and', 'for', 'how', 'what', 'where', 'when', 'who', 'why', 'can', 'does', 'did', 'are', 'was', 'you', 'your',
  'with', 'this', 'that', 'there', 'have', 'has', 'not', 'any', 'from', 'about', 'into', 'will', 'would', 'should', 'please',
  'ang', 'ng', 'mga', 'po', 'ba', 'ko', 'ako', 'ikaw', 'kayo', 'paano', 'saan', 'kailan', 'ano', 'sino', 'bakit', 'yung', 'iyong',
  'para', 'kung', 'may', 'meron', 'wala', 'lang', 'naman', 'din', 'rin', 'nga', 'sa', 'na', 'at', 'ay', 'si', 'ni',
  'antoy', 'iner', 'kasin', 'piga', 'say', 'ed', 'tan', 'ya', 'iray',
])

export function keywords(text) {
  const words = String(text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word))
    .map((word) => word.replace(/(es|s)$/u, ''))
  return [...new Set(words)]
}

export function similarity(a, b) {
  const x = keywords(a)
  const y = keywords(b)
  if (!x.length || !y.length) return 0
  const ys = new Set(y)
  const shared = x.filter((word) => ys.has(word)).length
  return (2 * shared) / (x.length + y.length)
}

/** FAQs that look like the same question, most alike first. */
export function similarQuestions(question, faqs, { excludeId = null, threshold = 0.6, limit = 3 } = {}) {
  if (!question || question.trim().length < 8) return []
  return faqs
    .filter((faq) => faq.id !== excludeId)
    .map((faq) => ({ faq, score: similarity(question, faq.question) }))
    .filter((match) => match.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
