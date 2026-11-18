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
const URL_FUNCTION = /url\s*\(\s*(['"]?)([^)'"]*)\1\s*\)/gi;

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

function isLocalUrl(value: string): boolean {
  URL_FUNCTION.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = URL_FUNCTION.exec(value))) {
    if (!SAFE_FRAGMENT.test((match[2] ?? "").trim())) return false;
  }
  return !/expression\s*\(|javascript\s*:|@import|behavior\s*:|-moz-binding|<\/|[{}]/i.test(value);
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
    if (name === "style" || name === "fill" || name === "stroke" || name === "clip-path" || name === "mask" || name === "filter") {
      if (!isLocalUrl(data.attrValue)) data.keepAttr = false;
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
