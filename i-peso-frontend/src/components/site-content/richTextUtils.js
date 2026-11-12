// Fills {office.address}-style placeholders in staff-written text from Office info.
const TOKEN = /\{office\.(name|address|phone|email|facebook|hours)\}/g

export function fillOfficeTokens(text, office) {
  if (!text) return ''
  return text.replace(TOKEN, (_, key) => {
    const field = key === 'name' ? 'office_name' : key
    return office?.[field] || 'not on record'
  })
}
