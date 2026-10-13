# GlobeMind 前后端工作入口

本工作区 `/root/data/globemind-shared` 是前后端协作入口，不是前端源码副本。`backend/` 指向本机后端仓库；前端代码实际位于前端服务器 `/data/globemind`，Vue 主站位于 `/data/globemind/vue_project`。前端查看、搜索、编辑、Git 操作、检查和构建均通过 `frontend/remote` 在远端执行，不要在本工作区创建或同步前端源码。

## 前端远端操作

从本工作区运行：

```bash
./frontend/remote status
./frontend/remote list vue_project/src
./frontend/remote read vue_project/package.json
./frontend/remote exec 'git diff --stat'
./frontend/remote shell
./frontend/remote sftp
```

`exec` 命令的工作目录是远端 `/data/globemind`，也支持标准输入脚本。连接优先使用校园网，失败时脚本会尝试公网；需要强制公网时设置 `FRONTEND_CONNECTION=public`。

前端项目职责、依赖和命令见 [`vue_project/README.md`](vue_project/README.md)；服务器维护、检查和发布说明见 [`vue_project/docs/frontend-server-operations.md`](vue_project/docs/frontend-server-operations.md)。未经授权不要发布或重启服务。
