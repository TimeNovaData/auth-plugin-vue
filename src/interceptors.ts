import type {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios'
import type {
  AuthInstance,
  AuthAxiosRequestConfig,
  InterceptorOptions,
} from './types'

/**
 * Configura os interceptors do Axios para autenticação
 *
 * - Request: Adiciona automaticamente o token no header Authorization
 * - Response: Trata erros 401 e tenta refresh automático do token
 *
 * @param auth - Auth instance
 * @param http - Axios instance
 * @param options - Configuration options
 *
 * @example
 * ```ts
 * setupInterceptors(authInstance, axiosInstance, {
 *   onSessionExpired: () => {
 *     router.push('/login?expired=true')
 *   }
 * })
 * ```
 */
export function setupInterceptors(
  auth: AuthInstance,
  http: AxiosInstance,
  options: InterceptorOptions = {}
): void {
  const { onSessionExpired } = options

  // Request interceptor - Adiciona token no header
  http.interceptors.request.use(
    (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
      const token = auth.token.value
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error: AxiosError) => Promise.reject(error)
  )

  // Response interceptor - Lida com 401 e refresh token
  http.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as AuthAxiosRequestConfig | undefined

      // Ignorar se não for erro 401
      if (error.response?.status !== 401) {
        return Promise.reject(error)
      }

      // Ignorar requisições marcadas para não fazer refresh
      if (originalRequest?._skipAuthRefresh) {
        return Promise.reject(error)
      }

      // Evitar loop: se já tentou refresh, não tenta novamente
      if (originalRequest?._retry) {
        onSessionExpired?.()
        return Promise.reject(error)
      }

      // Só tenta refresh se tiver refresh token
      if (!auth.refreshToken.value) {
        return Promise.reject(error)
      }

      if (originalRequest) {
        originalRequest._retry = true
      }

      try {
        const newToken = await auth.refreshAccessToken()
        if (originalRequest) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return http(originalRequest)
        }
        return Promise.reject(error)
      } catch (refreshError) {
        onSessionExpired?.()
        return Promise.reject(refreshError)
      }
    }
  )
}
