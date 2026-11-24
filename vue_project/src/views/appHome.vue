<!-- src/views/appHome.vue -->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import {
  buildHomeCapabilityCards,
  useFeatureFreshness,
} from '@/features/operations/index.js'

const mounted = ref(false)
const orbX = ref(0)
const orbY = ref(0)
const statusEvaluationNow = ref(new Date())
const { report, refresh } = useFeatureFreshness()
const cards = computed(() => buildHomeCapabilityCards(report.value, {
  now: statusEvaluationNow.value,
}))
let statusClock = null

onMounted(() => {
  requestAnimationFrame(() => {
    mounted.value = true
  })
  statusEvaluationNow.value = new Date()
  statusClock = window.setInterval(() => {
    statusEvaluationNow.value = new Date()
  }, 60_000)
  void refresh()
})

onBeforeUnmount(() => {
  if (statusClock !== null) window.clearInterval(statusClock)
})

function handleMouseMove(e) {
  orbX.value = (e.clientX / window.innerWidth - 0.5) * -40
  orbY.value = (e.clientY / window.innerHeight - 0.5) * -40
}

</script>

<template>
  <div class="home" @mousemove="handleMouseMove">
    <!-- 背景光斑 -->
    <div class="bg-layer" :style="{ transform: `translate(${orbX}px, ${orbY}px)` }">
      <div class="orb orb--1" />
      <div class="orb orb--2" />
      <div class="orb orb--3" />
      <div class="orb orb--4" />
    </div>

    <!-- 网格纹理 -->
    <div class="grid-texture" />

    <!-- 主体 -->
    <div class="home-content" :class="{ 'is-visible': mounted }">
      <!-- Hero -->
      <section class="hero">
        <h1 class="hero-title">全球新闻与研究证据工作台</h1>
        <p class="hero-tagline">从检索、事件脉络和来源证据开始研究</p>
        <div class="hero-line" />
      </section>

      <!-- Bento 卡片 -->
      <section class="bento" data-tour="home-capabilities">
        <router-link
          v-for="(card, i) in cards"
          :key="card.moduleId"
          :class="['card', { 'card--featured': card.featured }]"
          :data-module-id="card.moduleId"
          :data-module-state="card.disclosure.state"
          :data-tour="`home-capability-${i + 1}`"
          :style="{ '--i': i, '--bg-y': card.bgPosition }"
          :to="`/${card.path}`"
          :aria-label="`进入${card.title}`"
        >
          <div class="card-shimmer" />
          <div class="card-body">
            <h3 class="card-title">{{ card.title }}</h3>
          </div>
        </router-link>
      </section>
    </div>

    <!-- Footer — pinned to page bottom -->
    <footer class="home-footer">
      <span class="footer-text"
        >&copy; {{ new Date().getFullYear() }} GlobeMind. All rights reserved.</span
      >
    </footer>
  </div>
</template>

<style scoped>
/* ============================================================
   HOME — Premium redesign
   ============================================================ */

/* ---- Base ---- */
.home {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 64px; /* fixed navbar height */
  background: url('/imgs/home/hero-bg.webp') center/cover no-repeat;
  overflow-x: hidden;
  overflow-y: auto;
  isolation: isolate;
}

/* ---- Background orbs ---- */
.bg-layer {
  position: fixed;
  inset: -10%;
  pointer-events: none;
  z-index: 0;
  transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.45;
}

.orb--1 {
  width: 620px;
  height: 620px;
  top: 10%;
  left: 5%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.28), transparent 70%);
  animation: orbFloat1 18s ease-in-out infinite;
}

.orb--2 {
  width: 480px;
  height: 480px;
  top: 45%;
  right: -5%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.24), transparent 70%);
  animation: orbFloat2 22s ease-in-out infinite;
}

.orb--3 {
  width: 360px;
  height: 360px;
  bottom: 5%;
  left: 30%;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.22), transparent 70%);
  animation: orbFloat3 20s ease-in-out infinite;
}

.orb--4 {
  width: 280px;
  height: 280px;
  top: 25%;
  left: 55%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.14), transparent 70%);
  animation: orbFloat4 24s ease-in-out infinite;
}

@keyframes orbFloat1 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(40px, -30px) scale(1.08);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.94);
  }
}

@keyframes orbFloat2 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-35px, -25px) scale(1.1);
  }
}

@keyframes orbFloat3 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(25px, 30px) scale(0.92);
  }
  66% {
    transform: translate(-30px, -15px) scale(1.06);
  }
}

@keyframes orbFloat4 {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-20px, -35px) scale(1.12);
  }
}

/* ---- Grid texture ---- */
.grid-texture {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.25;
  background-image:
    linear-gradient(rgba(59, 130, 246, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.06) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 70% 70% at 50% 40%, black 30%, transparent 70%);
  -webkit-mask-image: radial-gradient(ellipse 70% 70% at 50% 40%, black 30%, transparent 70%);
}

/* ---- Main content wrapper ---- */
.home-content {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1280px;
  padding: 0 32px;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.8s ease,
    transform 0.8s ease;
}

.home-content.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* ============================================================
   Hero
   ============================================================ */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 28px;
}

.hero-title {
  margin: 0 0 8px;
  color: #172033;
  font-size: clamp(26px, 2.4vw, 36px);
  line-height: 1.15;
  letter-spacing: 0;
  text-align: center;
}

.hero-tagline {
  margin: 0;
  font-size: 21px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: rgba(71, 85, 105, 0.75);
  animation: fadeInUp 0.8s 0.15s ease both;
}

.hero-line {
  width: 48px;
  height: 3px;
  margin-top: 16px;
  border-radius: 2px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4);
  animation: fadeInUp 0.8s 0.3s ease both;
}

/* ============================================================
   Bento grid
   ============================================================ */
.bento {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  width: 100%;
  margin-bottom: 32px;
}

@media (max-width: 860px) {
  .bento {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

/* ---- Card ---- */
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 280px;
  aspect-ratio: 2 / 1;
  padding: 32px 36px;
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.12);
  background-image: url('/imgs/home/home-cards.webp');
  background-size: 100% 400%;
  background-position: center var(--bg-y);
  background-repeat: no-repeat;
  border: 1px solid rgba(255, 255, 255, 0.55);
  cursor: pointer;
  overflow: hidden;
  transition:
    transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    box-shadow 0.4s ease,
    border-color 0.4s ease;
  box-shadow:
    0 1px 3px rgba(15, 23, 42, 0.04),
    0 4px 16px rgba(15, 23, 42, 0.05);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  animation: fadeInUp 0.7s calc(0.4s + var(--i) * 0.1s) ease both;
  color: inherit;
  text-decoration: none;
}

.card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.card:hover {
  transform: translateY(-6px);
  box-shadow:
    0 2px 6px rgba(15, 23, 42, 0.06),
    0 10px 32px rgba(15, 23, 42, 0.1),
    0 0 0 1px rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.2);
}

.card:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 3px;
}

/* Featured card glow */
.card--featured {
  background-color: rgba(255, 255, 255, 0.18);
  border-color: rgba(59, 130, 246, 0.18);
  box-shadow:
    0 2px 8px rgba(59, 130, 246, 0.06),
    0 8px 24px rgba(15, 23, 42, 0.06),
    0 0 0 1px rgba(59, 130, 246, 0.08);
}

.card--featured:hover {
  border-color: rgba(59, 130, 246, 0.28);
  box-shadow:
    0 2px 8px rgba(59, 130, 246, 0.08),
    0 14px 40px rgba(59, 130, 246, 0.14),
    0 0 0 1px rgba(59, 130, 246, 0.16);
}

/* Shimmer — diagonal sweep */
.card-shimmer {
  position: absolute;
  inset: -40%;
  z-index: 1;
  pointer-events: none;
  opacity: 0;
  background:
    radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 52%),
    linear-gradient(
      100deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(56, 189, 248, 0.18) 42%,
      rgba(255, 255, 255, 0.42) 50%,
      rgba(37, 99, 235, 0.16) 58%,
      rgba(255, 255, 255, 0) 100%
    );
  transform: translateX(-65%) rotate(14deg);
  mix-blend-mode: overlay;
  transition: opacity 0.3s ease;
}

.card:hover .card-shimmer {
  opacity: 1;
  animation: cardShimmer 1.05s ease-in-out both;
}

@keyframes cardShimmer {
  0% {
    transform: translateX(-65%) rotate(14deg);
  }
  100% {
    transform: translateX(65%) rotate(14deg);
  }
}

/* ---- Card title ---- */
/* Each illustration leaves a different amount of space for its title. */
.card[data-module-id='home-data-search'] {
  --title-area-width: 58%;
}

.card[data-module-id='home-agent-data-connections'] {
  --title-area-width: 62%;
}

.card-body {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 2;
  display: grid;
  place-items: center;
  width: var(--title-area-width, 56%);
  min-width: 0;
  padding: 20px 12px;
  box-sizing: border-box;
  text-align: center;
}

.card-title {
  margin: 0;
  max-width: 100%;
  font-size: clamp(26px, 2.25vw, 36px);
  font-weight: 800;
  line-height: 1.4;
  color: #1e293b;
  letter-spacing: 0.01em;
  text-wrap: balance;
}

/* ============================================================
   Footer
   ============================================================ */
.home-footer {
  position: relative;
  z-index: 1;
  width: 100%;
  text-align: center;
  padding: 12px 24px;
  margin-top: auto;
  animation: fadeInUp 0.7s 0.8s ease both;
}

.footer-text {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
  letter-spacing: 0.02em;
}

/* ============================================================
   Shared keyframes
   ============================================================ */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ============================================================
   Mobile responsive
   ============================================================ */
@media (max-width: 768px) {
  .home {
    padding-top: 56px;
  }

  .home-content {
    padding: 0 16px;
    justify-content: flex-start;
  }

  .hero {
    margin-bottom: 28px;
  }

  .hero-title {
    font-size: 24px;
  }

  .hero-tagline {
    font-size: 16px;
    text-align: center;
    padding: 0 16px;
  }

  .hero-line {
    width: 40px;
    margin-top: 12px;
  }

  .bento {
    gap: 20px;
    margin-bottom: 28px;
  }

  .card {
    aspect-ratio: auto;
    min-height: 224px;
    padding: 24px;
    border-radius: 16px;
  }

  .card-title {
    font-size: 28px;
  }

  .home-footer {
    padding: 10px 16px;
  }
}

@media (max-width: 480px) {
  .home {
    padding-top: 52px;
  }

  .home-content {
    padding: 0 12px;
    justify-content: flex-start;
  }

  .hero-tagline {
    font-size: 14px;
  }

  .hero-title {
    font-size: 22px;
  }

  .card {
    min-height: 218px;
    padding: 20px;
  }

  .card-title {
    font-size: clamp(20px, 5.9vw, 23px);
  }

  .home-footer {
    padding: 10px 12px;
  }

  .footer-text {
    font-size: 11px;
  }
}
</style>
