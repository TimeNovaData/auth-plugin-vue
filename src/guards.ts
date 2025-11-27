import type { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import type { AuthInstance, GuardOptions } from './types'
import { waitForRef } from './utils'

/**
 * Configura os guards do Vue Router para autenticação
 * 
 * Funcionalidades:
 * - Redireciona usuários não autenticados para login
 * - Redireciona usuários autenticados que tentam acessar login
 * - Suporta rotas públicas e privadas via meta
 * - Limpa query params de logout após processamento
 * 
 * @param router - Vue Router instance
 * @param auth - Auth instance
 * @param options - Configuration options
 * 
 * @example
 * ```ts
 * // Configuração de rotas
 * const routes = [
 *   { path: '/login', name: 'login', meta: { public: true } },
 *   { path: '/dashboard', name: 'dashboard', meta: { auth: true } }
 * ]
 * 
 * setupGuards(router, auth, {
 *   loginRouteName: 'login',
 *   publicMetaKey: 'public',
 *   authMetaKey: 'auth'
 * })
 * ```
 */
export function setupGuards(
  router: Router,
  auth: AuthInstance,
  options: GuardOptions = {}
): void {
  const {
    loginRouteName = 'login',
    resetPasswordRouteName = 'redefinir-senha',
    publicMetaKey = 'public',
    authMetaKey = 'auth',
    defaultRedirect = '/',
  } = options

  router.beforeEach(async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) => {
    const requiresAuth = to.matched.some((record) => record.meta[authMetaKey])
    const isPublic = to.matched.some((record) => record.meta[publicMetaKey])
    const isLoginPages =
      to.name === loginRouteName || to.name === resetPasswordRouteName

    // Aguardar carregamento inicial se estiver em loading
    if (auth.loading.value) {
      try {
        await waitForRef(auth.loading, (v: boolean) => v === false)
      } catch (e) {
        console.warn('[vue-auth] Timeout waiting for auth loading')
      }
    }

    // Remover query.logout se existir
    if (to.query.logout) {
      const { logout, ...cleanQuery } = to.query
      return next({
        path: to.path,
        query: cleanQuery,
        replace: true,
      })
    }

    // Já autenticado tentando acessar login
    if (isLoginPages && auth.isAuthenticated.value) {
      const redirectPath = (to.query.redirect as string) || defaultRedirect
      return next({ path: redirectPath, replace: true })
    }

    // Verificar autenticação para rotas protegidas
    if (requiresAuth && !auth.isAuthenticated.value) {
      return next({
        name: loginRouteName,
        query: {
          redirect: to.fullPath,
        },
      })
    }

    next()
  })
}
