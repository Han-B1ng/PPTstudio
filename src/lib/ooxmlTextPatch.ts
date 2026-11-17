/**
 * Replace the single text run of one DrawingML shape.
 *
 * The shape is the `p:sp` whose `cNvPr/@id` matches `shapeId`. Only the
 * character data inside its one `<a:t>` is rewritten. Every other byte of the
 * slide XML stays put, so putting the original string back restores the file.
 */

import { normalizeReplacement } from "./replaceShapeText.ts";

export class OoxmlTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OoxmlTextError";
  }
}

type ShapeSpan = { start: number; end: number };
type TextNode = { raw: string; innerStart: number; innerEnd: number };

const SHAPE_TAG = /<(\/?)((?:[\w.-]+:)?sp)(?=[\s>/])([^>]*?)>/g;
const TEXT_TAG = /<((?:[\w.-]+:)?t)(?=[\s>/])([^>]*)>([\s\S]*?)<\/((?:[\w.-]+:)?t)>/g;
const PARAGRAPH_TAG = /<(?:[\w.-]+:)?p(?=[\s>/])/g;

function shapeSpans(xml: string): ShapeSpan[] {
  const spans: ShapeSpan[] = [];
  SHAPE_TAG.lastIndex = 0;
  let depth = 0;
  let start = -1;
  let match: RegExpExecArray | null;
  while ((match = SHAPE_TAG.exec(xml))) {
    const closing = match[1] === "/";
    const selfClosing = /\/\s*$/.test(match[3] ?? "");
    if (closing) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        spans.push({ start, end: match.index + match[0].length });
        start = -1;
      }
      if (depth < 0) depth = 0;
      continue;
    }
    if (selfClosing) {
      if (depth === 0) spans.push({ start: match.index, end: match.index + match[0].length });
      continue;
    }
    if (depth === 0) start = match.index;
    depth += 1;
  }
  return spans;
}

function shapeIdOf(fragment: string): string | null {
  const match =
    /<(?:[\w.-]+:)?cNvPr\b[^>]*\bid="(\d+)"/.exec(fragment) ||
    /<(?:[\w.-]+:)?cNvPr\b[^>]*\bid='(\d+)'/.exec(fragment);
  return match?.[1] ?? null;
}

function textNodes(fragment: string, base: number): TextNode[] {
  const nodes: TextNode[] = [];
  TEXT_TAG.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TEXT_TAG.exec(fragment))) {
    const openTag = match[0].slice(0, match[0].indexOf(">") + 1);
    const raw = match[3] ?? "";
    const innerStart = base + match.index + openTag.length;
    nodes.push({ raw, innerStart, innerEnd: innerStart + raw.length });
  }
  return nodes;
}

function unescapeXmlText(value: string): string {
  return value
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

function escapeXmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function locate(xml: string, shapeId: string): { previousText: string; node: TextNode } {
  if (!/^\d+$/.test(shapeId)) {
    throw new OoxmlTextError(`形状编号无效：${shapeId}。当前版本没有改。`);
  }
  const matches = shapeSpans(xml).filter((span) => shapeIdOf(xml.slice(span.start, span.end)) === shapeId);
  if (matches.length === 0) {
    throw new OoxmlTextError(`找不到形状 ${shapeId}。当前版本没有改。`);
  }
  if (matches.length > 1) {
    throw new OoxmlTextError(`形状 ${shapeId} 无法唯一确定，找到 ${matches.length} 个。当前版本没有改。`);
  }
  const span = matches[0];
  if (!span) throw new OoxmlTextError(`找不到形状 ${shapeId}。当前版本没有改。`);
  const fragment = xml.slice(span.start, span.end);
  PARAGRAPH_TAG.lastIndex = 0;
  const paragraphs = fragment.match(PARAGRAPH_TAG)?.length ?? 0;
  if (paragraphs > 1) {
    throw new OoxmlTextError(`形状 ${shapeId} 有多段文字，本轮还不支持。当前版本没有改。`);
  }
  const nodes = textNodes(fragment, span.start);
  if (nodes.length === 0) {
    throw new OoxmlTextError(`形状 ${shapeId} 没有可替换的文字。当前版本没有改。`);
  }
  if (nodes.length > 1) {
    throw new OoxmlTextError(`形状 ${shapeId} 有多段文字，本轮还不支持。当前版本没有改。`);
  }
  const node = nodes[0];
  if (!node) throw new OoxmlTextError(`形状 ${shapeId} 没有可替换的文字。当前版本没有改。`);
  if (node.raw.includes("&#")) {
    throw new OoxmlTextError(`形状 ${shapeId} 的文字含有数字字符引用，本轮不改写。当前版本没有改。`);
  }
  return { previousText: unescapeXmlText(node.raw), node };
}

export function readShapeTextFromSlide(xml: string, shapeId: string): string {
  return locate(xml, shapeId).previousText;
}

export function patchSlideXml(
  xml: string,
  shapeId: string,
  rawText: string,
): { xml: string; previousText: string; text: string } {
  const text = normalizeReplacement(rawText);
  const { previousText, node } = locate(xml, shapeId);
  const next = xml.slice(0, node.innerStart) + escapeXmlText(text) + xml.slice(node.innerEnd);
  return { xml: next, previousText, text };
}

/** Page number follows `p:sldIdLst` order, not the slide filename. */
export function slidePartForPage(presentationXml: string, relsXml: string, page: number): string {
  if (!Number.isInteger(page) || page < 1) {
    throw new OoxmlTextError(`页码无效：${page}。当前版本没有改。`);
  }
  const ids = [...presentationXml.matchAll(/<[\w.-]*:?sldId\b[^>]*\br:id="([^"]+)"/g)].map((match) => match[1]);
  if (ids.length === 0) {
    throw new OoxmlTextError("演示文稿里没有幻灯片列表。当前版本没有改。");
  }
  const relId = ids[page - 1];
  if (!relId) {
    throw new OoxmlTextError(`找不到第 ${page} 页（演示文稿只有 ${ids.length} 页）。当前版本没有改。`);
  }
  const byIdFirst = new RegExp(`<Relationship\\b[^>]*\\bId="${relId}"[^>]*\\bTarget="([^"]+)"`).exec(relsXml);
  const byTargetFirst = new RegExp(`<Relationship\\b[^>]*\\bTarget="([^"]+)"[^>]*\\bId="${relId}"`).exec(relsXml);
  const target = byIdFirst?.[1] ?? byTargetFirst?.[1];
  if (!target) {
    throw new OoxmlTextError(`找不到第 ${page} 页的幻灯片部件（${relId}）。当前版本没有改。`);
  }
  let part = decodeURIComponent(target).replace(/\\/g, "/");
  if (part.startsWith("/")) part = part.slice(1);
  if (part.startsWith("../") || part.includes("/../") || part === "..") {
    throw new OoxmlTextError(`幻灯片路径不安全：${part}。当前版本没有改。`);
  }
  if (!part.startsWith("ppt/")) part = `ppt/${part.replace(/^\.\//, "")}`;
  return part;
}
