<template>
  <div class="login-page">
    <router-link class="home-link" to="/">← 返回首页</router-link>
    <div class="login-card glass-panel">
      <h1>欢迎登录</h1>
      <p class="auth-subtitle">登录后即可访问 GlobeMind 数据服务平台</p>
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-item">
          <label>用户名或邮箱</label>
          <input v-model="username" type="text" required placeholder="用户名或邮箱" />
        </div>
        <div class="form-item">
          <label>密码</label>
          <input v-model="password" type="password" required placeholder="请输入密码" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading">{{ loading ? '登录中...' : '登录' }}</button>
        <div class="links">
          <router-link to="/register">注册账号</router-link>
          <router-link to="/forgot-password">忘记密码</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { API_PREFIX } from '@/config/api'
import { formatApiErrorDetail } from '@/utils/apiError'
import { getToken, setToken, setCurrentUser } from '@/utils/auth'

// 定义组件名以符合 Vue 规范
defineOptions({
  name: 'LoginPage'
})

const router = useRouter()
const route = useRoute()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const res = await fetch(`${API_PREFIX}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: String(username.value || '').trim(),
        password: password.value,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      error.value = formatApiErrorDetail(data)
      return
    }
    if (data.access_token) {
      setToken(data.access_token)
      if (data.user) {
        setCurrentUser(data.user)
      }
      const redirect = route.query.redirect || '/'
      router.replace(redirect)
    } else {
      error.value = '未返回 token'
    }
  } catch {
    error.value = '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (getToken()) {
    const redirect = route.query.redirect || '/'
    router.replace(redirect)
  }
})
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(66, 153, 225, 0.35), transparent 48%),
    radial-gradient(circle at 80% 10%, rgba(49, 130, 206, 0.28), transparent 45%),
    linear-gradient(145deg, #eef6ff 0%, #d7e8ff 45%, #d4e2f7 100%);
}
.home-link {
  position: absolute;
  top: 24px;
  left: 28px;
  color: #214d84;
  font-weight: 600;
  text-decoration: none;
}
.home-link:hover { text-decoration: underline; }
.login-card {
  width: min(100%, 500px);
  padding: 36px 34px 30px;
  border-radius: 22px;
}
.glass-panel {
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow:
    0 24px 60px rgba(22, 62, 121, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.login-card h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #14345d;
  text-align: left;
}
.auth-subtitle {
  margin: 10px 0 24px;
  font-size: 1.02rem;
  color: #3f5f87;
  line-height: 1.6;
}
.login-form .form-item {
  margin-bottom: 16px;
}
.login-form label {
  display: block;
  margin-bottom: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: #1e3a61;
}
.login-form input {
  width: 100%;
  min-height: 48px;
  padding: 11px 14px;
  border: 1px solid rgba(47, 92, 145, 0.26);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.84);
  color: #17375f;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-sizing: border-box;
}
.login-form input:focus {
  outline: none;
  border-color: rgba(34, 99, 182, 0.55);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
  background: rgba(255, 255, 255, 0.96);
}
.login-form .error {
  color: #b42318;
  font-size: 0.95rem;
  margin: 4px 0 12px;
}
.login-form button {
  width: 100%;
  min-height: 50px;
  padding: 12px;
  margin-top: 10px;
  background: linear-gradient(135deg, #1976d2, #0f56b3);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}
.login-form button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px rgba(17, 80, 160, 0.35);
}
.login-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.links {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
  font-size: 0.96rem;
}
.links a {
  color: #1257ad;
  font-weight: 500;
  text-decoration: none;
}
.links a:hover {
  text-decoration: underline;
}
@media (max-width: 520px) {
  .home-link { top: 18px; left: 18px; }
}
</style>
