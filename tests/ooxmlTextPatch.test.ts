import { describe, expect, it } from "vitest";
import slide2 from "./fixtures/slide2.xml?raw";
import { OoxmlTextError, patchSlideXml, readShapeTextFromSlide, slidePartForPage } from "../src/lib/ooxmlTextPatch";

const NEXT = "即时达改写了增长结构";
const ORIGINAL = "会员与即时达拉动增长";

describe("patchSlideXml", () => {
  it("changes only shape 3's a:t and restores the slide byte for byte", () => {
    const patched = patchSlideXml(slide2, "3", NEXT);
    expect(patched.previousText).toBe(ORIGINAL);
    expect(patched.text).toBe(NEXT);
    expect(readShapeTextFromSlide(patched.xml, "3")).toBe(NEXT);
    expect(readShapeTextFromSlide(patched.xml, "4")).toBe(ORIGINAL);
    expect(patched.xml).toContain('txBox="1"');
    expect(patched.xml).toContain('wrap="square"');
    expect(patched.xml).not.toContain('wrap="none"');

    const restored = patchSlideXml(patched.xml, "3", ORIGINAL);
    expect(restored.xml).toBe(slide2);
  });

  it("keeps an earlier edit when a second shape is patched", () => {
    const first = patchSlideXml(slide2, "3", NEXT).xml;
    const second = patchSlideXml(first, "4", "另一侧标题");
    expect(readShapeTextFromSlide(second.xml, "3")).toBe(NEXT);
    expect(readShapeTextFromSlide(second.xml, "4")).toBe("另一侧标题");
    const undoRight = patchSlideXml(second.xml, "4", ORIGINAL).xml;
    const undoLeft = patchSlideXml(undoRight, "3", ORIGINAL).xml;
    expect(undoLeft).toBe(slide2);
  });

  it("refuses a missing shape, a duplicate, and multiple paragraphs without editing", () => {
    expect(() => patchSlideXml(slide2, "99", NEXT)).toThrow(OoxmlTextError);
    const duplicate = slide2.replace('id="4"', 'id="3"');
    expect(() => patchSlideXml(duplicate, "3", NEXT)).toThrow(/无法唯一确定/);
    const multi = slide2.replace(
      "<a:t>会员与即时达拉动增长</a:t></a:r></a:p>",
      "<a:t>第一段</a:t></a:r></a:p><a:p><a:r><a:t>第二段</a:t></a:r></a:p>",
    );
    expect(multi).not.toBe(slide2);
    expect(() => patchSlideXml(multi, "3", NEXT)).toThrow(/多段文字/);
    expect(slide2).toContain(ORIGINAL);
  });
});

describe("slidePartForPage", () => {
  it("follows the slide list instead of assuming filenames", () => {
    const presentation = `<p:sldIdLst><p:sldId id="256" r:id="rId7"/><p:sldId id="257" r:id="rId8"/></p:sldIdLst>`;
    const rels = `<Relationships><Relationship Id="rId8" Type="slide" Target="slides/slide2.xml"/></Relationships>`;
    expect(slidePartForPage(presentation, rels, 2)).toBe("ppt/slides/slide2.xml");
    expect(() => slidePartForPage(presentation, rels, 3)).toThrow(OoxmlTextError);
  });
});
