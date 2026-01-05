import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from 'axios'
import type {
  Router,
  RouteLocationNormalized,
  NavigationGuardNext,
} from 'vue-router'
import type { ComputedRef, Ref, App } from 'vue'

/**
 * Interface para customização do storage de tokens
 */
export interface AuthStorage {
  /** Obtém o token de acesso do storage */
  getToken: () => string | null
  /** Salva o token de acesso no storage */
  setToken: (token: string) => void
  /** Remove o token de acesso do storage */
  removeToken: () => void
  /** Obtém o refresh token do storage */
  getRefreshToken: () => string | null
  /** Salva o refresh token no storage */
  setRefreshToken: (token: string) => void
  /** Remove o refresh token do storage */
  removeRefreshToken: () => void
}

/**
 * Configuração dos endpoints de autenticação
 */
export interface AuthEndpoints {
  /** Endpoint para login (padrão: '/token/') */
  login?: string
  /** Endpoint para refresh token (padrão: '/token/refresh/') */
  refresh?: string
  /** Endpoint para obter dados do usuário (padrão: '/contexto-inicial/') */
  user?: string
}

/**
 * Credenciais de login genéricas
 */
export interface LoginCredentials {
  [key: string]: unknown
}

/**
 * Dados do usuário autenticado (genérico)
 */
export interface User {
  [key: string]: unknown
}

/**
 * Resultado da operação de login
 */
export interface LoginResult<T = User> {
  /** Indica se o login foi bem sucedido */
  success: boolean
  /** Dados do usuário em caso de sucesso */
  user?: T
  /** Erro em caso de falha */
  error?: Error
  /** Mensagem de erro em caso de falha */
  message?: string
}

/**
 * Opções de configuração do plugin de autenticação
 */
export interface AuthOptions<T = User> {
  /** Instância do Axios (obrigatório) */
  http: AxiosInstance
  /** Instância do Vue Router (obrigatório) */
  router: Router

  // Callbacks
  /** Callback executado quando a sessão expira */
  onSessionExpired?: () => void
  /** Callback executado quando ocorre um erro de autenticação */
  onError?: (message: string, error: Error) => void
  /** Callback executado após login bem sucedido */
  onLogin?: (user: T) => void
  /** Callback executado após logout */
  onLogout?: () => void

  /** Callback executado após buscar os dados do usuário */
  onFetchUser?: (user: T) => void
  // Config
  /** Configuração dos endpoints */
  endpoints?: AuthEndpoints
  /** Storage customizado para tokens */
  storage?: AuthStorage
  /** Nome da chave do token na resposta do login (padrão: 'token') */
  tokenKey?: string
  /** Nome da chave do refresh token na resposta (padrão: 'refresh') */
  refreshTokenKey?: string
  /** Número máximo de tentativas de refresh (padrão: 3) */
  maxRetries?: number

  // Guards config
  /** Nome da rota de login (padrão: 'login') */
  loginRouteName?: string
  /** Nome da rota de reset de senha (padrão: 'redefinir-senha') */
  resetPasswordRouteName?: string
  /** Nome da meta key para rotas públicas (padrão: 'public') */
  publicMetaKey?: string
  /** Nome da meta key para rotas autenticadas (padrão: 'auth') */
  authMetaKey?: string
  /** Rota padrão após login (padrão: '/') */
  defaultRedirect?: string
}

/**
 * Opções internas do core de autenticação
 */
export interface AuthCoreOptions<T = User> {
  endpoints?: AuthEndpoints
  storage?: AuthStorage
  tokenKey?: string
  refreshTokenKey?: string
  maxRetries?: number
  onError?: (message: string, error: Error) => void
  onLogin?: (user: T) => void
  onLogout?: () => void
  onFetchUser?: (user: T) => void
  loginRouteName?: string
}

/**
 * Opções para configuração dos interceptors
 */
export interface InterceptorOptions {
  /** Callback executado quando a sessão expira */
  onSessionExpired?: () => void
}

/**
 * Opções para configuração dos guards
 */
export interface GuardOptions {
  /** Nome da rota de login */
  loginRouteName?: string
  /** Nome da rota de reset de senha */
  resetPasswordRouteName?: string
  /** Nome da meta key para rotas públicas */
  publicMetaKey?: string
  /** Nome da meta key para rotas autenticadas */
  authMetaKey?: string
  /** Rota padrão após login */
  defaultRedirect?: string
}

/**
 * Instância do Auth disponível via useAuth()
 */
export interface AuthInstance<T = User> {
  // State (reativo)
  /** Token de acesso atual */
  token: ComputedRef<string | null>
  /** Refresh token atual */
  refreshToken: ComputedRef<string | null>
  /** Dados do usuário autenticado */
  user: ComputedRef<T | null>
  /** Indica se o usuário está autenticado */
  isAuthenticated: ComputedRef<boolean>
  /** Indica se está carregando */
  loading: ComputedRef<boolean>

  // Methods
  /** Realiza o login com as credenciais fornecidas */
  login: (credentials: LoginCredentials) => Promise<LoginResult<T>>
  /** Realiza o logout */
  logout: () => Promise<void>
  /** Busca os dados do usuário */
  fetchUser: () => Promise<T>
  /** Atualiza o token de acesso usando o refresh token */
  refreshAccessToken: () => Promise<string>
  /** Limpa todos os dados de autenticação */
  clearAuth: () => void
  /** Inicializa o sistema de autenticação */
  initialize: () => Promise<void>
  /** Define os dados do usuário manualmente */
  setUser: (userData: T) => void
  /** Define os tokens manualmente */
  setTokens: (token: string, refreshToken: string) => void

  // Internal refs (para uso nos interceptors/guards)
  /** @internal */
  _http?: AxiosInstance
  /** @internal */
  _router?: Router
}

/**
 * Plugin Vue retornado por createAuth()
 */
export interface AuthPlugin {
  install: (app: App) => void
}

/**
 * Extensão do AxiosRequestConfig para flags internas
 */
export interface AuthAxiosRequestConfig extends InternalAxiosRequestConfig {
  _skipAuthRefresh?: boolean
  _retry?: boolean
  headers: InternalAxiosRequestConfig['headers']
}

/**
 * Resposta de login da API
 */
export interface LoginResponse {
  [key: string]: unknown
  access?: string
  token?: string
  refresh?: string
  refresh_token?: string
}

/**
 * Resposta de refresh da API
 */
export interface RefreshResponse {
  [key: string]: unknown
  access?: string
  token?: string
}
