import { inject } from 'vue'
import { createAuthCore } from './auth'
import { setupInterceptors } from './interceptors'
import { setupGuards } from './guards'

// Chave do provide/inject
const AUTH_INJECTION_KEY = Symbol('vue-auth')

/**
 * Cria o plugin de autenticação
 * @param {Object} options - Configuration options
 * @returns {Object} Vue plugin
 */
export function createAuth(options = {}) {
  const {
    http,
    router,
    // Callbacks
    onSessionExpired,
    onError,
    onLogin,
    onLogout,
    // Config
    endpoints,
    storage,
    tokenKey,
    refreshTokenKey,
    maxRetries,
    // Guards config
    loginRouteName,
    resetPasswordRouteName,
    publicMetaKey,
    authMetaKey,
    defaultRedirect,
  } = options

  let authInstance = null

  return {
    install(app) {
      if (!http) {
        throw new Error('[vue-auth] HTTP client (axios instance) is required')
      }
      if (!router) {
        throw new Error('[vue-auth] Vue Router instance is required')
      }

      // 1. Criar lógica de auth
      authInstance = createAuthCore(http, {
        endpoints,
        storage,
        tokenKey,
        refreshTokenKey,
        maxRetries,
        onError,
        onLogin,
        onLogout,
      })

      // 2. Adicionar referências internas para os interceptors
      authInstance._http = http
      authInstance._router = router

      // 3. Configurar interceptors
      setupInterceptors(authInstance, http, {
        onSessionExpired:
          onSessionExpired ||
          (() => {
            authInstance.clearAuth()
            router.replace({ name: loginRouteName || 'login', query: { expired: 'true' } })
          }),
      })

      // 4. Configurar guards
      setupGuards(router, authInstance, {
        loginRouteName,
        resetPasswordRouteName,
        publicMetaKey,
        authMetaKey,
        defaultRedirect,
      })

      // 5. Inicializar
      authInstance.initialize()

      // 6. Disponibilizar via provide/inject
      app.provide(AUTH_INJECTION_KEY, authInstance)

      // 7. Disponibilizar globalmente via $auth
      app.config.globalProperties.$auth = authInstance
    },
  }
}

/**
 * Composable para acessar o auth
 * @returns {Object} Auth instance
 */
export function useAuth() {
  const auth = inject(AUTH_INJECTION_KEY)
  if (!auth) {
    throw new Error('[vue-auth] Auth plugin not installed. Make sure to call app.use(createAuth(...))')
  }
  return auth
}

// Re-export utils
export { waitForRef, sleep } from './utils'

// Export types for TypeScript
export { AUTH_INJECTION_KEY }
