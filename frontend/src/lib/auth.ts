import Cookies from 'js-cookie'
import { TOKEN_KEY } from './api'

const COOKIE_OPTIONS = {
  expires: 7,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
}

export function setToken(token: string) {
  Cookies.set(TOKEN_KEY, token, COOKIE_OPTIONS)
}

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_KEY)
}

export function removeToken() {
  Cookies.remove(TOKEN_KEY, { path: '/' })
}

export function isAuthenticated(): boolean {
  return Boolean(getToken())
}
