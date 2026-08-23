<script setup>
import { onMounted, onActivated, onUnmounted, nextTick, ref } from 'vue'

const pageContainer = ref(null)
const brandLogoUrl = '/imgs/logo.png'

// 重置滚动位置到顶部
const resetScrollPosition = () => {
  // 重置window滚动位置
  window.scrollTo(0, 0)

  // 重置容器内部滚动位置
  nextTick(() => {
    if (pageContainer.value) {
      pageContainer.value.scrollTop = 0
    }
    // 再次确保window滚动位置为0
    window.scrollTo(0, 0)
  })
}

// 处理浏览器返回/前进按钮
const handlePopState = () => {
  // 延迟执行，确保页面已渲染
  setTimeout(() => {
    resetScrollPosition()
  }, 100)
}

// 组件挂载时重置滚动位置
onMounted(() => {
  // 禁用浏览器的自动滚动恢复
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }

  // 重置滚动位置
  resetScrollPosition()

  // 监听浏览器历史记录导航（返回/前进按钮）
  window.addEventListener('popstate', handlePopState)

  // 使用nextTick确保DOM已渲染后再重置一次
  nextTick(() => {
    resetScrollPosition()
  })
})

// 如果使用了keep-alive，在激活时也重置滚动位置
onActivated(() => {
  resetScrollPosition()
})

// 组件卸载时清理事件监听器
onUnmounted(() => {
  window.removeEventListener('popstate', handlePopState)
})
</script>

<template>
  <div class="about-us-page" ref="pageContainer">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-kicker">Moonlit Data Intelligence Lab</div>
      <h1 class="page-title">关于我们</h1>
      <p class="page-subtitle">数据挖掘实验室 · 交叉学科创新团队</p>
      <p class="page-deck">
        在多语种文本、数据挖掘与智能决策之间建立观测坐标，把科研训练、工程实践和国际化数据理解汇聚成一座面向真实问题的月光观测台。
      </p>
      <div class="page-header-brand" aria-hidden="true">
        <img :src="brandLogoUrl" alt="" />
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="content-container">
      <!-- 简介卡片 -->
      <div class="intro-card">
        <div class="card-icon">🏛️</div>
        <p class="intro-text">
          本实验室是跨学科科研与人才培养平台，成立于 2006 年，由资深教授领衔，长期探索 "计算机 + 外语 + 大数据" 融合的科研训练与工程实践。
        </p>
      </div>
      <div class="focus-strip">
        <div class="focus-item">
          <div class="focus-value">125</div>
          <div class="focus-label">在研学生成员</div>
        </div>
        <div class="focus-item">
          <div class="focus-value">330+</div>
          <div class="focus-label">累计培养学生</div>
        </div>
        <div class="focus-item">
          <div class="focus-value">60+</div>
          <div class="focus-label">近年高水平论文</div>
        </div>
        <div class="focus-item">
          <div class="focus-value">30+</div>
          <div class="focus-label">省级以上奖项</div>
        </div>
      </div>
      <div class="highlight-banner">
        <div class="highlight-title">重点成果速览</div>
        <div class="highlight-points">
          <span>2019-2026 累计发表高水平论文 60+</span>
          <span>国家级/省部级科研项目协同推进</span>
          <span>形成“计算机 + 外语 + 大数据”特色培养范式</span>
        </div>
      </div>

      <!-- 一、基本概况 -->
      <section class="content-section">
        <div class="section-header">
          <span class="section-number">01</span>
          <h2 class="section-title">基本概况</h2>
        </div>
        <div class="section-content">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">定位</div>
              <div class="info-value">教师引导、学生自主管理的创新型科研组织，以学术科研为主导，聚焦数据挖掘与自然语言处理技术的基础研究与应用落地。</div>
            </div>
            <div class="info-item">
              <div class="info-label">规模</div>
              <div class="info-value">现有学生成员 125 人，设 9 个研究小组；累计毕业 330 余名优秀学生，推动学院 13 个学生科技团队、2 个创新创业实践团队建设，覆盖全院近 50% 在校生。</div>
            </div>
            <div class="info-item">
              <div class="info-label">特色</div>
              <div class="info-value">依托外语与国际化优势，深耕 "多语种 + 数据智能" 交叉领域，是文科高校新工科人才培养的典型样本。</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 二、核心研究方向 -->
      <section class="content-section">
        <div class="section-header">
          <span class="section-number">02</span>
          <h2 class="section-title">核心研究方向</h2>
        </div>
        <div class="section-content">
          <div class="research-grid">
            <div class="research-card">
              <div class="research-icon">🔬</div>
              <h3 class="research-title">数据挖掘基础理论</h3>
              <p class="research-desc">聚类、分类、关联规则、异常检测等算法研究</p>
            </div>
            <div class="research-card research-card-emphasis">
              <div class="research-icon">💬</div>
              <h3 class="research-title">自然语言处理（NLP）</h3>
              <p class="research-desc">多语种文本分析、情感计算、低资源语言处理、文本生成与摘要</p>
            </div>
            <div class="research-card">
              <div class="research-icon">📊</div>
              <h3 class="research-title">网络文本与舆情分析</h3>
              <p class="research-desc">热点话题检测、公共事件舆情预警、观点挖掘</p>
            </div>
            <div class="research-card">
              <div class="research-icon">🌐</div>
              <h3 class="research-title">社会网络分析</h3>
              <p class="research-desc">网络可视化、链路预测、群体行为建模</p>
            </div>
            <div class="research-card">
              <div class="research-icon">🎯</div>
              <h3 class="research-title">个性化推荐系统</h3>
              <p class="research-desc">电商 / 新闻 / 教育场景的智能推荐、可监管推荐算法</p>
            </div>
            <div class="research-card">
              <div class="research-icon">🔍</div>
              <h3 class="research-title">企业竞争情报</h3>
              <p class="research-desc">多语种情报提取、行业态势推理、跨境数据应用</p>
            </div>
          </div>
        </div>
      </section>

      <!-- 三、核心师资团队 -->
      <section class="content-section">
        <div class="section-header">
          <span class="section-number">03</span>
          <h2 class="section-title">核心师资团队</h2>
        </div>
        <div class="section-content">
          <div class="team-info">
            <p class="team-lead">
              由<strong>资深教授</strong>（实验室创始人、学科带头人）领衔，核心师资团队覆盖多个研究方向：
            </p>
            <ul class="team-list">
              <li><strong>教授 A</strong>：NLP 与多语种智能信息处理专家，主持多项国家级、省部级项目</li>
              <li><strong>多位副教授、讲师</strong>，覆盖数据挖掘、机器学习、网络安全等方向</li>
            </ul>
            <p class="team-note">
              团队长期深耕 "一带一路"、重点区域相关的多语种数据智能研究，科研与项目经验丰富。
            </p>
          </div>
        </div>
      </section>

      <!-- 四、近年核心成就 -->
      <section class="content-section">
        <div class="section-header">
          <span class="section-number">04</span>
          <h2 class="section-title">近年核心成就（2019-2026）</h2>
        </div>
        <div class="section-content">
          <div class="achievement-tabs">
            <div class="achievement-item achievement-item-featured">
              <div class="achievement-icon">📝</div>
              <h3 class="achievement-title">学术成果（高水平论文）</h3>
              <ul class="achievement-list">
                <li>累计发表学术论文 <strong>60 余篇</strong>，其中 SCI 收录 4 篇、EI 收录 12 篇、CSCD/CSSCI 论文 37 篇</li>
                <li>2021 年：发表 / 录用高水平论文 <strong>18 篇</strong>，申请软著 / 专利 <strong>15 项</strong></li>
                <li>2024 年：团队本科生以第一作者在 <strong>EMNLP 2024</strong>（CCF B 类、NLP 顶级会议）发表论文</li>
                <li>多篇论文发表于《Information Sciences》（SCI Q1，IF=6.795）等国际权威期刊</li>
              </ul>
            </div>
            <div class="achievement-item">
              <div class="achievement-icon">🔬</div>
              <h3 class="achievement-title">科研项目（国家级 / 省部级）</h3>
              <ul class="achievement-list">
                <li>成员参与 <strong>5 项国家级科研项目</strong>、<strong>6 项省部级科研项目</strong></li>
                <li><strong>国家自然科学基金</strong>：面向中国英语学习者的英文作文全自动评分、无线网络资源优化机制研究</li>
                <li><strong>国家社科基金</strong>：东盟涉华舆情观点挖掘、"一带一路" 科技合作机理研究</li>
                <li><strong>省级自然科学基金</strong>：基于 LDA 的可监管推荐系统、图卷积网络自动问答系统</li>
                <li><strong>省级重点领域研发计划</strong>：自主可控联盟区块链关键技术研究</li>
              </ul>
            </div>
            <div class="achievement-item">
              <div class="achievement-icon">💡</div>
              <h3 class="achievement-title">知识产权与技术成果</h3>
              <ul class="achievement-list">
                <li>累计申请<strong>软件著作权 20 项</strong>、<strong>专利 5 项</strong></li>
                <li>研发多语种舆情监测、跨境电商数据挖掘、教育智能评分等系统，服务政府与企业需求</li>
              </ul>
            </div>
            <div class="achievement-item">
              <div class="achievement-icon">🏆</div>
              <h3 class="achievement-title">学科竞赛（国际 / 国家级奖项）</h3>
              <ul class="achievement-list">
                <li>2015 年至今，获 <strong>"挑战杯"、区域计算机作品赛、全国大学生计算机大赛、重点区域计算机作品赛等省级以上奖项 30 余项</strong></li>
                <li>2021 年：斩获 <strong>6 项国际级奖项</strong>、<strong>4 项国家级奖项</strong>、<strong>4 项省级奖项</strong></li>
                <li>多次在大数据、人工智能、软件设计类赛事中夺冠，如 <strong>2016 年大数据竞赛冠军</strong></li>
              </ul>
            </div>
            <div class="achievement-item">
              <div class="achievement-icon">⭐</div>
              <h3 class="achievement-title">荣誉称号</h3>
              <ul class="achievement-list">
                <li>2012 年：实验室团队获<strong>校级最高荣誉</strong></li>
                <li>2018 年：实验室成员获<strong>校级最高荣誉</strong></li>
                <li>2021 年：实验室获评<strong>省级创新科研团队</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- 五、人才培养成果 -->
      <section class="content-section">
        <div class="section-header">
          <span class="section-number">05</span>
          <h2 class="section-title">人才培养成果</h2>
        </div>
        <div class="section-content">
          <div class="talent-grid">
            <div class="talent-card">
              <div class="talent-number">30+</div>
              <div class="talent-label">升学深造</div>
              <div class="talent-desc">近 30 人赴国内外攻读硕士（推免 14 人），多名学生获地方人才计划资助赴海外名校深造</div>
            </div>
            <div class="talent-card">
              <div class="talent-number">10+</div>
              <div class="talent-label">国家奖学金</div>
              <div class="talent-desc">累计获国家奖学金 10 余人次</div>
            </div>
            <div class="talent-card">
              <div class="talent-number">20+</div>
              <div class="talent-label">学生项目</div>
              <div class="talent-desc">学生主持省级以上学术研究项目 20 余项</div>
            </div>
            <div class="talent-card">
              <div class="talent-icon">💼</div>
              <div class="talent-label">就业质量</div>
              <div class="talent-desc">毕业生进入腾讯、阿里、华为、百度、金融机构、政府部门等，从事数据挖掘、算法研发、NLP 工程师等岗位</div>
            </div>
          </div>
        </div>
      </section>

      <!-- 六、社会影响与特色价值 -->
      <section class="content-section">
        <div class="section-header">
          <span class="section-number">06</span>
          <h2 class="section-title">社会影响与特色价值</h2>
        </div>
        <div class="section-content">
          <div class="impact-grid">
            <div class="impact-card impact-card-emphasis">
              <div class="impact-icon">🚀</div>
              <h3 class="impact-title">交叉创新标杆</h3>
              <p class="impact-desc">开创 "计算机 + 外语 + 大数据" 培养模式，实现教学组织、方式、模式的 "三个转变"，为文科高校新工科建设提供范本</p>
            </div>
            <div class="impact-card">
              <div class="impact-icon">🌏</div>
              <h3 class="impact-title">服务国家战略</h3>
              <p class="impact-desc">围绕 "一带一路""重点区域"，开展多语种舆情、跨境数据、科技合作等研究，支撑区域与国家数字化发展</p>
            </div>
            <div class="impact-card">
              <div class="impact-icon">🤝</div>
              <h3 class="impact-title">产学研融合</h3>
              <p class="impact-desc">与企业合作研发智能系统，将科研成果转化为实际应用，提升技术落地能力</p>
            </div>
            <div class="impact-card">
              <div class="impact-icon">✨</div>
              <h3 class="impact-title">示范引领</h3>
              <p class="impact-desc">作为学院科创核心平台，带动学生科创氛围，建设具有多语种数据智能特色的标志性团队</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.about-us-page {
  --about-bg: #030813;
  --about-ink: #e2ebf6;
  --about-copy: #aebcd3;
  --about-muted: #8fa1bc;
  --about-moon: #fff1bd;
  --about-cyan: #68d8ff;
  --about-card: rgba(8, 22, 43, 0.74);
  --about-card-strong: rgba(13, 29, 54, 0.86);
  --about-line: rgba(177, 210, 255, 0.2);
  --about-line-strong: rgba(245, 220, 156, 0.38);
  --about-shadow: rgba(0, 0, 0, 0.38);
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  bottom: 0;
  overflow-y: auto;
  padding: 0;
  color: var(--about-copy);
  font-family: "Noto Sans CJK SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", "Heiti SC", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-weight: 500;
  background-color: var(--about-bg);
  background-image:
    linear-gradient(180deg, rgba(3, 8, 19, 0.22), rgba(3, 8, 19, 0.82) 74%, rgba(3, 8, 19, 0.96)),
    url('/assets/backgrounds/8k_stars_milky_way.webp');
  background-repeat: no-repeat;
  background-position: center top;
  background-size: cover;
  background-attachment: fixed;
  scrollbar-color: rgba(130, 166, 228, 0.72) rgba(3, 8, 19, 0.88);
}

.about-us-page::before,
.about-us-page::after {
  content: '';
  position: fixed;
  inset: 64px 0 0;
  pointer-events: none;
}

.about-us-page::before {
  z-index: 0;
  background:
    radial-gradient(circle at 78% 14%, rgba(255, 240, 190, 0.42) 0, rgba(255, 240, 190, 0.16) 9rem, rgba(112, 155, 255, 0.08) 21rem, transparent 34rem),
    radial-gradient(circle at 18% 8%, rgba(104, 216, 255, 0.16), transparent 18rem),
    linear-gradient(90deg, rgba(3, 8, 19, 0.82) 0%, rgba(3, 8, 19, 0.45) 46%, rgba(3, 8, 19, 0.78) 100%);
}

.about-us-page::after {
  z-index: 0;
  opacity: 0.72;
  background-image:
    linear-gradient(rgba(161, 195, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(161, 195, 255, 0.07) 1px, transparent 1px),
    radial-gradient(circle at 18% 32%, rgba(247, 226, 164, 0.85) 0 1px, transparent 2px),
    radial-gradient(circle at 54% 16%, rgba(104, 216, 255, 0.72) 0 1px, transparent 2px),
    radial-gradient(circle at 72% 48%, rgba(143, 145, 255, 0.68) 0 1px, transparent 2px);
  background-size: 150px 150px, 150px 150px, 340px 280px, 420px 300px, 520px 360px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.88), rgba(0, 0, 0, 0.38) 55%, transparent 86%);
}

.about-us-page * {
  box-sizing: border-box;
}

.page-header,
.content-container {
  position: relative;
  z-index: 1;
}

.page-header {
  max-width: 1220px;
  min-height: 390px;
  margin: 0 auto;
  padding: 76px 430px 54px 22px;
  text-align: left;
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.page-header::before {
  content: '';
  position: absolute;
  left: 22px;
  top: 48px;
  width: min(48vw, 520px);
  height: 1px;
  z-index: 1;
  background: linear-gradient(90deg, rgba(247, 226, 164, 0.82), rgba(104, 216, 255, 0.38), transparent);
}

.page-header::after {
  content: '';
  position: absolute;
  right: 56px;
  top: 62px;
  width: 400px;
  height: 252px;
  z-index: 0;
  border: 1px solid rgba(190, 216, 255, 0.15);
  border-left-color: transparent;
  border-radius: 50%;
  transform: rotate(-13deg);
}

.page-kicker {
  width: fit-content;
  margin: 0 0 18px;
  padding: 7px 12px;
  border: 1px solid rgba(247, 226, 164, 0.28);
  border-radius: 999px;
  background: rgba(255, 241, 189, 0.08);
  color: var(--about-moon);
  font-size: 0.78rem;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0;
  position: relative;
  z-index: 2;
}

.page-header-brand {
  position: absolute;
  right: 48px;
  top: 58%;
  width: 290px;
  height: 290px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(circle at 32% 24%, rgba(255, 255, 246, 0.98), rgba(255, 242, 196, 0.96) 38%, rgba(215, 197, 156, 0.92) 70%, rgba(126, 148, 180, 0.44) 100%);
  border: 1px solid rgba(255, 244, 209, 0.72);
  box-shadow:
    inset -36px -42px 60px rgba(96, 92, 119, 0.24),
    inset 18px 18px 34px rgba(255, 255, 255, 0.36),
    0 0 40px rgba(255, 241, 189, 0.48),
    0 0 120px rgba(104, 216, 255, 0.22),
    0 28px 90px rgba(0, 0, 0, 0.48);
  pointer-events: none;
  transform: translateY(-50%);
  z-index: 1;
}

.page-header-brand::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 34% 32%, rgba(104, 94, 116, 0.2) 0 16px, transparent 17px),
    radial-gradient(circle at 68% 28%, rgba(92, 86, 112, 0.16) 0 11px, transparent 12px),
    radial-gradient(circle at 58% 66%, rgba(88, 82, 109, 0.18) 0 22px, transparent 23px),
    radial-gradient(circle at 30% 70%, rgba(96, 87, 114, 0.13) 0 9px, transparent 10px);
  mix-blend-mode: multiply;
}

.page-header-brand::after {
  content: '';
  position: absolute;
  inset: -34px;
  border-radius: 50%;
  border: 1px solid rgba(190, 216, 255, 0.18);
  border-top-color: rgba(247, 226, 164, 0.34);
  transform: rotate(24deg);
}

.page-header-brand img {
  display: block;
  width: 230px;
  height: auto;
  object-fit: contain;
  opacity: 0.78;
  filter:
    saturate(0.88)
    drop-shadow(0 0 10px rgba(255, 255, 255, 0.54))
    drop-shadow(0 14px 22px rgba(31, 41, 75, 0.22));
  position: relative;
  z-index: 1;
}

.page-title {
  max-width: 700px;
  margin: 0 0 14px;
  font-size: clamp(3rem, 6vw, 5.7rem);
  line-height: 1.02;
  font-weight: 900;
  letter-spacing: 0;
  color: var(--about-ink);
  text-shadow:
    0 0 20px rgba(255, 241, 189, 0.22),
    0 12px 38px rgba(0, 0, 0, 0.38);
  position: relative;
  z-index: 2;
}

.page-subtitle {
  margin: 0;
  font-size: 1.2rem;
  line-height: 1.75;
  color: var(--about-moon);
  font-weight: 700;
  position: relative;
  z-index: 2;
  text-shadow: none;
}

.page-deck {
  max-width: 690px;
  margin: 18px 0 0;
  font-size: 1.02rem;
  line-height: 1.95;
  color: #acbad0;
  font-weight: 500;
  position: relative;
  z-index: 2;
  text-shadow: none;
}

.content-container {
  max-width: 1220px;
  margin: 0 auto;
  padding: 0 22px 72px;
}

.content-section {
  margin-bottom: 34px;
  padding: 34px 0 0;
  border-top: 1px solid rgba(177, 210, 255, 0.16);
}

.intro-card,
.info-item,
.research-card,
.team-info,
.achievement-item,
.talent-card,
.impact-card,
.focus-item,
.highlight-banner {
  border-radius: 8px;
  background:
    linear-gradient(145deg, rgba(255, 241, 189, 0.06), rgba(104, 216, 255, 0.04)),
    var(--about-card);
  border: 1px solid var(--about-line);
  box-shadow: 0 20px 54px var(--about-shadow);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  transition: transform 0.2s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}

.intro-card:hover,
.info-item:hover,
.research-card:hover,
.achievement-item:hover,
.talent-card:hover,
.impact-card:hover,
.focus-item:hover {
  transform: translateY(-3px);
  border-color: rgba(247, 226, 164, 0.42);
  box-shadow: 0 28px 68px rgba(0, 0, 0, 0.46);
}

.intro-card {
  padding: 28px 30px;
  margin-bottom: 14px;
  display: flex;
  gap: 18px;
  align-items: center;
}

.card-icon {
  margin-top: 2px;
  margin-bottom: 0;
}

.intro-text {
  margin: 0;
  color: var(--about-copy);
  font-size: 1.03rem;
  font-weight: 500;
  line-height: 1.9;
  text-shadow: none;
}

.focus-strip {
  margin-bottom: 24px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.focus-item {
  padding: 18px 14px;
  text-align: center;
}

.focus-value {
  font-size: 1.75rem;
  line-height: 1.1;
  font-weight: 850;
  color: var(--about-moon);
  text-shadow: none;
}

.focus-label {
  margin-top: 8px;
  font-size: 0.9rem;
  color: var(--about-muted);
  font-weight: 650;
}

.highlight-banner {
  margin-bottom: 30px;
  padding: 20px 22px;
  background:
    linear-gradient(135deg, rgba(255, 241, 189, 0.12), rgba(104, 216, 255, 0.08)),
    rgba(7, 20, 39, 0.76);
  border-color: var(--about-line-strong);
}

.highlight-title {
  font-size: 1.14rem;
  font-weight: 800;
  letter-spacing: 0;
  margin-bottom: 12px;
  color: var(--about-ink);
  text-shadow: none;
}

.highlight-points {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.highlight-points span {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(237, 245, 255, 0.07);
  border: 1px solid rgba(177, 210, 255, 0.18);
  font-size: 0.92rem;
  font-weight: 600;
  color: #b4c0d2;
  text-shadow: none;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 18px;
  padding-bottom: 13px;
  border-bottom: 1px solid rgba(177, 210, 255, 0.16);
}

.section-number {
  font-size: 2.2rem;
  font-weight: 850;
  line-height: 1;
  color: rgba(247, 226, 164, 0.62);
}

.section-title {
  margin: 0;
  font-size: 1.62rem;
  line-height: 1.3;
  color: var(--about-ink);
  font-weight: 800;
  text-shadow: none;
}

.info-grid,
.research-grid,
.achievement-tabs,
.talent-grid,
.impact-grid {
  display: grid;
  gap: 16px;
  align-items: start;
}

.info-grid { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
.research-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.achievement-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.talent-grid { grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.impact-grid { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }

.info-item,
.research-card,
.achievement-item,
.talent-card,
.impact-card {
  padding: 22px 20px;
  height: fit-content;
}

.info-label,
.research-title,
.achievement-title,
.talent-label,
.impact-title {
  margin: 0 0 10px;
  color: var(--about-ink);
  font-weight: 800;
  text-shadow: none;
}

.info-label { font-size: 1.06rem; }
.research-title { font-size: 1.05rem; }
.achievement-title { font-size: 1.08rem; }
.talent-label { font-size: 1.04rem; }
.impact-title { font-size: 1.06rem; }

.info-value,
.research-desc,
.team-lead,
.team-list li,
.team-note,
.achievement-list li,
.talent-desc,
.impact-desc {
  color: var(--about-copy);
  font-weight: 520;
  line-height: 1.8;
  text-shadow: none;
}

.info-value strong,
.research-desc strong,
.team-lead strong,
.team-list strong,
.achievement-list strong,
.talent-desc strong,
.impact-desc strong {
  color: var(--about-moon);
  font-weight: 850;
}

.info-item-emphasis,
.research-card-emphasis,
.impact-card-emphasis {
  background:
    linear-gradient(145deg, rgba(104, 216, 255, 0.18), rgba(143, 145, 255, 0.13)),
    var(--about-card-strong);
  border-color: rgba(104, 216, 255, 0.34);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    0 24px 60px rgba(0, 0, 0, 0.44);
}

.info-item-emphasis .info-label,
.research-card-emphasis .research-title,
.impact-card-emphasis .impact-title {
  color: var(--about-ink);
  text-shadow: none;
}

.info-item-emphasis .info-value,
.research-card-emphasis .research-desc,
.impact-card-emphasis .impact-desc {
  color: #bdcbe0;
}

.info-item-emphasis strong,
.research-card-emphasis strong,
.impact-card-emphasis strong {
  color: var(--about-moon);
}

.info-value,
.research-desc,
.achievement-list li,
.talent-desc,
.impact-desc {
  font-size: 0.96rem;
}

.research-card,
.talent-card,
.impact-card {
  text-align: center;
}

.research-icon,
.achievement-icon,
.impact-icon,
.talent-icon {
  margin-bottom: 10px;
}

.card-icon,
.research-icon,
.achievement-icon,
.impact-icon,
.talent-icon {
  position: relative;
  display: inline-flex;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 8px;
  border: 1px solid rgba(247, 226, 164, 0.26);
  background:
    radial-gradient(circle at 34% 30%, rgba(255, 241, 189, 0.38), transparent 44%),
    rgba(255, 255, 255, 0.05);
  color: transparent;
  font-size: 0;
  line-height: 0;
}

.card-icon::before,
.research-icon::before,
.achievement-icon::before,
.impact-icon::before,
.talent-icon::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 10px;
  width: 16px;
  height: 16px;
  border: 2px solid var(--about-moon);
  border-radius: 50%;
}

.card-icon::after,
.research-icon::after,
.achievement-icon::after,
.impact-icon::after,
.talent-icon::after {
  content: '';
  position: absolute;
  right: 9px;
  bottom: 11px;
  width: 14px;
  height: 2px;
  border-radius: 999px;
  background: var(--about-cyan);
  transform: rotate(-34deg);
  transform-origin: center;
}

.research-card-emphasis .research-icon,
.impact-card-emphasis .impact-icon {
  border-color: rgba(237, 245, 255, 0.3);
  background: rgba(237, 245, 255, 0.1);
}

.research-card-emphasis .research-icon::before,
.impact-card-emphasis .impact-icon::before {
  border-color: rgba(255, 255, 255, 0.92);
}

.research-card-emphasis .research-icon::after,
.impact-card-emphasis .impact-icon::after {
  background: var(--about-moon);
}

.team-info {
  padding: 26px 24px;
}

.team-lead {
  font-size: 1.03rem;
  margin-bottom: 14px;
}

.team-list {
  list-style: none;
  padding: 0;
  margin: 0 0 14px;
}

.team-list li {
  position: relative;
  padding: 10px 0 10px 22px;
  font-size: 0.97rem;
}

.team-list li::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 21px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--about-moon);
  box-shadow: 0 0 12px rgba(255, 241, 189, 0.5);
}

.team-note {
  margin: 0;
  padding: 14px 16px;
  border-radius: 8px;
  background: rgba(237, 245, 255, 0.06);
  border: 1px solid rgba(177, 210, 255, 0.14);
  font-size: 0.96rem;
}

.achievement-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.achievement-list li {
  position: relative;
  padding: 8px 0 8px 18px;
}

.achievement-list li::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 17px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--about-moon);
  box-shadow: 0 0 12px rgba(255, 241, 189, 0.44);
}

.achievement-item-featured {
  grid-column: 1 / -1;
  padding: 24px 22px;
  background:
    linear-gradient(135deg, rgba(255, 241, 189, 0.12), rgba(104, 216, 255, 0.08)),
    var(--about-card-strong);
  border-color: var(--about-line-strong);
}

.achievement-item-featured .achievement-title {
  font-size: 1.18rem;
}

.talent-number {
  color: var(--about-moon);
  font-size: 2.6rem;
  line-height: 1;
  font-weight: 850;
  margin-bottom: 8px;
  text-shadow: none;
}

@media (prefers-reduced-motion: reduce) {
  .intro-card,
  .info-item,
  .research-card,
  .achievement-item,
  .talent-card,
  .impact-card,
  .focus-item,
  .highlight-banner {
    transition: none;
  }

  .intro-card:hover,
  .info-item:hover,
  .research-card:hover,
  .achievement-item:hover,
  .talent-card:hover,
  .impact-card:hover,
  .focus-item:hover {
    transform: none;
  }
}

@media (max-width: 900px) {
  .about-us-page {
    top: 64px;
    background-position: center top;
  }

  .about-us-page::before,
  .about-us-page::after {
    inset: 64px 0 0;
  }

  .page-header {
    min-height: 350px;
    padding: 58px 220px 38px 18px;
  }

  .page-header::before {
    left: 18px;
    top: 36px;
  }

  .page-header::after {
    right: 18px;
    top: 68px;
    width: 260px;
    height: 180px;
  }

  .page-header-brand {
    width: 172px;
    height: 172px;
    right: 34px;
    top: 56%;
  }

  .page-header-brand::after {
    inset: -22px;
  }

  .page-header-brand img {
    width: 138px;
  }

  .page-title {
    font-size: 2.9rem;
  }

  .page-subtitle {
    font-size: 1rem;
  }

  .page-deck {
    font-size: 0.95rem;
    line-height: 1.8;
  }

  .content-container {
    padding: 0 14px 38px;
  }

  .content-section {
    padding-top: 24px;
    margin-bottom: 24px;
  }

  .intro-card {
    flex-direction: column;
    padding: 20px 16px;
    gap: 12px;
    align-items: flex-start;
  }

  .focus-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-bottom: 18px;
  }

  .highlight-banner {
    margin-bottom: 22px;
    padding: 16px 14px;
  }

  .highlight-title {
    font-size: 1.03rem;
  }

  .highlight-points span {
    min-height: 30px;
    font-size: 0.86rem;
  }

  .section-number {
    font-size: 1.55rem;
  }

  .section-title {
    font-size: 1.22rem;
  }

  .info-grid,
  .research-grid,
  .achievement-tabs,
  .talent-grid,
  .impact-grid {
    grid-template-columns: 1fr;
  }

  .achievement-item-featured {
    grid-column: auto;
  }
}

@media (max-width: 560px) {
  .about-us-page {
    top: 56px;
    background-position: 52% top;
  }

  .about-us-page::before,
  .about-us-page::after {
    inset: 56px 0 0;
  }

  .page-header {
    min-height: 430px;
    padding: 38px 14px 196px;
  }

  .page-header::before {
    left: 14px;
    top: 24px;
    width: 72vw;
  }

  .page-header::after {
    right: 50%;
    top: auto;
    bottom: 32px;
    width: 224px;
    height: 132px;
    transform: translateX(50%) rotate(-13deg);
  }

  .page-kicker {
    margin-bottom: 14px;
    font-size: 0.72rem;
  }

  .page-header-brand {
    width: 150px;
    height: 150px;
    top: auto;
    right: 50%;
    bottom: 24px;
    transform: translateX(50%);
  }

  .page-header-brand::after {
    inset: -18px;
  }

  .page-header-brand img {
    width: 120px;
  }

  .page-title {
    font-size: 2.35rem;
    margin-bottom: 10px;
  }

  .page-subtitle {
    font-size: 0.92rem;
  }

  .page-deck {
    margin-top: 14px;
    font-size: 0.88rem;
  }

  .content-container {
    padding: 0 10px 28px;
  }

  .content-section {
    padding-top: 20px;
    margin-bottom: 20px;
  }

  .intro-card {
    padding: 16px 14px;
  }

  .intro-text {
    font-size: 0.92rem;
  }

  .focus-strip {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }

  .focus-value {
    font-size: 1.3rem;
  }

  .focus-label {
    font-size: 0.8rem;
  }

  .highlight-banner {
    padding: 14px 12px;
    margin-bottom: 16px;
  }

  .highlight-title {
    font-size: 0.95rem;
  }

  .highlight-points span {
    font-size: 0.8rem;
    min-height: 28px;
    padding: 0 10px;
  }

  .section-header {
    gap: 10px;
    margin-bottom: 14px;
    padding-bottom: 10px;
  }

  .section-number {
    font-size: 1.3rem;
  }

  .section-title {
    font-size: 1.05rem;
  }

  .info-item,
  .research-card,
  .achievement-item,
  .talent-card,
  .impact-card {
    padding: 16px 14px;
  }

  .info-label,
  .research-title,
  .achievement-title,
  .talent-label,
  .impact-title {
    font-size: 0.95rem;
  }

  .info-value,
  .research-desc,
  .achievement-list li,
  .talent-desc,
  .impact-desc {
    font-size: 0.88rem;
  }

  .research-icon,
  .achievement-icon,
  .impact-icon,
  .talent-icon,
  .card-icon {
    width: 36px;
    height: 36px;
  }

  .research-icon,
  .achievement-icon,
  .impact-icon,
  .talent-icon {
    margin-bottom: 6px;
  }

  .card-icon::before,
  .research-icon::before,
  .achievement-icon::before,
  .impact-icon::before,
  .talent-icon::before {
    left: 9px;
    top: 8px;
    width: 14px;
    height: 14px;
  }

  .card-icon::after,
  .research-icon::after,
  .achievement-icon::after,
  .impact-icon::after,
  .talent-icon::after {
    right: 8px;
    bottom: 10px;
    width: 12px;
  }

  .talent-number {
    font-size: 2rem;
  }

  .team-info {
    padding: 18px 16px;
  }

  .team-lead {
    font-size: 0.92rem;
  }

  .team-list li {
    font-size: 0.88rem;
    padding: 8px 0 8px 20px;
  }

  .team-list li::before {
    top: 18px;
  }

  .team-note {
    font-size: 0.88rem;
    padding: 10px 12px;
  }

  .achievement-item-featured {
    padding: 18px 16px;
  }

  .achievement-list li {
    padding: 6px 0 6px 16px;
  }

  .talent-card {
    text-align: left;
  }
}
</style>
