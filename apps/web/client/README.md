# @novel-studio/web-client

Novel Studio **Web Studio** 前端（React + Vite + TanStack Query + Tailwind）。设计见 [`../../../docs/design/05-web-studio.md`](../../../docs/design/05-web-studio.md)。

**M2 范围：只读 UI** —— 书库 / 仪表盘 / 资产导航 + 阅读。**M3 新增：建世界向导**（`/books/:id/build/world`）—— AI 起草 / 编辑 / 接受 / 跳过 / approve，写入后自动失效相关 Query 缓存。

## 运行（需要 M1 服务端同时在跑）

```bash
# 终端 A：启动 API 服务端（默认 127.0.0.1:4567）
NOVEL_WORKSPACE=./examples pnpm --filter @novel-studio/web-server dev

# 终端 B：启动前端 dev（默认 127.0.0.1:4568，/api 反代到 4567）
pnpm --filter @novel-studio/web-client dev
# 打开 http://127.0.0.1:4568
```

## 结构

```
src/
├── main.tsx        QueryClientProvider + createBrowserRouter
├── api.ts          fetchJson + TanStack Query hooks（useBooks / useStatus / useAsset）
├── types.ts        API 响应类型（资产 payload 用 unknown，通用渲染）
├── ui.tsx          轻量原语（Card / Badge / Spinner / Empty / ErrorBox）—— 之后可替换为 shadcn/ui
└── pages/
    ├── Library.tsx     /            书库
    ├── BookLayout.tsx  /books/:id   左侧资产导航 + <Outlet/>
    ├── Dashboard.tsx   /books/:id   阶段 + 下一步
    └── AssetPage.tsx   /books/:id/{blueprint|world|characters|outline} 资产阅读
```

## 渲染约定

- 资产信封 `{ exists, data? }`：`exists:false` → 灰显「未创建」。
- 带 `.body` 的资产（蓝图正文 / 大纲）渲染为 Markdown 正文（M2 暂用 `pre` 等宽展示）；
  其余（world / character 的 JSON canonical）走可折叠 JSON 视图。
- 大纲页可点章号按需加载对应章纲（懒查询）。

## 说明（M2 的取舍）

- 设计候选是 shadcn/ui；M2 先用同风格的手写原语（`ui.tsx`），避免在无网环境跑 shadcn CLI。
  之后可用 `pnpm dlx shadcn@latest init` 增量替换，UI 结构不变。
- 客户端**不依赖 `@novel/core`**，只通过 HTTP 调服务端，保持前后端解耦。
- 富渲染（Markdown 渲染器、关系图、版本 diff）属后续打磨；M2 目标是打通只读路径 + 缓存。
