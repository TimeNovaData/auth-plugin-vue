# @novadata/vue-auth

Plugin de autenticação para Vue 3 com suporte a JWT e refresh token.

## Instalação

```bash
npm install @novadata/vue-auth
# ou
yarn add @novadata/vue-auth
# ou
pnpm add @novadata/vue-auth
```

## Uso Básico

### 1. Configuração do Plugin

```javascript
// main.js ou boot file
import { createApp } from 'vue'
import { createAuth } from '@novadata/vue-auth'
import axios from 'axios'
import router from './router'

const app = createApp(App)

// Criar instância do axios
const http = axios.create({
  baseURL: 'https://api.example.com'
})

// Configurar plugin de auth
const auth = createAuth({
  http,
  router,
  
  // Endpoints (opcional - valores padrão mostrados)
  endpoints: {
    login: '/token/',
    refresh: '/token/refresh/',
    user: '/users/me/'
  },
  
  // Chaves dos tokens na resposta da API (opcional)
  tokenKey: 'token',        // ou 'access'
  refreshTokenKey: 'refresh', // ou 'refresh_token'
  
  // Número de tentativas de refresh (opcional, padrão: 3)
  maxRetries: 3,
  
  // Configuração das rotas (opcional)
  loginRouteName: 'login',
  publicMetaKey: 'public',
  authMetaKey: 'auth',
  defaultRedirect: '/',
  
  // Callbacks (opcional)
  onError: (message, error) => {
    // Exibir notificação de erro
    console.error(message, error)
  },
  
  onSessionExpired: () => {
    // Sessão expirou - redirecionar para login
    router.replace({ name: 'login', query: { expired: 'true' } })
  },
  
  onLogin: (user) => {
    console.log('Usuário logado:', user)
  },
  
  onLogout: () => {
    console.log('Usuário deslogado')
  },
  
  // Storage customizado (opcional)
  storage: {
    getToken: () => localStorage.getItem('my_token'),
    setToken: (token) => localStorage.setItem('my_token', token),
    removeToken: () => localStorage.removeItem('my_token'),
    getRefreshToken: () => localStorage.getItem('my_refresh'),
    setRefreshToken: (token) => localStorage.setItem('my_refresh', token),
    removeRefreshToken: () => localStorage.removeItem('my_refresh'),
  }
})

app.use(auth)
app.use(router)
app.mount('#app')
```

### 2. Uso nos Componentes

```vue
<script setup>
import { useAuth } from '@novadata/vue-auth'

const auth = useAuth()

// Acessar estado reativo
const isLoggedIn = auth.isAuthenticated
const currentUser = auth.user
const isLoading = auth.loading

// Fazer login
const handleLogin = async () => {
  const result = await auth.login({
    email: 'user@example.com',
    password: 'senha123'
  })
  
  if (result.success) {
    console.log('Login bem-sucedido!')
  } else {
    console.error(result.message)
  }
}

// Fazer logout
const handleLogout = async () => {
  await auth.logout()
}
</script>

<template>
  <div v-if="isLoading.value">Carregando...</div>
  
  <div v-else-if="isAuthenticated.value">
    <p>Bem-vindo, {{ user.value.name }}!</p>
    <button @click="handleLogout">Sair</button>
  </div>
  
  <div v-else>
    <button @click="handleLogin">Entrar</button>
  </div>
</template>
```

### 3. Configuração das Rotas

```javascript
// router/routes.js
const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('pages/Login.vue'),
    meta: { public: true } // Rota pública
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('pages/Dashboard.vue'),
    meta: { auth: true } // Requer autenticação
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('pages/About.vue'),
    meta: { public: true } // Rota pública
  }
]
```

## API

### `createAuth(options)`

Cria o plugin de autenticação.

#### Options

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `http` | `AxiosInstance` | **required** | Instância do Axios |
| `router` | `Router` | **required** | Instância do Vue Router |
| `endpoints.login` | `string` | `'/token/'` | Endpoint de login |
| `endpoints.refresh` | `string` | `'/token/refresh/'` | Endpoint de refresh |
| `endpoints.user` | `string` | `'/contexto-inicial/'` | Endpoint para buscar usuário |
| `tokenKey` | `string` | `'token'` | Chave do token na resposta |
| `refreshTokenKey` | `string` | `'refresh'` | Chave do refresh token |
| `maxRetries` | `number` | `3` | Tentativas de refresh |
| `loginRouteName` | `string` | `'login'` | Nome da rota de login |
| `publicMetaKey` | `string` | `'public'` | Meta key para rotas públicas |
| `authMetaKey` | `string` | `'auth'` | Meta key para rotas autenticadas |
| `onError` | `function` | - | Callback de erro |
| `onSessionExpired` | `function` | - | Callback de sessão expirada |
| `onLogin` | `function` | - | Callback após login |
| `onLogout` | `function` | - | Callback após logout |
| `storage` | `object` | localStorage | Storage customizado |

### `useAuth()`

Composable para acessar a instância de auth.

#### Retorno

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `token` | `ComputedRef<string>` | Token de acesso atual |
| `refreshToken` | `ComputedRef<string>` | Refresh token atual |
| `user` | `ComputedRef<object>` | Dados do usuário |
| `isAuthenticated` | `ComputedRef<boolean>` | Se está autenticado |
| `loading` | `ComputedRef<boolean>` | Se está carregando |
| `login(credentials)` | `function` | Realiza login |
| `logout()` | `function` | Realiza logout |
| `fetchUser()` | `function` | Busca dados do usuário |
| `clearAuth()` | `function` | Limpa autenticação |
| `setUser(data)` | `function` | Define dados do usuário |

## Licença

MIT
