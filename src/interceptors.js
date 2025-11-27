/**
 * Configura os interceptors do Axios para autenticação
 * @param {Object} auth - Auth instance
 * @param {Object} http - Axios instance
 * @param {Object} options - Configuration options
 */
export function setupInterceptors(auth, http, options = {}) {
  const { onSessionExpired } = options

  // Request interceptor - Adiciona token no header
  http.interceptors.request.use(
    (config) => {
      const token = auth.token.value
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor - Lida com 401 e refresh token
  http.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config

      // Ignorar se não for erro 401
      if (error.response?.status !== 401) {
        return Promise.reject(error)
      }

      // Ignorar requisições marcadas para não fazer refresh
      if (originalRequest._skipAuthRefresh) {
        return Promise.reject(error)
      }

      // Evitar loop: se já tentou refresh, não tenta novamente
      if (originalRequest._retry) {
        onSessionExpired?.()
        return Promise.reject(error)
      }

      // Só tenta refresh se tiver refresh token
      if (!auth.refreshToken.value) {
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        const newToken = await auth.refreshAccessToken()
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return http(originalRequest)
      } catch (refreshError) {
        onSessionExpired?.()
        return Promise.reject(refreshError)
      }
    }
  )
}
