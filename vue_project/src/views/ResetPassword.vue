<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>重置密码</h1>
      <form @submit.prevent="handleSubmit">
        <div class="form-item">
          <label>新密码</label>
          <input v-model="newPassword" type="password" required placeholder="请输入新密码" />
        </div>
        <div class="form-item">
          <label>确认新密码</label>
          <input v-model="confirmPassword" type="password" required placeholder="请再次输入新密码" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="message" class="success">{{ message }}</p>
        <button type="submit" :disabled="loading">{{ loading ? '提交中...' : '确认重置' }}</button>
      </form>
      <p class="tips"><router-link to="/login">返回登录</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { API_PREFIX } from '@/config/api'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const error = ref('')
const message = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

async function handleSubmit() {
  const token = (route.query.token || '').toString()
  if (!token) {
    error.value = '重置链接缺少 token'
    return
  }
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    const res = await fetch(`${API_PREFIX}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        new_password: newPassword.value,
        confirm_password: confirmPassword.value,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data.detail || '重置失败'
      return
    }
    message.value = '密码重置成功，正在跳转登录页...'
    setTimeout(() => router.replace('/login'), 900)
  } catch {
    error.value = '网络错误，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; background: #f0f2f5; }
.auth-card { background: #fff; padding: 24px; width: 420px; max-width: 100%; border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,.1); }
.form-item { margin-bottom: 12px; }
.form-item label { display: block; margin-bottom: 4px; font-size: 13px; color: #555; }
.form-item input { width: 100%; padding: 8px 10px; border: 1px solid #dcdfe6; border-radius: 4px; box-sizing: border-box; }
button { width: 100%; margin-top: 6px; border: 0; background: #409eff; color: #fff; padding: 10px 0; border-radius: 4px; cursor: pointer; }
.error { color: #f56c6c; font-size: 13px; }
.success { color: #67c23a; font-size: 13px; }
.tips { margin: 12px 0 0; font-size: 13px; text-align: center; }

@media (max-width: 480px) {
  .auth-page { padding: 16px; }
  .auth-card { padding: 20px 16px; }
  .form-item input { min-height: 44px; font-size: 15px; }
  button { min-height: 46px; font-size: 15px; }
}
</style>
