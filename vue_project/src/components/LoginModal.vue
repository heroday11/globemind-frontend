<script setup>
import { ref } from 'vue'
import { API_PREFIX } from '@/config/api'
import { setToken, setCurrentUser } from '@/utils/auth'

defineProps({ visible: Boolean })
const emit = defineEmits(['close', 'login-success'])

const loginUsername = ref('')
const loginPassword = ref('')
const loginError = ref('')
const loginLoading = ref(false)

async function handleLogin() {
  loginError.value = ''
  loginLoading.value = true
  try {
    const res = await fetch(`${API_PREFIX}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginUsername.value, password: loginPassword.value }),
    })
    const data = await res.json()
    if (!res.ok) {
      loginError.value = data.detail || '登录失败'
      return
    }
    if (data.access_token) {
      setToken(data.access_token)
      if (data.user) setCurrentUser(data.user)
      loginUsername.value = ''
      loginPassword.value = ''
      window.dispatchEvent(new CustomEvent('loginSuccess'))
      emit('login-success')
      emit('close')
    } else {
      loginError.value = '未返回 token'
    }
  } catch {
    loginError.value = '网络错误，请稍后重试'
  } finally {
    loginLoading.value = false
  }
}
</script>

<template>
  <div v-if="visible" class="login-modal-overlay" @click.self="emit('close')">
    <div class="login-modal-card" @click.stop>
      <h2 class="login-modal-title">登录 GlobeMind</h2>
      <p class="login-modal-subtitle">同步收藏、使用数据助手并管理你的研究报告</p>
      <form class="login-modal-form" @submit.prevent="handleLogin">
        <div class="login-modal-item">
          <label>用户名</label>
          <input v-model="loginUsername" type="text" required placeholder="请输入用户名" />
        </div>
        <div class="login-modal-item">
          <label>密码</label>
          <input v-model="loginPassword" type="password" required placeholder="请输入密码" />
        </div>
        <div class="login-modal-buttons">
          <button type="submit" class="login-modal-submit" :disabled="loginLoading">
            {{ loginLoading ? '登录中...' : '登录' }}
          </button>
          <button type="button" class="login-modal-cancel" @click="emit('close')" :disabled="loginLoading">
            取消
          </button>
        </div>
        <div class="login-modal-register">
          <router-link to="/register" @click="emit('close')">注册账号</router-link>
        </div>
        <p v-if="loginError" class="login-modal-error">{{ loginError }}</p>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 36, 67, 0.45);
  z-index: 9999;
  overflow: auto;
}

.login-modal-card {
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.8);
  padding: 28px 30px;
  border-radius: 20px;
  box-shadow: 0 24px 56px rgba(20, 57, 109, 0.26);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  width: 400px;
  min-height: 460px;
  max-width: 90vw;
  margin: auto;
  position: relative;
  display: flex;
  flex-direction: column;
}

.login-modal-title {
  margin: 0 0 7px 0;
  text-align: left;
  font-size: 34px;
  font-weight: 700;
  color: #173d6a;
}

.login-modal-subtitle {
  margin: 0 0 18px;
  color: #55708f;
  font-size: 13px;
  line-height: 1.55;
}

.login-modal-form {
  display: flex;
  margin-top: 10px;
  flex-direction: column;
  gap: 24px;
  flex: 1;
  position: relative;
}

.login-modal-item {
  display: flex;
  flex-direction: column;
}

.login-modal-item label {
  display: block;
  margin-bottom: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f436e;
}

.login-modal-item input {
  width: 100%;
  min-height: 48px;
  padding: 10px 14px;
  border: 1px solid rgba(47, 92, 145, 0.3);
  border-radius: 12px;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.84);
  outline: none;
  color: #17375f;
  font-size: 18px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.login-modal-item input:focus {
  border-color: rgba(34, 99, 182, 0.58);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
  background: rgba(255, 255, 255, 0.96);
  outline: none;
}

.login-modal-item input::placeholder {
  color: #999;
}

.login-modal-error {
  position: relative;
  top: 8px;
  color: #b42318;
  font-size: 14px;
  text-align: center;
  font-weight: 500;
}

.login-modal-buttons {
  position: absolute;
  bottom: 54px;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  padding: 0 10px;
}

.login-modal-submit {
  flex: 1;
  min-height: 46px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea, #4e67d8);
  color: #fff;
  cursor: pointer;
  font-size: 16px;
  font-weight: 700;
}

.login-modal-submit:hover {
  background: linear-gradient(135deg, #5d74df, #435ecf);
}

.login-modal-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-modal-cancel {
  flex: 1;
  min-height: 46px;
  border-radius: 12px;
  border: 1px solid rgba(88, 111, 196, 0.45);
  background: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  font-size: 16px;
  color: #375b86;
  font-weight: 600;
}

.login-modal-cancel:hover {
  background: rgba(255, 255, 255, 0.92);
}

.login-modal-cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-modal-register {
  position: absolute;
  bottom: 12px;
  left: 0;
  right: 0;
  text-align: center;
  padding: 0 20px;
}

.login-modal-register a {
  color: #355f95;
  text-decoration: none;
  font-size: 15px;
  font-weight: 600;
  transition: color 0.3s ease;
}

.login-modal-register a:hover {
  color: #1a4f95;
  text-decoration: underline;
}
</style>
