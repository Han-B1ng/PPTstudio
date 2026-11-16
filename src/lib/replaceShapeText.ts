/**
 * Deterministic text replacement for one PPT-Master flat authoring shape.
 *
 * The shape is located by `id="shape-N"` together with
 * `data-pptx-source-ref="slide:N"`. Visible text is never used as the key.
 * Bytes outside that shape's single text run stay untouched.
 */

export class ShapeTextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShapeTextError";
  }
}

export type SlideObject = {
  shapeId: string;
  sourceRef: string;
  text: string;
};

type GroupSpan = {
  start: number;
  openEnd: number;
  end: number;
  shapeId: string;
};

type TextSlot = {
  start: number;
  end: number;
  raw: string;
};

const OPEN_GROUP = /<g\b[^>]*>/g;

function isSelfClosing(tag: string): boolean {
  return /\/\s*>$/.test(tag);
}

function findClose(svg: string, from: number): number {
  const re = /<\/?g\b[^>]*>/g;
  re.lastIndex = from;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = re.exec(svg))) {
    if (match[0].startsWith("</")) depth -= 1;
    else if (!isSelfClosing(match[0])) depth += 1;
    if (depth === 0) return match.index + match[0].length;
  }
  throw new ShapeTextError("SVG 里有未闭合的 <g>");
}

function groupSpans(svg: string): GroupSpan[] {
  const spans: GroupSpan[] = [];
  const seen = new Set<string>();
  OPEN_GROUP.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = OPEN_GROUP.exec(svg))) {
    const tag = match[0];
    const id = /\bid="shape-(\d+)"/.exec(tag);
    const ref = /\bdata-pptx-source-ref="slide:(\d+)"/.exec(tag);
    if (!id || !ref) continue;
    if (id[1] !== ref[1]) {
      throw new ShapeTextError(
        `形状编号不一致：id="shape-${id[1]}"，data-pptx-source-ref="slide:${ref[1]}"`,
      );
    }
    if (seen.has(id[1])) {
      throw new ShapeTextError(`这一页有重复的形状 ${id[1]}`);
    }
    seen.add(id[1]);
    if (isSelfClosing(tag)) {
      spans.push({
        start: match.index,
        openEnd: match.index + tag.length,
        end: match.index + tag.length,
        shapeId: id[1],
      });
      continue;
    }
    const end = findClose(svg, match.index + tag.length);
    spans.push({
      start: match.index,
      openEnd: match.index + tag.length,
      end,
      shapeId: id[1],
    });
  }
  return spans;
}

function directInner(svg: string, span: GroupSpan): { text: string; origin: number } {
  const body = svg.slice(span.openEnd, span.end);
  const closeAt = body.lastIndexOf("</g>");
  const inner = closeAt >= 0 ? body.slice(0, closeAt) : body;
  const nested = /<g\b/.exec(inner);
  const direct = nested ? inner.slice(0, nested.index) : inner;
  return { text: direct, origin: span.openEnd };
}

function slotsInFragment(fragment: string): TextSlot[] {
  const slots: TextSlot[] = [];
  const textRe = /<text\b[^>]*>[\s\S]*?<\/text>/g;
  let match: RegExpExecArray | null;
  while ((match = textRe.exec(fragment))) {
    const open = /<text\b[^>]*>/.exec(match[0]);
    if (!open) continue;
    const innerStart = match.index + open[0].length;
    const inner = match[0].slice(open[0].length, -"</text>".length);
    if (!inner.includes("<")) {
      slots.push({ start: innerStart, end: innerStart + inner.length, raw: inner });
      continue;
    }
    const segRe = />([^<]*)</g;
    let seg: RegExpExecArray | null;
    while ((seg = segRe.exec(inner))) {
      slots.push({
        start: innerStart + seg.index + 1,
        end: innerStart + seg.index + 1 + seg[1].length,
        raw: seg[1],
      });
    }
  }
  return slots;
}

export function escapeXmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function unescapeXmlText(value: string): string {
  return value.replaceAll("&gt;", ">").replaceAll("&lt;", "<").replaceAll("&amp;", "&");
}

function filledSlots(slots: TextSlot[]): TextSlot[] {
  return slots.filter((slot) => slot.raw.trim().length > 0);
}

function shapeById(svg: string, shapeId: string): GroupSpan {
  if (!/^\d+$/.test(shapeId)) {
    throw new ShapeTextError(`形状编号无效：${shapeId}`);
  }
  const span = groupSpans(svg).find((item) => item.shapeId === shapeId);
  if (!span) {
    throw new ShapeTextError(
      `这一页的 SVG 里没有 id="shape-${shapeId}" 且 data-pptx-source-ref="slide:${shapeId}" 的形状`,
    );
  }
  return span;
}

function readSlots(svg: string, shapeId: string): { slots: TextSlot[]; origin: number; span: GroupSpan } {
  const span = shapeById(svg, shapeId);
  const direct = directInner(svg, span);
  return { slots: slotsInFragment(direct.text), origin: direct.origin, span };
}

/** Visible text of one shape, or null when that shape has no single text run. */
export function readShapeText(svg: string, shapeId: string): string | null {
  let read: ReturnType<typeof readSlots>;
  try {
    read = readSlots(svg, shapeId);
  } catch (error) {
    if (error instanceof ShapeTextError && error.message.includes("没有")) return null;
    throw error;
  }
  const filled = filledSlots(read.slots);
  if (filled.length !== 1) return null;
  const raw = filled[0]?.raw ?? "";
  if (raw.includes("&#")) return null;
  return unescapeXmlText(raw);
}

export function listTextObjects(svg: string): SlideObject[] {
  const objects: SlideObject[] = [];
  for (const span of groupSpans(svg)) {
    const text = readShapeText(svg, span.shapeId);
    if (!text) continue;
    objects.push({
      shapeId: span.shapeId,
      sourceRef: `slide:${span.shapeId}`,
      text,
    });
  }
  return objects;
}

export function normalizeReplacement(raw: string): string {
  const title = raw.replace(/\s+/g, " ").trim();
  if (!title) throw new ShapeTextError("文字不能为空");
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(title)) {
    throw new ShapeTextError("文字里有控制字符");
  }
  if (title.length > 80) throw new ShapeTextError("文字超过 80 个字");
  return title;
}

export function replaceShapeText(
  svg: string,
  shapeId: string,
  rawText: string,
): { svg: string; previousText: string; text: string; shapeId: string; sourceRef: string } {
  const text = normalizeReplacement(rawText);
  const read = readSlots(svg, shapeId);
  const filled = filledSlots(read.slots);
  if (filled.length === 0) {
    throw new ShapeTextError(`形状 ${shapeId} 没有可替换的文本`);
  }
  if (filled.length > 1) {
    throw new ShapeTextError(`形状 ${shapeId} 有多段文字。本轮只替换单段文本框。`);
  }
  const slot = filled[0];
  if (!slot) throw new ShapeTextError(`形状 ${shapeId} 没有可替换的文本`);
  if (slot.raw.includes("&#")) {
    throw new ShapeTextError(`形状 ${shapeId} 的文字含有数字字符引用，本轮不改写`);
  }
  const previousText = unescapeXmlText(slot.raw);
  const absoluteStart = read.origin + slot.start;
  const absoluteEnd = read.origin + slot.end;
  const next =
    svg.slice(0, absoluteStart) + escapeXmlText(text) + svg.slice(absoluteEnd);
  return {
    svg: next,
    previousText,
    text,
    shapeId,
    sourceRef: `slide:${shapeId}`,
  };
}

/** Display-only hit rectangles. Never feed this SVG to the exporter. */
export function withHitTargets(svg: string, shapeIds: readonly string[]): string {
  const wanted = new Set(shapeIds);
  if (wanted.size === 0) return svg;
  let cursor = 0;
  let next = "";
  const openRe = /<g\b[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = openRe.exec(svg))) {
    const tag = match[0];
    const id = /\bid="shape-(\d+)"/.exec(tag);
    const frame = /\bdata-pptx-frame="([0-9.]+) ([0-9.]+) ([0-9.]+) ([0-9.]+)"/.exec(tag);
    if (!id || !frame || !wanted.has(id[1]) || isSelfClosing(tag)) continue;
    const insertAt = match.index + tag.length;
    next += svg.slice(cursor, insertAt);
    next += `<rect x="${frame[1]}" y="${frame[2]}" width="${frame[3]}" height="${frame[4]}" fill="#000000" fill-opacity="0" data-element="shape-hit" data-shape-id="${id[1]}"/>`;
    cursor = insertAt;
  }
  next += svg.slice(cursor);
  return next;
}
