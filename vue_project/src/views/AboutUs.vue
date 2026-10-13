<script setup>
import { onActivated, onMounted, onUnmounted, nextTick, ref } from 'vue'
import {
  Award,
  ArrowDown,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  ExternalLink,
  FileText,
  Globe2,
  GraduationCap,
  Languages,
  Lightbulb,
  MessageCircle,
  Microscope,
  Network,
  ScanSearch,
  Sparkles,
  Target,
  Telescope,
  Trophy,
  Users,
  Waypoints,
} from 'lucide-vue-next'

const pageContainer = ref(null)
const resetScrollPosition = () => {
  window.scrollTo(0, 0)
  nextTick(() => {
    if (pageContainer.value) pageContainer.value.scrollTop = 0
    window.scrollTo(0, 0)
  })
}
const handlePopState = () => setTimeout(resetScrollPosition, 100)

onMounted(() => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
  resetScrollPosition()
  window.addEventListener('popstate', handlePopState)
})
onActivated(resetScrollPosition)
onUnmounted(() => window.removeEventListener('popstate', handlePopState))

const researchAreas = [
  {
    icon: BrainCircuit,
    title: '数据挖掘',
    desc: '围绕数据中的结构、关联与异常开展算法研究与应用探索。',
  },
  {
    icon: Languages,
    title: '自然语言处理',
    desc: '结合广外多语种优势，关注文本理解、情感计算与低资源语言处理。',
  },
  {
    icon: MessageCircle,
    title: '网络文本分析',
    desc: '面向开放网络信息，研究话题检测、观点挖掘与文本纠错。',
  },
  {
    icon: Network,
    title: '社会网络分析',
    desc: '从关系网络出发，探索群体结构、传播路径与网络可视化。',
  },
  {
    icon: BarChart3,
    title: '舆情与竞争情报',
    desc: '聚焦舆情预警、企业竞争情报和多语种信息研判。',
  },
  {
    icon: ScanSearch,
    title: '推荐与信息服务',
    desc: '研究个性化推荐及面向真实场景的智能信息服务。',
  },
]

const sourceLinks = [
  {
    label: '实验室官方介绍',
    meta: '信息学院 · 2019',
    href: 'https://sist.gdufs.edu.cn/info/1144/5051.htm',
  },
  {
    label: '十五周年专题报道',
    meta: '信息学院 · 2021',
    href: 'https://sist.gdufs.edu.cn/info/1191/6681.htm',
  },
  {
    label: '省级创新工作室报道',
    meta: '广东外语外贸大学 · 2021',
    href: 'https://gh.gdufs.edu.cn/info/1015/2063.htm',
  },
  {
    label: 'EMNLP 2024 论文报道',
    meta: '信息学院 · 2024',
    href: 'https://sist.gdufs.edu.cn/info/1191/10344.htm',
  },
  {
    label: '毕业生发展分享会',
    meta: '信息学院 · 2023',
    href: 'https://sist.gdufs.edu.cn/info/1191/7389.htm',
  },
]
</script>

<template>
  <main ref="pageContainer" class="about-us-page">
    <div class="galaxy-flow galaxy-flow-one" aria-hidden="true"></div>
    <div class="galaxy-flow galaxy-flow-two" aria-hidden="true"></div>
    <div class="star-drift" aria-hidden="true"></div>
    <header class="page-header">
      <div class="hero-copy">
        <p class="page-kicker"><span></span> GDUFS DATA MINING LAB</p>
        <h1 class="page-title">GlobeMind</h1>
        <p class="page-identity">广东外语外贸大学数据挖掘实验室平台</p>
        <p class="page-deck">
          依托广外“外语 +
          信息技术”的交叉基因，我们把多语种信息、数据挖掘与智能分析汇聚到同一张世界观察图谱中。
        </p>
        <div class="hero-actions">
          <a class="primary-link" href="#lab-story">认识实验室 <ArrowDown :size="16" /></a>
          <a
            class="text-link"
            href="https://sist.gdufs.edu.cn/info/1144/5051.htm"
            target="_blank"
            rel="noopener noreferrer"
            >学校官方介绍 <ArrowUpRight :size="15"
          /></a>
        </div>
        <div class="page-header-brand">
          <img src="/imgs/logo.png" alt="GlobeMind" />
          <span>全球信息观察与数据智能</span>
        </div>
        <p class="hero-since">SINCE 2006 · GUANGZHOU</p>
      </div>

      <figure class="moon-portrait">
        <div class="moon-orbit moon-orbit-outer" aria-hidden="true"></div>
        <div class="moon-orbit moon-orbit-inner" aria-hidden="true"></div>
        <img src="/imgs/about/moon-supermoon-nasa.webp" alt="满月影像" />
        <figcaption>FROM DATA TO GLOBAL INSIGHT</figcaption>
      </figure>
      <div class="hero-index" aria-label="平台研究关键词">
        <span>多语种文本</span><span>数据智能</span><span>全球观察</span>
      </div>
    </header>

    <section class="identity-strip" aria-label="实验室概况">
      <div class="identity-item"><strong>2006.10</strong><span>实验室成立</span></div>
      <div class="identity-item"><strong>9 个</strong><span>研究小组 · 2021 公开口径</span></div>
      <div class="identity-item"><strong>125 人</strong><span>在校成员 · 2021 公开口径</span></div>
      <div class="identity-item"><strong>330+</strong><span>历届毕业生 · 2021 公开口径</span></div>
    </section>

    <section id="lab-story" class="story-section content-band">
      <div class="section-heading">
        <span class="section-number">01 / ABOUT</span>
        <h2>从数据出发，<em>理解更大的世界</em></h2>
      </div>
      <div class="story-layout">
        <div class="story-copy">
          <p class="story-lead">
            广外数据挖掘实验室成立于 2006 年 10
            月，是由教师引导、学生自主管理，专注于数据挖掘技术应用与前沿研究的创新型科研团队。
          </p>
          <p>
            实验室由蒋盛益教授领衔，面向对数据挖掘、社会网络分析和自然语言处理感兴趣的在校本科生与研究生，以科研兴趣为起点，通过课题研读、项目实践、竞赛协作和学术交流，将知识转化为解决真实问题的能力。
          </p>
          <div class="story-quote">
            <Sparkles :size="20" />
            <p>让语言成为理解世界的入口，让数据成为发现问题的方法。</p>
          </div>
        </div>
        <figure class="team-photo">
          <img
            src="/imgs/about/gdufs-dm-lab-15th.webp"
            alt="广东外语外贸大学数据挖掘实验室十五周年合影"
          />
          <figcaption>
            <span>数据挖掘实验室十五周年合影</span><span>广东外语外贸大学信息学院 · 2021</span>
          </figcaption>
        </figure>
      </div>
    </section>

    <section class="team-section content-band">
      <div class="section-heading section-heading-row">
        <div>
          <span class="section-number">02 / COMMUNITY</span>
          <h2>教师引导，<em>学生自主生长</em></h2>
        </div>
        <p>实验室以教师科研团队连接学生科技创新团队，在稳定指导中保留充分的自主探索空间。</p>
      </div>
      <div class="team-detail">
        <div class="mentor-panel">
          <div class="detail-label"><Users :size="18" /> 公开指导教师名单</div>
          <p class="mentor-names">蒋盛益、王连喜、肖锋、丘心颖、姜思羽、颜学明、张新猛</p>
          <p class="detail-note">
            名单依据学校 2021 年公开报道整理，人员与职务以学院最新信息为准。
          </p>
        </div>
        <div class="principle-grid">
          <div><strong>重实践</strong><span>让技术进入项目，在解决问题中形成方法</span></div>
          <div><strong>重创新</strong><span>从兴趣出发，主动追踪学术与产业前沿</span></div>
          <div><strong>学以致用</strong><span>把课程知识转化为研究、竞赛与工程成果</span></div>
          <div><strong>主动探索</strong><span>通过学生自治建立持续学习的共同体</span></div>
        </div>
      </div>
    </section>

    <section class="research-section content-band">
      <div class="section-heading section-heading-row">
        <div>
          <span class="section-number">03 / RESEARCH</span>
          <h2>探索数据背后的<em>结构与意义</em></h2>
        </div>
        <p>面向复杂、开放、多语种的信息环境，连接基础方法研究与真实应用场景。</p>
      </div>
      <div class="research-grid">
        <article v-for="area in researchAreas" :key="area.title" class="research-item">
          <component :is="area.icon" :size="22" :stroke-width="1.6" />
          <div>
            <h3>{{ area.title }}</h3>
            <p>{{ area.desc }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="spotlight-section content-band">
      <div class="section-heading section-heading-row">
        <div>
          <span class="section-number">04 / SPOTLIGHT</span>
          <h2>研究走向真实世界，<em>成果被看见</em></h2>
        </div>
        <p>从低资源语言研究到学生学术交流，实验室持续把问题意识转化为可验证的工作。</p>
      </div>
      <article class="research-feature">
        <figure>
          <img
            src="/imgs/about/emnlp-2024-presentation.webp"
            alt="实验室本科生陈卓玮在 EMNLP 2024 展示研究成果"
          />
          <figcaption>EMNLP 2024 · Miami, Florida</figcaption>
        </figure>
        <div class="feature-copy">
          <span class="feature-tag"><Microscope :size="16" /> 近期研究案例</span>
          <p class="feature-year">2024</p>
          <h3>本科生第一作者论文入选 EMNLP 2024</h3>
          <p>
            实验室本科生陈卓玮在王连喜教授指导下，以第一作者发表低资源情感分类研究。论文提出
            DiffusionCLS，探索扩散语言模型在中文、英文、阿拉伯语低资源文本数据增强中的应用。
          </p>
          <a
            href="https://sist.gdufs.edu.cn/info/1191/10344.htm"
            target="_blank"
            rel="noopener noreferrer"
            >阅读学校报道 <ArrowUpRight :size="15"
          /></a>
        </div>
      </article>
      <article class="community-feature">
        <div class="community-copy">
          <span class="feature-tag"><Award :size="16" /> 团队传承</span>
          <h3>研究之外，也回答“如何成长”</h3>
          <p>
            2023 年，实验室承办 CCF
            广外学生分会毕业生分享会。校友、毕业生与在校生围绕科研入门、升学、就业和职业发展展开交流，让经验在代际之间持续流动。
          </p>
          <div class="community-facts">
            <span>校友分享</span><span>科研入门</span><span>职业发展</span>
          </div>
        </div>
        <figure>
          <img
            src="/imgs/about/ccf-graduate-sharing-2023.webp"
            alt="2023 年 CCF 广外学生分会毕业生分享会合影"
          />
          <figcaption>启程，不止于此 · 2023</figcaption>
        </figure>
      </article>
    </section>

    <section class="training-section content-band">
      <div class="section-heading">
        <span class="section-number">05 / GROWTH</span>
        <h2>以兴趣为起点，<em>在实践中成长</em></h2>
      </div>
      <div class="training-flow">
        <article>
          <span class="flow-index">01</span>
          <div class="flow-icon"><Lightbulb /></div>
          <h3>培养兴趣</h3>
          <p>从前沿分享、论文研读和方向探索开始，找到值得持续投入的问题。</p>
        </article>
        <article>
          <span class="flow-index">02</span>
          <div class="flow-icon"><Waypoints /></div>
          <h3>项目实训</h3>
          <p>在真实课题、学科竞赛与产品开发中学习协作，让方法接受实践检验。</p>
        </article>
        <article>
          <span class="flow-index">03</span>
          <div class="flow-icon"><GraduationCap /></div>
          <h3>提升能力</h3>
          <p>形成自主学习、科研创新、工程实现、团队协作与表达沟通能力。</p>
        </article>
      </div>
      <p class="training-note">
        这一培养路径体现了实验室“教师科研团队 + 学生科技创新团队”的教研融合方式。
      </p>
    </section>

    <section class="platform-section content-band">
      <div class="platform-layout">
        <div class="section-heading">
          <span class="section-number">06 / PLATFORM</span>
          <h2>GlobeMind，实验室面向<em>全球信息研究</em>的实践平台</h2>
          <p>
            平台将实验室在多语种文本分析、舆情研究与数据挖掘中的方法积累，转化为可访问、可观察、可复用的研究工具。
          </p>
        </div>
        <div class="platform-map" aria-label="GlobeMind 平台能力">
          <div class="platform-core">
            <Telescope :size="28" /><strong>GlobeMind</strong><span>全球信息观测平台</span>
          </div>
          <div class="platform-node node-one"><Globe2 />多源信息</div>
          <div class="platform-node node-two"><Languages />多语种理解</div>
          <div class="platform-node node-three"><Target />智能研判</div>
          <div class="platform-node node-four"><BookOpen />科研辅助</div>
        </div>
      </div>
    </section>

    <section class="milestone-section content-band">
      <div class="section-heading section-heading-row">
        <div>
          <span class="section-number">07 / MILESTONES</span>
          <h2>一路探索，<em>一路沉淀</em></h2>
        </div>
        <p>以下节点依据广东外语外贸大学及信息学院公开资料整理。</p>
      </div>
      <div class="timeline">
        <article>
          <time>2006</time>
          <h3>实验室成立</h3>
          <p>从最初的研究小组出发，形成教师指导、学生自主管理的科研共同体。</p>
        </article>
        <article>
          <time>2012</time>
          <h3>获广外“校长奖章”</h3>
          <p>团队建设与学生科技创新成果获得学校认可。</p>
        </article>
        <article>
          <time>2021</time>
          <h3>十五周年</h3>
          <p>实验室在南校区举行十五周年活动，连接在校成员与历届校友。</p>
        </article>
        <article>
          <time>2024</time>
          <h3>走向国际学术现场</h3>
          <p>实验室本科生以第一作者在 EMNLP 2024 发表低资源情感分类研究。</p>
        </article>
        <article>
          <time>2021</time>
          <h3>省级创新工作室</h3>
          <p>由实验室发展而来的“蒋盛益创新工作室”获广东省劳模和工匠人才创新工作室命名。</p>
        </article>
      </div>
      <div class="archive-stats">
        <div class="archive-intro">
          <FileText :size="22" />
          <div>
            <strong>公开档案里的成长足迹</strong
            ><span>以下为学校官网 2019 年发布时的历史统计口径，并非当前实时数据。</span>
          </div>
        </div>
        <div><strong>60+</strong><span>学术论文</span></div>
        <div><strong>20</strong><span>软件著作权</span></div>
        <div><strong>5</strong><span>专利申请</span></div>
        <div><strong>30+</strong><span>竞赛奖项</span></div>
      </div>
    </section>

    <section class="sources-section content-band">
      <div class="section-heading">
        <span class="section-number">08 / SOURCES</span>
        <h2>沿着来源，<em>了解更多</em></h2>
      </div>
      <div class="source-links">
        <a
          v-for="source in sourceLinks"
          :key="source.href"
          :href="source.href"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span
            ><small>{{ source.meta }}</small
            >{{ source.label }}</span
          ><ExternalLink :size="17" />
        </a>
      </div>
      <div class="governance-row">
        <div>
          <Trophy :size="20" />
          <p>尊重事实、来源与使用边界，是 GlobeMind 进行数据观察的基本原则。</p>
        </div>
        <nav aria-label="平台治理页面">
          <router-link to="/methodology">方法说明</router-link
          ><router-link to="/sources">来源与许可</router-link
          ><router-link to="/privacy">隐私说明</router-link
          ><router-link to="/terms">服务条款</router-link>
        </nav>
      </div>
    </section>

    <footer class="about-footer">
      <img src="/imgs/logo.png" alt="GlobeMind" />
      <div>
        <strong>广东外语外贸大学数据挖掘实验室平台</strong
        ><span>Observe globally. Think intelligently.</span>
      </div>
      <Users :size="22" />
    </footer>
  </main>
</template>

<style scoped src="./AboutUsMoonlight.css"></style>
