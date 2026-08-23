<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Activity, ChevronDown, CircleHelp, Crosshair, FileText, Folder, LogOut, Search, User, X } from 'lucide-vue-next'
import { getToken, getAuthChangedEventName } from '@/utils/auth'
import LoginModal from './LoginModal.vue'

const props = defineProps({
  routePreloaders: {
    type: Object,
    required: true,
  },
})

const router = useRouter()
const route = useRoute()
const navLogoUrl = '/imgs/logo2_orig.png'
const DROPDOWN_CLOSE_DELAY = 280
const PRIMARY_PRELOAD_DELAY = 120

const preloadedRoutes = new Set()
const primaryPreloadTimers = new Set()

// 监听路由变化，确保组件状态正确
const currentPath = ref(route.path)

const hasToken = ref(!!getToken())

/** 登录弹窗 */
const showLoginModal = ref(false)

/** 顶栏情报检索关键词 */
const globalSearchQuery = ref('')

// 移动端菜单
const isMobileMenuOpen = ref(false)

// 移动端子菜单展开
const mobileExpandedMenus = ref({})

function toggleMobileSubmenu(key) {
  mobileExpandedMenus.value[key] = !mobileExpandedMenus.value[key]
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
  mobileExpandedMenus.value = {}
}

function mobileNavigateTo(path) {
  navigateTo(path)
  closeMobileMenu()
}

/** 移动端搜索关键词 */
const mobileSearchQuery = ref('')

function submitMobileSearch() {
  const q = String(mobileSearchQuery.value || '').trim()
  closeMobileMenu()
  if (q) {
    router.push({ path: '/data-service/data-search', query: { topic: q } })
  } else {
    router.push('/data-service/data-search')
  }
  mobileSearchQuery.value = ''
}

function openNewUserGuide() {
  closeMobileMenu()
  window.dispatchEvent(new CustomEvent('openGlobeMindGuide'))
}

// 添加监听路由变化的方法
const handleRouteChange = () => {
  currentPath.value = route.path
  hasToken.value = !!getToken()
  closeDropdowns()
}

// 新增：判断当前页面是否需要隐藏导航栏
const shouldHideNavbar = computed(() => {
  return route.meta?.hideNavbar === true
})

// 判断是否是首页
const isHomePage = computed(() => {
  return route.path === '/'
})

/** Orbis 展示页：深色顶栏以适配太空主题背景 */
const isShowcasePage = computed(() => route.path === '/showcase')

/** 数值分析预警：白色顶栏 */
const isFinancialTerminal = computed(() => route.path === '/financial-terminal')

// 检查数据服务系统下拉菜单是否应该高亮（不含报告中心）
const isDataServiceActive = computed(() => {
  const dropdownRoutes = ['/data-service/data-search', '/data-service/pipeline-monitor']
  return dropdownRoutes.some(p => route.path === p || route.path.startsWith(p + '/')) || route.path === '/data-service'
})

// 数据服务系统下拉菜单状态
const isDataServiceDropdownOpen = ref(false)
// 用户中心下拉菜单状态
const isUserCenterDropdownOpen = ref(false)

// 定时器引用
let dataServiceTimer = null
let userCenterTimer = null
let removeRouteAfterEach = null

function clearDropdownTimers() {
  if (dataServiceTimer) {
    clearTimeout(dataServiceTimer)
    dataServiceTimer = null
  }
  if (userCenterTimer) {
    clearTimeout(userCenterTimer)
    userCenterTimer = null
  }
}

function closeDropdowns() {
  clearDropdownTimers()
  isDataServiceDropdownOpen.value = false
  isUserCenterDropdownOpen.value = false
}

function preloadRoute(path) {
  schedulePrimaryPreload(path)
}

function loadRouteNow(path) {
  const loader = props.routePreloaders[path]
  if (!loader || preloadedRoutes.has(path)) return
  preloadedRoutes.add(path)
  Promise.resolve()
    .then(loader)
    .catch(() => preloadedRoutes.delete(path))
}

function schedulePrimaryPreload(path) {
  const timer = setTimeout(() => {
    primaryPreloadTimers.delete(timer)
    loadRouteNow(path)
  }, PRIMARY_PRELOAD_DELAY)
  primaryPreloadTimers.add(timer)
}

// 监听自定义事件，当返回首页时重置状态
const handleRouteToHome = () => {
  closeDropdowns()
}

// 监听显示登录弹窗的自定义事件
const handleShowLoginModal = () => {
  showLoginModal.value = true
}

onMounted(() => {
  removeRouteAfterEach = router.afterEach(handleRouteChange)
  // 监听自定义事件
  window.addEventListener('routeToHome', handleRouteToHome)
  // 监听显示登录弹窗事件
  window.addEventListener('showLoginModal', handleShowLoginModal)
  // 路由回退时，强制触发页面重绘，解决布局错乱
  window.dispatchEvent(new Event('resize'))
  window.addEventListener(getAuthChangedEventName(), handleRouteChange)

  // document.body.style.paddingTop = '60px'
})

onUnmounted(() => {
  clearDropdownTimers()
  for (const timer of primaryPreloadTimers) {
    clearTimeout(timer)
  }
  primaryPreloadTimers.clear()
  if (removeRouteAfterEach) {
    removeRouteAfterEach()
    removeRouteAfterEach = null
  }
  window.removeEventListener('routeToHome', handleRouteToHome)
  window.removeEventListener('showLoginModal', handleShowLoginModal)
  window.removeEventListener(getAuthChangedEventName(), handleRouteChange)

  if (shouldHideNavbar.value) {
    document.body.style.paddingTop = '0'
  }
})

// 鼠标进入数据服务系统导航项
const enterDataServiceDropdown = () => {
  isDataServiceDropdownOpen.value = true
  // 关闭用户中心下拉菜单
  isUserCenterDropdownOpen.value = false
  clearDropdownTimers()
  preloadRoute('/data-service/data-search')
}

// 鼠标进入数据服务系统下拉菜单内容
const enterDataServiceDropdownContent = () => {
  clearDropdownTimers()
}

// 鼠标离开数据服务系统下拉菜单
const leaveDataServiceDropdown = () => {
  if (dataServiceTimer) clearTimeout(dataServiceTimer)
  dataServiceTimer = setTimeout(() => {
    isDataServiceDropdownOpen.value = false
    dataServiceTimer = null
  }, DROPDOWN_CLOSE_DELAY)
}

// 鼠标进入用户中心导航项
const enterUserCenterDropdown = () => {
  isUserCenterDropdownOpen.value = true
  // 关闭数据服务系统下拉菜单
  isDataServiceDropdownOpen.value = false
  clearDropdownTimers()
  preloadRoute('/user-center/personal-center')
}

// 鼠标进入用户中心下拉菜单内容
const enterUserCenterDropdownContent = () => {
  clearDropdownTimers()
}

// 鼠标离开用户中心下拉菜单
const leaveUserCenterDropdown = () => {
  if (userCenterTimer) clearTimeout(userCenterTimer)
  userCenterTimer = setTimeout(() => {
    isUserCenterDropdownOpen.value = false
    userCenterTimer = null
  }, DROPDOWN_CLOSE_DELAY)
}

// 导航到指定路由
const navigateTo = (path) => {
  closeDropdowns()
  preloadRoute(path)
  router.push(path)
}

/** 顶栏情报检索：跳转数据搜索并预填主题 */
const submitGlobalSearch = () => {
  const q = String(globalSearchQuery.value || '').trim()
  closeDropdowns()
  preloadRoute('/data-service/data-search')
  if (q) {
    router.push({ path: '/data-service/data-search', query: { topic: q } })
  } else {
    router.push('/data-service/data-search')
  }
  globalSearchQuery.value = ''
}

</script>

<template>
  <div
    class="header"
    :class="{
      'header-transparent': isHomePage,
      'header-white': !isHomePage && !isShowcasePage && !isFinancialTerminal,
      'header-showcase': isShowcasePage,
      'header-financial': isFinancialTerminal,
    }"
    v-if="!shouldHideNavbar"
  >
    <div class="logo-corner" @pointerenter="preloadRoute('/')" @click="navigateTo('/')" title="返回首页">
      <span class="logo-shine" aria-hidden="true" />
      <img :src="navLogoUrl" alt="GlobeMind" class="logo-img" width="204" height="46" fetchpriority="high" decoding="async" />
    </div>

    <!-- 移动端汉堡菜单按钮 -->
    <button
      class="mobile-hamburger"
      :class="{ 'mobile-hamburger--active': isMobileMenuOpen }"
      @click="isMobileMenuOpen = !isMobileMenuOpen"
      aria-label="打开菜单"
      title="菜单"
    >
      <span class="hamburger-line" />
      <span class="hamburger-line" />
      <span class="hamburger-line" />
    </button>

    <div class="nav-shell">
      <div class="nav-center">
        <div class="middle">
          <ul class="nav-list">
        <!-- 使用 <router-link> 实现路由跳转，to 属性指定目标路径 -->
        <li class="nav-item"><router-link to="/" @pointerenter="preloadRoute('/')" @focus="preloadRoute('/')" @click="closeDropdowns">首页</router-link></li>
        <li class="nav-item"><router-link to="/data-service/ground-news" @pointerenter="preloadRoute('/data-service/ground-news')" @focus="preloadRoute('/data-service/ground-news')" @click="closeDropdowns">全球新闻观察台</router-link></li>
        <li class="nav-item"><router-link to="/sentiment-analysis" @pointerenter="preloadRoute('/sentiment-analysis')" @focus="preloadRoute('/sentiment-analysis')" @click="closeDropdowns">涉华舆情分析</router-link></li>
        <li class="nav-item"><router-link to="/data-service/story-graph" @pointerenter="preloadRoute('/data-service/story-graph')" @focus="preloadRoute('/data-service/story-graph')" @click="closeDropdowns">事件故事脉络</router-link></li>
        <li
          class="nav-item dropdown-item"
          :class="{ 'nav-item-active': isDataServiceActive }"
          @pointerenter="enterDataServiceDropdown"
          @pointerleave="leaveDataServiceDropdown"
          @focusin="enterDataServiceDropdown"
          @focusout="leaveDataServiceDropdown"
        >
          <div class="dropdown-trigger" @click="navigateTo('/data-service/data-search')">
            <span>数据服务</span>
            <ChevronDown class="nav-icon dropdown-icon" :class="{ rotate: isDataServiceDropdownOpen }" :size="14" />
          </div>
          <div
            class="dropdown-menu"
            :class="{ show: isDataServiceDropdownOpen }"
            @pointerenter="enterDataServiceDropdownContent"
            @pointerleave="leaveDataServiceDropdown"
          >
            <!-- 修改后 -->
            <div
              class="dropdown-item-content"
              @click="navigateTo('/data-service/data-search')"
              style="--item-index: 0"
            >
              <FileText class="nav-icon dropdown-item-icon" :size="16" />
              <span>数据搜索</span>
            </div>

            <div
              class="dropdown-item-content"
              @click="navigateTo('/data-service/pipeline-monitor')"
              style="--item-index: 1"
            >
              <Activity class="nav-icon dropdown-item-icon" :size="16" />
              <span>管线监控</span>
            </div>

          </div>
        </li>
        <li class="nav-item"><router-link to="/data-service/report-center" @pointerenter="preloadRoute('/data-service/report-center')" @focus="preloadRoute('/data-service/report-center')" @click="closeDropdowns">报告中心</router-link></li>
        <li class="nav-item"><router-link to="/data-assistant" @pointerenter="preloadRoute('/data-assistant')" @focus="preloadRoute('/data-assistant')" @click="closeDropdowns">数据助手</router-link></li>
        <li class="nav-item"><router-link to="/financial-terminal" @pointerenter="preloadRoute('/financial-terminal')" @focus="preloadRoute('/financial-terminal')" @click="closeDropdowns">数值分析预警</router-link></li>
        <li class="nav-item"><router-link to="/academic-data" @pointerenter="preloadRoute('/academic-data')" @focus="preloadRoute('/academic-data')" @click="closeDropdowns">智库信息汇聚</router-link></li>
        <li
          v-if="hasToken"
          class="nav-item dropdown-item"
          @pointerenter="enterUserCenterDropdown"
          @pointerleave="leaveUserCenterDropdown"
          @focusin="enterUserCenterDropdown"
          @focusout="leaveUserCenterDropdown"
        >
          <div class="dropdown-trigger" @click="navigateTo('/user-center/personal-center')">
            <span>用户中心</span>
            <ChevronDown class="nav-icon dropdown-icon" :class="{ rotate: isUserCenterDropdownOpen }" :size="14" />
          </div>
          <div
            class="dropdown-menu"
            :class="{ show: isUserCenterDropdownOpen }"
            @pointerenter="enterUserCenterDropdownContent"
            @pointerleave="leaveUserCenterDropdown"
          >
            <div
              class="dropdown-item-content"
              style="--item-index: 0"
              @click="navigateTo('/user-center/personal-center')"
            >
              <User class="nav-icon dropdown-item-icon" :size="16" />
              <span>个人中心</span>
            </div>
            <div
              class="dropdown-item-content"
              @click="navigateTo('/user-center/my-applications')"
              style="--item-index: 1"
            >
              <Crosshair class="nav-icon dropdown-item-icon" :size="16" />
              <span>我的报告</span>
            </div>
            <div
              class="dropdown-item-content"
              @click="navigateTo('/user-center/help-docs')"
              style="--item-index: 2"
            >
              <FileText class="nav-icon dropdown-item-icon" :size="16" />
              <span>帮助文档</span>
            </div>
            <div
              class="dropdown-item-content"
              @click="navigateTo('/user-center/my-collections')"
              style="--item-index: 3"
            >
              <Folder class="nav-icon dropdown-item-icon" :size="16" />
              <span>我的收录</span>
            </div>
            <div
              class="dropdown-item-content"
              @click="navigateTo('/user-center/logout')"
              style="--item-index: 4"
            >
              <LogOut class="nav-icon dropdown-item-icon" :size="16" />
              <span>退出登录</span>
            </div>
          </div>
        </li>
          </ul>
        </div>

        <router-link class="about-us-link" to="/about-us" @pointerenter="preloadRoute('/about-us')" @focus="preloadRoute('/about-us')" @click="closeDropdowns">关于我们</router-link>
      </div>

      <!-- 页面最右：搜索 + 登录 -->
      <div class="header-actions header-actions--right">
        <button class="action-btn guide-btn" data-tour="guide-entry" type="button" title="新手指南" aria-label="打开新手指南" @click="openNewUserGuide">
          <CircleHelp class="nav-icon" :size="19" />
        </button>
        <form class="header-search" data-tour="global-search" @submit.prevent="submitGlobalSearch">
          <button type="submit" class="header-search__submit" title="检索" aria-label="提交检索">
            <Search class="nav-icon" :size="18" />
          </button>
          <input
            v-model.trim="globalSearchQuery"
            type="search"
            class="header-search__input"
            placeholder="检索情报、实体、事件…"
            enterkeyhint="search"
            autocomplete="off"
            aria-label="情报检索"
          />
        </form>
        <!-- 未登录：显示"登录"按钮；已登录：显示小人图标 -->
        <button
          v-if="!hasToken"
          class="action-btn login-btn"
          @click="showLoginModal = true"
          title="登录"
        >
          登录
        </button>
        <button
          v-else
          class="action-btn user-btn"
          @click="navigateTo('/user-center/personal-center')"
          title="个人中心"
        >
          <User class="nav-icon" :size="20" />
        </button>
      </div>
    </div>
    <!-- 移动端抽屉菜单 -->
    <Teleport to="body">
      <transition name="mobile-drawer">
        <div v-if="isMobileMenuOpen" class="mobile-drawer-overlay" @click="closeMobileMenu">
          <div class="mobile-drawer" @click.stop>
          <div class="mobile-drawer-header">
            <button class="mobile-drawer-close" @click="closeMobileMenu" aria-label="关闭菜单">
              <X class="nav-icon" :size="24" />
            </button>
          </div>

          <!-- 移动端搜索 -->
          <form class="mobile-search" @submit.prevent="submitMobileSearch">
            <Search class="nav-icon mobile-search-icon" :size="18" />
            <input
              v-model.trim="mobileSearchQuery"
              type="search"
              class="mobile-search-input"
              placeholder="检索情报、实体、事件…"
              enterkeyhint="search"
              autocomplete="off"
            />
          </form>

          <!-- 移动端导航列表 -->
          <nav class="mobile-nav">
            <router-link class="mobile-nav-item" to="/" @click="closeMobileMenu">
              <span>首页</span>
            </router-link>
            <router-link class="mobile-nav-item" to="/data-service/ground-news" @click="closeMobileMenu">
              <span>全球新闻观察台</span>
            </router-link>
            <router-link class="mobile-nav-item" to="/sentiment-analysis" @click="closeMobileMenu">
              <span>涉华舆情分析</span>
            </router-link>
            <router-link class="mobile-nav-item" to="/data-service/story-graph" @click="closeMobileMenu">
              <span>事件故事脉络</span>
            </router-link>

            <!-- 数据服务（含子菜单） -->
            <div class="mobile-nav-item mobile-nav-item--has-children">
              <button
                type="button"
                class="mobile-nav-item-row"
                :aria-expanded="Boolean(mobileExpandedMenus.dataService)"
                @click="toggleMobileSubmenu('dataService')"
              >
                <span>数据服务</span>
                <ChevronDown class="nav-icon mobile-nav-arrow" :class="{ 'arrow-open': mobileExpandedMenus.dataService }" :size="14" />
              </button>
              <div v-if="mobileExpandedMenus.dataService" class="mobile-submenu">
                <div class="mobile-submenu-item" @click="mobileNavigateTo('/data-service/data-search')">
                  <FileText class="nav-icon mobile-submenu-icon" :size="16" />
                  <span>数据搜索</span>
                </div>
                <div class="mobile-submenu-item" @click="mobileNavigateTo('/data-service/pipeline-monitor')">
                  <Activity class="nav-icon mobile-submenu-icon" :size="16" />
                  <span>管线监控</span>
                </div>
              </div>
            </div>

            <router-link class="mobile-nav-item" to="/data-service/report-center" @click="closeMobileMenu">
              <span>报告中心</span>
            </router-link>
            <router-link class="mobile-nav-item" to="/data-assistant" @click="closeMobileMenu">
              <span>数据助手</span>
            </router-link>
            <router-link class="mobile-nav-item" to="/financial-terminal" @click="closeMobileMenu">
              <span>数值分析预警</span>
            </router-link>
            <router-link class="mobile-nav-item" to="/academic-data" @click="closeMobileMenu">
              <span>智库信息汇聚</span>
            </router-link>
            <button class="mobile-nav-item mobile-guide-item" type="button" @click="openNewUserGuide">
              <span>新手指南</span>
              <CircleHelp class="nav-icon" :size="18" />
            </button>

            <!-- 用户中心（含子菜单） -->
            <template v-if="hasToken">
              <div class="mobile-nav-item mobile-nav-item--has-children">
                <button
                  type="button"
                  class="mobile-nav-item-row"
                  :aria-expanded="Boolean(mobileExpandedMenus.userCenter)"
                  @click="toggleMobileSubmenu('userCenter')"
                >
                  <span>用户中心</span>
                  <ChevronDown class="nav-icon mobile-nav-arrow" :class="{ 'arrow-open': mobileExpandedMenus.userCenter }" :size="14" />
                </button>
                <div v-if="mobileExpandedMenus.userCenter" class="mobile-submenu">
                  <div class="mobile-submenu-item" @click="mobileNavigateTo('/user-center/personal-center')">
                    <User class="nav-icon mobile-submenu-icon" :size="16" />
                    <span>个人中心</span>
                  </div>
                  <div class="mobile-submenu-item" @click="mobileNavigateTo('/user-center/my-applications')">
                    <Crosshair class="nav-icon mobile-submenu-icon" :size="16" />
                    <span>我的报告</span>
                  </div>
                  <div class="mobile-submenu-item" @click="mobileNavigateTo('/user-center/help-docs')">
                    <FileText class="nav-icon mobile-submenu-icon" :size="16" />
                    <span>帮助文档</span>
                  </div>
                  <div class="mobile-submenu-item" @click="mobileNavigateTo('/user-center/my-collections')">
                    <Folder class="nav-icon mobile-submenu-icon" :size="16" />
                    <span>我的收录</span>
                  </div>
                  <div class="mobile-submenu-item" @click="mobileNavigateTo('/user-center/logout')">
                    <LogOut class="nav-icon mobile-submenu-icon" :size="16" />
                    <span>退出登录</span>
                  </div>
                </div>
              </div>
            </template>

            <router-link class="mobile-nav-item" to="/about-us" @click="closeMobileMenu">
              <span>关于我们</span>
            </router-link>
          </nav>

          <!-- 移动端登录/用户按钮 -->
          <div class="mobile-drawer-footer">
            <button
              v-if="!hasToken"
              class="mobile-login-btn"
              @click="closeMobileMenu(); showLoginModal = true"
            >
              登录 / 注册
            </button>
            <div v-else class="mobile-user-info" @click="mobileNavigateTo('/user-center/personal-center')">
              <User class="nav-icon" :size="20" />
              <span>个人中心</span>
            </div>
          </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <LoginModal :visible="showLoginModal" @close="showLoginModal = false" />
  </div>
</template>

<style src="./appNav.css"></style>
