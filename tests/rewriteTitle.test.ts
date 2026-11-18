import { describe, expect, it } from "vitest";
import { PAGE1_SVG, PAGE2_SVG, PAGE3_SVG } from "../src/deck/sampleDeck";
import {
  EmptyTitleError,
  readTitleText,
  rewriteTitleOnly,
  svgWithoutTitleText,
  TitleElementMissingError,
} from "../src/lib/rewriteTitle";

const BODY = [
  "会员贡献 GMV 占比从 46% 升至 53%",
  "即时达履约时效中位数 28 分钟",
  "线下来客持平，客单提升 6.2%",
  "+18.4%",
  "126 万",
  "GMV 指数",
  "title-decoy: 会员与即时达拉动增长",
  "本季 GMV 同比 +18.4%。结构比新开门店更重要。",
];

describe("rewriteTitleOnly", () => {
  it("replaces only the page-2 title text", () => {
    const next = rewriteTitleOnly(PAGE2_SVG, "即时达改写了增长结构");
    expect(readTitleText(next)).toBe("即时达改写了增长结构");
    expect(readTitleText(PAGE2_SVG)).toBe("会员与即时达拉动增长");
    expect(svgWithoutTitleText(next)).toBe(svgWithoutTitleText(PAGE2_SVG));
    expect(next).not.toBe(PAGE2_SVG);

    const openEnd = PAGE2_SVG.indexOf(">", PAGE2_SVG.indexOf('data-element="title"'));
    expect(next.slice(0, openEnd + 1)).toBe(PAGE2_SVG.slice(0, openEnd + 1));
    const close = PAGE2_SVG.indexOf("</text>", PAGE2_SVG.indexOf('data-element="title"'));
    expect(next.endsWith(PAGE2_SVG.slice(close + "</text>".length))).toBe(true);
  });

  it("leaves page-2 body markers untouched", () => {
    const next = rewriteTitleOnly(PAGE2_SVG, "会员复购撑起这一季");
    for (const marker of BODY) {
      expect(next).toContain(marker);
      expect(PAGE2_SVG).toContain(marker);
    }
    expect(next).not.toContain(">会员与即时达拉动增长<");
  });

  it("does not rewrite pages that have no title element", () => {
    expect(() => rewriteTitleOnly(PAGE1_SVG, "另一标题")).toThrow(TitleElementMissingError);
    expect(() => rewriteTitleOnly(PAGE3_SVG, "另一标题")).toThrow(TitleElementMissingError);
    expect(PAGE1_SVG).toContain("星河零售");
    expect(PAGE3_SVG).toContain("会后三十天");
  });

  it("escapes markup so a title cannot break the node", () => {
    const next = rewriteTitleOnly(PAGE2_SVG, `A & B <C>`);
    expect(readTitleText(next)).toBe("A & B <C>");
    expect(next).toContain("A &amp; B &lt;C&gt;");
    expect(svgWithoutTitleText(next)).toBe(svgWithoutTitleText(PAGE2_SVG));
  });

  it("rejects an empty title", () => {
    expect(() => rewriteTitleOnly(PAGE2_SVG, "   ")).toThrow(EmptyTitleError);
  });
});
