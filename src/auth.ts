import { ref, computed, type ComputedRef, type Ref } from 'vue'
import type { AxiosInstance, AxiosError } from 'axios'
import type { Router } from 'vue-router'
import { sleep } from './utils'
import type {
  AuthStorage,
  AuthEndpoints,
  AuthCoreOptions,
  AuthInstance,
  LoginCredentials,
  LoginResult,
  LoginResponse,
  RefreshResponse,
  User,
} from './types'

/**
 * Storage padrão usando localStorage
 */
const defaultStorage: AuthStorage = {
  getToken: () => localStorage.getItem('token'),
  setToken: (token: string) => localStorage.setItem('token', token),
  removeToken: () => localStorage.removeItem('token'),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  setRefreshToken: (token: string) =>
    localStorage.setItem('refresh_token', token),
  removeRefreshToken: () => localStorage.removeItem('refresh_token'),
}

/**
 * Cria a lógica de autenticação
 * @param http - Axios instance
 * @param router - Vue Router instance
 * @param options - Configuration options
 * @returns AuthInstance com state reativo e métodos
 *
 * @example
 * ```ts
 * const auth = createAuthCore(axiosInstance, router, {
 *   endpoints: {
 *     login: '/api/auth/login',
 *     refresh: '/api/auth/refresh',
 *     user: '/api/auth/me'
 *   },
 *   onLogin: (user) => console.log('Usuário logado:', user)
 * })
 * ```
 */
export function createAuthCore<T = User>(
  http: AxiosInstance,
  router: Router,
  options: AuthCoreOptions<T> = {}
): AuthInstance<T> {
  const {
    endpoints = {
      login: '/token/',
      refresh: '/token/refresh/',
      user: '/contexto-inicial/',
    },
    storage = defaultStorage,
    tokenKey = 'token',
    refreshTokenKey = 'refresh',
    maxRetries = 3,
    onError,
    onLogin,
    onLogout,
    onFetchUser,
    loginRouteName = 'login',
  } = options

  // State
  const token: Ref<string | null> = ref(storage.getToken?.() || null)
  const refreshToken: Ref<string | null> = ref(
    storage.getRefreshToken?.() || null
  )
  const user: Ref<T | null> = ref(null)
  const loading: Ref<boolean> = ref(true)
  const authenticated: Ref<boolean> = ref(false)

  // Computed
  const isAuthenticated: ComputedRef<boolean> = computed(
    () => authenticated.value
  )

  /**
   * Define os tokens de acesso e refresh
   */
  const setTokens = (
    newToken: string | null,
    newRefresh: string | null
  ): void => {
    token.value = newToken
    refreshToken.value = newRefresh

    if (newToken) {
      storage.setToken?.(newToken)
    } else {
      storage.removeToken?.()
    }

    if (newRefresh) {
      storage.setRefreshToken?.(newRefresh)
    } else {
      storage.removeRefreshToken?.()
    }
  }

  /**
   * Limpa todos os dados de autenticação
   */
  const clearAuth = (): void => {
    user.value = null
    token.value = null
    refreshToken.value = null
    authenticated.value = false
    storage.removeToken?.()
    storage.removeRefreshToken?.()
  }

  /**
   * Realiza o login com as credenciais fornecidas
   */
  const login = async (
    credentials: LoginCredentials
  ): Promise<LoginResult<T>> => {
    try {
      loading.value = true

      const { data } = await http.post<LoginResponse>(
        endpoints.login!,
        credentials,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )

      // Extrair tokens da resposta (suporta diferentes formatos)
      const accessToken = (data[tokenKey] ||
        data.access ||
        data.token) as string
      const refresh = (data[refreshTokenKey] ||
        data.refresh ||
        data.refresh_token) as string

      setTokens(accessToken, refresh)
      await fetchUser()

      onLogin?.(user.value as T)

      return { success: true, user: user.value as T }
    } catch (error) {
      const axiosError = error as AxiosError<{
        detail?: string
        message?: string
      }>
      const message =
        axiosError.response?.data?.detail ||
        axiosError.response?.data?.message ||
        'Erro ao realizar login'

      onError?.(message, error as Error)

      return { success: false, error: error as Error, message }
    } finally {
      loading.value = false
    }
  }

  /**
   * Realiza o logout e redireciona para a página de login
   */
  const logout = async (): Promise<void> => {
    try {
      authenticated.value = false
      await router.replace({ name: loginRouteName, query: { logout: 'true' } })
      clearAuth()
      onLogout?.()
    } catch (error) {
      console.log(error)
    }
  }

  /**
   * Busca os dados do usuário autenticado
   */
  const fetchUser = async (): Promise<T> => {
    try {
      loading.value = true
      const { data } = await http.get<T>(endpoints.user!)
      user.value = data
      authenticated.value = true
      onFetchUser?.(data)
      return data
    } catch (error) {
      clearAuth()
      throw error
    } finally {
      loading.value = false
    }
  }

  /**
   * Atualiza o token de acesso usando o refresh token
   */
  const refreshAccessToken = async (): Promise<string> => {
    if (!refreshToken.value) {
      clearAuth()
      throw new Error('No refresh token available')
    }

    let lastError: Error | null = null

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`🔄 Tentativa ${i + 1}/${maxRetries} de refresh token`)

        const { data } = await http.post<RefreshResponse>(
          endpoints.refresh!,
          { [refreshTokenKey]: refreshToken.value },
          { _skipAuthRefresh: true } as any
        )

        // Extrair novo token da resposta
        const newToken = (data[tokenKey] || data.access || data.token) as string

        setTokens(newToken, refreshToken.value)
        console.log(`✅ Token atualizado com sucesso`)
        return newToken
      } catch (error) {
        lastError = error as Error
        const axiosError = error as AxiosError
        console.error(
          `❌ Tentativa ${i + 1}/${maxRetries} falhou:`,
          axiosError.response?.status
        )

        if (i < maxRetries - 1) {
          const delay = 1000 * (i + 1)
          console.log(`⏳ Aguardando ${delay}ms...`)
          await sleep(delay)
        }
      }
    }

    console.error('❌ Todas as tentativas de refresh falharam')
    clearAuth()
    throw lastError
  }

  /**
   * Inicializa o sistema de autenticação
   */
  const initialize = async (): Promise<void> => {
    loading.value = true
    try {
      if (token.value) {
        console.log('🔑 Token encontrado, buscando usuário...')
        await fetchUser()
      } else {
        console.log('🚫 Sem token, usuário não autenticado')
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar:', error)
      clearAuth()
    } finally {
      loading.value = false
      console.log('✅ Inicialização do Auth completa')
    }
  }

  /**
   * Define os dados do usuário manualmente
   */
  const setUser = (userData: T): void => {
    user.value = userData
  }

  return {
    // State (computed para garantir reatividade)
    token: computed(() => token.value),
    refreshToken: computed(() => refreshToken.value),
    user: computed(() => user.value),
    isAuthenticated,
    loading: computed(() => loading.value),

    // Methods
    login,
    logout,
    fetchUser,
    refreshAccessToken,
    clearAuth,
    initialize,
    setUser,
    setTokens: (t: string, r: string) => setTokens(t, r),
  }
}
