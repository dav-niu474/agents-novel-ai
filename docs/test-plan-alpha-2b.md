# Alpha-2b Regression Test Plan

> Goal: validate that `feat/cli-alpha-2b-character-atelier` branch has no regression
> in alpha-1 / alpha-2a behavior, and that all new `novel character ...` commands
> work as designed.
>
> Pre-condition: a machine with full network access (sandbox here cannot reach
> `registry.npmjs.org`).
>
> Branch under test: `feat/cli-alpha-2b-character-atelier` (merged HEAD = `fdd0743`).

---

## Phase 0 · 环境准备

```bash
# 1. clone + checkout
git clone https://github.com/dav-niu474/agents-novel-ai.git
cd agents-novel-ai
git checkout feat/cli-alpha-2b-character-atelier

# 2. install
cd cli
npm install   # 如果失败，换 pnpm install / bun install
```

**通过条件**：`node_modules/` 出现，`npm install` exit 0。

**失败处理**：如果是 lockfile 冲突（不会有，因为我们没有 lock），换 `npm install --no-package-lock`。

---

## Phase 1 · 编译期类型检查

### T1.1 typecheck 全绿

```bash
npm run typecheck
```

**通过条件**：exit 0，无任何 TS error。

**预期失败信号**：
- 任何 `error TSxxxx` 都视为回归
- 特别留意 alpha-2a 残留：`p.worldview` / `p.cheatSystemJson` / `p.powers` 这类扁平路径访问应该已经被我修成 `p.world.*` nested

如果有报错，运行：

```bash
npm run typecheck 2>&1 | grep -vE "Cannot find name 'process'|Cannot find module" | head -50
```

应该完全为空（除非真的有 bug）。

---

### T1.2 build 产出物

```bash
npm run build
```

**通过条件**：
- exit 0
- `dist/bin/novel.js` 存在
- `dist/bin/novel.js` 第一行是 `#!/usr/bin/env node`（由 post-build.mjs 添加）
- `chmod +x dist/bin/novel.js` 后可执行

```bash
ls -la dist/bin/novel.js
head -1 dist/bin/novel.js
node dist/bin/novel.js --version
```

最后一条应输出 `0.2.0-alpha.3`。

---

## Phase 2 · 单元测试（vitest）

### T2.1 全部测试通过

```bash
npm test
```

**通过条件**：
- exit 0
- 测试总数 ≥ alpha-2a 的数量 + alpha-2b 新增的两个文件（character-schemas.test.ts ≈ 25 用例 / character-assets.test.ts ≈ 18 用例）
- 失败数 = 0

**测试文件清单（应都跑过）**：

| 文件 | alpha 来源 | 关注点 |
|------|----------|--------|
| `tests/blueprint-body.test.ts` | alpha-1 | 蓝图 10 节渲染 |
| `tests/character-assets.test.ts` | **alpha-2b 新增** | 路径路由 / 索引 upsert / writeCharacter roundtrip / charactersStatus 状态机 / relationships 写读 |
| `tests/character-schemas.test.ts` | **alpha-2b 新增** | role / tier 枚举 / CharacterData 校验 / role↔tier consistency / powers alignment |
| `tests/config-resolver.test.ts` | alpha-1 | 配置解析 |
| `tests/frontmatter.test.ts` | alpha-1 | YAML frontmatter 解析 |
| `tests/id.test.ts` | alpha-1 | slugify + nanoid |
| `tests/scaffold.test.ts` | alpha-1 | scaffoldProject 创建目录 |
| `tests/schemas.test.ts` | alpha-1 | novel/blueprint schema |
| `tests/skills-loader.test.ts` | alpha-1 | SKILL.md 加载 |
| `tests/status.test.ts` | alpha-1 | detector 阶段判定 |
| `tests/world-assets.test.ts` | alpha-2a | **要重点验**：我把 `p.cheatSystemJson` 改成 `p.world.cheatSystemJson` 等 nested 路径，确保旧测试还过 |
| `tests/world-render.test.ts` | alpha-2a | world MD 渲染 |
| `tests/world-schemas.test.ts` | alpha-2a | world schema |

---

### T2.2 重点关注：character-schemas

```bash
npm test -- character-schemas
```

**关键断言**：

| 用例 | 期望 |
|------|------|
| `AssetType` 包含 character / character-index / characters-relationships | 通过 |
| `CharacterRole.options` 是 4 项 | 通过 |
| `AntagonistTier.options` 是 `['early','mid','late','meta']` | 通过 |
| `SupportingTier.options` 是 `['core','important','minor']` | 通过 |
| `CharacterData.parse` 拒绝空 `one_line_portrait` | 拒绝 |
| `CharacterData.parse` 拒绝空 `emotional_anchors` 数组 | 拒绝 |
| `relationships[].character_id` 必须 `<role>-<slug>` 格式 | `random-id-xyz` 拒绝、`Protagonist-Foo` 拒绝 |
| `ability_curve[].chapter` 必须正整数 | `chapter: 0` 拒绝 |
| `CharacterFrontmatter.asset_id` 必须 `<role>-<slug>` | `random-xyz` 拒绝 / `protagonist-LinJin` 拒绝（大写） |
| `CharacterIndex` 的 protagonist tier 只能是 'protagonist' | 别的拒绝 |
| `CharacterIndex` 的 antagonists tier 必须是 4 选 1 | 'core' 拒绝 |
| `Relationship.strength` 范围 [0,5] | 7 拒绝、-1 拒绝 |
| `Relationship.notes[].chapter` 正整数 | 0 拒绝 |
| `RelationshipsFrontmatter.asset_id` 字面量 'relationships-main' | 别的字符串拒绝 |
| `checkRoleTierConsistency('protagonist', 'core')` 返回 1 issue | 通过 |
| `checkRoleTierConsistency('antagonist', undefined)` 返回 1 issue（必须给 tier） | 通过 |
| `checkRoleTierConsistency('antagonist', 'early')` 返回 [] | 通过 |
| `checkRoleTierConsistency('supporting', 'early')` 返回 1 issue | 通过 |
| `checkCharacterPowersAlignment` 子集匹配返回 [] | 通过 |
| `checkCharacterPowersAlignment` 中间章节继承最近 anchor stage | 通过 |
| `checkCharacterPowersAlignment` 已知 chapter mismatch 返回 issue | 通过 |
| 双方任一空数组返回 [] | 通过 |

---

### T2.3 重点关注：character-assets

```bash
npm test -- character-assets
```

**关键断言**：

| 用例 | 期望 |
|------|------|
| `characterFilePath('protagonist', 'lin-jin')` → `<root>/characters/protagonist-lin-jin.md` | 通过 |
| `characterFilePath('antagonist', 'foo')` → `<root>/characters/antagonists/antagonist-foo.md` | 通过 |
| `characterFilePath('supporting', 'foo')` → `<root>/characters/supporting/supporting-foo.md` | 通过 |
| `characterFilePath('minor', 'foo')` → `<root>/characters/supporting/minor-foo.md` | 通过 |
| `characterSlug('林烬')` → `'unnamed'`（中文 fallback） | 通过 |
| `characterSlug('Lin Jin')` → `'lin-jin'` | 通过 |
| `buildInitialCharacterIndex()` 通过自身 schema | 通过 |
| `writeCharacterIndex` 把 version 1 → 2 | 通过 |
| `upsertIndexEntry` 同 id 重复插入只保留最后一条 | 通过 |
| `findIndexEntry('supporting-su-wanrou')` 命中 supporting 桶 | 通过 |
| `writeCharacter` 写 protagonist 卡 → version=1 / 文件存在 / frontmatter 正确 | 通过 |
| 卡 body 包含 `## 1. 一句话画像` `## 3. 性格内核` `## 8. 禁止写法` | 通过 |
| 卡 body 包含 ability_curve 的 context（"被欺凌"） | 通过 |
| 卡 body 包含 relationship 的 relation_type（"师妹 / 朦胧情线"） | 通过 |
| antagonist 写到 `antagonists/` 子目录 | 通过 |
| overwrite 时保留 created_at + version+1 | 通过 |
| 改写后 body 反映新 `one_line_portrait` | 通过 |
| 校验失败的 CharacterData 让 writeCharacter 抛错 | 抛 |
| `charactersStatus` 4 状态：`hasIndex=false` / `hasIndex=true & ready=false` / `hasProtagonist=true & ready=true` / 索引有但卡缺失 → ready=false | 通过 |
| `indexFileFor / indexFileAbsolute` roundtrip | 通过 |
| `writeRelationships` 写出含 `## 主角圈` 的 body / 强度 7 / strength=99 拒绝 | 通过 |
| 空 relationships 渲染出 "暂无关系条目" | 通过 |

---

### T2.4 重点关注：alpha-2a 回归（world-assets）

```bash
npm test -- world-assets
```

**关注点**：我把 `p.worldviewJson` 等扁平访问改成 `p.world.worldviewJson`。如果还有遗漏会在这里挂掉。

**预期所有 11 个用例（含我修改的 path 检查）通过**。

---

## Phase 3 · 端到端 CLI 流程

设计上 `--mock-llm` 只 echo 用户 prompt，**不会**自动产出合法 CharacterData JSON。所以 e2e 流程要走 `--no-llm` + 注入 $EDITOR 模拟。

### Phase 3 准备 · 关闭交互的 helper

```bash
# 设一个非交互式 EDITOR，把 stdin 内容写入文件
mkdir -p ~/.bin
cat > ~/.bin/inject-editor <<'EOF'
#!/usr/bin/env bash
# 用法：EDITOR_INJECT=<path> inject-editor <file>
# 读取 EDITOR_INJECT 指向的 JSON，覆盖到 inquirer 临时文件
if [ -n "$EDITOR_INJECT" ] && [ -f "$EDITOR_INJECT" ]; then
  cp "$EDITOR_INJECT" "$1"
fi
exit 0
EOF
chmod +x ~/.bin/inject-editor
export PATH="$HOME/.bin:$PATH"
export EDITOR=inject-editor
```

> 备注：alpha-2b 工作流大量用 inquirer `editor()` + `select()` + `confirm()` 交互。
> 完整自动化需要 `expect` 脚本或 `node-pty` 包装，下面用最简方案：
> 用 **Node 直接调 character.ts assets 函数**，绕过 prompt 层；交互层走脚本片段。

---

### T3.1 项目初始化（非交互模式）

```bash
TEST_ROOT=$(mktemp -d /tmp/novel-alpha2b-XXXX)
cd "$TEST_ROOT"

# 用 alpha-1 的 --yes 模式
NOVEL=/path/to/cli/dist/bin/novel.js     # 或 npm exec novel
node "$NOVEL" init "测试·alpha2b" \
  --genre xuanhuan \
  --platform qidian \
  --audience male-young-adult \
  --yes

# 验证骨架
test -f novel.json
test -d characters
test -d characters/antagonists
test -d characters/supporting
test -d world
ls -1 characters
ls -1 world
```

**通过条件**：
- exit 0
- `novel.json` 存在 + 含 `"id":"ce-shi-..."`
- `characters/`、`characters/antagonists/`、`characters/supporting/` 都存在（**这些目录由 alpha-1 的 scaffold 创建**——验证我没改坏）

---

### T3.2 在没 blueprint 的项目上 `character list`（友好降级）

```bash
node "$NOVEL" character list
```

**通过条件**：
- exit 0
- 输出含 `characters/_index.json 还不存在`
- 提示 `运行 \`novel character add --role protagonist\``

---

### T3.3 在没 blueprint 的项目上 `character add`（应阻止）

```bash
# 用 expect 或 echo 注入 confirm=N
echo "N" | node "$NOVEL" character add --role protagonist --no-llm 2>&1 | tee /tmp/out.log
echo "exit=$?"
```

**通过条件**：
- exit code ≠ 0（NovelError throw）
- 输出含 `blueprint.md 还未创建`
- 提示 `先跑 \`novel blueprint start\``

---

### T3.4 假装 blueprint 已 approved（绕过 alpha-1 流程）

```bash
# 直接用 fixture 写一份合法 blueprint.md（最小通过 schema 即可）
cat > blueprint.md <<'EOF'
---
asset_type: blueprint
asset_id: blueprint-main
created_at: 2026-05-29T00:00:00Z
updated_at: 2026-05-29T00:00:00Z
version: 1
status: approved
maintained_by: novel-blueprint
---

# 开书蓝图

## 1. 一句话定盘

现代研究生穿越成宗门末等弟子林烬，靠一卷残卷反向解析功法漏洞，从被欺凌一路反杀至魔帝。

## 2. 主角

林烬，废柴翻身。

## 3. 题材

xuanhuan / 末法。

## 4. 金手指

天工残卷：解析对手功法漏洞，但代价是消耗精神力。

## 5. 钩子

第一章被赵天霄踩成左眉留疤。

## 6. 排除项

不写后宫；不写王道升级。

## 7. 长期意图

8 卷写完，结局是林烬接管残卷使命。

## 8. 平台 fit

起点·玄幻金牌征文。

## 9. 节奏锚点

每 10 章一个反杀节点。

## 10. 风险与备份

如果 30 章数据不够，转晋江。
EOF

# 同步 novel.json 的 blueprint_status
node -e '
const fs = require("fs");
const j = JSON.parse(fs.readFileSync("novel.json", "utf8"));
j.blueprint_status = "approved";
fs.writeFileSync("novel.json", JSON.stringify(j, null, 2));
'
```

**通过条件**：blueprint.md 存在 + status=approved。

---

### T3.5 直接调用 writeCharacter（绕过 prompt 层）

```bash
node --experimental-strip-types <<'EOF'
import { writeCharacter, readCharacterCard, characterFilePath } from "../path-to-cli/dist/core/assets/character.js";

const data = {
  one_line_portrait: "测试主角，废柴翻身。",
  basic_profile: {
    age: "16",
    origin: "外门弟子",
    appearance: ["清瘦", "左眉有疤"],
    clothing_style: "青布",
  },
  personality_core: {
    core_drive: "想活下去",
    decision_pattern: "先观察后行动",
    emotional_anchors: ["对师妹有保护欲"],
  },
  ability_curve: [{ chapter: 1, stage: "炼气一层", context: "被欺凌" }],
  signature_details: ["残卷贴身藏", "说话前停顿"],
  relationships: [{ character_id: "supporting-su-wanrou", relation_type: "师妹" }],
  arc_design: [{ volume: "第 1 卷", description: "从被动到主动" }],
  prohibited: ["突然变豪侠"],
};

const r = await writeCharacter({
  root: process.cwd(),
  role: "protagonist",
  name: "林烬",
  tier: "protagonist",
  data,
});
console.log("file:", r.filePath);
console.log("indexFile:", r.indexFile);
console.log("id:", r.id);
console.log("version:", r.version);

// 读回来验
const card = await readCharacterCard(process.cwd(), "protagonist", r.slug);
console.log("status:", card.frontmatter.status);
console.log("body has section 1:", card.body.includes("## 1. 一句话画像"));
console.log("body has section 8:", card.body.includes("## 8. 禁止写法"));
EOF
```

**通过条件**：
- file = `<TEST_ROOT>/characters/protagonist-unnamed.md`（中文名 fallback；如果想要英文 slug，name 传 ASCII）
- id = `protagonist-unnamed`
- version = 1
- status = drafting
- body 含两个 section 标题

> 注意：`characterSlug('林烬')` 在 ASCII fallback 下返回 `'unnamed'`，这是设计的。
> 真实 CLI 跑时用户会被提示输入名字 + slug 由非中文字符派生。
> 想测真实文件名，name 传 `'Lin Jin'` → slug=`'lin-jin'` → 文件名=`protagonist-lin-jin.md`。

---

### T3.6 character list（应该看到刚写的）

```bash
node "$NOVEL" character list
```

**通过条件**：
- exit 0
- 输出含 `角色清单（共 1 个）`
- 输出含 `主角（1）`
- 输出含 `protagonist-unnamed` 或 `protagonist-lin-jin`
- 输出含 `✓`（绿色对勾，表示卡片文件存在）
- 输出含 `第 1 章登场`

---

### T3.7 character show（按 id）

```bash
node "$NOVEL" character show protagonist-unnamed   # 或 lin-jin 视实际 slug
```

**通过条件**：
- exit 0
- 输出含完整 .md 内容（含 8 个 section 标题）

```bash
node "$NOVEL" character show 林烬   # 按名字模糊匹配
```

**通过条件**：同上（应通过 name substring 匹配命中）。

---

### T3.8 character approve（无 id = 批量）

```bash
node "$NOVEL" character approve
```

**通过条件**：
- exit 0
- 输出含 `approved protagonist-...`
- 输出含 `完成：1 个 approved / 0 个跳过`

```bash
# 验证 .md 现在 status=approved + version=2
grep "^status:" characters/protagonist-*.md
grep "^version:" characters/protagonist-*.md
```

**预期**：`status: approved` + `version: 2`。

---

### T3.9 status 阶段判定

```bash
node "$NOVEL" status
```

**通过条件**：
- exit 0
- 输出 `阶段：角色人设` 或类似（取决于我在 detector.ts 里的 STAGE_LABEL）
- 因为只有 1 个角色（< 5），detector 会判定 `characters-grow`
- 输出 next-step 含 `novel character add --role antagonist`

> ⚠️ **可能的 alpha-2b detector 回归**：我把 STAGE_LABEL 里的 `characters` 拆成了 3 个子阶段。
> 这要求 `commands/status.ts` 能渲染 3 个新 stage label。如果 status 输出报 undefined，是 bug。

---

### T3.10 边界：不带 protagonist 直接 approve

```bash
TEST_ROOT2=$(mktemp -d /tmp/novel-alpha2b-XXXX)
cd "$TEST_ROOT2"
node "$NOVEL" init "T2" --genre xuanhuan --platform qidian --yes
# 写一份 blueprint approved 同 T3.4

# 不写任何 protagonist 卡，直接造一份 _index.json 含一个 supporting 但无 protagonist
cat > characters/_index.json <<'EOF'
{
  "schema_version": "1.0",
  "asset_type": "character-index",
  "asset_id": "characters-index",
  "created_at": "2026-05-29T00:00:00Z",
  "updated_at": "2026-05-29T00:00:00Z",
  "version": 1,
  "data": {
    "protagonist": [],
    "antagonists": [],
    "supporting": [
      {
        "id": "supporting-foo",
        "name": "Foo",
        "file": "supporting/supporting-foo.md",
        "first_appear_chapter": 5,
        "tier": "core"
      }
    ],
    "minor": []
  }
}
EOF

node "$NOVEL" character approve
```

**通过条件**：
- exit code ≠ 0
- 输出含 `approve 前必须至少有 1 个主角`

---

### T3.11 边界：role / tier 不匹配（CLI 层提前 fail）

```bash
echo "" | node "$NOVEL" character add --role protagonist --tier core --no-llm 2>&1 | tee /tmp/out.log
```

**通过条件**：
- exit code ≠ 0
- 输出含 `protagonist 的 tier 必须是 'protagonist'`

```bash
echo "" | node "$NOVEL" character add --role antagonist --tier minor --no-llm 2>&1
```

**通过条件**：
- exit code ≠ 0
- 输出含 `antagonist 的 tier 必须是 early / mid / late / meta`

---

### T3.12 边界：cwd 不在项目里

```bash
cd /tmp
node "$NOVEL" character list
```

**通过条件**：
- exit code ≠ 0
- 错误信息含 `当前目录不是 Novel Studio 项目` 或类似（`NotInProjectError`）

---

### T3.13 边界：world 三件套不齐时 add 主角（应警告但允许跳过）

```bash
TEST_ROOT3=$(mktemp -d /tmp/novel-alpha2b-XXXX)
cd "$TEST_ROOT3"
node "$NOVEL" init "T3" --genre xuanhuan --platform qidian --yes
# 写 blueprint approved（同 T3.4）

# 不建 world，直接 character add
echo "N" | node "$NOVEL" character add --role protagonist --no-llm 2>&1
```

**通过条件**：
- 提示 `world 三件套尚未齐全`，给用户一个 confirm
- 用户选 N 时 exit 0，无文件创建

---

## Phase 4 · 跨资产校验

### T4.1 character.ability_curve 与 powers.protagonist_curve 不一致 → 警告

按 T3.4 准备项目 + blueprint approved 后：

```bash
# 1. 写一份 powers.json，protagonist_curve 在第 1 章是 "炼气一层"
mkdir -p world
cat > world/powers.json <<'EOF'
{
  "schema_version": "1.0",
  "asset_type": "powers",
  "asset_id": "powers-main",
  "created_at": "2026-05-29T00:00:00Z",
  "updated_at": "2026-05-29T00:00:00Z",
  "version": 1,
  "data": {
    "system_name": "测试体系",
    "genre_basis": "xianxia",
    "stages": [],
    "protagonist_curve": [
      {"chapter": 1, "stage": "炼气一层", "context": ""},
      {"chapter": 30, "stage": "炼气七层", "context": ""}
    ],
    "info_boundaries": {"hidden_stages": [], "protagonist_unknown_until_chapter": []},
    "not_applicable": false
  }
}
EOF

# 2. 用 Node 调用 writeCharacter，传一个 ability_curve 第 30 章 stage 故意写成 "筑基"
node --experimental-strip-types <<'EOF'
import { writeCharacter } from "/path/to/cli/dist/core/assets/character.js";
import { checkCharacterPowersAlignment } from "/path/to/cli/dist/core/schemas/character.js";
import { readPowers } from "/path/to/cli/dist/core/assets/world.js";

const data = {
  one_line_portrait: "测试", basic_profile: { age: "16", origin: "x", appearance: ["a"], clothing_style: "" },
  personality_core: { core_drive: "x", decision_pattern: "x", emotional_anchors: ["x"] },
  ability_curve: [
    { chapter: 1, stage: "炼气一层", context: "" },
    { chapter: 30, stage: "筑基", context: "WRONG" }
  ],
  signature_details: [], relationships: [], arc_design: [], prohibited: []
};

const powers = await readPowers(process.cwd());
const issues = checkCharacterPowersAlignment(data, powers.data.protagonist_curve);
console.log("alignment issues:", issues);
console.assert(issues.length === 1);
console.assert(issues[0].includes("30"));
EOF
```

**通过条件**：返回 1 个 issue，含章节号 30 的不一致提示。

---

### T4.2 character_id 引用别人时是合法 ID（schema 层）

```bash
# 通过 character add 时让 LLM 输出 character_id="invalid-format-foo"
# 应该被 CharacterData.relationships[].character_id 的 regex 拒绝
# 这个由 character-schemas.test.ts 覆盖（见 T2.2）
```

---

## Phase 5 · 回归 alpha-1 / alpha-2a

### T5.1 blueprint show / edit 还能跑

```bash
cd "$TEST_ROOT"   # 已有 approved blueprint
node "$NOVEL" blueprint show
```

**通过条件**：exit 0，输出含 `# 开书蓝图`。

---

### T5.2 world build / approve 还能跑

```bash
cd "$TEST_ROOT"
# 用 mock-llm 走流程（mock 不会出合法 JSON，但可以验证 build 流程在 no-llm 模式下不崩）
echo -e "skip\nskip\nskip" | node "$NOVEL" world build --no-llm 2>&1 | tail -10
```

**通过条件**：
- exit 0
- 三步都被 skip，但流程不崩
- 文件未创建（因为全 skip）

---

### T5.3 status 输出格式没破

```bash
cd "$TEST_ROOT"
node "$NOVEL" status --json
```

**通过条件**：
- exit 0
- 输出是合法 JSON
- 包含 `stage`、`headline`、`details`、`nextSteps`、`novel` 字段
- `stage` 现在可能是 `characters-empty` / `characters-protagonist` / `characters-grow` 中的一个（**新增字符串值，要确保 JSON 输出不挂**）

```bash
node "$NOVEL" status --json | python3 -c 'import sys, json; print(json.load(sys.stdin)["stage"])'
```

---

### T5.4 doctor

```bash
node "$NOVEL" doctor
```

**通过条件**：exit 0，输出 Node 版本 / skill 路径 / config 状态。

---

## 通过判定（最终验收）

| 阶段 | 必过 |
|------|------|
| Phase 1 typecheck | T1.1 + T1.2 全部 exit 0 |
| Phase 2 unit tests | T2.1 全过 + character-* 子用例总数 ≥ 40 |
| Phase 3 e2e | T3.1-T3.13 全过 |
| Phase 4 cross-asset | T4.1 显示出 alignment issue |
| Phase 5 regression | T5.1-T5.4 全过 |

任何一项失败：

1. 把失败用例的完整输出粘回来
2. 标记是 alpha-2b 引入还是 alpha-2a/1 已有
3. 最常见嫌疑点：
   - `commands/status.ts` 没处理 detector 新增的 3 个子阶段 → status 输出含 `undefined` 或抛错
   - `examples/tunshi-mo-di/characters/_index.json`（如果 vitest 顺路扫到 examples）的 v1 数据可能不通过新 schema → 看 `tests/scaffold.test.ts` 是否扫了 example
   - inquirer 的 `editor()` 在 CI 环境无 EDITOR 时挂起 → 必须用 `--no-llm` + 实际不进入 add 的子流程，或者用 `expect` 包装

---

## 已知不能在 sandbox 里跑的部分

- 凡是需要 `npm install` 的（即整个 plan）都需要本地 / CI 环境
- inquirer 的交互 prompt 在非 TTY 下会挂起；自动化必须：
  - 用 `expect`、`tmux send-keys`、或者
  - 直接调底层 `core/assets/character.ts` API 跳过 prompt 层（T3.5 / T4.1 的方式）

---

## 我额外希望本地确认的可疑点（按嫌疑大小）

1. **`commands/status.ts`** 的 STAGE_LABEL → 我在 detector.ts 把 'characters' 拆成 3 个子阶段，但没改 status.ts 的渲染。如果 status.ts 自己有 stage label 表，可能漏；如果它直接读 detector 的 headline，就没事。**T5.3 的 `--json` 输出是关键测试**。
2. **`examples/tunshi-mo-di/characters/_index.json`** — v1 旧数据如果被任何测试扫到，可能不通过我新加的 schema（schema 严格性增强了）。运行 `npm test 2>&1 | grep tunshi` 检查。
3. **inquirer prompt 默认值与 schema 之间的 race**：character add 在用户没填 hint 时直接进入 `editor` 模式，而 `editor()` 在没 $EDITOR 的环境会挂。开发用的话需要 `export EDITOR=vim`。
4. **`character add --no-llm`** 时 provider 为 null 但代码会 fall through 到 `chooseMode(false)`，此时只剩 'editor' 和 'skip' 两个选项。验证 select 不会因 disabled 选项过多而崩。
