export const todayLocalDate = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 10)
}

export const nowLocalTime = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(11, 16)
}

export const getMatchTone = (score) => {
  const value = Number(score) || 0
  if (value >= 90) return 'bg-emerald-100 text-emerald-800 border-emerald-300'
  if (value >= 75) return 'bg-blue-100 text-blue-800 border-blue-300'
  if (value >= 50) return 'bg-amber-100 text-amber-800 border-amber-300'
  return 'bg-slate-100 text-slate-600 border-slate-300'
}

export const getInitials = (name) => {
  if (!name) return '??'
  return name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

export const formatDate = (value) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const formatDateTime = (value) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export const timeAgo = (value) => {
  if (!value) return 'N/A'
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (Number.isNaN(seconds)) return 'N/A'
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export const formatCurrency = (value) => new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
}).format(Number(value) || 0)
