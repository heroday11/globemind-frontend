<template>
  <div class="knowledge-vault-page">
    <aside class="vault-sidebar" data-tour="knowledge-navigation">
      <div class="vault-brand">
        <div class="vault-brand-mark">
          <Archive />
        </div>
        <div>
          <p class="vault-eyebrow">GlobeMind Knowledge Vault</p>
          <h1>Agent 能力与连接卡</h1>
        </div>
      </div>

      <label class="vault-search">
        <Search />
        <input v-model="searchKeyword" type="search" :placeholder="isPluginDomain ? '搜索 DSH 插件' : '检索领域、skill、任务或来源'" />
      </label>

      <nav class="domain-nav" aria-label="专家领域">
        <button
          class="domain-nav-item"
          :class="{ active: activeDomainId === 'all' }"
          type="button"
          @click="activeDomainId = 'all'"
        >
          <Layers />
          <span>全部领域</span>
          <strong>{{ totalSkills }}</strong>
        </button>

        <button
          type="button"
          class="domain-nav-item"
          :class="{ active: isPluginDomain }"
          @click="openPluginMarket"
        >
          <PlugZap />
          <span>DSH 插件</span>
          <strong>{{ pluginIndex?.plugins.length ?? '—' }}</strong>
        </button>

        <button
          v-for="domain in domains"
          :key="domain.id"
          class="domain-nav-item"
          :class="{ active: activeDomainId === domain.id }"
          type="button"
          @click="activeDomainId = domain.id"
        >
          <component :is="domainIcon(domain.id)" />
          <span>{{ domain.shortName || domain.name }}</span>
          <strong>{{ domain.skills?.length || 0 }}</strong>
        </button>
      </nav>

      <div class="source-shelf">
        <div class="side-section-title">
          <DownloadCloud />
          <span>已下载索引</span>
        </div>
        <button
          v-for="source in downloadedSources"
          :key="source.id"
          type="button"
          class="source-row"
          @click="openLocalSource(source)"
        >
          <span>{{ source.publisher }}</span>
          <strong>{{ source.name }}</strong>
        </button>
      </div>
    </aside>

    <main class="vault-main">
      <section class="vault-hero">
        <div class="hero-copy">
          <div class="hero-kicker">
            <component :is="isPluginDomain ? PlugZap : ShieldCheck" />
            <span>{{ isPluginDomain ? 'DeepSeek Harness 官方插件' : '给 Agent 装配可审查的专家能力与数据源' }}</span>
          </div>
          <h2>{{ isPluginDomain ? 'DSH 插件' : 'Agent 能力市场' }}</h2>
          <p v-if="isPluginDomain">为数据助手添加会话检索、语音输入和智能体协作等能力。</p>
          <p v-else>
            文献检索、数据分析、报告交付、视频制作与专家知识源。
          </p>
        </div>

        <div class="hero-ledger" :aria-label="isPluginDomain ? '插件目录统计' : '知识库统计'">
          <div v-for="{ label, value } in heroStatistics" :key="label" class="ledger-cell">
            <span>{{ value }}</span>
            <p>{{ label }}</p>
          </div>
        </div>
      </section>

      <section v-if="!isPluginDomain && !catalogLoading && !catalogError" class="featured-skills" aria-labelledby="featured-skills-title">
        <header class="panel-header">
          <div>
            <p class="section-label">Essential Skills</p>
            <h3 id="featured-skills-title">高频通用能力</h3>
          </div>
          <span class="curation-count">{{ totalSkills }} 项精选能力</span>
        </header>

        <div class="featured-skill-grid">
          <article
            v-for="item in featuredSkills"
            :key="item.skill.id"
            class="featured-skill-card"
            :class="{ selected: isSkillSelected(item.skill.id) }"
          >
            <button class="featured-skill-main" type="button" @click="openSkillDetail(item.skill)">
              <span class="featured-skill-icon">
                <component :is="domainIcon(item.skill.domainId)" />
              </span>
              <span class="featured-skill-copy">
                <small>{{ item.eyebrow }}</small>
                <strong>{{ skillName(item.skill) }}</strong>
                <span>{{ item.summary }}</span>
              </span>
            </button>
            <button
              class="featured-skill-toggle"
              type="button"
              :aria-label="isSkillSelected(item.skill.id) ? `移除${skillName(item.skill)}` : `选择${skillName(item.skill)}`"
              :title="isSkillSelected(item.skill.id) ? '移除 skill' : '选择使用'"
              @click="toggleSkill(item.skill)"
            >
              <CheckCircle2 v-if="isSkillSelected(item.skill.id)" />
              <Plus v-else />
            </button>
          </article>
        </div>
      </section>

      <section class="vault-grid">
        <div class="skill-library" data-tour="knowledge-skills">
          <header class="panel-header">
            <div>
              <p class="section-label">{{ isPluginDomain ? 'DSH Plugins' : 'Expert Skill Library' }}</p>
              <h3>{{ isPluginDomain ? 'DSH 插件目录' : activeDomainTitle }}</h3>
            </div>
            <div class="panel-actions">
              <button
                v-if="isPluginDomain && getToken()"
                class="sync-pill plugin-status-refresh"
                type="button"
                :disabled="pluginStatusLoading"
                @click="loadPluginStatus"
              >
                <RefreshCw :class="{ 'catalog-spinner': pluginStatusLoading }" />
                {{ pluginStatusLoading ? '正在连接数据助手' : '刷新插件状态' }}
              </button>
              <span v-else class="sync-pill">
                <RefreshCw />
                {{ isPluginDomain ? '官方插件目录' : catalogMeta }}
              </span>
            </div>
          </header>

          <div v-if="activeDomain && activeDomainId !== 'all'" class="domain-brief">
            <div class="domain-brief-icon">
              <component :is="domainIcon(activeDomain.id)" />
            </div>
            <div>
              <strong>{{ activeDomain.name }}</strong>
            </div>
          </div>

          <template v-if="isPluginDomain">
            <p v-if="pluginStatusError" class="form-error" role="alert">{{ pluginStatusError }}</p>
            <p v-if="pluginNotice" class="db-privacy-note" role="status">{{ pluginNotice }}</p>
          </template>
          <div v-if="isPluginDomain && pluginIndex" class="dsh-market-filters">
            <div class="dsh-market-views" role="group" aria-label="插件目录">
              <button
                class="use-skill-btn"
                type="button"
                :aria-pressed="pluginGroup === 'featured'"
                @click="selectPluginGroup('featured')"
              >
                精选 <span>{{ matchingPlugins.featured.length }}</span>
              </button>
              <button
                class="use-skill-btn"
                type="button"
                :aria-pressed="pluginGroup === 'other'"
                @click="selectPluginGroup('other')"
              >
                其他 <span>{{ matchingPlugins.other.length }}</span>
              </button>
            </div>
            <div class="modal-chip-list dsh-category-filter">
              <label for="dsh-plugin-category">用途</label>
              <select id="dsh-plugin-category" v-model="pluginCategory">
                <option value="">全部用途</option>
                <option v-for="category in pluginIndex.categories" :key="category.id" :value="category.id">
                  {{ pluginText(category.title) }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="directoryLoading" class="empty-state catalog-state" role="status">
            <RefreshCw class="catalog-spinner" />
            <strong>{{ isPluginDomain ? '正在加载插件目录' : '正在加载 Skill 目录' }}</strong>
            <p v-if="!isPluginDomain">目录较大，请稍候；加载完成前不会显示为 0 个 skill。</p>
          </div>

          <div v-else-if="directoryError" class="empty-state catalog-state" role="alert">
            <BookOpen />
            <strong>{{ isPluginDomain ? '插件目录加载失败' : 'Skill 目录加载失败' }}</strong>
            <p v-if="!isPluginDomain">{{ directoryError }}</p>
            <button type="button" class="use-skill-btn" @click="reloadDirectory">重新加载</button>
          </div>

          <div v-else-if="catalogCards.length" class="skill-grid">
            <article
              v-for="card in catalogCards"
              :key="card.key"
              class="skill-card"
              :class="{ selected: card.selected }"
              role="button"
              tabindex="0"
              @click="card.open"
              @keydown.enter.prevent="card.open"
              @keydown.space.prevent="card.open"
            >
              <div class="skill-card-accent" aria-hidden="true">
                <span>{{ card.kind }}</span>
                <strong>{{ card.count }}</strong>
              </div>
              <div class="skill-card-badges">
                <span class="status-badge" :class="card.statusClass">{{ card.status }}</span>
                <span v-for="badge in card.badges" :key="badge" class="license-badge">{{ badge }}</span>
              </div>
              <div class="skill-card-top">
                <div class="skill-icon"><component :is="card.icon" /></div>
                <div>
                  <span class="skill-domain">{{ card.category }}</span>
                  <h4>{{ card.title }}</h4>
                </div>
              </div>
              <div class="skill-card-highlight">
                <span>{{ card.highlight }}</span>
                <strong>{{ card.highlightDetail }}</strong>
              </div>
              <p class="skill-desc">{{ card.description }}</p>
              <div class="skill-tags">
                <span v-for="tag in card.tags" :key="tag">{{ tag }}</span>
              </div>
              <dl class="skill-meta">
                <div v-for="[label, value] in card.facts" :key="label">
                  <dt>{{ label }}</dt>
                  <dd>{{ value }}</dd>
                </div>
              </dl>
              <div class="skill-footer">
                <span class="safety-note">{{ card.note }}</span>
                <button
                  class="use-skill-btn"
                  type="button"
                  @click.stop="card.action.run"
                  @keydown.enter.stop
                  @keydown.space.stop
                >
                  <component :is="card.action.icon" />
                  {{ card.action.label }}
                </button>
              </div>
            </article>
          </div>

          <div v-else class="empty-state">
            <component :is="isPluginDomain ? PlugZap : BookOpen" />
            <strong>{{ isPluginDomain ? '没有匹配的插件' : '没有匹配的 skill' }}</strong>
            <p>{{ isPluginDomain ? '换一个关键词或用途筛选。' : '换一个关键词或领域筛选。' }}</p>
          </div>
        </div>

        <aside class="database-console">
          <section class="selected-skills-panel">
            <header class="panel-header compact">
              <div>
                <p class="section-label">Active Skills</p>
                <h3>已使用 Skill</h3>
              </div>
              <span class="selected-count">{{ selectedSkills.length }}</span>
            </header>

            <p class="db-privacy-note" :class="{ 'sync-error': capabilitySyncError }" aria-live="polite">
              <RefreshCw v-if="capabilitySyncing" class="catalog-spinner" />
              <PlugZap v-else />
              {{ capabilitySyncMessage }}
            </p>

            <div v-if="selectedSkills.length" class="selected-skill-list">
              <article v-for="skill in selectedSkills" :key="skill.id" class="selected-skill-item">
                <button type="button" class="selected-skill-main" @click="openSkillDetail(skill)">
                  <span class="selected-skill-icon">
                    <component :is="domainIcon(skill.domainId)" />
                  </span>
                  <span>
                    <strong>{{ skillName(skill) }}</strong>
                    <small>{{ skill.domainName }}</small>
                  </span>
                </button>
                <button
                  type="button"
                  class="selected-skill-remove"
                  title="移除 skill"
                  @click="removeSelectedSkill(skill.id)"
                >
                  <X />
                </button>
              </article>
            </div>

            <div v-else class="selected-empty">
              <BrainCircuit />
              <strong>还没有选择 skill</strong>
              <p>在左侧卡片点击“选择使用”，这里会形成当前 Agent 的专家能力列表。</p>
            </div>
          </section>

          <header class="panel-header compact">
            <div>
              <p class="section-label">Database Registry</p>
              <h3>数据库连接卡片</h3>
            </div>
            <Server />
          </header>

          <p class="db-privacy-note">
            <LockKeyhole /> 登录后连接说明会同步到知识库和 DSH；不保存密码，也不会自动连接外部数据库。
          </p>

          <form class="db-form" data-tour="knowledge-databases" @submit.prevent="saveDatabaseCard">
            <label>
              <span>卡片名称</span>
              <input v-model.trim="dbForm.name" type="text" placeholder="例如：地缘事件向量库" />
            </label>

            <div class="form-row">
              <label>
                <span>类型</span>
                <select v-model="dbForm.type" @change="applyDefaultPort">
                  <option v-for="type in dbTypes" :key="type.name" :value="type.name">{{ type.name }}</option>
                </select>
              </label>
              <label>
                <span>端口</span>
                <input v-model.trim="dbForm.port" type="text" inputmode="numeric" placeholder="5432" />
              </label>
            </div>

            <label>
              <span>数据库 IP / Host</span>
              <input v-model.trim="dbForm.host" type="text" placeholder="10.0.0.12 或 db.internal" />
            </label>

            <div class="form-row">
              <label>
                <span>库名 / Collection</span>
                <input v-model.trim="dbForm.database" type="text" placeholder="globemind_kb" />
              </label>
              <label>
                <span>用户名</span>
                <input v-model.trim="dbForm.username" type="text" placeholder="readonly_user" />
              </label>
            </div>

            <label>
              <span>用途</span>
              <textarea v-model.trim="dbForm.purpose" rows="3" placeholder="存放地缘政治报告切片、向量和引用来源"></textarea>
            </label>

            <label>
              <span>标签</span>
              <input v-model.trim="dbForm.tags" type="text" placeholder="RAG, 只读, 生产" />
            </label>

            <p class="db-warning">
              <LockKeyhole />
              不保存密码或 Token。请只填写连接描述，密钥放在后端环境变量或密钥管理系统。
            </p>

            <p v-if="dbFormError" class="form-error">{{ dbFormError }}</p>

            <button class="save-db-btn" type="submit">
              <Plus />
              保存数据库卡片
            </button>
          </form>

          <div class="db-card-list">
            <article v-for="card in databaseCards" :key="card.id" class="db-card">
              <div class="db-card-head">
                <div class="db-type-icon">
                  <Database />
                </div>
                <div>
                  <h4>{{ card.name }}</h4>
                  <p>{{ card.type }} · {{ card.host }}:{{ card.port }}</p>
                </div>
                <button type="button" class="remove-db-btn" title="删除卡片" @click="removeDatabaseCard(card.id)">
                  <X />
                </button>
              </div>
              <dl>
                <div>
                  <dt>库名</dt>
                  <dd>{{ card.database || '未填写' }}</dd>
                </div>
                <div>
                  <dt>用户</dt>
                  <dd>{{ card.username || '未填写' }}</dd>
                </div>
              </dl>
              <p class="db-purpose">{{ card.purpose || '未填写用途说明。' }}</p>
              <div class="db-tags">
                <span v-for="tag in card.tags" :key="tag">{{ tag }}</span>
              </div>
            </article>

            <div v-if="!databaseCards.length" class="db-empty">
              <PlugZap />
              <strong>还没有数据库卡片</strong>
              <p>填写左侧连接信息后，会在这里保存为可管理的知识库数据源。</p>
            </div>
          </div>
        </aside>
      </section>

      <section v-if="!isPluginDomain" class="source-panel">
        <header class="panel-header">
          <div>
            <p class="section-label">Downloaded References</p>
            <h3>外部 skill 索引资料</h3>
          </div>
          <span class="source-policy">{{ catalogPolicy.securityNote }}</span>
        </header>
        <div class="source-grid">
          <article v-for="source in downloadedSources" :key="source.id" class="source-card">
            <div class="source-card-head">
              <FileText />
              <span>{{ trustLabel(source.trustLevel) }}</span>
            </div>
            <h4>{{ source.name }}</h4>
            <p>{{ source.notes }}</p>
            <p class="source-license">{{ source.license }}</p>
            <div class="source-links">
              <button type="button" @click="openLocalSource(source)">
                <BookOpen />
                本地索引
              </button>
              <button type="button" @click="openExternalSource(source)">
                <ExternalLink />
                GitHub
              </button>
            </div>
          </article>
          </div>
        </section>
      </main>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="detailSkill" class="skill-modal-backdrop" @click.self="closeSkillDetail">
          <section class="skill-modal" role="dialog" aria-modal="true" :aria-label="skillName(detailSkill)">
            <button type="button" class="modal-close" title="关闭" @click="closeSkillDetail">
              <X />
            </button>

            <div class="modal-head">
              <div class="modal-icon">
                <component :is="domainIcon(detailSkill.domainId)" />
              </div>
              <div>
                <span>{{ detailSkill.domainName }}</span>
                <h3>{{ skillName(detailSkill) }}</h3>
                <small v-if="skillOriginalName(detailSkill)" class="modal-original-name">
                  原名：{{ skillOriginalName(detailSkill) }}
                </small>
                <p>{{ skillDescription(detailSkill) }}</p>
              </div>
            </div>

            <div class="modal-grid">
              <section class="modal-section">
                <h4>适用任务</h4>
                <div class="modal-chip-list">
                  <span v-for="task in skillTasks(detailSkill)" :key="task">{{ task }}</span>
                </div>
              </section>

              <section class="modal-section">
                <h4>知识输入</h4>
                <div class="modal-chip-list">
                  <span v-for="input in skillKnowledgeInputs(detailSkill)" :key="input">{{ input }}</span>
                </div>
              </section>

              <section class="modal-section">
                <h4>激活条件</h4>
                <p>{{ skillActivation(detailSkill) }}</p>
              </section>

              <section class="modal-section">
                <h4>来源与审查</h4>
                <p>{{ detailSkill.source }}<template v-if="!detailSkill.inlineContent"> · {{ skillSafety(detailSkill) }}</template></p>
              </section>

              <section class="modal-section">
                <h4>运行与文件</h4>
                <dl class="modal-fact-list">
                  <div>
                    <dt>状态</dt>
                    <dd>{{ statusLabel(detailSkill.status) }}</dd>
                  </div>
                  <div v-if="detailSkill.stars">
                    <dt>GitHub Star</dt>
                    <dd>{{ detailSkill.stars.toLocaleString() }} · 2026-11-25</dd>
                  </div>
                  <div v-if="detailSkill.license">
                    <dt>许可证</dt>
                    <dd>{{ detailSkill.license || '未标注' }}</dd>
                  </div>
                  <div>
                    <dt>运行时</dt>
                    <dd>{{ runtimeLabel(detailSkill.runtime) }}</dd>
                  </div>
                  <div v-if="!detailSkill.inlineContent">
                    <dt>本地 Skill</dt>
                    <dd>{{ detailSkill.localPath || '未下载' }}</dd>
                  </div>
                  <div v-if="detailSkill.skillPath">
                    <dt>上游 Skill</dt>
                    <dd v-if="detailSkill.inlineContent"><a :href="safeExternalHttpUrl(detailSkill.sourceRepo + '/blob/main/' + detailSkill.skillPath)" target="_blank" rel="noopener noreferrer">查看 SKILL.md</a></dd>
                    <dd v-else>{{ detailSkill.skillPath }}</dd>
                  </div>
                  <div v-if="detailSkill.upstreamReferenceUrl">
                    <dt>参考来源</dt>
                    <dd><a :href="safeExternalHttpUrl(detailSkill.upstreamReferenceUrl)" target="_blank" rel="noopener noreferrer">查看参考来源</a></dd>
                  </div>
                  <div v-if="detailSkill.sourceAvailableNotice">
                    <dt>许可说明</dt>
                    <dd>{{ detailSkill.sourceAvailableNotice }}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <div class="modal-actions">
              <button
                class="modal-use-btn"
                :class="{ 'is-selected': isSkillSelected(detailSkill.id) }"
                type="button"
                @click="toggleSkill(detailSkill)"
              >
                <CheckCircle2 v-if="isSkillSelected(detailSkill.id)" />
                <Plus v-else />
                {{ isSkillSelected(detailSkill.id) ? '已加入使用列表' : '选择使用这个 Skill' }}
              </button>
            </div>
          </section>
        </div>
      </Transition>

      <Transition name="modal-fade">
        <div v-if="detailPlugin" class="skill-modal-backdrop" @click.self="closePluginDetail">
          <section class="skill-modal" role="dialog" aria-modal="true" :aria-label="pluginText(detailPlugin.title)">
            <button type="button" class="modal-close" aria-label="关闭" @click="closePluginDetail"><X /></button>
            <div class="modal-head">
              <div class="modal-icon"><PlugZap /></div>
              <div>
                <span>{{ pluginCategoryTitle(detailPlugin.category) }}</span>
                <h3>{{ pluginText(detailPlugin.title) }}</h3>
                <p>{{ pluginText(detailPlugin.description) }}</p>
              </div>
            </div>
            <div class="modal-grid">
              <section class="modal-section">
                <h4>版本与来源</h4>
                <dl class="modal-fact-list dsh-plugin-facts">
                  <div><dt>发布者</dt><dd>{{ detailPlugin.author }}</dd></div>
                  <div><dt>安装来源</dt><dd><a :href="safeExternalHttpUrl(detailPlugin.homepage)" target="_blank" rel="noopener noreferrer">{{ detailPlugin.name }}</a></dd></div>
                  <div v-if="detailPlugin.requirements"><dt>运行条件</dt><dd>{{ detailPlugin.requirements }}</dd></div>
                  <div v-if="detailPlugin.unavailable"><dt>添加限制</dt><dd>{{ detailPlugin.unavailable }}</dd></div>
                  <div>
                    <dt><label for="dsh-plugin-version">版本</label></dt>
                    <dd><select id="dsh-plugin-version" v-model="pluginVersion" :disabled="pluginState?.installed || pluginState?.provided || Boolean(pendingPluginAction) || pluginActionBusy">
                      <option v-for="version in detailPlugin.versions" :key="version.version" :value="version.version">{{ version.version }}</option>
                    </select></dd>
                  </div>
                  <div><dt>兼容性</dt><dd>{{ pluginCompatibilityLabel }}</dd></div>
                  <div><dt>状态</dt><dd>{{ pluginStateLabel(detailPlugin) }}</dd></div>
                </dl>
              </section>
            </div>
            <p v-if="pluginActionMessage" class="db-privacy-note" role="status">{{ pluginActionMessage }}</p>
            <p v-if="pluginActionError" class="form-error" role="alert">{{ pluginActionError }}</p>
            <div class="modal-actions">
              <router-link v-if="!getToken() && !detailPlugin.unavailable" class="use-skill-btn" :to="pluginLoginRoute">登录后管理插件</router-link>
              <template v-else-if="pendingPluginAction">
                <button class="use-skill-btn" type="button" :disabled="pluginActionBusy" @click="pendingPluginAction = ''">取消</button>
                <button class="modal-use-btn" type="button" :disabled="pluginActionBusy" @click="applyPluginAction">
                  {{ pluginActionBusy ? '正在处理…' : '确认' + pluginActionLabels[pendingPluginAction] }}
                </button>
              </template>
              <template v-else-if="pluginState">
                <button v-if="pluginState.removable" class="use-skill-btn" type="button" @click="pendingPluginAction = 'remove'">卸载</button>
                <button v-if="primaryPluginAction" class="modal-use-btn" type="button" @click="pendingPluginAction = primaryPluginAction">
                  {{ primaryPluginAction === 'disable' ? '停用' : '添加' }}
                </button>
              </template>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  Archive,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  CheckCircle2,
  Database,
  DownloadCloud,
  ExternalLink,
  FileSearch,
  FileText,
  Globe2,
  Layers,
  LibraryBig,
  LockKeyhole,
  Network,
  Plus,
  PlugZap,
  RefreshCw,
  Scale,
  Search,
  Server,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-vue-next'
import { safeExpertSkillDocumentPath, safeExternalHttpUrl } from '@/utils/externalUrl.js'
import { getToken } from '@/utils/auth.js'
import { expertSkillGroups } from '@/features/assistant/expert-skill-market.js'

const CATALOG_URL = '/datasets/expert-skills/catalog.json'
const DB_STORAGE_KEY = 'globemind_academic_data_database_cards_v1'
const SELECTED_SKILLS_KEY = 'globemind_academic_data_selected_skills_v1'
const CAPABILITIES_SYNC_KEY = 'globemind_assistant_capabilities_sync_v1'

const FEATURED_SKILLS = [
  { id: 'globemind-docx-processing', eyebrow: '文档工作', summary: '创建、编辑与检查 Word 文档' },
  { id: 'ppt-master-ppt-master', eyebrow: '演示制作', summary: '从文档或模板生成可编辑 PPT' },
  { id: 'alirez-litreview', eyebrow: '论文检索', summary: '制定检索式并系统综述文献' },
  { id: 'nous-arxiv', eyebrow: '精准查论文', summary: '定向检索 arXiv 论文与元数据' },
  { id: 'nous-research-paper-writing', eyebrow: '学术写作', summary: '组织论文结构、论证与引用' },
  { id: 'orchestra-academic-plotting', eyebrow: '研究表达', summary: '生成适合论文发表的学术图表' },
  { id: 'globemind-pdf-processing', eyebrow: '文献阅读', summary: '提取、整理与核对 PDF 内容' },
  { id: 'globemind-xlsx-processing', eyebrow: '数据处理', summary: '分析、编辑与交付 Excel 工作簿' },
]

const catalog = ref({
  version: '',
  updatedAt: '',
  policy: {},
  downloadedSources: [],
  domains: [],
})
const searchKeyword = ref('')
const activeDomainId = ref('all')
const databaseCards = ref([])
const selectedSkillIds = ref([])
const detailSkill = ref(null)
const dbFormError = ref('')
const catalogLoading = ref(true)
const catalogError = ref('')
const capabilitySyncing = ref(false)
const capabilitySyncError = ref('')
const capabilitySyncUnavailable = ref(false)
const capabilityLastSyncedAt = ref('')
const capabilityNeedsMigration = ref(false)
let capabilitySyncGeneration = 0

const route = useRoute()
const isPluginDomain = computed(() => activeDomainId.value === 'dsh-plugins')
const pluginLoginRoute = computed(() => ({ path: '/login', query: { redirect: route.fullPath } }))
const pluginApi = '/api/assistant/dsh-plugins'
const pluginIndex = ref(null)
const pluginLoading = ref(false)
const pluginError = ref('')
const pluginCategory = ref('')
const pluginGroup = ref('featured')
const pluginStates = ref({})
const pluginStatusLoading = ref(false)
const pluginStatusError = ref('')
const pluginNotice = ref('')
const detailPlugin = ref(null)
const pluginVersion = ref('')
const pendingPluginAction = ref('')
const pluginActionBusy = ref(false)
const pluginActionError = ref('')
const pluginActionMessage = ref('')
const pluginActionLabels = { install: '安装并启用', enable: '启用', disable: '停用', remove: '卸载' }

const dbTypes = [
  { name: 'PostgreSQL', port: '5432' },
  { name: 'Milvus', port: '19530' },
  { name: 'ClickHouse', port: '8123' },
  { name: 'Elasticsearch', port: '9200' },
  { name: 'MySQL', port: '3306' },
  { name: 'MongoDB', port: '27017' },
  { name: 'Neo4j', port: '7687' },
  { name: 'Object Storage', port: '443' },
]

const dbForm = reactive({
  name: '',
  type: 'PostgreSQL',
  host: '',
  port: '5432',
  database: '',
  username: '',
  purpose: '',
  tags: '',
})

const domainIcons = {
  geo: Globe2,
  mil: Shield,
  econ: BriefcaseBusiness,
  law: Scale,
  academic: LibraryBig,
  psych: BrainCircuit,
  osint: FileSearch,
  research: FileSearch,
  mlops: Network,
  frontend: Layers,
  devops: Server,
  security: Shield,
  compliance: Scale,
  documents: FileText,
  data: Database,
  agent: BrainCircuit,
  engineering: Network,
  business: BriefcaseBusiness,
  product: Layers,
  marketing: Globe2,
  presentations: FileText,
  creative: LibraryBig,
  productivity: BrainCircuit,
  knowledge: BookOpen,
}

const originalSkills = computed(() =>
  (catalog.value.domains || []).flatMap((domain) => (domain.skills || []).map((skill) => ({
    ...skill,
    domainId: domain.id,
    domainName: domain.shortName || domain.name,
  }))),
)
const domains = computed(() => {
  const originalById = new Map(originalSkills.value.map((skill) => [skill.id, skill]))
  return expertSkillGroups.map((group) => ({
    id: group.id,
    name: group.name,
    skills: [...group.retainedIds.map((id) => originalById.get(id)).filter(Boolean), ...group.skills],
  }))
})
const downloadedSources = computed(() => catalog.value.downloadedSources || [])
const catalogPolicy = computed(() => catalog.value.policy || {})
const catalogMeta = computed(() => {
  if (catalogLoading.value) return '正在加载目录'
  if (catalogError.value) return '目录不可用'
  return catalog.value.updatedAt ? `更新 ${catalog.value.updatedAt}` : '本地目录'
})

const totalSkills = computed(() =>
  domains.value.reduce((sum, domain) => sum + (domain.skills?.length || 0), 0),
)

const allSkills = computed(() =>
  domains.value.flatMap((domain) =>
    (domain.skills || []).map((skill) => ({
      ...skill,
      domainId: domain.id,
      domainName: domain.shortName || domain.name,
    })),
  ),
)

const featuredSkills = computed(() => {
  const skillsById = new Map(allSkills.value.map((skill) => [skill.id, skill]))
  return FEATURED_SKILLS
    .map((item) => ({ ...item, skill: skillsById.get(item.id) }))
    .filter((item) => item.skill)
})

const activeDomain = computed(() =>
  domains.value.find((domain) => domain.id === activeDomainId.value) || null,
)

const activeDomainTitle = computed(() => {
  if (activeDomainId.value === 'all') return '精选 Skill 目录'
  return activeDomain.value?.name || '专家 Skill'
})

const filteredSkills = computed(() => {
  const q = searchKeyword.value.trim().toLowerCase()
  return allSkills.value.filter((skill) => {
    if (activeDomainId.value !== 'all' && skill.domainId !== activeDomainId.value) return false
    if (!q && activeDomainId.value === 'all' && FEATURED_SKILLS.some((item) => item.id === skill.id)) return false
    if (!q) return true
    const haystack = [
      skill.name,
      skill.nameZh,
      skill.description,
      skill.descriptionZh,
      skill.domainName,
      skill.source,
      skill.status,
      skill.license,
      skill.runtime,
      skill.quality,
      skill.sourceRepo,
      skill.skillPath,
      skill.upstreamReferenceUrl,
      skill.sourceAvailableNotice,
      skill.activationHint,
      skill.activationHintZh,
      skill.safety,
      skill.safetyZh,
      ...(skill.tasks || []),
      ...(skill.tasksZh || []),
      ...(skill.knowledgeInputs || []),
      ...(skill.knowledgeInputsZh || []),
      ...(skill.requires || []),
      ...(skill.tags || []),
    ].join(' ').toLowerCase()
    return haystack.includes(q)
  })
})

const selectedSkillSet = computed(() => new Set(selectedSkillIds.value))

const selectableSkills = computed(() => new Map([...originalSkills.value, ...allSkills.value].map((skill) => [skill.id, skill])))
const selectedSkills = computed(() => selectedSkillIds.value.map((id) => selectableSkills.value.get(id)).filter(Boolean))

const capabilitySyncMessage = computed(() => {
  if (!getToken()) return '访客选择仅保存在当前浏览器；登录后可同步到知识库和 DSH。'
  if (capabilitySyncing.value) return '正在同步到知识库和 DSH...'
  if (capabilitySyncUnavailable.value) return '已保存在当前浏览器；账户与 DSH 同步暂不可用。'
  if (capabilitySyncError.value) return capabilitySyncError.value
  if (capabilityLastSyncedAt.value) return `已同步到知识库和 DSH · ${capabilityLastSyncedAt.value}`
  return '选择会同步到知识库，并作为原生 Skill 接入 DSH。'
})

function domainIcon(id) {
  return domainIcons[id] || BookOpen
}

function trustLabel(level) {
  const labels = {
    official: '官方示例',
    standard: '开放标准',
    'community-curated': '社区索引',
    'community-registry': '社区注册表',
    'upstream-runtime': '上游运行时',
    'domain-specialist': '领域专家',
    'large-community-library': '大型社区库',
    'specialized-upstream': '专项上游',
    'internal-policy': '内部策略',
  }
  return labels[level] || level || '来源'
}

function statusLabel(status) {
  const labels = {
    available: '可用',
    'available-requires-runtime': '需运行时',
  }
  return labels[status] || status || '待审查'
}

function statusClass(status) {
  return status === 'available' ? 'ready' : 'runtime'
}

function runtimeLabel(runtime) {
  const labels = {
    'script-backed': '脚本支持',
    'tool-backed': '外部工具',
    'workflow-backed': '工作流',
    'reference-backed': '参考资料',
    'eval-backed': '评测流程',
  }
  return labels[runtime] || runtime || '未标注'
}

function skillName(skill) {
  return skill?.nameZh || skill?.name || '未命名 Skill'
}

function skillOriginalName(skill) {
  if (!skill?.name || !skill?.nameZh || skill.nameZh === skill.name) return ''
  return skill.name
}

function skillDescription(skill) {
  return skill?.descriptionZh || skill?.description || ''
}

function skillActivation(skill) {
  return skill?.activationHintZh || skill?.activationHint || '按任务需要启用。'
}

function skillSafety(skill) {
  return skill?.safetyZh || skill?.safety || '按需读取 Skill 原文并遵守最小权限。'
}

function skillTasks(skill) {
  return skill?.tasksZh?.length ? skill.tasksZh : (skill?.tasks || [])
}

function skillKnowledgeInputs(skill) {
  return skill?.knowledgeInputsZh?.length ? skill.knowledgeInputsZh : (skill?.knowledgeInputs || [])
}

function isSkillSelected(id) {
  return selectedSkillSet.value.has(id)
}

function toggleSkill(skill) {
  const id = skill?.id
  if (!id) return
  if (isSkillSelected(id)) {
    selectedSkillIds.value = selectedSkillIds.value.filter((skillId) => skillId !== id)
  } else {
    selectedSkillIds.value = [id, ...selectedSkillIds.value].slice(0, 12)
  }
  persistSelectedSkills()
}

function removeSelectedSkill(id) {
  selectedSkillIds.value = selectedSkillIds.value.filter((skillId) => skillId !== id)
  persistSelectedSkills()
}

function openSkillDetail(skill) {
  detailSkill.value = skill
}

function closeSkillDetail() {
  detailSkill.value = null
}

function persistSelectedSkills() {
  try {
    localStorage.setItem(SELECTED_SKILLS_KEY, JSON.stringify(selectedSkillIds.value))
  } catch (error) {
    console.warn('保存已使用 skill 失败', error)
  }
  void syncCapabilities()
}

function capabilityFingerprint(skillIds = selectedSkillIds.value, cards = databaseCards.value) {
  return JSON.stringify({
    skills: [...skillIds].sort(),
    databases: cards.map((card) => card.id).filter(Boolean).sort(),
  })
}

function readCapabilitySyncFingerprint() {
  try { return localStorage.getItem(CAPABILITIES_SYNC_KEY) || '' } catch { /* Storage may be unavailable. */ return '' }
}

function markCapabilitiesSynced() {
  try { localStorage.setItem(CAPABILITIES_SYNC_KEY, capabilityFingerprint()) } catch { /* Storage is optional. */ }
}

function loadSelectedSkills() {
  try {
    const raw = localStorage.getItem(SELECTED_SKILLS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    selectedSkillIds.value = Array.isArray(parsed) ? parsed.filter(Boolean) : []
  } catch {
    selectedSkillIds.value = []
  }
}

function pruneSelectedSkills() {
  if (catalogError.value) return
  const validIds = selectableSkills.value
  if (!validIds.size || !selectedSkillIds.value.length) return
  const nextIds = selectedSkillIds.value.filter((id) => validIds.has(id))
  if (nextIds.length !== selectedSkillIds.value.length) {
    selectedSkillIds.value = nextIds
    persistSelectedSkills()
  }
}

function applyDefaultPort() {
  const item = dbTypes.find((type) => type.name === dbForm.type)
  if (item) dbForm.port = item.port
}

function normalizeTags(raw) {
  return String(raw || '')
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6)
}

function saveDatabaseCard() {
  dbFormError.value = ''
  if (!dbForm.name || !dbForm.host) {
    dbFormError.value = '请至少填写卡片名称和数据库 IP / Host。'
    return
  }
  const now = new Date().toISOString()
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `db-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const card = {
    id,
    name: dbForm.name,
    type: dbForm.type,
    host: dbForm.host,
    port: dbForm.port || '默认',
    database: dbForm.database,
    username: dbForm.username,
    purpose: dbForm.purpose,
    tags: normalizeTags(dbForm.tags),
    createdAt: now,
  }
  databaseCards.value = [card, ...databaseCards.value]
  persistDatabaseCards()
  resetDbForm()
}

function removeDatabaseCard(id) {
  databaseCards.value = databaseCards.value.filter((card) => card.id !== id)
  persistDatabaseCards()
}

function resetDbForm() {
  dbForm.name = ''
  dbForm.type = 'PostgreSQL'
  dbForm.host = ''
  dbForm.port = '5432'
  dbForm.database = ''
  dbForm.username = ''
  dbForm.purpose = ''
  dbForm.tags = ''
}

function persistDatabaseCards() {
  try {
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(databaseCards.value))
  } catch (error) {
    console.warn('保存数据库卡片失败', error)
  }
  void syncCapabilities()
}

function loadDatabaseCards() {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY)
    databaseCards.value = raw ? JSON.parse(raw) : []
  } catch {
    databaseCards.value = []
  }
}

function authHeaders(extra = {}) {
  const token = getToken()
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra
}

async function readSelectedSkillContent(skill) {
  if (skill.inlineContent) return skill.inlineContent
  const target = safeExpertSkillDocumentPath(skill?.localPath)
  if (!target) return ''
  const response = await fetch(target, { cache: 'force-cache' })
  if (!response.ok) return ''
  return response.text()
}

async function syncCapabilities() {
  const token = getToken()
  if (!token || catalogLoading.value || capabilitySyncUnavailable.value) return
  const generation = ++capabilitySyncGeneration
  capabilitySyncing.value = true
  capabilitySyncError.value = ''
  try {
    const skills = await Promise.all(selectedSkills.value.map(async (skill) => ({
      id: skill.id,
      name: skill.name || skill.id,
      nameZh: skill.nameZh || '',
      description: skill.description || '',
      descriptionZh: skill.descriptionZh || '',
      domain: skill.domainId || '',
      source: skill.source || '',
      runtime: skill.runtime || '',
      content: await readSelectedSkillContent(skill),
    })))
    const response = await fetch('/api/assistant/capabilities', {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ skills, databaseCards: databaseCards.value }),
    })
    const payload = await response.json().catch(() => ({}))
    if (response.status === 404 || response.status === 405) {
      if (generation === capabilitySyncGeneration) {
        capabilitySyncUnavailable.value = true
        capabilitySyncError.value = ''
      }
      return
    }
    if (!response.ok) throw new Error(payload.detail || payload.error || '能力同步失败')
    if (generation === capabilitySyncGeneration) {
      markCapabilitiesSynced()
      capabilityLastSyncedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    }
  } catch (error) {
    if (generation === capabilitySyncGeneration) {
      capabilitySyncError.value = error instanceof Error ? error.message : '能力同步失败'
    }
  } finally {
    if (generation === capabilitySyncGeneration) capabilitySyncing.value = false
  }
}

async function loadAccountCapabilities() {
  if (!getToken()) return
  try {
    const response = await fetch('/api/assistant/capabilities', { headers: authHeaders(), cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    if (response.status === 404 || response.status === 405) {
      capabilitySyncUnavailable.value = true
      capabilitySyncError.value = ''
      return
    }
    if (!response.ok) throw new Error(payload.detail || payload.error || '能力配置加载失败')
    const profile = payload.data || {}
    const hasAccountProfile = Boolean(profile.updatedAt)
    const hasPendingLocalChanges = Boolean(
      (selectedSkillIds.value.length || databaseCards.value.length)
      && readCapabilitySyncFingerprint() !== capabilityFingerprint(),
    )
    if (hasAccountProfile && Array.isArray(profile.skills) && !hasPendingLocalChanges) {
      selectedSkillIds.value = profile.skills.map((skill) => skill.id).filter(Boolean)
    }
    if (hasAccountProfile && Array.isArray(profile.databaseCards) && !hasPendingLocalChanges) {
      databaseCards.value = profile.databaseCards
    }
    capabilityNeedsMigration.value = hasPendingLocalChanges
      || (!hasAccountProfile && Boolean(selectedSkillIds.value.length || databaseCards.value.length))
    capabilityLastSyncedAt.value = profile.updatedAt && !capabilityNeedsMigration.value ? '账号配置已加载' : ''
    if (hasAccountProfile && !capabilityNeedsMigration.value) markCapabilitiesSynced()
    persistSelectedSkillsLocally()
    persistDatabaseCardsLocally()
  } catch (error) {
    capabilitySyncError.value = error instanceof Error ? error.message : '能力配置加载失败'
  }
}

function persistSelectedSkillsLocally() {
  try { localStorage.setItem(SELECTED_SKILLS_KEY, JSON.stringify(selectedSkillIds.value)) } catch { /* Storage is optional. */ }
}

function persistDatabaseCardsLocally() {
  try { localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(databaseCards.value)) } catch { /* Storage is optional. */ }
}

function openLocalSource(source) {
  const target = safeExpertSkillDocumentPath(source?.localPath)
  if (target) window.open(target, '_blank', 'noopener,noreferrer')
}

function openExternalSource(source) {
  const target = safeExternalHttpUrl(source?.repoUrl)
  if (target) window.open(target, '_blank', 'noopener,noreferrer')
}

async function loadCatalog() {
  catalogLoading.value = true
  catalogError.value = ''
  try {
    const response = await fetch(CATALOG_URL)
    if (!response.ok) throw new Error(`catalog ${response.status}`)
    catalog.value = await response.json()
    pruneSelectedSkills()
  } catch (error) {
    console.error('加载专家 skill 目录失败:', error)
    catalogError.value = '请检查网络后重试。现有选择和数据库卡片不会受到影响。'
  } finally {
    catalogLoading.value = false
  }
}

function pluginText(value) {
  return typeof value === 'string' ? value : value?.zh || value?.en || ''
}

function pluginCategoryTitle(categoryId) {
  return pluginText(pluginIndex.value?.categories.find(category => category.id === categoryId)?.title)
}

function selectPluginGroup(group) {
  pluginCategory.value = ''
  pluginGroup.value = group
}

const matchingPlugins = computed(() => {
  const terms = searchKeyword.value.normalize('NFKC').toLowerCase().trim().split(/\s+/).filter(Boolean)
  const groups = { featured: [], other: [] }
  for (const plugin of pluginIndex.value?.plugins || []) {
    const text = [plugin.name, plugin.author, pluginText(plugin.title), plugin.title?.en,
      pluginText(plugin.description), plugin.description?.en, plugin.requirements,
      pluginCategoryTitle(plugin.category)].join(' ').normalize('NFKC').toLowerCase()
    if (terms.every(term => text.includes(term))) groups[plugin.unavailable ? 'other' : 'featured'].push(plugin)
  }
  return groups
})
const filteredPlugins = computed(() => matchingPlugins.value[pluginGroup.value].filter(plugin =>
  !pluginCategory.value || plugin.category === pluginCategory.value,
))
const pluginState = computed(() => pluginStates.value[detailPlugin.value?.name])
const pluginCompatibility = computed(() => pluginState.value?.versions.find(version =>
  version.version === (pluginState.value.installedVersion || pluginVersion.value),
)?.compatibility)
const pluginCompatibilityLabel = computed(() => {
  if (detailPlugin.value?.unavailable && !pluginCompatibility.value) return '查看添加限制'
  if (!pluginCompatibility.value) return '连接数据助手后检查'
  return pluginCompatibility.value.compatible ? '兼容当前 DSH' : '与当前 DSH 版本不兼容'
})
const primaryPluginAction = computed(() => {
  if (pluginState.value?.enabled) return 'disable'
  if (detailPlugin.value?.unavailable || pluginState.value?.error || !pluginCompatibility.value?.compatible) return ''
  return pluginState.value?.installed || pluginState.value?.provided ? 'enable' : 'install'
})

function pluginCanBeAdded(plugin) {
  const state = pluginStates.value[plugin.name]
  return !plugin.unavailable && !state?.enabled && (!state || Boolean(state.defaultVersion && !state.error))
}

function pluginStateLabel(plugin) {
  const state = pluginStates.value[plugin.name]
  if (plugin.unavailable && !state?.enabled) return '仅浏览'
  if (!state) return getToken() ? '等待连接' : 'DSH 插件'
  if (state.error === 'incompatible-version' || !state.defaultVersion) return '版本不兼容'
  if (state.error) return '状态异常'
  if (state.enabled) return '已启用'
  if (state.provided) return '随 DSH 提供'
  if (state.installed) return '已停用'
  return '未安装'
}

const directoryLoading = computed(() => isPluginDomain.value ? pluginLoading.value : catalogLoading.value)
const directoryError = computed(() => isPluginDomain.value ? pluginError.value : catalogError.value)
const catalogCards = computed(() => isPluginDomain.value
  ? filteredPlugins.value.map(pluginCard)
  : filteredSkills.value.map(skillCard),
)

const heroStatistics = computed(() => {
  if (!isPluginDomain.value) {
    return [
      { label: '专家领域', value: catalogLoading.value ? '—' : domains.value.length },
      { label: '精选 skill', value: catalogLoading.value ? '—' : totalSkills.value },
      { label: '下载索引', value: catalogLoading.value ? '—' : downloadedSources.value.length },
      { label: '数据库卡片', value: databaseCards.value.length },
    ]
  }
  const index = pluginIndex.value
  const available = index?.plugins.filter(plugin => !plugin.unavailable).length
  return [
    { label: '插件总数', value: index?.plugins.length ?? '—' },
    { label: '可添加', value: available ?? '—' },
    { label: '仅浏览', value: index ? index.plugins.length - available : '—' },
    { label: '用途分类', value: index?.categories.length ?? '—' },
  ]
})

function reloadDirectory() {
  return isPluginDomain.value ? loadPluginIndex() : loadCatalog()
}

function skillCard(skill) {
  const tasks = skillTasks(skill)
  const selected = isSkillSelected(skill.id)
  return {
    key: 'skill:' + skill.id,
    kind: skill.stars ? 'GITHUB STAR' : 'SKILL',
    count: skill.stars?.toLocaleString() || tasks.length,
    icon: domainIcon(skill.domainId),
    category: skill.domainName,
    title: skillName(skill),
    status: statusLabel(skill.status),
    statusClass: statusClass(skill.status),
    badges: [skill.license, (skill.hasSkillMd || skill.skillPath && skill.inlineContent) && 'SKILL.md'].filter(Boolean),
    highlight: skill.inlineContent ? runtimeLabel(skill.runtime) : tasks[0] || '专家能力',
    highlightDetail: skillKnowledgeInputs(skill).length + ' 类知识输入',
    description: skillDescription(skill),
    tags: skill.inlineContent ? [] : tasks,
    facts: [
      ['来源', skill.source],
      ['激活条件', skillActivation(skill)],
      ['运行时', runtimeLabel(skill.runtime)],
    ],
    note: skill.inlineContent ? '' : skillSafety(skill),
    selected,
    open: () => openSkillDetail(skill),
    action: {
      icon: selected ? CheckCircle2 : Plus,
      label: selected ? '已选择使用' : '选择使用',
      run: () => toggleSkill(skill),
    },
  }
}

function pluginCard(plugin) {
  const state = pluginStates.value[plugin.name]
  const version = plugin.versions.find(item => item.version === state?.defaultVersion) || plugin.versions[0]
  const source = version?.source
  const sourceLabel = source?.type === 'npm' ? 'npm' : source?.type === 'git' ? 'Git' : ''
  const selected = state?.enabled === true
  const open = () => openPluginDetail(plugin)
  const canAdd = pluginCanBeAdded(plugin)
  const tags = []
  if (sourceLabel) tags.push(sourceLabel)
  if (version?.engines?.dsh) tags.push('DSH ' + version.engines.dsh)
  return {
    key: 'plugin:' + plugin.name,
    kind: 'DSH',
    count: plugin.versions.length,
    icon: PlugZap,
    category: pluginCategoryTitle(plugin.category),
    title: pluginText(plugin.title),
    status: pluginStateLabel(plugin),
    statusClass: selected && !state.error ? 'ready' : 'runtime',
    badges: plugin.author ? [plugin.author] : [],
    highlight: '推荐版本',
    highlightDetail: version?.version || '—',
    description: pluginText(plugin.description),
    tags,
    facts: [
      ['来源', [plugin.author, sourceLabel].filter(Boolean).join(' · ')],
      ['激活条件', plugin.requirements || (plugin.unavailable ? '查看添加限制' : '在当前数据助手中启用')],
      ['运行时', 'DSH'],
    ],
    note: plugin.unavailable || (selected ? '已在当前数据助手中启用' : state?.error ? '请查看详情中的兼容性和状态' : '添加时确认插件来源和版本'),
    selected,
    open,
    action: { icon: canAdd ? Plus : FileSearch, label: canAdd ? '添加' : '查看详情', run: open },
  }
}

async function loadPluginIndex() {
  if (pluginLoading.value) return
  pluginLoading.value = true
  pluginError.value = ''
  try {
    const response = await fetch(pluginApi + '/catalog')
    if (!response.ok) throw new Error(String(response.status))
    pluginIndex.value = await response.json()
  } catch {
    pluginError.value = '插件目录加载失败'
  } finally {
    pluginLoading.value = false
  }
}

async function loadPluginStatus() {
  if (!getToken() || pluginStatusLoading.value) return
  pluginStatusLoading.value = true
  pluginStatusError.value = ''
  try {
    const response = await fetch(pluginApi + '/status', { headers: authHeaders(), cache: 'no-store' })
    if (!response.ok) throw new Error(String(response.status))
    const payload = await response.json()
    pluginStates.value = Object.fromEntries(payload.plugins.map(plugin => [plugin.name, plugin]))
  } catch {
    pluginStatusError.value = '暂时无法读取数据助手的插件状态'
  } finally {
    pluginStatusLoading.value = false
  }
}

function openPluginMarket() {
  if (!isPluginDomain.value) selectPluginGroup('featured')
  activeDomainId.value = 'dsh-plugins'
  if (!pluginIndex.value) void loadPluginIndex()
  void loadPluginStatus()
}

function openPluginDetail(plugin) {
  detailPlugin.value = plugin
  const state = pluginStates.value[plugin.name]
  pluginVersion.value = plugin.versions.find(version => version.version === state?.installedVersion)?.version
    || state?.defaultVersion || plugin.versions[0]?.version || ''
  pendingPluginAction.value = ''
  pluginActionMessage.value = ''
  pluginActionError.value = ''
}

function closePluginDetail() {
  if (!pluginActionBusy.value) detailPlugin.value = null
}

async function applyPluginAction() {
  if (!detailPlugin.value || !pendingPluginAction.value || pluginActionBusy.value) return
  const action = pendingPluginAction.value
  pluginActionBusy.value = true
  pluginActionError.value = ''
  pluginActionMessage.value = ''
  pluginNotice.value = ''
  try {
    const response = await fetch(pluginApi + '/actions', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ name: detailPlugin.value.name, action, version: pluginVersion.value }),
    })
    const result = await response.json()
    if (response.ok && result.application === 'applied') {
      pluginActionMessage.value = pluginActionLabels[action] + '成功'
    } else if (response.ok && result.application === 'restart-required') {
      pluginActionMessage.value = '更改已保存，下次启动数据助手时生效'
    } else if (result.needsBuildApproval) {
      pluginActionError.value = '该版本需要额外授权才能运行依赖的构建脚本'
    } else {
      const message = {
        'incompatible-version': '插件版本与当前 DSH 不兼容',
        'already-installed': '当前数据助手已安装此插件',
        'action-unavailable': '当前插件状态不支持此操作',
        'overridden': '插件配置被当前数据助手设置覆盖',
      }[result.error || result.code || result.application]
      pluginActionError.value = message || (typeof result.detail === 'string' ? result.detail : '操作失败，请稍后重试')
    }
    pluginNotice.value = pluginActionMessage.value
    await loadPluginStatus()
  } catch {
    pluginActionError.value = '暂时无法确认操作结果，刷新状态后再试'
    await loadPluginStatus()
  } finally {
    pendingPluginAction.value = ''
    pluginActionBusy.value = false
  }
}

function handleKeydown(event) {
  if (event.key === 'Escape' && detailSkill.value) closeSkillDetail()
  if (event.key === 'Escape' && detailPlugin.value) closePluginDetail()
}

onMounted(() => {
  loadDatabaseCards()
  loadSelectedSkills()
  void Promise.all([loadCatalog(), loadAccountCapabilities()]).then(() => {
    pruneSelectedSkills()
    if (capabilityNeedsMigration.value) void syncCapabilities()
  })
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style src="./AcademicData.css" scoped></style>
<style scoped>
.plugin-status-refresh {
  border: 0;
  cursor: pointer;
}
.plugin-status-refresh svg {
  width: 14px;
  height: 14px;
}
.dsh-market-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: space-between;
  margin: 0 0 1rem;
}
.dsh-market-views {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5rem;
}
.dsh-market-views button {
  min-height: 36px;
  white-space: nowrap;
}
.dsh-market-views button[aria-pressed='true'] {
  border-color: currentColor;
  font-weight: 700;
}
.dsh-category-filter {
  align-items: center;
}
.dsh-category-filter select,
.dsh-plugin-facts select {
  max-width: 100%;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--w36-border, #b9c3cb);
  border-radius: 6px;
  background: transparent;
  color: inherit;
}
.dsh-plugin-facts dd {
  overflow-wrap: anywhere;
}
</style>
