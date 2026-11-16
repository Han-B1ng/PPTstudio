import { readShapeText } from "./replaceShapeText";
import { readTitleText } from "./rewriteTitle";
import type { SlideRecord } from "../types";

export function slideCaption(slide: SlideRecord, svg: string): string {
  for (const object of slide.objects) {
    const text = readShapeText(svg, object.shapeId);
    if (text) return text;
  }
  return readTitleText(svg) ?? slide.fallbackTitle;
}
