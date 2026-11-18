/**
 * Render-only SVG sanitizer.
 *
 * DOMPurify parses the markup. Hooks then reject resource URLs and style
 * values this preview does not need. Export and OOXML write-back never use
 * the returned string.
 */

import DOMPurify from "dompurify";

const SAFE_IMAGE_DATA = /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i;
const SAFE_MEDIA_PATH = /^(?:\.\.\/)?images\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}\.(?:png|jpe?g|gif|webp)$/;
const SAFE_FRAGMENT = /^#[A-Za-z_][\w:.-]*$/;
let hooksInstalled = false;

function decodedPath(value: string): string | null {
  try {
    return decodeURIComponent(value).replaceAll("\\", "/");
  } catch {
    return null;
  }
}

/** Raster images from a PPT-Master media folder, or an inline raster data URI. */
export function isAllowedImageReference(value: string): boolean {
  const compact = value.trim().replace(/\s+/g, "");
  if (SAFE_IMAGE_DATA.test(compact)) return true;
  const path = decodedPath(value.trim());
  if (!path || path !== value.trim() || path.includes("..") && !path.startsWith("../images/")) return false;
  if (path.slice("../images/".length).includes("..")) return false;
  return SAFE_MEDIA_PATH.test(path);
}

const COLOR =
  "(?:none|transparent|currentcolor|#[0-9a-f]{3,8}|(?:rgb|rgba)\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}(?:\\s*,\\s*(?:0|1|0?\\.\\d+))?\\s*\\))";
const LENGTH = "-?\\d+(?:\\.\\d+)?(?:px|em|%|pt)?";
const FRAGMENT_URL = "url\\(\\s*['\"]?#[A-Za-z_][\\w:.-]*['\"]?\\s*\\)";
const OPACITY = "(?:0|1|0?\\.\\d+|\\d{1,3}%)";

/** Every declaration must match. Anything else drops the whole style attribute. */
const STYLE_VALUE: Record<string, RegExp> = {
  fill: new RegExp(`^(?:${COLOR}|${FRAGMENT_URL})$`, "i"),
  stroke: new RegExp(`^(?:${COLOR}|${FRAGMENT_URL})$`, "i"),
  color: new RegExp(`^${COLOR}$`, "i"),
  "stop-color": new RegExp(`^${COLOR}$`, "i"),
  "fill-opacity": new RegExp(`^${OPACITY}$`),
  "stroke-opacity": new RegExp(`^${OPACITY}$`),
  "stop-opacity": new RegExp(`^${OPACITY}$`),
  opacity: new RegExp(`^${OPACITY}$`),
  "stroke-width": new RegExp(`^${LENGTH}$`),
  "stroke-linecap": /^(?:butt|round|square)$/,
  "stroke-linejoin": /^(?:miter|round|bevel)$/,
  "stroke-dasharray": new RegExp(`^(?:none|(?:${LENGTH}\\s*,?\\s*)+)$`),
  "font-size": new RegExp(`^${LENGTH}$`),
  "font-weight": /^(?:normal|bold|[1-9]00)$/,
  "font-style": /^(?:normal|italic)$/,
  "font-family": /^[A-Za-z0-9"'\s,._-]{1,80}$/,
  "text-anchor": /^(?:start|middle|end)$/,
  "text-decoration": /^(?:none|underline|line-through)$/,
  "letter-spacing": new RegExp(`^(?:normal|${LENGTH})$`),
  visibility: /^(?:visible|hidden)$/,
  display: /^(?:inline|block|none)$/,
  "clip-path": new RegExp(`^(?:none|${FRAGMENT_URL})$`, "i"),
  mask: new RegExp(`^(?:none|${FRAGMENT_URL})$`, "i"),
  filter: new RegExp(`^(?:none|${FRAGMENT_URL})$`, "i"),
  "marker-start": new RegExp(`^(?:none|${FRAGMENT_URL})$`, "i"),
  "marker-mid": new RegExp(`^(?:none|${FRAGMENT_URL})$`, "i"),
  "marker-end": new RegExp(`^(?:none|${FRAGMENT_URL})$`, "i"),
};

const RESOURCE_ATTRIBUTES = new Set([
  "fill",
  "stroke",
  "clip-path",
  "mask",
  "filter",
  "marker-start",
  "marker-mid",
  "marker-end",
]);

/** Same legal values as inline style: an ordinary paint, or url(#…). */
function resourceAttributeIsAllowed(name: string, value: string): boolean {
  const rule = STYLE_VALUE[name];
  return Boolean(rule?.test(value.trim()));
}

function styleIsAllowlisted(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 400 || /[{}<>\\]|\/\*|\*\//.test(trimmed)) return false;
  const declarations = trimmed.split(";").map((part) => part.trim()).filter(Boolean);
  if (declarations.length === 0) return false;
  for (const declaration of declarations) {
    const match = /^([a-z-]+)\s*:\s*(.+)$/i.exec(declaration);
    if (!match) return false;
    const property = match[1].toLowerCase();
    const propertyValue = match[2].trim();
    const rule = STYLE_VALUE[property];
    if (!rule || !rule.test(propertyValue)) return false;
  }
  return true;
}

function isAllowedReference(element: string, value: string): boolean {
  const trimmed = value.trim();
  if (element === "image") return isAllowedImageReference(trimmed);
  return SAFE_FRAGMENT.test(trimmed);
}

function installHooks(): void {
  if (hooksInstalled || !DOMPurify.isSupported) return;
  hooksInstalled = true;
  DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
    const name = data.attrName.toLowerCase();
    const element = node.nodeName.toLowerCase();
    if (name.startsWith("on")) {
      data.keepAttr = false;
      return;
    }
    if (name === "href" || name === "xlink:href") {
      if (!isAllowedReference(element, data.attrValue)) data.keepAttr = false;
      return;
    }
    if (name === "style") {
      if (!styleIsAllowlisted(data.attrValue)) data.keepAttr = false;
      return;
    }
    if (RESOURCE_ATTRIBUTES.has(name) && !resourceAttributeIsAllowed(name, data.attrValue)) {
      data.keepAttr = false;
    }
  });
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.nodeType !== 1) return;
    const element = node.nodeName.toLowerCase();
    if (element !== "image" && element !== "use") return;
    const href = (node as Element).getAttribute("href") || (node as Element).getAttribute("xlink:href");
    if (!href) node.parentNode?.removeChild(node);
  });
}

export function sanitizeSvg(input: string): string {
  if (!DOMPurify.isSupported) {
    throw new Error("SVG 净化需要 DOM");
  }
  installHooks();
  return DOMPurify.sanitize(input, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["style", "script", "foreignObject", "iframe", "embed", "object", "handler", "animate", "set"],
    ADD_ATTR: [
      "data-pptx-object",
      "data-pptx-source-ref",
      "data-pptx-frame",
      "data-pptx-prst",
      "data-pptx-semantic-object",
      "data-pptx-part",
      "data-pptx-text-baseline",
      "data-pptx-text-model",
      "data-pptx-shape-id",
      "data-pptx-shape-name",
      "data-element",
      "data-shape-id",
      "data-name",
    ],
  });
}
