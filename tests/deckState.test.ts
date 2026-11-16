import { describe, expect, it } from "vitest";
import { PAGE1_SVG, PAGE2_SVG, PAGE3_SVG, createInitialDeck } from "../src/deck/sampleDeck";
import { acceptCandidate, currentSvg, proposeTitleChange, rejectCandidate, slideById } from "../src/lib/deckState";
import { readTitleText, svgWithoutTitleText } from "../src/lib/rewriteTitle";

const NEXT_TITLE = "即时达改写了增长结构";

describe("version state", () => {
  it("builds a page-2 candidate without touching current slides", () => {
    const before = createInitialDeck();
    const proposed = proposeTitleChange(before, "p2", NEXT_TITLE);

    expect(before.candidate).toBeNull();
    expect(proposed.slides).toBe(before.slides);
    expect(currentSvg(proposed, "p2")).toBe(PAGE2_SVG);
    expect(currentSvg(proposed, "p1")).toBe(PAGE1_SVG);
    expect(currentSvg(proposed, "p3")).toBe(PAGE3_SVG);
    expect(proposed.candidate?.pageId).toBe("p2");
    expect(proposed.candidate?.baseVersionId).toBe("p2-v1");
    expect(readTitleText(proposed.candidate?.svg ?? "")).toBe(NEXT_TITLE);
    expect(svgWithoutTitleText(proposed.candidate?.svg ?? "")).toBe(svgWithoutTitleText(PAGE2_SVG));
    expect(proposed.candidate?.svg).toContain("会员贡献 GMV 占比从 46% 升至 53%");
    expect(proposed.candidate?.svg).toContain("126 万");
    expect(proposed.candidate?.svg).toContain("GMV 指数");
  });

  it("reject leaves the current deck unchanged", () => {
    const before = createInitialDeck();
    const proposed = proposeTitleChange(before, "p2", "会员复购撑起这一季");
    const rejected = rejectCandidate(proposed);

    expect(rejected.candidate).toBeNull();
    expect(rejected.slides).toBe(proposed.slides);
    expect(currentSvg(rejected, "p2")).toBe(PAGE2_SVG);
    expect(currentSvg(rejected, "p1")).toBe(PAGE1_SVG);
    expect(currentSvg(rejected, "p3")).toBe(PAGE3_SVG);
    expect(slideById(rejected, "p2").versions).toHaveLength(1);
    expect(slideById(rejected, "p2").versions[0]?.svg).toBe(PAGE2_SVG);
    expect(readTitleText(currentSvg(rejected, "p2"))).toBe("会员与即时达拉动增长");
  });

  it("accept promotes the candidate and keeps the old version", () => {
    const before = createInitialDeck();
    const proposed = proposeTitleChange(before, "p2", NEXT_TITLE);
    const accepted = acceptCandidate(proposed);

    expect(accepted.candidate).toBeNull();
    expect(slideById(accepted, "p1")).toBe(slideById(before, "p1"));
    expect(slideById(accepted, "p3")).toBe(slideById(before, "p3"));
    expect(currentSvg(accepted, "p1")).toBe(PAGE1_SVG);
    expect(currentSvg(accepted, "p3")).toBe(PAGE3_SVG);
    expect(PAGE1_SVG).toBe(slideById(accepted, "p1").versions[0]?.svg);
    expect(PAGE3_SVG).toBe(slideById(accepted, "p3").versions[0]?.svg);

    const page2 = slideById(accepted, "p2");
    expect(page2.versions).toHaveLength(2);
    expect(page2.currentVersionId).toBe("p2-v2");
    expect(page2.versions[0]?.id).toBe("p2-v1");
    expect(page2.versions[0]?.svg).toBe(PAGE2_SVG);
    expect(readTitleText(page2.versions[0]?.svg ?? "")).toBe("会员与即时达拉动增长");
    expect(currentSvg(accepted, "p2")).toBe(proposed.candidate?.svg);
    expect(readTitleText(currentSvg(accepted, "p2"))).toBe(NEXT_TITLE);
    expect(svgWithoutTitleText(currentSvg(accepted, "p2"))).toBe(svgWithoutTitleText(PAGE2_SVG));
    expect(currentSvg(accepted, "p2")).toContain("线下来客持平，客单提升 6.2%");
    expect(currentSvg(accepted, "p2")).not.toContain(">会员与即时达拉动增长<");
  });

  it("does not auto-accept: current svg stays original while a candidate exists", () => {
    const proposed = proposeTitleChange(createInitialDeck(), "p2", NEXT_TITLE);
    expect(readTitleText(currentSvg(proposed, "p2"))).toBe("会员与即时达拉动增长");
    expect(acceptCandidate(proposed).candidate).toBeNull();
    expect(proposed.candidate).not.toBeNull();
  });
});
