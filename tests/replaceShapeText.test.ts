import { describe, expect, it } from "vitest";
import slide2 from "./fixtures/slide_02_authoring.svg?raw";
import {
  listTextObjects,
  readShapeText,
  replaceShapeText,
  ShapeTextError,
} from "../src/lib/replaceShapeText";

const SLIDE2 = slide2;
const SHARED = "会员与即时达拉动增长";

function groupOf(svg: string, shapeId: string): string {
  const start = svg.indexOf(`id="shape-${shapeId}"`);
  const open = svg.lastIndexOf("<g", start);
  const end = svg.indexOf("</g>", start) + "</g>".length;
  return svg.slice(open, end);
}

describe("replaceShapeText", () => {
  it("lists both identical titles as different shape ids", () => {
    const objects = listTextObjects(SLIDE2);
    const twins = objects.filter((item) => item.text === SHARED);
    expect(twins.map((item) => item.shapeId)).toEqual(["3", "4"]);
    expect(readShapeText(SLIDE2, "3")).toBe(SHARED);
    expect(readShapeText(SLIDE2, "4")).toBe(SHARED);
    expect(readShapeText(SLIDE2, "5")).toContain("GMV");
  });

  it("replaces only the shape addressed by page-local shape id", () => {
    const next = replaceShapeText(SLIDE2, "3", "即时达改写了增长结构");
    expect(next.previousText).toBe(SHARED);
    expect(next.text).toBe("即时达改写了增长结构");
    expect(next.sourceRef).toBe("slide:3");
    expect(readShapeText(next.svg, "3")).toBe("即时达改写了增长结构");
    expect(readShapeText(next.svg, "4")).toBe(SHARED);
    expect(groupOf(next.svg, "4")).toBe(groupOf(SLIDE2, "4"));
    expect(next.svg).toContain("本季 GMV 同比 +18.4%。结构比新开门店更重要。");
    expect(next.svg).toContain("126 万");
    const untouched = SLIDE2.slice(SLIDE2.indexOf('id="shape-4"'));
    expect(next.svg.endsWith(untouched)).toBe(true);
  });

  it("escapes markup inside the selected run only", () => {
    const next = replaceShapeText(SLIDE2, "4", "A & B <C>");
    expect(readShapeText(next.svg, "4")).toBe("A & B <C>");
    expect(next.svg).toContain("A &amp; B &lt;C&gt;");
    expect(readShapeText(next.svg, "3")).toBe(SHARED);
  });

  it("rejects an empty replacement and a missing shape", () => {
    expect(() => replaceShapeText(SLIDE2, "3", "   ")).toThrow(ShapeTextError);
    expect(() => replaceShapeText(SLIDE2, "99", "另一标题")).toThrow(/没有/);
    expect(readShapeText(SLIDE2, "2")).toBeNull();
  });
});
