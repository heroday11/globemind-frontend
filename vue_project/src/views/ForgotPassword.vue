<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>忘记密码</h1>
      <form @submit.prevent="handleSubmit">
        <div class="form-item">
          <label>邮箱</label>
          <input v-model.trim="email" type="email" required placeholder="请输入注册邮箱" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="message" class="success">{{ message }}</p>
        <button type="submit" :disabled="loading">{{ loading ? '提交中...' : '发送重置链接' }}</button>
      </form>
      <p class="tips"><router-link to="/login">返回登录</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { API_PREFIX } from '@/config/api'

const email = ref('')
const loading = ref(false)
const error = ref('')
const message = ref('')

async function handleSubmit() {
  loading.value = true
  error.value = ''
  message.value = ''
  try {
    const res = await fetch(`${API_PREFIX}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value }),
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data.detail || '提交失败'
      return
    }
    message.value = data.message || '如果邮箱已注册，将收到重置链接'
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
