const rawUrl = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '')
const isDefault = !rawUrl || rawUrl === 'http://localhost:8000'
export const BACKEND_URL = isDefault ? '' : rawUrl

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
