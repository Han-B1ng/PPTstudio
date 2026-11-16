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
    shapeId: null,
  };
  return shell(deck, candidate);
}

/**
 * Store a candidate SVG produced by the native text-box replace.
 * The current slide records stay on the same objects.
 */
export function proposeShapeCandidate(
  deck: DeckModel,
  pageId: string,
  shapeId: string,
  svg: string,
  newTitle: string,
): DeckModel {
  const slide = slideById(deck, pageId);
  if (!slide.objects.some((item) => item.shapeId === shapeId)) {
    throw new Error(`这一页没有形状 ${shapeId}`);
  }
  const title = newTitle.replace(/\s+/g, " ").trim();
  if (!title) throw new Error("文字不能为空");
  const base = currentVersion(slide);
  const candidate: Candidate = {
    pageId,
    svg,
    title,
    baseVersionId: base.id,
    shapeId,
  };
  return shell(deck, candidate);
}

function shell(deck: DeckModel, candidate: Candidate | null): DeckModel {
  return {
    kind: deck.kind,
    sessionId: deck.sessionId,
    fileName: deck.fileName,
    slides: deck.slides,
    candidate,
  };
}

/** Drop the candidate. Current versions are not copied and not modified. */
export function rejectCandidate(deck: DeckModel): DeckModel {
  if (!deck.candidate) return deck;
  return shell(deck, null);
}

/**
 * Promote the candidate to a new version on its own page.
 * The previous version stays in history. Other pages keep the same slide records.
 */
export function acceptCandidate(deck: DeckModel, pptxFile: string | null = null): DeckModel {
  const candidate = deck.candidate;
  if (!candidate) return deck;

  return {
    kind: deck.kind,
    sessionId: deck.sessionId,
    fileName: deck.fileName,
    candidate: null,
    slides: deck.slides.map((slide) => {
      if (slide.id !== candidate.pageId) return slide;
      const version: VersionRecord = {
        id: `${slide.id}-v${slide.versions.length + 1}`,
        label: `v${slide.versions.length + 1} · 采纳`,
        svg: candidate.svg,
        pptxFile,
        note: candidate.shapeId
          ? `局部修改已采纳。形状 ${candidate.shapeId} 的文字改为「${candidate.title}」。只替换了这个文本框。`
          : `局部修改已采纳。标题改为「${candidate.title}」。只替换了标题文本。`,
      };
      return {
        ...slide,
        versions: [...slide.versions, version],
        currentVersionId: version.id,
      };
    }),
  };
}
