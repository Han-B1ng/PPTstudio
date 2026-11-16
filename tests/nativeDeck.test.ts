import { describe, expect, it } from "vitest";
import slide2 from "./fixtures/slide_02_authoring.svg?raw";
import { deckFromImport } from "../src/lib/nativeDeck";
import { acceptCandidate, currentSvg, proposeShapeCandidate, rejectCandidate, slideById } from "../src/lib/deckState";
import { readShapeText, replaceShapeText } from "../src/lib/replaceShapeText";
import type { ImportResult } from "../src/lib/pptxApi";

const SLIDE2 = slide2;

const imported: ImportResult = {
  sessionId: "11111111-1111-1111-1111-111111111111",
  fileName: "xinghe-retail-q3.pptx",
  upstream: {
    repo: "https://github.com/hugohe3/ppt-master",
    commit: "3af3e8ef774c4d67ee57e1306d9256d08c9ee1bf",
    pinnedCommit: "3af3e8ef774c4d67ee57e1306d9256d08c9ee1bf",
    matchesPin: true,
  },
  slides: [
    { page: 1, svg: "<svg>page-1</svg>", objects: [{ shapeId: "4", sourceRef: "slide:4", name: "cover-title", text: "星河零售" }] },
    {
      page: 2,
      svg: SLIDE2,
      objects: [
        { shapeId: "3", sourceRef: "slide:3", name: "title-left", text: "会员与即时达拉动增长" },
        { shapeId: "4", sourceRef: "slide:4", name: "title-right", text: "会员与即时达拉动增长" },
      ],
    },
    { page: 3, svg: "<svg>page-3</svg>", objects: [{ shapeId: "3", sourceRef: "slide:3", name: "close-title", text: "会后三十天" }] },
  ],
};

describe("native deck candidate", () => {
  it("keeps the current page and the other identical text box until accept", () => {
    const deck = deckFromImport(imported);
    const edited = replaceShapeText(SLIDE2, "3", "即时达改写了增长结构");
    const proposed = proposeShapeCandidate(deck, "slide-2", "3", edited.svg, edited.text);

    expect(proposed.slides).toBe(deck.slides);
    expect(currentSvg(proposed, "slide-1")).toBe("<svg>page-1</svg>");
    expect(currentSvg(proposed, "slide-2")).toBe(SLIDE2);
    expect(currentSvg(proposed, "slide-3")).toBe("<svg>page-3</svg>");
    expect(readShapeText(proposed.candidate?.svg ?? "", "3")).toBe("即时达改写了增长结构");
    expect(readShapeText(proposed.candidate?.svg ?? "", "4")).toBe("会员与即时达拉动增长");

    const rejected = rejectCandidate(proposed);
    expect(rejected.candidate).toBeNull();
    expect(currentSvg(rejected, "slide-2")).toBe(SLIDE2);
    expect(slideById(rejected, "slide-1")).toBe(slideById(deck, "slide-1"));
    expect(slideById(rejected, "slide-3")).toBe(slideById(deck, "slide-3"));

    const accepted = acceptCandidate(proposed, "export-1");
    expect(slideById(accepted, "slide-1")).toBe(slideById(deck, "slide-1"));
    expect(slideById(accepted, "slide-3")).toBe(slideById(deck, "slide-3"));
    expect(readShapeText(currentSvg(accepted, "slide-2"), "3")).toBe("即时达改写了增长结构");
    expect(readShapeText(currentSvg(accepted, "slide-2"), "4")).toBe("会员与即时达拉动增长");
    expect(slideById(accepted, "slide-2").versions[0]?.svg).toBe(SLIDE2);
    expect(slideById(accepted, "slide-2").versions[0]?.pptxFile).toBe("original");
    expect(slideById(accepted, "slide-2").versions[1]?.pptxFile).toBe("export-1");
  });
});
