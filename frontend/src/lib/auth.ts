import Cookies from 'js-cookie'
import { TOKEN_KEY } from './api'

const COOKIE_OPTIONS = {
  expires: 7,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return
  Cookies.set(TOKEN_KEY, token, COOKIE_OPTIONS)
}

export function getToken(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return Cookies.get(TOKEN_KEY)
}

export function removeToken() {
  if (typeof window === 'undefined') return
  Cookies.remove(TOKEN_KEY, { path: '/' })
}

export function isAuthenticated(): boolean {
  return Boolean(getToken())
}
