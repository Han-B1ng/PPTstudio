import { rewriteTitleOnly } from "./rewriteTitle";
import type { Candidate, DeckModel, SlideRecord, VersionRecord } from "../types";

export class SlideNotFoundError extends Error {
  constructor(pageId: string) {
    super(`找不到页面 ${pageId}`);
    this.name = "SlideNotFoundError";
  }
}

export function slideById(deck: DeckModel, pageId: string): SlideRecord {
  const slide = deck.slides.find((item) => item.id === pageId);
  if (!slide) throw new SlideNotFoundError(pageId);
  return slide;
}

export function currentVersion(slide: SlideRecord): VersionRecord {
  const version = slide.versions.find((item) => item.id === slide.currentVersionId);
  if (!version) throw new Error(`页面 ${slide.id} 缺少当前版本`);
  return version;
}

export function currentSvg(deck: DeckModel, pageId: string): string {
  return currentVersion(slideById(deck, pageId)).svg;
}

/**
 * Build a title-only candidate. The current version and every other page stay as they are.
 * Nothing is accepted here.
 */
export function proposeTitleChange(deck: DeckModel, pageId: string, newTitle: string): DeckModel {
  const slide = slideById(deck, pageId);
  const base = currentVersion(slide);
  const svg = rewriteTitleOnly(base.svg, newTitle);
  const title = newTitle.replace(/\s+/g, " ").trim();
  const candidate: Candidate = {
    pageId,
    svg,
    title,
    baseVersionId: base.id,
  };
  return {
    slides: deck.slides,
    candidate,
  };
}

/** Drop the candidate. Current versions are not copied and not modified. */
export function rejectCandidate(deck: DeckModel): DeckModel {
  if (!deck.candidate) return deck;
  return {
    slides: deck.slides,
    candidate: null,
  };
}

/**
 * Promote the candidate to a new version on its own page.
 * The previous version stays in history. Other pages keep the same slide records.
 */
export function acceptCandidate(deck: DeckModel): DeckModel {
  const candidate = deck.candidate;
  if (!candidate) return deck;

  return {
    candidate: null,
    slides: deck.slides.map((slide) => {
      if (slide.id !== candidate.pageId) return slide;
      const version: VersionRecord = {
        id: `${slide.id}-v${slide.versions.length + 1}`,
        label: `v${slide.versions.length + 1} · 采纳`,
        svg: candidate.svg,
        note: `局部修改已采纳。标题改为「${candidate.title}」。只替换了标题文本。`,
      };
      return {
        ...slide,
        versions: [...slide.versions, version],
        currentVersionId: version.id,
      };
    }),
  };
}
