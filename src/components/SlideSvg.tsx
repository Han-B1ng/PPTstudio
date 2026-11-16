import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { withHitTargets } from "../lib/replaceShapeText";

type Halo = { left: number; top: number; width: number; height: number };

type SlideSvgProps = {
  svg: string;
  label: string;
  interactive?: boolean;
  interactiveMode?: "title" | "shape";
  selectedTitle?: boolean;
  selectedShapeId?: string | null;
  selectableShapeIds?: readonly string[];
  onSelectTitle?: () => void;
  onSelectShape?: (shapeId: string) => void;
  onClearSelection?: () => void;
  testId?: string;
};

export function SlideSvg({
  svg,
  label,
  interactive = false,
  interactiveMode = "title",
  selectedTitle = false,
  selectedShapeId = null,
  selectableShapeIds = [],
  onSelectTitle,
  onSelectShape,
  onClearSelection,
  testId,
}: SlideSvgProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [halo, setHalo] = useState<Halo | null>(null);
  const rendered = useMemo(
    () =>
      interactive && interactiveMode === "shape" ? withHitTargets(svg, selectableShapeIds) : svg,
    [interactive, interactiveMode, selectableShapeIds, svg],
  );
  const selected = interactiveMode === "shape" ? Boolean(selectedShapeId) : selectedTitle;

  const measure = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || !selected) {
      setHalo(null);
      return;
    }
    const target =
      interactiveMode === "shape" && selectedShapeId
        ? frame.querySelector(`[data-pptx-source-ref="slide:${selectedShapeId}"]`)
        : frame.querySelector("[data-element='title']");
    if (!target) {
      setHalo(null);
      return;
    }
    const frameBox = frame.getBoundingClientRect();
    const textBox = target.getBoundingClientRect();
    const pad = 8;
    setHalo({
      left: textBox.left - frameBox.left - pad,
      top: textBox.top - frameBox.top - pad,
      width: textBox.width + pad * 2,
      height: textBox.height + pad * 2,
    });
  }, [interactiveMode, selected, selectedShapeId, rendered]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    const fonts = document.fonts;
    let cancel = false;
    fonts?.ready.then(() => {
      if (!cancel) measure();
    });
    return () => {
      cancel = true;
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return (
    <div
      className={`slide-frame${interactive ? " is-interactive" : ""}${selected ? " is-selected" : ""}`}
      ref={frameRef}
      data-testid={testId}
      role="img"
      aria-label={label}
    >
      <div
        className="slide-svg"
        dangerouslySetInnerHTML={{ __html: rendered }}
        onClick={
          interactive
            ? (event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;
                if (interactiveMode === "shape") {
                  const hit = target.closest("[data-pptx-source-ref]");
                  const ref = hit?.getAttribute("data-pptx-source-ref") ?? "";
                  const shapeId = /^slide:(\d+)$/.exec(ref)?.[1];
                  if (shapeId && selectableShapeIds.includes(shapeId)) onSelectShape?.(shapeId);
                  else onClearSelection?.();
                  return;
                }
                const hit = target.closest("[data-element='title'], [data-element='title-hit']");
                if (hit) onSelectTitle?.();
                else onClearSelection?.();
              }
            : undefined
        }
      />
      {halo ? (
        <div
          className="halo"
          data-testid="title-halo"
          style={{ left: halo.left, top: halo.top, width: halo.width, height: halo.height }}
        >
          <span>{interactiveMode === "shape" && selectedShapeId ? `形状 ${selectedShapeId}` : "标题"}</span>
        </div>
      ) : null}
    </div>
  );
}
