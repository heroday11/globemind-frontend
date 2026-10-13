# vue_project

## 职责

Vue 3/Vite 主站，包含搜索、新闻、研究工作区、助手、治理、故事图、金融终端导航等页面和前端状态/路由。它负责浏览器呈现和 API 请求，不负责数据库、抓取、LLM 或发布 release。

## 主要入口

- `src/main.js` 创建 Vue 应用、Pinia 和 router。
- `src/App.vue` 与 `src/router/` 组织页面；`src/config/api.js` 管理 API 地址。
- `src/features/README.md` 是业务 feature、公共入口和聚焦测试索引。
- `scripts/build-release.mjs` 构建主站并整合金融终端；`scripts/dev-all.mjs` 是未接入默认命令的历史编排器。

## 依赖与环境

前端源码只在前端服务器 `/data/globemind/vue_project`。从协作工作区 `/root/data/globemind-shared` 通过 `./frontend/remote` 执行查看、编辑、依赖安装、开发、检查和构建；不要在本地工作区创建源码副本。Node 版本要求见 `package.json`。`.env.example` 中的 `VITE_*` 值会进入浏览器环境，严禁放入秘密。

## 开发与检查

以下命令均从 `/root/data/globemind-shared` 发起，实际在远端运行：

```bash
./frontend/remote exec 'cd vue_project && npm run dev'
./frontend/remote exec 'cd vue_project && npm run lint'
./frontend/remote exec 'cd vue_project && npm run typecheck'
./frontend/remote exec 'cd vue_project && npm run test:features'
./frontend/remote exec 'cd vue_project && npm run build:main-only'
```

`npm run dev` 只启动 Vue 主站；`dev:main` 是兼容别名。构建输出可由 `VITE_OUT_DIR` 指向隔离目录，避免覆盖源文件或受控发布目录。服务器服务状态、回滚和发布步骤见 [`docs/frontend-server-operations.md`](docs/frontend-server-operations.md)。

## 数据与安全边界

生产数据必须经后端 API 和现有鉴权/权限边界访问；mock API 脚本只用于本地 fixture。不要把 JWT、API key、数据库 URL 或内部主机写进 `VITE_*` 配置、静态资源或日志，也不要用前端脚本写生产数据库。

## 当前状态

主站是活跃 Vue 应用，包含历史兼容页面和 feature audit 文档；构建脚本还会整合金融终端静态包。开发、测试与发布产物边界必须保持分离。
