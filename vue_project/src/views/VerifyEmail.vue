<template>
  <main class="verify-page">
    <router-link class="home-link" to="/">返回首页</router-link>

    <section class="verify-panel" aria-labelledby="verify-email-title">
      <img src="/imgs/logo.png" alt="GlobeMind" class="brand-logo" />

      <div class="status-icon" :class="`status-icon--${state}`" aria-hidden="true">
        <LoaderCircle v-if="state === 'verifying'" :size="30" class="spin" />
        <CircleCheck v-else-if="state === 'verified'" :size="30" />
        <MailWarning v-else-if="state === 'error'" :size="30" />
        <MailCheck v-else :size="30" />
      </div>

      <h1 id="verify-email-title">{{ title }}</h1>
      <p class="status-copy" role="status" aria-live="polite">{{ statusCopy }}</p>

      <router-link v-if="state === 'verified'" class="primary-link" to="/login">
        前往登录
        <ArrowRight :size="17" aria-hidden="true" />
      </router-link>

      <form v-else-if="state !== 'verifying'" @submit.prevent="resend" :aria-busy="sending">
        <label for="verification-email">注册邮箱</label>
        <input
          id="verification-email"
          ref="emailField"
          v-model.trim="email"
          type="email"
          name="email"
          autocomplete="email"
          required
          placeholder="name@example.com"
        />
        <p v-if="resendMessage" class="success" role="status" aria-live="polite">
          {{ resendMessage }}
        </p>
        <p v-if="resendError" class="error" role="alert">{{ resendError }}</p>
        <button type="submit" :disabled="sending">
          <RefreshCw :size="17" :class="{ spin: sending }" aria-hidden="true" />
          {{ sending ? '正在发送' : '重新发送验证邮件' }}
        </button>
      </form>

      <p class="secondary-link"><router-link to="/login">返回登录</router-link></p>
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowRight,
  CircleCheck,
  LoaderCircle,
  MailCheck,
  MailWarning,
  RefreshCw,
} from 'lucide-vue-next'

import { API_PREFIX } from '@/config/api'
import { formatApiErrorDetail } from '@/utils/apiError'

defineOptions({ name: 'VerifyEmail' })

const route = useRoute()
const token = String(route.query.token || '').trim()
const email = ref(String(route.query.email || '').trim())
const state = ref(token ? 'verifying' : 'idle')
const verificationError = ref('')
const sending = ref(false)
const resendMessage = ref('')
const resendError = ref('')
const emailField = ref(null)

const title = computed(() => ({
  verifying: '正在验证邮箱',
  verified: '邮箱验证成功',
  error: '验证链接不可用',
  idle: '查收验证邮件',
}[state.value]))

const statusCopy = computed(() => {
  if (state.value === 'verifying') return '正在确认验证链接，请稍候。'
  if (state.value === 'verified') return '你的 GlobeMind 账号已启用，现在可以登录。'
  if (state.value === 'error') return verificationError.value
  return '打开注册邮箱中的验证链接即可完成账号注册。'
})

async function verify() {
  try {
    const response = await fetch(`${API_PREFIX}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      verificationError.value = formatApiErrorDetail(data)
      state.value = 'error'
      return
    }
    state.value = 'verified'
  } catch {
    verificationError.value = '网络错误，请稍后重新打开验证链接'
    state.value = 'error'
  }
}

async function resend() {
  sending.value = true
  resendMessage.value = ''
  resendError.value = ''
  try {
    const response = await fetch(`${API_PREFIX}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      resendError.value = formatApiErrorDetail(data)
      return
    }
    resendMessage.value = data.message || '若该邮箱存在待验证账号，将收到新的验证链接'
  } catch {
    resendError.value = '网络错误，请稍后重试'
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  if (token) {
    await verify()
    if (state.value === 'error') {
      await nextTick()
      emailField.value?.focus()
    }
    return
  }
  emailField.value?.focus()
})
</script>

<style scoped>
.verify-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  position: relative;
  box-sizing: border-box;
  padding: 68px 20px 28px;
  background: #f4f7ff;
  color: #17365f;
}
.home-link {
  position: absolute;
  top: 24px;
  left: 28px;
  color: #214d84;
  font-weight: 650;
  text-decoration: none;
}
.home-link:hover { text-decoration: underline; }
.verify-panel {
  width: min(100%, 480px);
  box-sizing: border-box;
  padding: 36px;
  border: 1px solid #dbe5f4;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 18px 46px rgba(31, 67, 110, 0.12);
  text-align: center;
}
.brand-logo {
  display: block;
  width: 190px;
  height: auto;
  margin: 0 auto 30px;
}
.status-icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  margin: 0 auto 20px;
  border-radius: 8px;
  background: #eff4ff;
  color: #2563eb;
}
.status-icon--verified { background: #edf8f1; color: #18733d; }
.status-icon--error { background: #fff1f0; color: #b42318; }
h1 {
  margin: 0;
  color: #102b4e;
  font-size: 1.75rem;
  line-height: 1.3;
  letter-spacing: 0;
}
.status-copy {
  margin: 12px auto 26px;
  max-width: 370px;
  color: #58708f;
  line-height: 1.7;
}
form { text-align: left; }
label {
  display: block;
  margin-bottom: 7px;
  color: #344f70;
  font-size: 0.9rem;
  font-weight: 650;
}
input {
  width: 100%;
  min-height: 48px;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #cdd9e8;
  border-radius: 6px;
  color: #17365f;
  font-size: 1rem;
}
input:focus-visible { outline: 3px solid rgba(37, 99, 235, 0.2); border-color: #2563eb; }
button,
.primary-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  box-sizing: border-box;
  margin-top: 14px;
  border: 0;
  border-radius: 6px;
  background: #2563eb;
  color: #fff;
  font-size: 0.98rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
}
button:disabled { opacity: 0.62; cursor: not-allowed; }
.success,
.error { margin: 12px 0 0; font-size: 0.88rem; line-height: 1.55; }
.success { color: #18733d; }
.error { color: #b42318; }
.secondary-link { margin: 20px 0 0; font-size: 0.9rem; }
.secondary-link a { color: #315f96; }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
@media (max-width: 520px) {
  .verify-page { padding: 62px 12px 20px; }
  .home-link { top: 18px; left: 18px; }
  .verify-panel { padding: 28px 20px; }
  .brand-logo { width: 170px; margin-bottom: 24px; }
  h1 { font-size: 1.5rem; }
}
</style>
