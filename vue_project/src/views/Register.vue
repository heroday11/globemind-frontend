<template>
  <div class="auth-page">
    <router-link class="home-link" to="/">
      <ArrowLeft :size="16" aria-hidden="true" /> 返回首页
    </router-link>
    <div class="auth-card">
      <h1>创建账号</h1>
      <p class="auth-subtitle">创建账号前，请先了解信息处理方式和实验性使用边界</p>
      <form @submit.prevent="handleRegister" :aria-busy="loading">
        <div class="form-item">
          <label for="register-username">用户名</label>
          <input id="register-username" ref="firstField" v-model.trim="form.username" name="username" required autocomplete="username" aria-describedby="register-username-hint" />
          <p id="register-username-hint" class="field-hint">登录时可使用用户名或邮箱。</p>
        </div>
        <div class="form-item">
          <label for="register-full-name">姓名（可选）</label>
          <input id="register-full-name" v-model.trim="form.full_name" name="full_name" autocomplete="name" aria-describedby="register-full-name-hint" />
          <p id="register-full-name-hint" class="field-hint">可稍后在个人中心填写。</p>
        </div>
        <div class="form-item">
          <label for="register-email">邮箱</label>
          <input id="register-email" v-model.trim="form.email" name="email" type="email" required autocomplete="email" aria-describedby="register-email-hint" />
          <p id="register-email-hint" class="field-hint">邮箱验证码将发送到此地址。</p>
        </div>
        <div class="form-item">
          <label for="register-phone">手机号（可选）</label>
          <input id="register-phone" v-model.trim="form.phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" pattern="1[3-9][0-9]{9}" aria-describedby="register-phone-hint" />
          <p id="register-phone-hint" class="field-hint">填写时请输入 11 位中国大陆手机号。</p>
        </div>
        <div class="form-item">
          <label for="register-password">密码</label>
          <input id="register-password" v-model="form.password" name="password" type="password" required minlength="8" autocomplete="new-password" aria-describedby="register-password-hint" />
          <p id="register-password-hint" class="field-hint">至少 8 位，且同时包含字母和数字。</p>
        </div>
        <div class="form-item">
          <label for="register-confirm-password">确认密码</label>
          <input id="register-confirm-password" v-model="form.confirm_password" name="confirm_password" type="password" required minlength="8" autocomplete="new-password" aria-describedby="register-confirm-password-hint" />
          <p id="register-confirm-password-hint" class="field-hint">请再次输入上方设置的密码。</p>
        </div>
        <div class="consent-item">
          <input
            id="register-consent"
            v-model="acceptedNotice"
            name="accepted_notice"
            type="checkbox"
            required
            aria-describedby="registration-data-note"
          />
          <label for="register-consent">
            我已阅读并同意
            <router-link to="/terms" target="_blank" rel="noopener noreferrer">《服务条款与使用边界》</router-link>，并已了解
            <router-link to="/privacy" target="_blank" rel="noopener noreferrer">《隐私说明》</router-link>。
          </label>
        </div>
        <p id="registration-data-note" class="registration-data-note">
          创建账号仅要求用户名、邮箱和密码；姓名与手机号为可选资料，可在个人中心留空或清除。分类保留期及完整自助删除流程仍待治理复核。
        </p>
        <p v-if="error" id="register-error" ref="errorMessage" class="error" role="alert" aria-live="assertive" tabindex="-1">{{ error }}</p>
        <p v-if="success" id="register-success" ref="successMessage" class="success" role="status" aria-live="polite" tabindex="-1">{{ success }}</p>
        <button type="submit" :disabled="loading" :aria-disabled="loading">{{ loading ? '提交中...' : '注册' }}</button>
      </form>
      <p class="tips">注册还未完成？<router-link :to="{ path: '/verify-email', query: form.email ? { email: form.email } : {} }">继续验证邮箱</router-link></p>
      <p class="tips">已有账号？<router-link to="/login">去登录</router-link></p>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'
import { API_PREFIX } from '@/config/api'
import { formatApiErrorDetail } from '@/utils/apiError'

defineOptions({ name: 'UserRegister' })

const router = useRouter()
const loading = ref(false)
const error = ref('')
const success = ref('')
const acceptedNotice = ref(false)
const firstField = ref(null)
const errorMessage = ref(null)
const successMessage = ref(null)
const form = reactive({
  username: '',
  full_name: '',
  email: '',
  phone: '',
  password: '',
  confirm_password: '',
})

async function showError(message) {
  error.value = message
  await nextTick()
  errorMessage.value?.focus()
}

onMounted(() => firstField.value?.focus())

async function handleRegister() {
  error.value = ''
  success.value = ''
  if (form.password !== form.confirm_password) {
    await showError('两次输入密码不一致')
    return
  }
  if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
    await showError('密码至少 8 位，且需同时包含字母和数字')
    return
  }
  if (!acceptedNotice.value) {
    await showError('请先阅读服务条款和隐私说明，并确认同意与了解')
    return
  }
  loading.value = true
  try {
    const res = await fetch(`${API_PREFIX}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      await showError(formatApiErrorDetail(data))
      return
    }
    success.value = data.message || '请查收邮件并输入验证码'
    await nextTick()
    successMessage.value?.focus()
    setTimeout(() => router.replace({ path: '/verify-email', query: { email: form.email } }), 700)
  } catch {
    await showError('网络错误，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  --auth-text: #17365e;
  --auth-muted: #495f7c;
  --auth-link: #2456a6;
  color-scheme: light;
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  grid-template-columns: minmax(0, 660px);
  justify-content: center;
  align-content: center;
  gap: 18px;
  padding: 28px 18px 40px;
  box-sizing: border-box;
  background:
    linear-gradient(145deg, rgba(193, 211, 233, 0.92), rgba(165, 187, 216, 0.88)),
    url('/imgs/home/hero-bg.webp') center / cover no-repeat,
    #b5c9e2;
  color: var(--auth-text);
}

.home-link {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  color: var(--auth-link);
  font-weight: 600;
  text-decoration: none;
}

.home-link:hover { text-decoration: underline; }

.auth-card {
  min-width: 0;
  padding: 32px;
  border: 1px solid #91a8c7;
  border-radius: 8px;
  background: #edf3fb;
  box-shadow: 0 4px 12px rgba(27, 54, 93, 0.09), 0 20px 48px rgba(27, 54, 93, 0.21);
}

h1 {
  margin: 0;
  color: var(--auth-text);
  font-size: 1.85rem;
  line-height: 1.25;
  font-weight: 700;
}

.auth-subtitle {
  margin: 8px 0 24px;
  color: var(--auth-muted);
  font-size: 0.95rem;
  line-height: 1.6;
}

form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 17px 18px;
}

.form-item {
  min-width: 0;
}

.form-item label {
  display: block;
  margin-bottom: 7px;
  color: var(--auth-text);
  font-size: 0.95rem;
  font-weight: 600;
}

.form-item input {
  display: block;
  width: 100%;
  min-width: 0;
  min-height: 46px;
  padding: 10px 12px;
  box-sizing: border-box;
  border: 1px solid #758aa9;
  border-radius: 8px;
  background: #e4edf8;
  color: var(--auth-text);
  font-size: 1rem;
}

.form-item input:focus {
  border-color: var(--auth-link);
  background: #edf4fd;
}

.auth-page :is(a, input, button):focus-visible {
  outline: 2px solid var(--auth-link);
  outline-offset: 3px;
}

.field-hint,
.registration-data-note {
  color: var(--auth-muted);
  font-size: 0.82rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.field-hint {
  margin: 6px 0 0;
}

.consent-item {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding-top: 16px;
  border-top: 1px solid #cbd9ee;
  font-size: 0.92rem;
  line-height: 1.6;
}

.consent-item input {
  width: 20px;
  height: 20px;
  margin: 2px 0 0;
  accent-color: #2456a6;
}

.consent-item a,
.tips a {
  color: var(--auth-link);
  font-weight: 650;
  text-underline-offset: 3px;
}

.registration-data-note {
  grid-column: 1 / -1;
  margin: -7px 0 0 30px;
}

button {
  grid-column: 1 / -1;
  width: 100%;
  min-height: 48px;
  padding: 10px 14px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #315fba, #234c9d);
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0;
  cursor: pointer;
}

button:not(:disabled):hover {
  background: linear-gradient(135deg, #2b55aa, #1d428b);
}

button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.error,
.success {
  grid-column: 1 / -1;
  margin: 0;
  padding: 9px 12px;
  border-radius: 6px;
  font-size: 0.92rem;
  overflow-wrap: anywhere;
}

.error { background: #fbe9eb; color: #922c38; }
.success { background: #e5f3ed; color: #245d44; }

.error:focus,
.success:focus {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}

.tips {
  margin: 15px 0 0;
  color: var(--auth-muted);
  font-size: 0.92rem;
  text-align: center;
}

@media (max-width: 600px) {
  .auth-page {
    align-content: start;
    gap: 12px;
    padding: 14px 12px 24px;
  }

  .auth-card {
    padding: 22px 16px;
  }

  form {
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
  }

  .registration-data-note {
    margin-left: 0;
  }
}
</style>
