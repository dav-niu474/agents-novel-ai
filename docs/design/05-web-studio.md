# Web Studio 设计 · Novel Studio

> 这份文档把 `roadmap.md` 里的 v3 Web Studio 草案，落成可执行的架构设计。基线是**当前已落地的 CLI**（alpha-2a worldforge / alpha-2b character / alpha-2c outline）。
>
> 一句话目标：在浏览器里管理书、建设定、捏角色、写大纲，作为资产的**第三种视图**——与 Skill、CLI 同源、文件 100% 兼容。

---

## 1. 定位与边界

Web Studio 是一个**本地优先、单用户**的 Web UI：

- 默认绑定 `127.0.0.1:4567`，浏览器访问。
- **复用 CLI 的校验 + 原子写逻辑**，不引入新的数据库。资产文件依然是 `docs/design/01-asset-model.md` 定义的那套，CLI / Skill / Web 三方随时互读。
- 维持 `roadmap.md` 的永久边界：**不做 SaaS、不做多人协作、不做移动端、不上传作者数据**。

它不是新产品，而是 v1 Skill、v2 CLI 之后的**同一组资产的可视化视图**。

```
同一套 SKILL.md / 同一套资产 schema
        │
   ┌────┴───────────────┬───────────────────┐
   ▼                    ▼                   ▼
Skill 视图           CLI 视图             Web 视图
(Agent runtime)    (novel <cmd>)       (Studio, 本文)
对话驱动            命令驱动             点击 + 表单驱动
```

---

## 2. 三条原则如何在 Web 端兑现

延续 `00-system-overview.md` §1.2 的三条不动摇原则：

| 原则 | Web 端的兑现方式 |
|------|------------------|
| **Asset-First（资产中心化）** | Web 不新建数据库。它读写的就是 `novel.json` / `blueprint.md` / `world/*` / `characters/*` / `outline/*`。UI 状态是资产的派生视图，刷新即真相。 |
| **Pipeline-Composable（流水线可拆可合）** | 每个 skill 的 build workflow 在 Web 上变成一个「向导（stepper）」；根编排 `novel-studio` 变成顶部的阶段进度条。可单独跑某一阶段，也可顺序走完。 |
| **Runtime-Agnostic（运行时无依赖）** | 关键：Web 后端**直接 import CLI 的 `core/`**（已验证 `core/` 零 `inquirer`/`commander` 依赖），而不是 fork `novel` 子进程。LLM provider 仍走 `core/llm` 抽象，provider-agnostic 不变。 |

---

## 3. 架构决策：复用 core，重写编排层

### 3.1 已验证的事实

对当前 `cli/src` 做依赖边界扫描：

```
core/ (assets, schemas, llm, skills, status, config, utils)
    → 零 @inquirer/prompts、零 commander            ✅ 可被任意运行时复用
workflows/*.ts + commands/init.ts
    → 依赖 @inquirer/prompts（终端交互）             ❌ 与展示层耦合，不可复用
bin/novel.ts
    → 依赖 commander                                ❌ CLI 专属
```

`core/` 已经天然是「运行时无关」的：Zod schema、`readX/writeX`（原子写 + 校验）、LLM provider、SKILL.md 编译、status detector、config resolver——全部可以被一个 web server 直接调用。

### 3.2 决策

> **决策**：Web 后端把 `core/` 当库 import；build 工作流的**编排状态机在 Web 端重写**（HTTP + SSE），不复用 `workflows/*.ts`。

**理由**：

1. `core/` 是已验证、已测试、与 CLI 完全一致的写入路径——复用它 = Web 写出来的资产和 CLI 写出来的逐字节一致，零漂移。
2. `workflows/*.ts` 的「`accept / refine / cancel` 循环」是 `@inquirer/prompts` 的终端交互，无法搬到浏览器。它们要被 Web 的「请求 / 响应 + 草稿态」协议替代（见 §7）。
3. import library 比 fork 子进程更优：类型安全、无进程开销、可直接复用 Zod 类型，且 `roadmap.md` 已把 "import library" 列为允许方案。

**反对意见**：编排逻辑会出现两份实现（CLI 的 inquirer 版 + Web 的 HTTP 版），可能漂移。

**应对**：把两版共用的「业务规则」尽量下沉到 `core/`——例如 outline 章纲的 R1 九字段校验、world 的 R2 金手指校验、character 的 R1/R3 校验**已经在 `core/` 里**（`workflows` 只负责问答 UX）。Web 与 CLI 各写一层薄编排，但都调同一组 `core` 校验函数。新增编排时遵循「校验进 core、问答留各端」。

---

## 4. 仓库结构：pnpm workspace monorepo

当前是单包 `cli/`。引入 Web 端时重构成 pnpm workspace：

```
agents-novel-ai/
├── pnpm-workspace.yaml          # packages: ['packages/*', 'apps/*']
├── packages/
│   └── core/                    # 从 cli/src/core 抽出，发布名 @novel/core
│       ├── assets/  schemas/  llm/  skills/  status/  config/  utils/
│       └── package.json         # "exports": "./dist/index.js"
├── apps/
│   ├── cli/                     # 今天的 cli，改为 depends on @novel/core
│   │   └── src/{bin,commands,workflows}/
│   └── web/
│       ├── server/              # Hono；import @novel/core；REST + SSE
│       └── client/              # React + Vite + TanStack Query + shadcn/ui
├── skills/  templates/  examples/  docs/    # 不变
```

### 4.1 core 抽取迁移步骤

1. `git mv cli/src/core packages/core/src`，加 `packages/core/package.json`（name `@novel/core`，`type: module`，`exports`）。
2. `cli/` → `apps/cli/`；把 `from '../core/...'` 改成 `from '@novel/core'`（core 提供 barrel `index.ts` 重导出 schemas/assets/llm/skills/status/config/utils）。
3. 根 `pnpm-workspace.yaml` + 根 `tsconfig`（project references：core → cli / web）。
4. `apps/web` 新建，依赖 `@novel/core`。

> 抽取 `@novel/core`（而非让 web 直接 `import '../../cli/src/core'`）的理由：CLI 与 Web 共享**唯一**一份校验内核，import 路径稳定，单独编译 / 单独测试；也为将来第三种前端（桌面壳）留出干净边界。

### 4.2 对 alpha-2d 的影响

抽取是机械重构，不改 `core/` 任何逻辑。alpha-2d（章节六阶段循环）在 `@novel/core` 里实现后，CLI 与 Web 同时获得能力——这正是抽取的回报。

---

## 5. 分层架构（Web 视图）

```
┌──────────────────────────────────────────────────────────────┐
│  Browser — React + Vite + TanStack Query + shadcn/ui          │
│  仪表盘 / 资产导航树 / 阅读视图 / build 向导(stepper)         │
└───────────────────────────────┬──────────────────────────────┘
                                 │  HTTP (REST) + SSE
                                 ▼
┌──────────────────────────────────────────────────────────────┐
│  apps/web/server — Hono（仅绑定 127.0.0.1:4567）              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 路由层: /api/...  (REST)  +  /api/.../stream (SSE)      │  │
│  │ 编排层: build session 状态机（替代 inquirer 循环）       │  │
│  └───────────────────────────┬────────────────────────────┘  │
│                              │ import                         │
│  ┌───────────────────────────▼────────────────────────────┐  │
│  │  @novel/core                                            │  │
│  │  assets(readX/writeX·原子+校验) · schemas(Zod) ·        │  │
│  │  llm(provider 抽象) · skills(SKILL.md 编译) ·           │  │
│  │  status(阶段判定) · config(provider/key 解析)           │  │
│  └───────────────────────────┬────────────────────────────┘  │
└──────────────────────────────┼───────────────────────────────┘
                               ▼  读 / 写（文件即数据库，不变）
┌──────────────────────────────────────────────────────────────┐
│  Asset Layer: novel.json · blueprint.md · world/* ·           │
│  characters/* · outline/*  （CLI / Skill 随时互读）           │
└──────────────────────────────────────────────────────────────┘
                               ▲
                               │ 仅 LLM 调用需联网
                        External: LLM provider(任意 model)
```

与 `00-system-overview.md` §2 的四层对齐：**Browser + server 合起来是一个新的「Runtime / 视图层」**，下面的 Asset Layer 与 External Capabilities 完全不变。

---

## 6. 后端设计（apps/web/server）

### 6.1 基本约束

- 框架 **Hono**（轻、Web 标准 API、SSE 友好）。
- 只监听 `127.0.0.1`，**无鉴权、无多用户**（本地单用户）。
- 多本书 = 一个 workspace 根目录下的多个项目目录；`bookId` 映射到磁盘路径（沿用 `findProjectRoot` 的判定）。
- **所有写操作一律经 `@novel/core` 的 `writeX`**——服务端不直接拼文件，保证校验 + 原子写（`02-pipeline-architecture.md` §8 R3）。

### 6.2 REST API（MVP 表面）

| Method & Path | 作用 | 复用的 core |
|---|---|---|
| `GET /api/workspace/books` | 列出 workspace 下所有书 | 扫目录 + `readNovel` |
| `POST /api/workspace/books` | 新建书（骨架） | `init` 逻辑 |
| `GET /api/books/:id/status` | 阶段判定 + 下一步建议 | `status/detector` |
| `GET /api/books/:id/assets/blueprint` | 读蓝图 | `readBlueprint` |
| `GET /api/books/:id/assets/world/:asset` | worldview / powers / cheat-system | `readWorldview` 等 |
| `GET /api/books/:id/assets/characters` / `:charId` / `relationships` | 角色卡 / 关系网 | `readCharacter*` |
| `GET /api/books/:id/assets/outline/(master\|volumes/:n\|chapters/:n)` | 三级大纲 | `readOutlineMaster` 等 |
| `POST /api/books/:id/build/:stage` | 开一个 build session（stage ∈ blueprint/world/character/outline） | preflight + skill 编译 |
| `GET /api/books/:id/build/:stage/session` | 当前 session 状态 | — |
| `POST …/step/:key/draft` | 让 LLM 起草本步（`{mode, hint}`） | `llm` + skill prompt |
| `POST …/step/:key/refine` | 带反馈重生成 | `llm` |
| `POST …/step/:key/accept` | 接受（含手改后的数据）→ 落盘 | `writeX`（校验+原子） |
| `POST …/step/:key/skip` | 写占位骨架 | `buildInitialX` |
| `POST /api/books/:id/:stage/approve` | 完整度 / 强约束校验后翻 approved | core approve 校验 |
| `GET /api/config` · `PUT /api/config` | 读写 provider / model / key | `config` resolver |
| `GET /api/books/:id/events` (SSE) | 进度 / draft 流（见 §7.3） | — |

### 6.3 Build session 状态机

一个 session 是**服务端内存中的临时对象**（单用户，不需持久化；进程重启丢弃未保存草稿 = 等价于 CLI 里 `^C`）：

```
session = {
  stage,                     // 'world'
  steps: ['worldview','powers','cheat-system'],
  cursor,                    // 当前步
  preflight: { ok, warnings },
  draft: { key → { data|body, validation } }   // 未落盘的草稿态
}
```

校验仍由 `core` 的 Zod schema 完成（draft 一产生就 `safeParse`，把 issues 回给前端高亮），落盘才调 `writeX`。

---

## 7. Build 工作流的 Web 协议（核心）

这是把 CLI 的 inquirer 循环搬到浏览器的关键映射。

### 7.1 CLI 循环 → Web 协议

| CLI（inquirer） | Web |
|---|---|
| `chooseMode()`（llm-draft / editor / skip） | 每步三个按钮：**AI 起草** / **手动编辑** / **跳过** |
| LLM 生成 + spinner | `POST …/step/:key/draft` → 返回 draft（或 SSE 流式，见 §7.3） |
| 预览 + 校验 warning | 前端渲染 draft；Zod issues 内联高亮 |
| `accept / refine / cancel` | **接受**(`/accept`) / **重生成**(`/refine`) / **离开** |
| editor 手填 | JSON-canonical 资产 → 表单；MD-canonical 资产 → Markdown 编辑器 |
| 写盘（status=drafting） | `/accept` → `writeX(status='drafting')` |
| `novel X approve` | `POST /:stage/approve` |

### 7.2 两类资产的草稿编辑差异

- **JSON-canonical（world / character）**：草稿是结构化 JSON。前端按 schema 渲染**可编辑表单**；接受时提交结构化数据，core 重渲染 MD 投影（`*-render.ts`）。
- **Markdown-canonical（blueprint / outline）**：草稿是 Markdown 正文，逐字保存。前端用 Markdown 编辑器；完整度（如章纲 R1 九字段、master/volume 必填段落）由 core 的分析函数实时回报缺失项。

### 7.3 时序（以「world → worldview → AI 起草」为例）

```
Client                         Server (Hono)              @novel/core
  │  POST /build/world            │                          │
  │ ─────────────────────────────▶ preflight(blueprint?)     │
  │ ◀──── session{steps,cursor} ──┤                          │
  │                               │                          │
  │  POST step/worldview/draft    │                          │
  │  {mode:'llm-draft', hint}     │── compile SKILL prompt ──▶│
  │                               │── provider.chat() ───────▶│ (LLM)
  │ ◀── draft + zod issues ───────┤◀── parsed+validated ─────┤
  │  (用户在表单里微调)            │                          │
  │  POST step/worldview/accept   │                          │
  │  {data}                       │── writeWorldview() ──────▶│ 原子写 .json+.md
  │ ◀── {written, nextStep} ──────┤                          │
```

> v3.0-alpha 的 draft 用**普通请求/响应 + loading 态**即可。**逐 token SSE 流式**留给章节写作（`roadmap.md` v3.4），因为设定/角色/大纲是一次性整份生成，不需要 token 级进度。API 已为 SSE 预留（§6.2 `/events`）。

---

## 8. 前端设计（apps/web/client）

- 栈：**React + Vite + TanStack Query**（服务端状态缓存 / 失效）**+ shadcn/ui**（组件）+ Tailwind。
- 路由：
  - `/` 书库（workspace 下所有书 + 新建）
  - `/books/:id` 仪表盘（阶段进度条 + 字数/完整度 + 下一步建议，来自 `/status`）
  - `/books/:id/blueprint` · `/world` · `/characters` · `/outline` 阅读视图
  - `/books/:id/build/:stage` build 向导（stepper）

```
<App>
 ├─ <Sidebar/>            资产导航树: blueprint·world·characters·outline
 │                        (灰显未来项: chapters·memory·vault — 见 §9)
 ├─ <BookDashboard/>      <StageBar/> + <StatusCards/> + <NextSteps/>
 ├─ <AssetReader/>        Markdown/JSON 渲染 + status/version 徽标
 └─ <BuildWizard stage>   <Stepper/> + <ModeButtons/> +
                          <DraftReview/>(<SchemaForm/> | <MarkdownEditor/>) +
                          <AcceptRefineSkip/>
```

- **TanStack Query** 的 key 以 `bookId + asset` 组织；`/accept`、`/approve` 成功后 invalidate 对应 query → UI 自动刷新（资产即真相）。
- shadcn 的 `Sonner`/`Toast` 承接 core 抛出的 `NovelError`（message + hint），与 CLI 的红色 ✗ 一致。

---

## 9. MVP 范围（v3.0-alpha = 「Web over 现有 CLI 能力」）

**原则**：只做当前 `@novel/core` 已支持的资产，绝不为 UI 临时造能力。

### 在范围内 ✅

| 模块 | 说明 |
|------|------|
| 书库 + 新建 | 列出 / 创建项目 |
| 阶段仪表盘 | status detector 的阶段 + 下一步 |
| 资产导航 + 阅读 | blueprint / world / character / outline 的只读渲染 |
| 4 个 build 向导 | blueprint · world · character · outline 的 AI 起草 / 编辑 / 跳过 / 接受 |
| approve | 各阶段的完整度 / 强约束校验后翻 approved |
| 配置面板 | provider / model / key（复用 config resolver） |

### 明确延后 ❌（依赖尚未落地的 CLI 能力）

| 延后模块 | roadmap 位置 | 阻塞前置 |
|---|---|---|
| **章节编辑器**（章纲↔正文双栏） | v3.2 | **alpha-2d**：`core` 的章节六阶段循环（plan→compose→write→audit→revise→settle）尚未实现 |
| **内联审稿 issue** | v3.2 | alpha-2d 的 quality-auditor |
| **长期记忆可视化**（时间线 / 关系图 / 伏笔看板） | v3.3 | `memory/*` 真相文件代码层（v2.4 / alpha-2d） |
| **雷达视图** | v3.5 | `novel radar`（v2.x） |
| **vault 浏览器** | v3.6 | `novel vault`（v2.x） |

> 因此 v3.0-alpha 实质是「把整本书的**设定圣经**（蓝图 / 世界 / 角色 / 大纲）搬上 Web，可建可读可定稿」。章节编辑器——v3 真正的核心——在 alpha-2d 落地后作为 v3.2 接入；§7 的 build 协议届时复用（章节多一层 SSE 流式）。

---

## 10. 安全与边界

- 仅监听 `127.0.0.1`，无对外端口、无鉴权——本地单用户假设。
- LLM key 走 `core/config` 同一套解析（环境变量 > 项目级 > 全局），**不在前端存 key**，请求由服务端发起。
- 不做遥测、不上传作者文本（对齐 roadmap「作者数据不出本地」）。
- 不替用户决策：题材 / 主角 / 金手指 / 角色名仍由用户输入或从候选里选，AI 只填充（对齐 character R7、roadmap 永久边界）。

---

## 11. 里程碑（v3.0-alpha 拆解）

| 阶段 | 内容 | 验收 |
|------|------|------|
| **M0** | pnpm workspace 重构：抽 `@novel/core`，`cli` 迁 `apps/cli`，绿测 | CLI 现有测试全过；core 可被独立 import |
| **M1** | `apps/web/server` 骨架：Hono + 只读 API（books / status / assets） | 浏览器能看到现有 `examples/tunshi-mo-di` 的全部设定资产 |
| **M2** | 前端：书库 + 仪表盘 + 资产导航/阅读 | 纯读路径打通，TanStack Query 缓存/失效正确 |
| **M3** | build 向导：先打通 `world`（JSON 表单流），再推广到 blueprint/character/outline | 能从 Web 跑完 world build 并落盘，文件与 CLI 产物一致 |
| **M4** | approve + 配置面板 + 错误/空态打磨 | 一本新书可在 Web 上从 init 走到 outline approve |

---

## 12. 风险与开放问题

1. **编排双实现漂移**（CLI inquirer 版 vs Web HTTP 版）——靠「校验下沉 core」缓解（§3.2）；后续可考虑把编排抽成与 UI 无关的「step 引擎」让两端共用。
2. **外部改动**：用户在 CLI / 编辑器改了文件，Web 不自动刷新。MVP 先用「手动刷新 / 重新 GET」；可选 v3.1 加 `chokidar` 文件监听 → SSE 推送失效。
3. **并发写**：单用户假设下基本无并发；但「Web 在 build、CLI 同时写同一本」会冲突。MVP 接受单写者；core 的原子写避免半截文件，version 字段可做乐观锁的基础。
4. **core 的 LLM 目前非流式**：`provider.chat` 返回整段。MVP 不需要流式（§7.3）；章节写作（v3.2）再给 provider 加 streaming。

---

## 13. 文档导航

- 资产模型：[`01-asset-model.md`](./01-asset-model.md)
- Pipeline 编排：[`02-pipeline-architecture.md`](./02-pipeline-architecture.md)
- 长期记忆与素材：[`03-memory-and-vault.md`](./03-memory-and-vault.md)
- Skill 规范：[`04-skill-spec.md`](./04-skill-spec.md)
- 系统总览：[`00-system-overview.md`](./00-system-overview.md)
- 演进路线：[`../roadmap.md`](../roadmap.md)
- CLI（Web 后端复用的内核）：[`../../cli/README.md`](../../cli/README.md)
