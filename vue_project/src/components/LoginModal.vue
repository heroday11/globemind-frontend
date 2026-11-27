<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { API_PREFIX } from '@/config/api'
import { formatApiErrorDetail } from '@/utils/apiError'
import { setToken, setCurrentUser } from '@/utils/auth'
import { restoreDialogFocus, trapDialogTab } from '@/utils/dialogFocus'

const props = defineProps({ visible: Boolean })
const emit = defineEmits(['close', 'login-success'])

const loginUsername = ref('')
const loginPassword = ref('')
const loginError = ref('')
const loginLoading = ref(false)
const dialogCard = ref(null)
const usernameField = ref(null)
const errorMessage = ref(null)
const mfaChallenge = ref('')
const mfaMethod = ref('totp')
const mfaValue = ref('')
const mfaField = ref(null)
let returnFocusTarget = null

function closeDialog() {
  if (loginLoading.value) return
  emit('close')
}

function handleRegisterClick(event) {
  if (loginLoading.value) {
    event.preventDefault()
    return
  }
  emit('close')
}

function handleDialogKeydown(event) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeDialog()
    return
  }
  trapDialogTab(event, dialogCard.value, document.activeElement)
}

function restoreOpeningFocus() {
  restoreDialogFocus(returnFocusTarget)
  returnFocusTarget = null
}

function resetLoginState() {
  loginUsername.value = ''
  loginPassword.value = ''
  loginError.value = ''
  mfaChallenge.value = ''
  mfaMethod.value = 'totp'
  mfaValue.value = ''
}

async function showLoginError(message) {
  loginError.value = String(message || '登录失败')
  await nextTick()
  errorMessage.value?.focus()
}

watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      returnFocusTarget = document.activeElement
      loginError.value = ''
      await nextTick()
      usernameField.value?.focus()
      return
    }
    resetLoginState()
    restoreOpeningFocus()
  },
  { immediate: true },
)

onUnmounted(restoreOpeningFocus)

async function handleLogin() {
  loginError.value = ''
  loginLoading.value = true
  try {
    let res
    try {
      const completingMfa = Boolean(mfaChallenge.value)
      const payload = completingMfa
        ? {
            challenge: mfaChallenge.value,
            ...(mfaMethod.value === 'totp'
              ? { code: mfaValue.value }
              : {
                  recovery_code: String(mfaValue.value || '')
                    .trim()
                    .toUpperCase(),
                }),
          }
        : { username: loginUsername.value, password: loginPassword.value }
      res = await fetch(`${API_PREFIX}${completingMfa ? '/auth/login/mfa' : '/auth/login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch {
      await showLoginError('网络错误，请稍后重试')
      return
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      await showLoginError(formatApiErrorDetail(data))
      return
    }
    if (data.mfa_required === true && data.challenge && !data.access_token) {
      mfaChallenge.value = data.challenge
      loginPassword.value = ''
      mfaValue.value = ''
      await nextTick()
      mfaField.value?.focus()
    } else if (data.access_token) {
      try {
        setToken(data.access_token)
      } catch {
        await showLoginError('已收到登录响应，但浏览器无法保存登录状态。请允许站点存储后重试。')
        return
      }
      if (data.user) {
        try {
          setCurrentUser(data.user)
        } catch {
          console.warn('登录成功，但浏览器未能保存用户资料。')
        }
      }
      resetLoginState()
      window.dispatchEvent(new CustomEvent('loginSuccess'))
      emit('login-success')
      emit('close')
    } else {
      await showLoginError('登录响应无效：服务未返回访问令牌。')
    }
  } finally {
    loginLoading.value = false
  }
}

async function restartPasswordLogin() {
  mfaChallenge.value = ''
  mfaValue.value = ''
  loginError.value = ''
  await nextTick()
  usernameField.value?.focus()
}

watch(mfaMethod, async () => {
  mfaValue.value = ''
  await nextTick()
  mfaField.value?.focus()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="login-modal-overlay" @click.self="closeDialog">
      <div
        ref="dialogCard"
        class="login-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        aria-describedby="login-modal-subtitle"
        tabindex="-1"
        @click.stop
        @keydown="handleDialogKeydown"
      >
        <h2 id="login-modal-title" class="login-modal-title">
          {{ mfaChallenge ? '完成双因素验证' : '登录 GlobeMind' }}
        </h2>
        <p id="login-modal-subtitle" class="login-modal-subtitle">
          {{
            mfaChallenge
              ? '请输入动态验证码或恢复码以完成登录。'
              : '同步收藏、使用数据助手并管理你的研究报告'
          }}
        </p>
        <form class="login-modal-form" :aria-busy="loginLoading" @submit.prevent="handleLogin">
          <div v-if="!mfaChallenge" class="login-modal-item">
            <label for="login-modal-username">用户名或邮箱</label>
            <input
              id="login-modal-username"
              ref="usernameField"
              v-model.trim="loginUsername"
              name="username"
              type="text"
              required
              autocomplete="username"
              placeholder="请输入用户名或邮箱"
            />
          </div>
          <div v-if="!mfaChallenge" class="login-modal-item">
            <label for="login-modal-password">密码</label>
            <input
              id="login-modal-password"
              v-model="loginPassword"
              name="password"
              type="password"
              required
              autocomplete="current-password"
              placeholder="请输入密码"
            />
          </div>
          <template v-else>
            <fieldset class="login-modal-mfa-methods">
              <legend>验证方式</legend>
              <label><input v-model="mfaMethod" type="radio" value="totp" />动态验证码</label>
              <label><input v-model="mfaMethod" type="radio" value="recovery" />恢复码</label>
            </fieldset>
            <div class="login-modal-item">
              <label for="login-modal-mfa-code">{{
                mfaMethod === 'totp' ? '6 位动态验证码' : '恢复码'
              }}</label>
              <input
                id="login-modal-mfa-code"
                ref="mfaField"
                v-model="mfaValue"
                :inputmode="mfaMethod === 'totp' ? 'numeric' : 'text'"
                :autocomplete="mfaMethod === 'totp' ? 'one-time-code' : 'off'"
                :pattern="
                  mfaMethod === 'totp' ? '[0-9]{6}' : '[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}'
                "
                required
              />
            </div>
          </template>
          <p
            v-if="loginError"
            id="login-modal-error"
            ref="errorMessage"
            class="login-modal-error"
            role="alert"
            aria-live="assertive"
            tabindex="-1"
          >
            {{ loginError }}
          </p>
          <div class="login-modal-buttons">
            <button type="submit" class="login-modal-submit" :disabled="loginLoading">
              {{ loginLoading ? '验证中...' : mfaChallenge ? '验证并登录' : '登录' }}
            </button>
            <button
              type="button"
              class="login-modal-cancel"
              @click="mfaChallenge ? restartPasswordLogin() : closeDialog()"
              :disabled="loginLoading"
            >
              {{ mfaChallenge ? '返回密码登录' : '取消' }}
            </button>
          </div>
          <div class="login-modal-register">
            <router-link
              to="/register"
              :aria-disabled="loginLoading"
              :tabindex="loginLoading ? -1 : undefined"
              @click="handleRegisterClick"
              >注册账号</router-link
            >
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.login-modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  padding: 16px;
  box-sizing: border-box;
  overflow: auto;
  overscroll-behavior: contain;
  background: rgba(15, 36, 67, 0.45);
  z-index: 9999;
}

.login-modal-card {
  width: 100%;
  max-width: 420px;
  min-width: 0;
  margin: auto;
  padding: 28px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 20px;
  background: rgba(247, 250, 255, 0.88);
  box-shadow: 0 24px 56px rgba(20, 57, 109, 0.28), inset 0 1px 0 #fff;
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  color: #172b46;
}

.login-modal-title {
  margin: 0 0 6px;
  color: #173d6a;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.25;
}

.login-modal-subtitle {
  margin: 0 0 22px;
  color: #53647a;
  font-size: 14px;
  line-height: 1.5;
}

.login-modal-form {
  display: grid;
  gap: 16px;
}

.login-modal-item {
  display: grid;
  gap: 6px;
}

.login-modal-item label {
  font-size: 14px;
  font-weight: 600;
}

.login-modal-item input {
  width: 100%;
  min-height: 44px;
  padding: 9px 12px;
  box-sizing: border-box;
  border: 1px solid #b4c3d7;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.88);
  color: inherit;
  font-size: 16px;
}

.login-modal-item input::placeholder {
  color: #64748b;
}

.login-modal-item input:focus {
  background: #fff;
  box-shadow: 0 0 0 4px rgba(73, 103, 204, 0.14);
}

.login-modal-item input:focus,
.login-modal-card :is(button, a, input[type='radio']):focus-visible {
  border-color: #2563eb;
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.login-modal-mfa-methods {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  min-width: 0;
  margin: 0;
  padding: 8px 12px 12px;
  border: 1px solid #b9c6d6;
  border-radius: 6px;
}

.login-modal-mfa-methods legend {
  padding: 0 4px;
  font-weight: 600;
}

.login-modal-mfa-methods label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.login-modal-error {
  margin: 0;
  padding: 8px 12px;
  border-radius: 6px;
  background: #fff1f0;
  color: #9e2118;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.login-modal-error:focus-visible {
  outline: 2px solid #9e2118;
  outline-offset: 2px;
}

.login-modal-buttons {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 10px;
}

.login-modal-buttons button {
  min-height: 44px;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.login-modal-submit {
  background: linear-gradient(135deg, #4f66d6, #3c52bd);
  box-shadow: 0 4px 12px rgba(60, 82, 189, 0.23);
  color: #fff;
}

.login-modal-submit:hover:not(:disabled) {
  background: linear-gradient(135deg, #465cc9, #344aaf);
}

.login-modal-buttons .login-modal-cancel {
  border-color: #b4c3d7;
  background: rgba(255, 255, 255, 0.56);
  color: #314663;
}

.login-modal-cancel:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.9);
}

.login-modal-buttons button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-modal-register {
  padding-top: 12px;
  border-top: 1px solid rgba(107, 132, 166, 0.26);
  text-align: center;
}

.login-modal-register a {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  color: #1d4ed8;
  font-size: 14px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.login-modal-register a:hover {
  color: #1e40af;
}

@media (max-width: 480px) {
  .login-modal-card {
    padding: 20px;
  }

  .login-modal-title {
    font-size: 24px;
  }
}
</style>
