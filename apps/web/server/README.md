# @novel-studio/web-server

Novel Studio **Web Studio** 后端（Hono），本地优先、单用户。设计见 [`../../../docs/design/05-web-studio.md`](../../../docs/design/05-web-studio.md)。

**M1 范围：只读 API**（books / status / assets）。build 工作流的 HTTP+SSE 协议在后续里程碑加入。

## 运行

```bash
# 在仓库根目录先装依赖 + 构建 core
pnpm install
pnpm --filter @novel/core build

# 指向包含书目录的工作区（每个子目录一个 novel.json）
NOVEL_WORKSPACE=./examples pnpm --filter @novel-studio/web-server dev
# → http://127.0.0.1:4567
```

环境变量：`NOVEL_WORKSPACE`（默认 cwd）、`NOVEL_WEB_PORT`（默认 4567）。

## 端点（M1）

| Method & Path | 说明 |
|---|---|
| `GET /api/health` | 健康检查 |
| `GET /api/workspace/books` | 列出工作区里的书 |
| `GET /api/books/:id` | 原始 novel.json |
| `GET /api/books/:id/status` | status detector 报告（阶段 + 下一步） |
| `GET /api/books/:id/assets/blueprint` | 蓝图 |
| `GET /api/books/:id/assets/world/:asset` | worldview / powers / cheat-system |
| `GET /api/books/:id/assets/characters` | 角色索引 + 状态 |
| `GET /api/books/:id/assets/characters/:charId` | 单个角色卡 |
| `GET /api/books/:id/assets/relationships` | 关系网 |
| `GET /api/books/:id/assets/outline` | 三级大纲汇总（存在性 + 计数） |
| `GET /api/books/:id/assets/outline/master` | 总纲 |
| `GET /api/books/:id/assets/outline/volumes/:n` | 第 n 卷卷纲 |
| `GET /api/books/:id/assets/outline/chapters/:n` | 第 n 章章纲 |

资产端点统一信封 `{ exists, data? }`：资产未建时返回 `200 { exists: false }`（不是 404），方便导航树灰显。

## 边界

- 仅监听 `127.0.0.1`，无鉴权（本地单用户）。
- 所有读取经 `@novel/core` 的 `readX`（schema 校验）。写操作 / build 工作流不在 M1。
- 不在前端暴露 LLM key；`/api/config` 留待配置面板里程碑（v3.7）。
