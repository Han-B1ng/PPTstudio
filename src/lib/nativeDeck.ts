import type { DeckModel } from "../types";
import type { ImportResult } from "./pptxApi";

export function deckFromImport(result: ImportResult): DeckModel {
  return {
    kind: "pptx",
    sessionId: result.sessionId,
    fileName: result.fileName,
    candidate: null,
    slides: result.slides.map((slide) => {
      const id = `slide-${slide.page}`;
      const first = slide.objects[0]?.text ?? `第 ${slide.page} 页`;
      return {
        id,
        page: slide.page,
        kicker: `${slide.objects.length} 个文本框`,
        fallbackTitle: first,
        evidenceSummary: "无依据",
        objects: slide.objects.map((object) => ({
          shapeId: object.shapeId,
          sourceRef: object.sourceRef,
          name: object.name,
        })),
        evidence: [],
        currentVersionId: `${id}-v1`,
        versions: [
          {
            id: `${id}-v1`,
            label: "v1 · 原稿",
            svg: slide.svg,
            note: "PPT-Master 导入的原稿。",
            pptxFile: "original",
          },
        ],
      };
    }),
  };
}

export function importNote(result: ImportResult): string {
  const page2 = result.slides.find((slide) => slide.page === 2);
  const parts = [
    `已导入 ${result.fileName}。PPT-Master pptx_to_svg.py --roundtrip 完成，提交 ${result.upstream.commit}。没有调用模型。`,
  ];
  if (!result.upstream.matchesPin) {
    parts.push(`锁定的提交是 ${result.upstream.pinnedCommit}，当前检出不一致。`);
  }
  if (page2) {
    const groups = new Map<string, typeof page2.objects>();
    for (const object of page2.objects) {
      const list = groups.get(object.text) ?? [];
      list.push(object);
      groups.set(object.text, list);
    }
    const twins = [...groups.values()].filter((list) => list.length > 1);
    if (twins.length > 0) {
      const described = twins
        .map((list) =>
          `「${list[0]?.text ?? ""}」对应 ${list
            .map((object) => `形状 ${object.shapeId}${object.name ? `（${object.name}）` : ""}`)
            .join(" 与 ")}`,
        )
        .join("；");
      parts.push(`第 2 页有文字相同、形状编号不同的文本框：${described}。点选时用页码和形状编号。`);
    }
  }
  return parts.join("");
}
