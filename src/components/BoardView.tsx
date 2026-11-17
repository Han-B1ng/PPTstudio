import { currentVersion } from "../lib/deckState";
import { slideCaption } from "../lib/slideCaption";
import { useStudio } from "../studio";
import { SlideSvg } from "./SlideSvg";

export function BoardView() {
  const studio = useStudio();
  return (
    <section className="board" data-testid="board">
      <header className="view-head">
        <p className="eyebrow">Presentation Board</p>
        <h1>演示画板</h1>
        <p className="lede">
          {studio.deck.kind === "pptx"
            ? "缩略图来自 PPT-Master 的 flat authoring SVG。点一页进入工作区，再点文本框。"
            : "按页序看这三页短报。缩略图就是 SVG 本身。点一页进入工作区，不另开窗口。"}
        </p>
      </header>
      <ol className="board-list">
        {studio.deck.slides.map((slide) => {
          const svg = currentVersion(slide).svg;
          const title = slideCaption(slide, svg);
          const pending = studio.deck.candidate?.pageId === slide.id;
          return (
            <li key={slide.id} className={slide.id === studio.pageId ? "is-current" : ""}>
              <div className="board-meta">
                <span className="page-index">{String(slide.page).padStart(2, "0")}</span>
                <span className="kicker">{slide.kicker}</span>
              </div>
              <button
                type="button"
                className="thumb-button"
                data-testid={`thumb-${slide.page}`}
                onClick={() => studio.openPage(slide.id)}
              >
                <SlideSvg
                  svg={svg}
                  label={`第 ${slide.page} 页 ${title}`}
                  sanitize={studio.deck.kind === "pptx"}
                  testId={`thumb-svg-${slide.page}`}
                />
                <span className="thumb-caption">
                  <span className="thumb-title" data-testid={`thumb-title-${slide.page}`}>
                    {title}
                  </span>
                  <span className="thumb-chips">
                    <span className="chip">{studio.deck.kind === "pptx" ? "PPTX" : "SVG"}</span>
                    <span className="chip" data-testid={`thumb-evidence-${slide.page}`}>
                      {slide.evidenceSummary}
                    </span>
                    {pending ? <span className="chip chip-pending">待确认</span> : null}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
