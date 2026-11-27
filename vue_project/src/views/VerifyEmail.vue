<template>
  <main class="verify-page">
    <router-link class="home-link" to="/">返回首页</router-link>

    <section class="verify-panel" aria-labelledby="verify-email-title">
      <img src="/imgs/logo.png" alt="GlobeMind" class="brand-logo" />

      <div class="status-icon" :class="{ 'status-icon--verified': verified }" aria-hidden="true">
        <CircleCheck v-if="verified" :size="30" />
        <MailCheck v-else :size="30" />
      </div>

      <h1 id="verify-email-title" ref="title" :tabindex="verified ? -1 : undefined">
        {{ verified ? '邮箱验证成功' : '验证邮箱' }}
      </h1>
      <p class="status-copy" role="status">
        {{ verified ? '你的 GlobeMind 邮箱已验证，现在可以登录。' : '请输入邮件中的 8 位验证码。验证码由字母和数字组成，10 分钟内有效。' }}
      </p>

      <router-link v-if="verified" class="primary-link" to="/login">
        前往登录
        <ArrowRight :size="17" aria-hidden="true" />
      </router-link>

      <form v-else @submit.prevent="verify" :aria-busy="busy">
        <label for="verification-email">待验证邮箱</label>
        <input
          id="verification-email"
          ref="emailField"
          v-model.trim="email"
          type="email"
          name="email"
          autocomplete="email"
          maxlength="255"
          required
        />
        <label class="code-label" for="verification-code">邮箱验证码</label>
        <input
          id="verification-code"
          ref="codeField"
          v-model.trim="code"
          type="text"
          name="code"
          autocomplete="one-time-code"
          autocapitalize="characters"
          spellcheck="false"
          minlength="8"
          maxlength="8"
          pattern="[A-Za-z2-9]{8}"
          required
        />
        <p v-if="message" class="success" role="status">{{ message }}</p>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button type="submit" :disabled="busy">
          <CircleCheck :size="17" aria-hidden="true" />
          {{ verifying ? '正在验证' : '验证邮箱' }}
        </button>
        <button class="resend-button" type="button" :disabled="busy" @click="resend">
          <RefreshCw :size="17" :class="{ spin: sending }" aria-hidden="true" />
          {{ sending ? '正在发送' : '重新发送验证码' }}
        </button>
      </form>

      <p v-if="!verified" class="secondary-link"><router-link to="/login">返回登录</router-link></p>
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowRight, CircleCheck, MailCheck, RefreshCw } from 'lucide-vue-next'

import { API_PREFIX } from '@/config/api'
import { formatApiErrorDetail } from '@/utils/apiError'

defineOptions({ name: 'VerifyEmail' })

const route = useRoute()
const email = ref(typeof route.query.email === 'string' ? route.query.email.trim() : '')
const code = ref('')
const verified = ref(false)
const verifying = ref(false)
const sending = ref(false)
const busy = computed(() => verifying.value || sending.value)
const message = ref('')
const error = ref('')
const emailField = ref(null)
const codeField = ref(null)
const title = ref(null)

async function verify() {
  if (busy.value) return
  verifying.value = true
  message.value = ''
  error.value = ''
  try {
    const response = await fetch(`${API_PREFIX}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, code: code.value.toUpperCase() }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      error.value = formatApiErrorDetail(data)
      codeField.value?.select()
      return
    }
    verified.value = true
    await nextTick()
    title.value?.focus()
  } catch {
    error.value = '网络错误，请稍后重试'
  } finally {
    verifying.value = false
  }
}

async function resend() {
  if (busy.value || !emailField.value?.reportValidity()) return
  sending.value = true
  message.value = ''
  error.value = ''
  try {
    const response = await fetch(`${API_PREFIX}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      error.value = formatApiErrorDetail(data)
      return
    }
    code.value = ''
    message.value = data.message || '若该邮箱存在待验证账号，将收到新的验证码'
    codeField.value?.focus()
  } catch {
    error.value = '网络错误，请稍后重试'
  } finally {
    sending.value = false
  }
}

onMounted(() => (email.value ? codeField.value : emailField.value)?.focus())
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
.code-label { margin-top: 14px; }
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
.resend-button {
  border: 1px solid #b8cbe6;
  background: #f3f7ff;
  color: #2456a6;
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
