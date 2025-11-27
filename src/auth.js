import { ref, computed } from "vue";
import { sleep } from "./utils";

/**
 * Storage padrão usando localStorage
 */
const defaultStorage = {
  getToken: () => localStorage.getItem("token"),
  setToken: (token) => localStorage.setItem("token", token),
  removeToken: () => localStorage.removeItem("token"),
  getRefreshToken: () => localStorage.getItem("refresh_token"),
  setRefreshToken: (token) => localStorage.setItem("refresh_token", token),
  removeRefreshToken: () => localStorage.removeItem("refresh_token"),
};

/**
 * Cria a lógica de autenticação
 * @param {Object} http - Axios instance
 * @param {Object} options - Configuration options
 */
export function createAuthCore(http, router, options = {}) {
  const {
    endpoints = {
      login: "/token/",
      refresh: "/token/refresh/",
      user: "/contexto-inicial/",
    },
    storage = defaultStorage,
    tokenKey = "token",
    refreshTokenKey = "refresh",
    maxRetries = 3,
    onError,
    onLogin,
    onLogout,
    loginRouteName,
  } = options;

  // State
  const token = ref(storage.getToken?.() || null);
  const refreshToken = ref(storage.getRefreshToken?.() || null);
  const user = ref(null);
  const loading = ref(true);
  const authenticated = ref(false);

  // Computed
  const isAuthenticated = computed(() => authenticated.value);

  // Methods
  const setTokens = (newToken, newRefresh) => {
    token.value = newToken;
    refreshToken.value = newRefresh;

    if (newToken) {
      storage.setToken?.(newToken);
    } else {
      storage.removeToken?.();
    }

    if (newRefresh) {
      storage.setRefreshToken?.(newRefresh);
    } else {
      storage.removeRefreshToken?.();
    }
  };

  const clearAuth = () => {
    token.value = null;
    refreshToken.value = null;
    user.value = null;
    authenticated.value = false;
    storage.removeToken?.();
    storage.removeRefreshToken?.();
  };

  const login = async (credentials) => {
    try {
      loading.value = true;

      const { data } = await http.post(endpoints.login, credentials, {
        headers: { "Content-Type": "application/json" },
      });

      // Extrair tokens da resposta (suporta diferentes formatos)
      const accessToken = data[tokenKey] || data.access || data.token;
      const refresh =
        data[refreshTokenKey] || data.refresh || data.refresh_token;

      setTokens(accessToken, refresh);
      await fetchUser();

      onLogin?.(user.value);

      return { success: true, user: user.value };
    } catch (error) {
      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Erro ao realizar login";

      onError?.(message, error);

      return { success: false, error, message };
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    try {
      authenticated.value = false;
      await router.replace({ name: loginRouteName, query: { logout: true } });
      clearAuth();
    } catch (error) {
      console.log(error);
    }
  };

  const fetchUser = async () => {
    try {
      loading.value = true;
      const { data } = await http.get(endpoints.user);
      user.value = data;
      authenticated.value = true;
      return data;
    } catch (error) {
      clearAuth();
      throw error;
    } finally {
      loading.value = false;
    }
  };

  const refreshAccessToken = async () => {
    if (!refreshToken.value) {
      clearAuth();
      throw new Error("No refresh token available");
    }

    let lastError = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(`🔄 Tentativa ${i + 1}/${maxRetries} de refresh token`);

        const { data } = await http.post(
          endpoints.refresh,
          { [refreshTokenKey]: refreshToken.value },
          { _skipAuthRefresh: true }
        );

        // Extrair novo token da resposta
        const newToken = data[tokenKey] || data.access || data.token;

        setTokens(newToken, refreshToken.value);
        console.log(`✅ Token atualizado com sucesso`);
        return newToken;
      } catch (error) {
        lastError = error;
        console.error(
          `❌ Tentativa ${i + 1}/${maxRetries} falhou:`,
          error.response?.status
        );

        if (i < maxRetries - 1) {
          const delay = 1000 * (i + 1);
          console.log(`⏳ Aguardando ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    console.error("❌ Todas as tentativas de refresh falharam");
    clearAuth();
    throw lastError;
  };

  const initialize = async () => {
    loading.value = true;
    try {
      if (token.value) {
        console.log("🔑 Token encontrado, buscando usuário...");
        await fetchUser();
      } else {
        console.log("🚫 Sem token, usuário não autenticado");
      }
    } catch (error) {
      console.error("❌ Erro ao inicializar:", error);
      clearAuth();
    } finally {
      loading.value = false;
      console.log("✅ Inicialização do Auth completa");
    }
  };

  const setUser = (userData) => {
    user.value = userData;
  };

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
    setTokens,
  };
}
