const TITLE_PATTERN = String.raw`<text\b([^>]*\bdata-element="title"[^>]*)>([\s\S]*?)<\/text>`;

export class TitleElementMissingError extends Error {
  constructor(message = "这一页的 SVG 里没有 data-element=\"title\" 的文本节点") {
    super(message);
    this.name = "TitleElementMissingError";
  }
}

export class EmptyTitleError extends Error {
  constructor(message = "标题不能为空") {
    super(message);
    this.name = "EmptyTitleError";
  }
}

export function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function unescapeXml(value: string): string {
  return value.replaceAll("&gt;", ">").replaceAll("&lt;", "<").replaceAll("&amp;", "&");
}

export function readTitleText(svg: string): string | null {
  const match = new RegExp(TITLE_PATTERN).exec(svg);
  if (!match) return null;
  return unescapeXml(match[2]);
}

/**
 * Replace only the character data of the single `<text data-element="title">` node.
 * The opening tag, every other element, and the bytes outside that text node stay intact.
 */
export function rewriteTitleOnly(svg: string, rawTitle: string): string {
  const title = rawTitle.replace(/\s+/g, " ").trim();
  if (!title) throw new EmptyTitleError();

  const match = new RegExp(TITLE_PATTERN).exec(svg);
  if (!match || match.index === undefined) throw new TitleElementMissingError();

  const after = svg.slice(match.index + match[0].length);
  if (new RegExp(TITLE_PATTERN).test(after)) {
    throw new Error("SVG 中有多个 data-element=\"title\" 节点");
  }

  const next = `<text${match[1]}>${escapeXml(title)}</text>`;
  return svg.slice(0, match.index) + next + after;
}

/** SVG with the title text node emptied, so callers can compare everything else. */
export function svgWithoutTitleText(svg: string): string {
  const match = new RegExp(TITLE_PATTERN).exec(svg);
  if (!match || match.index === undefined) return svg;
  const emptied = `<text${match[1]}></text>`;
  return svg.slice(0, match.index) + emptied + svg.slice(match.index + match[0].length);
}
