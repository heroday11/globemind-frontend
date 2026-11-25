const groups = {
  "research": "证据与文献",
  "data": "数据处理与图表",
  "analysis": "专家分析",
  "presentations": "报告与演示",
  "creative": "视频与动效",
  "knowledge": "专家知识源"
}

const retainedSkills = {
  research: ['alirez-litreview', 'nous-arxiv', 'globemind-pdf-processing'],
  data: ['globemind-xlsx-processing', 'orchestra-academic-plotting'],
  presentations: ['nous-research-paper-writing', 'globemind-docx-processing'],
}

const sourceLinks = {
  "world-data": "https://ourworldindata.org/",
  "open-library": "https://openlibrary.org/developers/api",
  "dataset-hub": "https://huggingface.co/datasets",
  "citation-rules": "https://www.zotero.org/styles",
  "openalex": "https://docs.openalex.org/",
  "world-bank": "https://data.worldbank.org/"
}

const upstreamSkillPaths = {
  "ppt-master": "skills/ppt-master/SKILL.md",
  "video-shotcraft": "SKILL.md"
}

// GitHub Star snapshot checked on 2026-11-25.
const workflows = [
  ["presentations","ppt-master","hugohe3/ppt-master",80043,"可编辑 PPT · PPT Master","Python、PPT Master 项目依赖","从报告提炼逐页论点，选择模板并生成可编辑 PPTX；逐页检查文字溢出、源数据与元素可编辑性。"],
  ["creative","video-shotcraft","Vincentwei1021/video-shotcraft",22506,"产品视频 · Video Shotcraft","Node.js、Remotion、项目素材","把真实产品页面转成镜头表，按镜头卡制作动效并对齐旁白与音效；交付可修改的工程和 MP4，注明素材许可。"],
  ["creative","research-video","remotion-dev/remotion",75576,"数据故事视频","Node.js、Remotion","将经核对的时间序列转成字幕和逐帧图表；交付可编辑工程、数据来源和 MP4。"],
  ["creative","terminal-demo","charmbracelet/vhs",21406,"命令行演示录制","VHS、终端录制环境","把可复现命令写入 tape，隐藏凭据，核对输出并交付 GIF 或 MP4。"],
  ["creative","subtitle-edit","FFmpeg/FFmpeg",68140,"视频字幕与剪辑","FFmpeg、媒体素材","检查媒体轨道和时间基准，生成字幕及裁剪后的成片；验证字幕同步和音轨完整性。"],
  ["research","reference-manager","zotero/zotero",16038,"研究资料与引用管理","Zotero 库或导出文件","依据 DOI、标题和年份去重；用 DOI 或出版方核对引用，导出 BibTeX 或 CSL JSON。"],
  ["research","pdf-layout","docling-project/docling",71009,"复杂 PDF 版面提取","Python、Docling 及模型","识别双栏、脚注和表格结构，抽查原页，交付结构化 Markdown 或 JSON。"],
  ["research","document-ocr","ocrmypdf/OCRmyPDF",35398,"扫描件 OCR","OCRmyPDF、对应语言包","检测扫描页和方向，按语种执行 OCR，抽查姓名数字及页码，交付可搜索 PDF。"],
  ["research","multiformat-ingest","microsoft/markitdown",198354,"多格式材料转 Markdown","Python、MarkItDown","将办公附件转为 Markdown；保留文件来源并抽查表格、链接和标题层级。"],
  ["research","archive-search","paperless-ngx/paperless-ngx",48596,"机构文档档案检索","用户授权的 Paperless-ngx 实例","结合日期、通讯方及全文筛选档案，为每条摘录记录档案 ID、日期和原文位置。"],
  ["presentations","reproducible-report","Quarto-dev/quarto-cli",6212,"可复现研究报告","Quarto 和相应计算环境","把数据、统计计算与解释写进同一份报告，重新运行并核对图表，交付源文件与 HTML 或 PDF。"],
  ["presentations","typeset-report","typst/typst",57414,"长篇报告排版","Typst、指定字体","为长报告设计标题、表格和参考文献样式，编译检查交叉引用与分页。"],
  ["presentations","publication-conversion","jgm/pandoc",47078,"报告格式转换","Pandoc、格式对应的导出组件","使用共享源文档输出不同格式，核对脚注、表格、图题和引用是否完整。"],
  ["data","local-sql","duckdb/duckdb",43323,"CSV 与 Parquet 分析","DuckDB","抽查字段类型和缺失值，使用可复跑 SQL 汇总数据，附查询、口径与结果表。"],
  ["data","batch-tables","pola-rs/polars",40497,"大型表格批处理","Python、Polars","为批量表格定义字段规则、去重条件和连接键，报告行数变化并导出 Parquet。"],
  ["data","clean-entities","openrefine/openrefine",12118,"机构与实体清洗","OpenRefine","发现机构名异写，记录聚类与合并依据，保留人工复核清单和可回放变更。"],
  ["data","interactive-chart","plotly/plotly.py",18933,"交互式研究图表","Python、Plotly","按研究问题选择图形，标注单位、来源和缺失点，导出交互 HTML。"],
  ["data","publication-figures","matplotlib/matplotlib",23502,"期刊图与印刷图","Python、Matplotlib","按版面尺寸制作图形，验证字体和黑白可读性，导出 SVG 或 PDF 及绘图代码。"],
  ["data","interactive-dashboard","metabase/metabase",50513,"数据监测看板","用户授权的 Metabase 数据源","定义可比较指标与时间过滤，配置看板并记录数据更新时间。"],
  ["analysis","econometrics","statsmodels/statsmodels",11767,"计量经济与时间序列","Python、statsmodels","先说明识别假设，检查残差、稳健误差与样本区间，报告区间估计和敏感性结果。"],
  ["analysis","bayesian","pymc-devs/pymc",9853,"贝叶斯建模","Python、PyMC","给出先验理由，检查收敛和后验预测，交付带可信区间的结论和可复跑模型。"],
  ["analysis","model-evaluation","scikit-learn/scikit-learn",68321,"预测模型评估","Python、scikit-learn","划分训练和评估数据，检查泄漏，使用基线比较并按样本切片报告误差。"],
  ["analysis","gis","qgis/QGIS",14882,"地理空间研究","QGIS、授权地理数据","检查坐标系与地理边界版本，执行空间连接或缓冲区分析，交付地图和地理数据。"],
  ["analysis","geo-automation","geopandas/geopandas",5313,"空间数据批处理","Python、GeoPandas","批量清理坐标、统一投影并计算空间覆盖；交付 GeoPackage 和可复跑脚本。"],
  ["knowledge","world-data","owid/owid-grapher",1574,"全球发展指标 · Our World in Data","可访问公开数据；核对上游许可","从公开指标中核对定义、时间范围与来源，输出国家对照表和可追溯引用。"],
  ["knowledge","open-library","internetarchive/openlibrary",6986,"国际书目 · Open Library","Open Library 公共接口；遵守限流","区分作品与版本，核对作者、ISBN、出版年和版本来源，返回结构化书目。"],
  ["knowledge","dataset-hub","huggingface/datasets",22185,"开放研究数据集 · Hugging Face","公开数据集访问或已授权账号","比较数据卡、许可、样本划分与适用范围，记录数据版本，抽查样本再引用。"],
  ["knowledge","citation-rules","citation-style-language/styles",3941,"引文规范库 · CSL","引用元数据与目标期刊样式","匹配期刊引用样式，抽查多人作者、网页与缺失年份条目，输出统一参考文献。"],
  ["knowledge","openalex","OpenAlex",null,"学术知识图谱 · OpenAlex","OpenAlex API；核对密钥和配额要求","用 DOI 或 OpenAlex ID 查找研究成果，关联作者、机构和引用。记录筛选条件、检索日期和原始 ID；引用计数按查询时间标注。"],
  ["knowledge","world-bank","World Bank Open Data",null,"世界银行开放数据","世界银行指标 API 或下载文件","先核对指标代码、统计定义与单位，再按经济体和年份查询。保留缺失值和数据版本，在比较时明确口径与覆盖期。"],
]

export const expertSkillGroups = Object.entries(groups).map(([id, name]) => ({
  id,
  name,
  skills: workflows.filter(([group]) => group === id).map(([, key, repo, stars, name, requirement, task]) => {
    const sourceRepo = stars ? `https://github.com/${repo}` : ''
    const reference = sourceLinks[key] || sourceRepo
    const skillPath = upstreamSkillPaths[key]
    const isKnowledgeSource = id === 'knowledge'
    return {
      id: key === 'ppt-master' ? 'ppt-master-ppt-master' : `globemind-expert-${key}`,
      name: key,
      nameZh: name,
      source: repo,
      sourceRepo,
      stars,
      skillPath,
      upstreamReferenceUrl: reference,
      descriptionZh: task,
      tasksZh: [name],
      knowledgeInputsZh: [requirement],
      activationHintZh: requirement,
      status: isKnowledgeSource ? 'available' : 'available-requires-runtime',
      runtime: isKnowledgeSource ? 'reference-backed' : 'tool-backed',
      inlineContent: [
        `# ${name}`,
        task,
        `所需输入或依赖：${requirement}。`,
        `参考来源：${reference}`,
        skillPath ? `上游说明：${sourceRepo}/blob/main/${skillPath}` : '',
        '使用前确认所需工具、数据和权限。如果依赖缺失，说明缺失项及其对交付结果的影响。引用事实时附来源和日期。',
      ].filter(Boolean).join('\n\n'),
    }
  }),
  retainedIds: retainedSkills[id] || [],
}))
