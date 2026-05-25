import { describe, expect, it } from 'vitest';
import {
  isBlueprintComplete,
  listMissingSections,
  parseBlueprintBody,
  renderBlueprintBody,
} from '../src/core/assets/blueprint.js';
import { BLUEPRINT_SECTION_KEYS } from '../src/core/schemas/blueprint.js';

const SAMPLE = `# 《吞天魔帝》开书蓝图

## 1. 一句话定盘
末法时代穿越者，靠一本残卷解析功法，从废柴成长为吞天魔帝。

## 2. 题材定位
- 主题材：玄幻
- 副题材：末法

## 3. 主角一句话画像
现代研究生穿越成宗门末等弟子林烬。

## 4. 金手指一句话
《天工残卷》：可解析任何接触过的功法，但消耗精神力会反噬。

## 5. 卖点 / 钩子（前 30 章承诺）
- 第 1 章：得卷
- 第 5 章前：反杀
- 第 30 章前：露第二段封印

## 6. 反 AI 味要求
- 高频禁用词：眉头一皱
- 必备元素：具体场景细节

## 7. 文风指纹
通用网文风。

## 8. 排除项
- 不写：种马
- 写：废柴翻身

## 9. 章字数 / 节奏
- 章字数：3500

## 10. 长期意图
- 计划：800 章
`;

describe('parseBlueprintBody', () => {
  it('extracts the H1 title and 10 sections', () => {
    const { title, sections } = parseBlueprintBody(SAMPLE);
    expect(title).toBe('《吞天魔帝》开书蓝图');
    expect(sections.pitch).toContain('末法时代');
    expect(sections.cheat_system).toContain('天工残卷');
    expect(sections.long_term_intent).toContain('800 章');
  });

  it('marks unknown sections as null', () => {
    const partial = `# Title

## 1. 一句话定盘
just pitch
`;
    const { sections } = parseBlueprintBody(partial);
    expect(sections.pitch).toBe('just pitch');
    expect(sections.positioning).toBeNull();
  });
});

describe('renderBlueprintBody', () => {
  it('round-trips through parse', () => {
    const { title, sections } = parseBlueprintBody(SAMPLE);
    const rendered = renderBlueprintBody(title, sections);
    const reparsed = parseBlueprintBody(rendered);
    for (const k of BLUEPRINT_SECTION_KEYS) {
      expect(reparsed.sections[k]).toBe(sections[k]);
    }
  });

  it('emits placeholder for empty sections', () => {
    const { title, sections } = parseBlueprintBody('# Empty\n');
    const rendered = renderBlueprintBody(title, sections);
    expect(rendered).toContain('待 `novel blueprint start` 填写');
  });
});

describe('isBlueprintComplete / listMissingSections', () => {
  it('full sample is complete', () => {
    const { sections } = parseBlueprintBody(SAMPLE);
    expect(isBlueprintComplete(sections)).toBe(true);
    expect(listMissingSections(sections)).toEqual([]);
  });

  it('empty sample reports all required missing', () => {
    const { sections } = parseBlueprintBody('# x\n');
    expect(isBlueprintComplete(sections)).toBe(false);
    // style_fingerprint is optional so missing list is 9, not 10.
    expect(listMissingSections(sections).length).toBe(9);
  });
});
