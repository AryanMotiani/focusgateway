import { formatMinutes, startOfDay, addDays } from '@focusgateway/core'

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const time = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
export const date = (ms) => new Date(ms).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
export const dateTime = (ms) => `${date(ms)}, ${time(ms)}`
export const hhmm = formatMinutes

export function daysLabel(days) {
  const d = [...days].sort()
  if (d.length === 7) return 'Every day'
  if (d.join() === '1,2,3,4,5') return 'Weekdays'
  if (d.join() === '6,7') return 'Weekends'
  return d.map((x) => DAY_NAMES[x - 1]).join(', ')
}

export function countdown(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const p = (n) => String(n).padStart(2, '0')
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`
}

export function humanDuration(ms) {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function deadlineLabel(deadline, now) {
  const today = startOfDay(now)
  const d = startOfDay(deadline)
  const t = time(deadline)
  if (deadline < now) return { text: `Overdue · ${date(deadline)} ${t}`, tone: 'bad' }
  if (d === today) return { text: `Today ${t}`, tone: deadline - now < 3 * 3600_000 ? 'caution' : 'muted' }
  if (d === addDays(today, 1)) return { text: `Tomorrow ${t}`, tone: 'muted' }
  return { text: `${date(deadline)} ${t}`, tone: 'muted' }
}

/** <input type="datetime-local"> value <-> epoch ms (local time) */
export function toLocalInput(ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
export function fromLocalInput(v) {
  if (!v) return null
  const t = new Date(v).getTime()
  return Number.isFinite(t) ? t : null
}

export function endOfToday(now) {
  const d = new Date(now)
  d.setHours(23, 59, 0, 0)
  return d.getTime()
}

export function greeting(now) {
  const h = new Date(now).getHours()
  if (h < 5) return 'Up late'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function download(filename, text, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
