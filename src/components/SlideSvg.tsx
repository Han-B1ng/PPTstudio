import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type Halo = { left: number; top: number; width: number; height: number };

type SlideSvgProps = {
  svg: string;
  label: string;
  interactive?: boolean;
  selected?: boolean;
  onSelectTitle?: () => void;
  onClearSelection?: () => void;
  testId?: string;
};

export function SlideSvg({
  svg,
  label,
  interactive = false,
  selected = false,
  onSelectTitle,
  onClearSelection,
  testId,
}: SlideSvgProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [halo, setHalo] = useState<Halo | null>(null);

  const measure = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || !selected) {
      setHalo(null);
      return;
    }
    const text = frame.querySelector("[data-element='title']");
    if (!text) {
      setHalo(null);
      return;
    }
    const frameBox = frame.getBoundingClientRect();
    const textBox = text.getBoundingClientRect();
    const pad = 8;
    setHalo({
      left: textBox.left - frameBox.left - pad,
      top: textBox.top - frameBox.top - pad,
      width: textBox.width + pad * 2,
      height: textBox.height + pad * 2,
    });
  }, [selected, svg]);

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
        dangerouslySetInnerHTML={{ __html: svg }}
        onClick={
          interactive
            ? (event) => {
                const target = event.target;
                if (!(target instanceof Element)) return;
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
          <span>标题</span>
        </div>
      ) : null}
    </div>
  );
}
