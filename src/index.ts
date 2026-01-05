import { inject, type App, type InjectionKey } from 'vue'
import type { AxiosInstance } from 'axios'
import type { Router } from 'vue-router'
import { createAuthCore } from './auth'
import { setupInterceptors } from './interceptors'
import { setupGuards } from './guards'
import type { AuthOptions, AuthInstance, AuthPlugin, User } from './types'

/** Chave do provide/inject para o auth */
export const AUTH_INJECTION_KEY: InjectionKey<AuthInstance> = Symbol('vue-auth')

/**
 * Cria o plugin de autenticação para Vue 3
 *
 * @param options - Opções de configuração do plugin
 * @returns Plugin Vue para ser usado com app.use()
 *
 * @example
 * ```ts
 * // main.ts
 * import { createApp } from 'vue'
 * import { createAuth } from 'novadata-vue-auth'
 * import axios from 'axios'
 * import router from './router'
 *
 * const app = createApp(App)
 *
 * const auth = createAuth({
 *   http: axios,
 *   router,
 *   endpoints: {
 *     login: '/api/auth/login',
 *     refresh: '/api/auth/refresh',
 *     user: '/api/auth/me'
 *   },
 *   onSessionExpired: () => {
 *     console.log('Sessão expirou!')
 *   },
 *   onLogin: (user) => {
 *     console.log('Usuário logado:', user)
 *   }
 * })
 *
 * app.use(auth)
 * app.use(router)
 * app.mount('#app')
 * ```
 */
export function createAuth<T = User>(options: AuthOptions<T>): AuthPlugin {
  const {
    http,
    router,
    // Callbacks
    onSessionExpired,
    onError,
    onLogin,
    onLogout,
    onFetchUser,
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

  let authInstance: AuthInstance<T> | null = null

  return {
    install(app: App): void {
      if (!http) {
        throw new Error('[vue-auth] HTTP client (axios instance) is required')
      }
      if (!router) {
        throw new Error('[vue-auth] Vue Router instance is required')
      }

      // 1. Criar lógica de auth
      authInstance = createAuthCore<T>(http, router, {
        endpoints,
        storage,
        tokenKey,
        refreshTokenKey,
        maxRetries,
        onError,
        onLogin,
        onLogout,
        onFetchUser,
      })

      // 2. Adicionar referências internas para os interceptors
      authInstance._http = http
      authInstance._router = router

      // 3. Configurar interceptors
      setupInterceptors(authInstance as unknown as AuthInstance, http, {
        onSessionExpired:
          onSessionExpired ||
          (() => {
            authInstance!.clearAuth()
            router.replace({
              name: loginRouteName || 'login',
              query: { expired: 'true' },
            })
          }),
      })

      // 4. Configurar guards
      setupGuards(router, authInstance as unknown as AuthInstance, {
        loginRouteName,
        resetPasswordRouteName,
        publicMetaKey,
        authMetaKey,
        defaultRedirect,
      })

      // 5. Inicializar
      authInstance.initialize()

      // 6. Disponibilizar via provide/inject
      app.provide(AUTH_INJECTION_KEY, authInstance as unknown as AuthInstance)

      // 7. Disponibilizar globalmente via $auth
      app.config.globalProperties.$auth = authInstance
    },
  }
}

/**
 * Composable para acessar o auth em componentes Vue
 *
 * @returns Instância do Auth com state reativo e métodos
 * @throws Error se o plugin não foi instalado
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useAuth } from 'novadata-vue-auth'
 *
 * const auth = useAuth()
 *
 * // State reativo
 * const { user, isAuthenticated, loading } = auth
 *
 * // Métodos
 * async function handleLogin() {
 *   const result = await auth.login({
 *     email: 'user@example.com',
 *     password: 'password'
 *   })
 *
 *   if (result.success) {
 *     console.log('Login bem sucedido!', result.user)
 *   } else {
 *     console.error('Erro no login:', result.message)
 *   }
 * }
 *
 * async function handleLogout() {
 *   await auth.logout()
 * }
 * </script>
 *
 * <template>
 *   <div v-if="loading">Carregando...</div>
 *   <div v-else-if="isAuthenticated">
 *     Olá, {{ user?.name }}!
 *     <button @click="handleLogout">Sair</button>
 *   </div>
 *   <div v-else>
 *     <button @click="handleLogin">Entrar</button>
 *   </div>
 * </template>
 * ```
 */
export function useAuth<T = User>(): AuthInstance<T> {
  const auth = inject<AuthInstance<T>>(AUTH_INJECTION_KEY)
  if (!auth) {
    throw new Error(
      '[vue-auth] Auth plugin not installed. Make sure to call app.use(createAuth(...))'
    )
  }
  return auth
}

// Re-export utils
export { waitForRef, sleep } from './utils'

// Re-export types
export type {
  AuthStorage,
  AuthEndpoints,
  AuthOptions,
  AuthInstance,
  AuthPlugin,
  LoginCredentials,
  LoginResult,
  User,
  GuardOptions,
  InterceptorOptions,
} from './types'
