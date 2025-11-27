import { waitForRef } from './utils'

/**
 * Configura os guards do Vue Router para autenticação
 * @param {Object} router - Vue Router instance
 * @param {Object} auth - Auth instance
 * @param {Object} options - Configuration options
 */
export function setupGuards(router, auth, options = {}) {
  const {
    loginRouteName = 'login',
    resetPasswordRouteName = 'redefinir-senha',
    publicMetaKey = 'public',
    authMetaKey = 'auth',
    defaultRedirect = '/',
  } = options

  router.beforeEach(async (to, from, next) => {
    const requiresAuth = to.matched.some((record) => record.meta[authMetaKey])
    const isPublic = to.matched.some((record) => record.meta[publicMetaKey])
    const isLoginPages =
      to.name === loginRouteName || to.name === resetPasswordRouteName

    // Aguardar carregamento inicial se estiver em loading
    if (auth.loading.value) {
      try {
        await waitForRef(auth.loading, (v) => v === false)
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
      const redirectPath = to.query.redirect || defaultRedirect
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
