/**
 * Whitelist sanitizer for PPTX preview SVG.
 *
 * This is a render copy only. Export still uses the authoring SVG and the
 * OOXML text patch, never this string.
 */

const ALLOWED_ELEMENTS = new Set([
  "svg",
  "g",
  "rect",
  "path",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "textpath",
  "image",
  "use",
  "defs",
  "clippath",
  "mask",
  "lineargradient",
  "radialgradient",
  "stop",
  "pattern",
  "title",
  "desc",
  "symbol",
  "marker",
  "switch",
  "a",
]);

const ALLOWED_ATTRS = new Set([
  "id",
  "class",
  "style",
  "lang",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "fx",
  "fy",
  "fr",
  "width",
  "height",
  "d",
  "points",
  "viewbox",
  "preserveaspectratio",
  "transform",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-opacity",
  "fill-opacity",
  "fill-rule",
  "opacity",
  "color",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-variant",
  "text-anchor",
  "text-decoration",
  "letter-spacing",
  "word-spacing",
  "dominant-baseline",
  "alignment-baseline",
  "baseline-shift",
  "clip-path",
  "clip-rule",
  "mask",
  "marker-start",
  "marker-mid",
  "marker-end",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientunits",
  "gradienttransform",
  "spreadmethod",
  "patternunits",
  "patterncontentunits",
  "patterntransform",
  "visibility",
  "display",
  "overflow",
  "pointer-events",
  "version",
  "xmlns",
  "xml:space",
  "xml:lang",
  "href",
  "xlink:href",
  "data-element",
  "data-shape-id",
  "data-name",
]);

const URL_ATTRS = new Set(["href", "xlink:href"]);
const RESOURCE_ELEMENTS = new Set(["image", "use"]);

function localName(name: string): string {
  const index = name.lastIndexOf(":");
  return (index === -1 ? name : name.slice(index + 1)).toLowerCase();
}

function isAllowedAttr(element: string, rawName: string): boolean {
  const name = rawName.toLowerCase();
  if (name.startsWith("on")) return false;
  if (name.startsWith("data-pptx-")) return true;
  if (name.startsWith("xmlns:") || name === "xmlns") return true;
  if (!ALLOWED_ATTRS.has(name) && !ALLOWED_ATTRS.has(localName(rawName))) return false;
  if (URL_ATTRS.has(name) || URL_ATTRS.has(localName(rawName))) {
    return element === "a" || RESOURCE_ELEMENTS.has(element);
  }
  return true;
}

function attrValue(raw: string): string {
  const quoted = /\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))\s*$/.exec(raw);
  const value = quoted?.[1] ?? quoted?.[2] ?? quoted?.[3] ?? "";
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function compactUrl(value: string): string {
  return value.trim().replace(/[\u0000-\u0020]+/g, "").toLowerCase();
}

function isSafeResource(value: string): boolean {
  const url = compactUrl(value);
  if (!url || url.startsWith("#")) return true;
  if (url.startsWith("//") || url.startsWith("\\\\") || url.includes("\\")) return false;
  if (url.startsWith("javascript:") || url.startsWith("vbscript:") || url.startsWith("file:") || url.startsWith("blob:")) {
    return false;
  }
  if (url.startsWith("http:") || url.startsWith("https:")) return false;
  if (url.startsWith("data:")) {
    return /^data:image\/(png|jpeg|jpg|gif|webp)[;,]/i.test(url);
  }
  return !url.includes(":");
}

function functionalUrlsAreSafe(value: string): boolean {
  const pattern = /url\s*\(\s*(['"]?)([\s\S]*?)\1\s*\)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    const target = (match[2] ?? "").trim();
    if (!target.startsWith("#")) return false;
  }
  return !/expression\s*\(|javascript:|@import|behavior\s*:|-moz-binding/i.test(value);
}

function attributeIsSafe(element: string, rawName: string, rawAttr: string): boolean {
  const name = localName(rawName);
  const value = attrValue(rawAttr);
  if (name === "style" || name === "fill" || name === "stroke" || name === "clip-path" || name === "mask") {
    if (!functionalUrlsAreSafe(value)) return false;
  }
  if (URL_ATTRS.has(rawName.toLowerCase()) || URL_ATTRS.has(name)) {
    if (element === "a") return value.trim() === "" || value.trim().startsWith("#");
    return isSafeResource(value);
  }
  return true;
}

function parseAttributes(source: string): { raw: string; name: string }[] {
  const attrs: { raw: string; name: string }[] = [];
  const pattern = /([^\s="'<>/]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    const raw = match[0];
    if (raw === "/") continue;
    attrs.push({ raw, name: match[1] ?? "" });
  }
  return attrs;
}

function rebuildTag(name: string, attrs: { raw: string }[], selfClosing: boolean): string {
  const body = attrs.map((attr) => attr.raw).join(" ");
  const gap = body ? ` ${body}` : "";
  return selfClosing ? `<${name}${gap}/>` : `<${name}${gap}>`;
}

export function sanitizeSvg(input: string): string {
  const pattern = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[\s\S]*?>|<\/?[^>]+>/g;
  let cursor = 0;
  let output = "";
  const skip: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input))) {
    if (skip.length === 0) output += input.slice(cursor, match.index);
    cursor = match.index + match[0].length;
    const token = match[0];
    if (
      token.startsWith("<!--") ||
      token.startsWith("<![CDATA[") ||
      token.startsWith("<?") ||
      token.startsWith("<!DOCTYPE")
    ) {
      continue;
    }
    const parsed = /^<\s*(\/)?\s*([^\s/>]+)([^>]*)>$/.exec(token);
    if (!parsed) continue;
    const closing = Boolean(parsed[1]);
    const name = parsed[2] ?? "";
    const element = localName(name);
    const attrSource = parsed[3] ?? "";
    const selfClosing = /\/\s*$/.test(attrSource);
    const allowed = ALLOWED_ELEMENTS.has(element);
    if (closing) {
      if (skip.length > 0 && skip[skip.length - 1] === element) skip.pop();
      else if (skip.length === 0 && allowed) output += token;
      continue;
    }
    if (skip.length > 0) {
      if (!allowed && !selfClosing) skip.push(element);
      continue;
    }
    if (!allowed) {
      if (!selfClosing) skip.push(element);
      continue;
    }
    const attrBody = selfClosing ? attrSource.replace(/\/\s*$/, "") : attrSource;
    const attrs = parseAttributes(attrBody);
    const kept = attrs.filter(
      (attr) => attr.name && isAllowedAttr(element, attr.name) && attributeIsSafe(element, attr.name, attr.raw),
    );
    const dropResource =
      RESOURCE_ELEMENTS.has(element) &&
      attrs.some((attr) => URL_ATTRS.has(localName(attr.name))) &&
      !kept.some((attr) => URL_ATTRS.has(localName(attr.name)));
    if (dropResource) {
      if (!selfClosing) skip.push(element);
      continue;
    }
    if (kept.length === attrs.length) output += token;
    else output += rebuildTag(name, kept, selfClosing);
  }
  if (skip.length === 0) output += input.slice(cursor);
  return output;
}
