export function lkr(value) {
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
  return `Rs ${formatted}`
}

export function prettyDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatQty(value, unit = 'cookies') {
  if (value === 1) return unit === 'cookies' ? '1 cookie' : `1 ${unit}`
  return `${value} ${unit}`
}

export function countLabel(count, singular, plural = `${singular}s`) {
  return `${count} ${Number(count) === 1 ? singular : plural}`
}

export function parseAmount(text) {
  const cleaned = String(text ?? '').replace(/,/g, '').trim()
  if (!cleaned) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

export function plainAmount(value) {
  if (!Number.isFinite(value)) return ''
  return Math.round(value) === value ? String(Math.round(value)) : String(value)
}

export function toInputDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

export function fromInputDate(value) {
  const [year, month, day] = String(value).split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0)
}

export function dateBounds() {
  return { min: '2020-01-01', max: toInputDate(new Date(Date.now() + 14 * 86400000)) }
}

export function colorFromArgb(value) {
  const hex = (Number(value) >>> 0).toString(16).padStart(8, '0').slice(2)
  return `#${hex}`
}

export function newId() {
  return crypto.randomUUID()
}
