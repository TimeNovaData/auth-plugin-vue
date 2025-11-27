import { AxiosInstance } from 'axios'
import { Router } from 'vue-router'
import { ComputedRef, Ref } from 'vue'

export interface AuthStorage {
  getToken: () => string | null
  setToken: (token: string) => void
  removeToken: () => void
  getRefreshToken: () => string | null
  setRefreshToken: (token: string) => void
  removeRefreshToken: () => void
}

export interface AuthEndpoints {
  login?: string
  refresh?: string
  user?: string
}

export interface AuthOptions {
  http: AxiosInstance
  router: Router
  // Callbacks
  onSessionExpired?: () => void
  onError?: (message: string, error: Error) => void
  onLogin?: (user: any) => void
  onLogout?: () => void
  // Config
  endpoints?: AuthEndpoints
  storage?: AuthStorage
  tokenKey?: string
  refreshTokenKey?: string
  maxRetries?: number
  // Guards config
  loginRouteName?: string
  resetPasswordRouteName?: string
  publicMetaKey?: string
  authMetaKey?: string
  defaultRedirect?: string
}

export interface LoginResult {
  success: boolean
  user?: any
  error?: Error
  message?: string
}

export interface AuthInstance {
  // State
  token: ComputedRef<string | null>
  refreshToken: ComputedRef<string | null>
  user: ComputedRef<any>
  isAuthenticated: ComputedRef<boolean>
  loading: ComputedRef<boolean>
  // Methods
  login: (credentials: Record<string, any>) => Promise<LoginResult>
  logout: () => Promise<void>
  fetchUser: () => Promise<any>
  refreshAccessToken: () => Promise<string>
  clearAuth: () => void
  initialize: () => Promise<void>
  setUser: (userData: any) => void
  setTokens: (token: string, refreshToken: string) => void
}

export function createAuth(options: AuthOptions): {
  install: (app: any) => void
}

export function useAuth(): AuthInstance

export function waitForRef<T>(
  ref: Ref<T>,
  predicate: (value: T) => boolean,
  timeout?: number
): Promise<T>

export function sleep(ms: number): Promise<void>

export const AUTH_INJECTION_KEY: Symbol
