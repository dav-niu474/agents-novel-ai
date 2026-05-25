---
inclusion: always
---

# CLI Conventions (cli/ subtree)

工程层面的约束。仅适用于 `cli/` 子目录的 TypeScript 代码；不影响 `skills/` 与 `docs/`。

## 关键设计原则

### 1. SKILL.md 是 source of truth，不要在代码里重复 prompt

CLI 在 `core/skills/loader.ts` 加载 `skills/<name>/SKILL.md`，body 直接拼到 system prompt。**不要把 SKILL.md 的工作流文本拷贝到 TypeScript 字符串里**——那样会让 v1 用户和 v2 用户的行为漂移。

如果某段 prompt 是 CLI 运行时独有（比如"现在执行第 N 步"），放在 `compileSystemPrompt` 的 `taskHint` / `extraRules` 里。

### 2. 资产 IO 必须经过 `core/assets/io.ts`

不要在 commands 或 workflows 里直接 `fs.readFile` / `fs.writeFile` 读写资产文件。理由：

- `readJsonAsset` / `writeJsonAsset` / `readMarkdownAsset` / `writeMarkdownAsset` 都自带 Zod schema 校验，能在写入前 fail-fast。
- `writeFileAtomic` 保证半截文件不污染（02-pipeline-architecture.md §8 R3）。
- 一处改 schema，所有 caller 自动受益。

例外：`commands/blueprint.ts` 的 `blueprintEdit` 用 `spawn` 调用外部编辑器是合理例外（不是直接 IO）。

### 3. exactOptionalPropertyTypes 风格的 spread

`tsconfig.json` 没开 `exactOptionalPropertyTypes`，但代码风格上仍按其语义写：**绝不显式传 `undefined` 给 optional 字段**。

```ts
// ❌ 不要
runInit({ name: opts.name, genre: opts.genre, force: opts.force });

// ✅ 这样
runInit({
  ...(opts.name !== undefined ? { name: opts.name } : {}),
  ...(opts.genre !== undefined ? { genre: opts.genre } : {}),
  ...(opts.force !== undefined ? { force: opts.force } : {}),
});
```

理由：将来如果某个字段类型加上 `| null` 或 `| ''`，显式 `undefined` 会绕过校验。

### 4. 错误用 `NovelError` 子类，不要 console.log

业务/用户错误：在 core/commands 里 `throw new SomeNovelError(...)`，由 `bin/novel.ts` 统一捕获并打印（红 ✗ + hint，按 `error.exitCode` 退出）。

绝对不要在 core 层调用 `process.exit` 或 `console.log` 打印错误。

### 5. 依赖添加规则

- 不引入 gray-matter（CommonJS）；继续用 `yaml` 直接处理 frontmatter。
- 不引入 dotenv；环境变量靠用户的 shell。
- 不引入 axios/node-fetch；HTTP 走 LLM SDK 自带的 client。
- 加新依赖前先在 PR 描述里说明为什么不能用 stdlib 做。

## 模块组织

```
src/
├── bin/novel.ts              # 唯一 CLI 入口，所有 commander 注册都在这
├── commands/<verb>.ts        # 一条子命令一个文件，export run<Verb>
├── workflows/<flow>.ts       # 多步交互流程；commands 调用它
└── core/
    ├── schemas/              # 所有 Zod schemas
    ├── assets/               # 资产 IO（路径约定 / frontmatter / atomic 写）
    ├── status/               # 项目阶段判定
    ├── skills/               # SKILL.md 加载与 prompt 编译
    ├── llm/                  # provider 抽象 + OpenAI / Anthropic / mock
    ├── config/               # global + project 配置
    └── utils/                # id / time / logger / errors / fs / zod-format
```

横向依赖规则：

- `commands/` → `workflows/` → `core/`（单向）
- `core/` 内部任何模块不得 import `commands/` 或 `workflows/`
- `core/<a>/` 可以 import `core/<b>/`，但不要循环

## TypeScript 规范

- `module: "NodeNext"` + 所有 import 必须带 `.js` 扩展名（即使源文件是 `.ts`）。
- `strict: true` + `noUncheckedIndexedAccess: true`：数组索引返回 `T | undefined`，必须显式检查。
- 不使用 `as` 强制类型断言，除非有运行时校验先发生（如刚 Zod parse 完）。
- 不使用 `// @ts-ignore`，要用 `// @ts-expect-error <reason>`。

## 新增资产类型时的 checklist

如果 alpha-2 / 后续要加新资产（例如 chapter / outline / memory）：

1. 在 `core/schemas/common.ts` 的 `AssetType` enum 里加。
2. 在 `core/schemas/<asset>.ts` 写 frontmatter + body 的 Zod schema，包括 `BaseFrontmatter.extend(...)`。
3. 在 `core/assets/paths.ts` 的 `ProjectPaths` 加路径字段。
4. 在 `core/assets/<asset>.ts` 实现 `readX / writeX / buildInitialX`。
5. 在 `core/assets/scaffold.ts` 的 `allDirs(p)` 里加新目录。
6. 在 `core/status/detector.ts` 决策树里加判定。
7. 至少一个 `tests/<asset>.test.ts` 覆盖 happy path + 1 个 schema 失败。
8. 同步更新 `docs/design/01-asset-model.md`（若 schema 有调整）。

## 测试

- vitest，单 run 模式：`npm test`；watch：`npm run test:watch`。
- 不要在测试里调用真实 LLM。需要 LLM 时用 `MockProvider` + `enqueue(...)` 喂 canned response。
- 每个测试用 `makeTmpDir` / `rmTmpDir` 隔离文件系统。绝不在 `os.tmpdir()` 之外写测试文件。
- `setSkillsDir(null)` 重置 skills 加载缓存（在用 NOVEL_SKILLS_DIR 切换的测试里必须）。

## 与 v1 SKILL 协议的对齐

CLI 写出来的资产文件 schema 必须 100% 兼容 v1 用户用 Claude Code / Cursor 直接装 SKILL 写出来的文件。具体含义：

- novel.json / blueprint.md / memory/*.json / chapter-NNNN.md 的 frontmatter 字段、命名、值范围必须匹配 `docs/design/01-asset-model.md`。
- 如果 CLI 想加新的 frontmatter 字段（比如 `audit_score`），必须先在 `docs/design/01-asset-model.md` 加，再在 SKILL.md 里告诉 Agent，然后才在 CLI 里实现。
