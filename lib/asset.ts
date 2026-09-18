export const BASE_PATH = '/wedding-lottery'

export function asset(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`
}
