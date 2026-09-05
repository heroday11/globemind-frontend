<script setup>
import '@/styles/user-center.css'
import { BookOpen, CircleHelp, FileText, LogOut, Star, UserRound } from 'lucide-vue-next'

const navItems = [
  { path: '/user-center/personal-center', label: '个人中心', icon: UserRound },
  { path: '/user-center/my-applications', label: '我的报告', icon: FileText },
  { path: '/user-center/help-docs', label: '帮助文档', icon: BookOpen },
  { path: '/user-center/my-collections', label: '我的收录', icon: Star },
  { path: '/user-center/logout', label: '退出登录', icon: LogOut, muted: true },
]

function openNewUserGuide() {
  window.dispatchEvent(new CustomEvent('openGlobeMindGuide'))
}
</script>

<template>
  <div class="uc-shell uc-theme">
    <aside class="uc-sidebar" aria-label="用户中心导航">
      <div class="uc-side-head">
        <span class="uc-side-title">用户中心</span>
        <span class="uc-side-sub">账号与偏好</span>
      </div>
      <nav class="uc-nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="uc-nav-link"
          :class="{ 'is-muted': item.muted }"
        >
          <component :is="item.icon" class="uc-nav-ico" :size="18" :stroke-width="1.8" aria-hidden="true" />
          <span class="uc-nav-label">{{ item.label }}</span>
        </router-link>
      </nav>
      <button type="button" class="uc-tour-entry" data-tour="account-guide-entry" @click="openNewUserGuide">
        <span class="uc-tour-entry__mark" aria-hidden="true">
          <CircleHelp :size="18" :stroke-width="2" />
        </span>
        <span class="uc-tour-entry__copy">
          <strong>重看新手教程</strong>
          <small>逐页认识核心功能</small>
        </span>
      </button>
    </aside>

    <main class="uc-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.uc-shell {
  display: flex;
  min-height: calc(100vh - 64px);
  margin-top: 64px;
  width: 100%;
  box-sizing: border-box;
}

.uc-sidebar {
  width: 236px;
  flex-shrink: 0;
  background: #ffffff;
  border-right: 1px solid var(--uc-border);
  padding: 0 0 24px;
  position: sticky;
  top: 64px;
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.uc-side-head {
  padding: clamp(22px, 3vw, 30px) 20px clamp(18px, 2.5vw, 22px);
  border-bottom: 1px solid var(--uc-border-soft);
  margin-bottom: 8px;
}

.uc-side-title {
  display: block;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--uc-text);
  letter-spacing: 0;
}

.uc-side-sub {
  display: block;
  margin-top: 6px;
  font-size: 0.84rem;
  color: var(--uc-muted);
  font-weight: 500;
}

.uc-nav {
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  gap: 4px;
}

.uc-nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--uc-radius-sm);
  text-decoration: none;
  color: var(--uc-muted);
  font-size: 0.95rem;
  font-weight: 550;
  transition:
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.uc-nav-link:hover {
  background: #eef2ff;
  color: var(--uc-text);
}

.uc-nav-link.router-link-active {
  background: #eef2ff;
  color: var(--uc-accent);
  box-shadow: inset 0 0 0 1px rgba(91, 114, 223, 0.22);
}

.uc-nav-link.is-muted {
  color: var(--uc-muted);
}

.uc-nav-link.is-muted:hover {
  background: #fff5f5;
  color: #b91c1c;
}

.uc-nav-ico {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.uc-nav-label {
  flex: 1;
}

.uc-tour-entry {
  display: flex;
  align-items: center;
  gap: 11px;
  margin: auto 12px 0;
  padding: 12px;
  border: 1px solid rgba(91, 114, 223, .24);
  border-radius: 12px;
  color: #26375f;
  background: linear-gradient(135deg, #f0f4ff, #ffffff);
  text-align: left;
  cursor: pointer;
}

.uc-tour-entry__mark { width: 31px; height: 31px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 9px; color: #fff; background: #5b72df; font-weight: 900; }
.uc-tour-entry__copy { display: grid; gap: 2px; }
.uc-tour-entry strong { font-size: 13px; }
.uc-tour-entry small { color: #7180a8; font-size: 11px; }
.uc-tour-entry:hover { border-color: rgba(91, 114, 223, .45); box-shadow: 0 8px 22px rgba(91, 114, 223, .12); }

.uc-main {
  flex: 1;
  min-width: 0;
  padding: 36px clamp(28px, 4vw, 56px) 64px;
  box-sizing: border-box;
}

@media (min-width: 901px) {
  .uc-shell {
    display: block;
  }

  .uc-sidebar {
    position: fixed;
    inset: 64px auto 0 0;
    z-index: 20;
    max-height: none;
  }

  .uc-main {
    margin-left: 236px;
  }
}

@media (max-width: 900px) {
  .uc-shell {
    flex-direction: column;
  }

  .uc-sidebar {
    width: 100%;
    position: relative;
    top: 0;
    max-height: none;
    border-right: none;
    border-bottom: 1px solid var(--uc-border);
    display: block;
    overflow: hidden;
  }

  .uc-side-head {
    display: none;
  }

  .uc-nav {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 6px;
    padding: 10px 12px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .uc-nav::-webkit-scrollbar { display: none; }

  .uc-nav-link {
    flex: 0 0 auto;
    min-width: auto;
    padding: 9px 12px;
    justify-content: center;
    white-space: nowrap;
  }

  .uc-tour-entry { display: none; }

  .uc-main {
    padding: 20px 16px 40px;
  }
}
</style>
