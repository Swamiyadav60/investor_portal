export const fmt = (n: number): string =>
  '₹' + Math.round(n).toLocaleString('en-IN')

export const fmtK = (n: number): string =>
  n >= 1000 ? '₹' + (n / 1000).toFixed(1) + 'k' : fmt(n)

export const fmtPct = (n: number): string => n.toFixed(1) + '%'

export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return s + 's ago'
  if (s < 3600) return Math.floor(s / 60) + 'm ago'
  return Math.floor(s / 3600) + 'h ago'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function profitClass(margin: number): 'profit-good' | 'profit-warn' | 'profit-bad' {
  if (margin >= 30) return 'profit-good'
  if (margin >= 15) return 'profit-warn'
  return 'profit-bad'
}

export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h]
      const str = val === null || val === undefined ? '' : String(val)
      return str.includes(',') ? `"${str}"` : str
    }).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function maskPan(pan: string | null | undefined): string {
  if (!pan) return '-'
  const cleaned = pan.trim()
  if (cleaned.length < 4) return cleaned
  return '•'.repeat(Math.max(0, cleaned.length - 4)) + cleaned.slice(-4)
}

export function maskAadhaar(aadhaar: string | null | undefined): string {
  if (!aadhaar) return '-'
  const cleaned = aadhaar.trim().replace(/\s+/g, '')
  if (cleaned.length < 4) return cleaned
  return '•••• •••• ' + cleaned.slice(-4)
}

export function maskBankAccount(account: string | null | undefined): string {
  if (!account) return '-'
  const cleaned = account.trim()
  if (cleaned.length < 4) return cleaned
  return '•'.repeat(Math.max(4, cleaned.length - 4)) + cleaned.slice(-4)
}
