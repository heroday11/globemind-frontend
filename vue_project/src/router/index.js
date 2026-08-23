// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'

import { getToken } from '@/utils/auth'
import { routeViewLoaders } from './routePreloaders.js'

const DEFAULT_TITLE = 'GlobeMind · 多语言地缘情报平台'
const ROUTE_TITLES = Object.freeze({
  '/': DEFAULT_TITLE,
  '/login': '登录 · GlobeMind',
  '/register': '创建账号 · GlobeMind',
  '/forgot-password': '找回密码 · GlobeMind',
  '/reset-password': '重置密码 · GlobeMind',
  '/data-service/data-search': '新闻与事件检索 · GlobeMind',
  '/data-service/story-graph': '事件故事脉络 · GlobeMind',
  '/data-service/ground-news': '全球事件研究总览 · GlobeMind',
  '/data-service/ground-news-desk': '新闻分析工作台 · GlobeMind',
  '/data-service/report-center': '报告中心 · GlobeMind',
  '/data-service/pipeline-monitor': '管线监控 · GlobeMind',
  '/sentiment-analysis': '涉华舆情分析 · GlobeMind',
  '/data-assistant': '数据助手 · GlobeMind',
  '/financial-terminal': '数值分析预警 · GlobeMind',
  '/academic-data': '智库信息汇聚 · GlobeMind',
  '/about-us': '关于我们 · GlobeMind',
  '/user-center/personal-center': '个人中心 · GlobeMind',
  '/user-center/my-applications': '我的报告 · GlobeMind',
  '/user-center/help-docs': '帮助文档 · GlobeMind',
  '/user-center/my-collections': '我的收录 · GlobeMind',
})

const CHUNK_RELOAD_KEY = 'globemind_chunk_recovery_path'

function isChunkLoadError(error) {
  const message = String(error?.message || error || '')
  return /dynamically imported module|importing a module script failed|loading chunk|failed to fetch.*module/i.test(message)
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { hideNavbar: true, public: true }
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/Register.vue'),
      meta: { hideNavbar: true, public: true }
    },
    {
      path: '/forgot-password',
      name: 'ForgotPassword',
      component: () => import('@/views/ForgotPassword.vue'),
      meta: { hideNavbar: true, public: true }
    },
    {
      path: '/reset-password',
      name: 'ResetPassword',
      component: () => import('@/views/ResetPassword.vue'),
      meta: { hideNavbar: true, public: true }
    },
    {
      path: '/',
      component: routeViewLoaders.appHome,
      meta: {
        keepAlive: false, // 不缓存首页
        hideNavbar: false
      }
    },
    {
      path: '/data-service',
      component: routeViewLoaders.dataServiceShell,
      children: [
        {
          path: 'data-search',
          name: 'DataSearch',
          component: routeViewLoaders.dataSearch
        },
        {
          path: 'alert-center',
          redirect: '/financial-terminal'
        },
        {
          path: 'report-center',
          name: 'ReportCenter',
          component: routeViewLoaders.reportCenter
        },
        {
          path: 'open-computing',
          redirect: '/data-service/data-search'
        },
        {
          path: 'algorithm-analysis',
          redirect: '/data-service/data-search'
        },
        {
          path: 'model-test/:modelId',
          redirect: '/data-service/data-search'
        },
        {
          path: 'news/:id',
          name: 'NewsDetail',
          component: () => import('@/views/DataService/news-detail.vue')
        },
        {
          path: 'story-graph',
          name: 'StoryGraph',
          component: routeViewLoaders.storyGraph
        },
        {
          path: 'ground-news',
          name: 'GroundNewsHome',
          component: routeViewLoaders.groundNewsHome
        },
        {
          path: 'ground-news-desk',
          name: 'GroundNewsDesk',
          component: () => import('@/views/GroundNewsDesk.vue')
        },
        {
          path: 'ground-news-blindspot',
          redirect: '/data-service/ground-news'
        },
        {
          path: 'ground-news-topic/:topic',
          name: 'GroundNewsTopic',
          component: () => import('@/views/GroundNewsFeed.vue')
        },
        {
          path: 'ground-news-search',
          redirect: '/data-service/ground-news'
        },
        {
          path: 'ground-news-source/:domain',
          name: 'GroundNewsSource',
          component: () => import('@/views/GroundNewsSource.vue')
        },
        {
          path: 'ground-news-timeline/:chain_id',
          name: 'GroundNewsTimeline',
          component: () => import('@/views/GroundNewsTimeline.vue')
        },
        {
          path: 'pipeline-monitor',
          name: 'PipelineMonitor',
          component: routeViewLoaders.pipelineMonitor,
          meta: { requiresAuth: true, hideNavbar: false }
        }
      ]
    },
    {
      path: '/data-statistics',
      redirect: '/data-service/ground-news-desk'
    },
    {
      path: '/academic-data',
      component: routeViewLoaders.academicData,
      meta: { hideNavbar: false }
    },
    {
      path: '/sentiment-analysis',
      component: routeViewLoaders.sentimentAnalysis,
      meta: { hideNavbar: false }
    },
    {
      path: '/data-assistant',
      name: 'DataAssistant',
      component: routeViewLoaders.dataAssistant,
      meta: { hideNavbar: false }
    },
    {
      path: '/financial-terminal',
      name: 'FinancialTerminal',
      component: routeViewLoaders.financialTerminal,
      meta: { hideNavbar: false }
    },
    {
      path: '/showcase',
      name: 'ShowcaseOrbis',
      component: () => import('@/views/ShowcaseOrbis.vue'),
      meta: { hideNavbar: false }
    },
    ...(import.meta.env.DEV ? [{
      path: '/story-graph-handle-debug',
      name: 'StoryGraphHandleDebug',
      component: () => import('@/views/StoryGraphHandleDebugView.vue'),
      meta: { hideNavbar: true }
    }] : []),
    {
      path: '/user-center',
      component: routeViewLoaders.userCenter,
      meta: { requiresAuth: true, hideNavbar: false },
      children: [
          {
            path: '',
            redirect: { name: 'UserPersonalCenter' }
          },
          {
            path: 'personal-center',
            name: 'UserPersonalCenter',
            component: routeViewLoaders.personalCenter
          },
          {
            path: 'my-applications',
            component: () => import('@/views/user/MyApplications.vue')
          },
          {
            path: 'help-docs',
            component: () => import('@/views/user/HelpDocs.vue')
          },
          {
            path: 'my-collections',
            component: () => import('@/views/user/MyCollections.vue')
          },
          {
            path: 'logout',
            component: () => import('@/views/user/Logout_.vue')
          }
      ]
    },
    {
      path: '/amazing-globe',
      name: 'AmazingGlobe',
      component: () => import('@/views/AmazingGlobe.vue'),
      meta: { hideNavbar: false }
    },
    {
      path: '/about-us',
      component: routeViewLoaders.aboutUs,
      meta: { hideNavbar: false }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('@/views/NotFound.vue'),
      meta: { hideNavbar: false }
    }
  ],
})

// 添加全局路由守卫
router.beforeEach((to, from, next) => {
  const token = getToken()
  const requiresAuth = to.matched.some((record) => record.meta?.requiresAuth)
  if (requiresAuth && !token) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }
  if (to.path === '/login' && token) {
    next(to.query.redirect || '/')
    return
  }
  if (to.path === '/' && from.path !== '/') {
    window.dispatchEvent(new CustomEvent('routeToHome'))
  }
  next()
})

router.afterEach((to) => {
  window.scrollTo(0, 0)
  document.title = ROUTE_TITLES[to.path] || (to.name === 'NotFound' ? '页面未找到 · GlobeMind' : DEFAULT_TITLE)
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY)
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
  }
})

router.onError((error, to) => {
  if (!isChunkLoadError(error) || typeof window === 'undefined') return
  const target = to?.fullPath || window.location.pathname + window.location.search
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === target) return
    sessionStorage.setItem(CHUNK_RELOAD_KEY, target)
  } catch {
    // A single reload is still preferable when storage is unavailable.
  }
  window.location.assign(target)
})

export default router
