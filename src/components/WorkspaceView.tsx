import { currentVersion, slideById } from "../lib/deckState";
import { readShapeText } from "../lib/replaceShapeText";
import { readTitleText } from "../lib/rewriteTitle";
import { slideCaption } from "../lib/slideCaption";
import { useStudio } from "../studio";
import { SlideSvg } from "./SlideSvg";

export function WorkspaceView() {
  const studio = useStudio();
  const page = slideById(studio.deck, studio.pageId);
  const version = currentVersion(page);
  const native = studio.deck.kind === "pptx";
  const shapeId = studio.selected?.kind === "shape" ? studio.selected.shapeId : null;
  const currentTitle = native
    ? (shapeId ? readShapeText(version.svg, shapeId) : null) ?? slideCaption(page, version.svg)
    : readTitleText(version.svg) ?? page.fallbackTitle;
  const candidate = studio.deck.candidate?.pageId === page.id ? studio.deck.candidate : null;
  const pendingElsewhere =
    studio.deck.candidate && studio.deck.candidate.pageId !== page.id
      ? studio.deck.candidate
      : null;
  const inspected = page.versions.find((item) => item.id === studio.inspectVersionId) ?? null;
  const showCompare = Boolean(candidate);
  const shownSvg = !showCompare && inspected ? inspected.svg : version.svg;
  const shownTitle = native
    ? slideCaption(page, shownSvg)
    : readTitleText(shownSvg) ?? page.fallbackTitle;
  const shapeIds = page.objects.map((item) => item.shapeId);

  return (
    <section className="workspace" data-testid="workspace">
      <header className="view-head workspace-head">
        <div>
          <p className="eyebrow">Slide Workspace</p>
          <h1>幻灯片工作区</h1>
        </div>
        <div className="workspace-nav">
          <button type="button" data-testid="back-to-board" onClick={() => studio.setView("board")}>
            返回画板
          </button>
          <nav className="page-switch" aria-label="切换页面">
            {studio.deck.slides.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`goto-${item.page}`}
                aria-current={item.id === page.id ? "page" : undefined}
                className={item.id === page.id ? "is-active" : ""}
                onClick={() => studio.goToPage(item.id)}
              >
                {String(item.page).padStart(2, "0")}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="badge-row" data-testid="badges">
        {native ? (
          <>
            <span className="badge badge-sim">确定性文本替换</span>
            <span className="badge badge-svg">PPT-Master round-trip</span>
            <span className="badge badge-pptx" data-testid="pptx-badge">
              {studio.latestPptxFile ? "PPTX 已导出" : "PPTX 尚未导出"}
            </span>
          </>
        ) : (
          <>
            <span className="badge badge-sim">模拟执行</span>
            <span className="badge badge-svg">SVG 编辑预览</span>
            <span className="badge badge-pptx" data-testid="pptx-badge">
              PPTX 交付预览 · 不可用
            </span>
          </>
        )}
      </div>
      <p className="disclaimer">
        {native
          ? "候选只改选中文本框的文字。采纳时才运行 svg_to_pptx.py --roundtrip。没有调用模型。"
          : "仅编辑预览，尚未验证交付。SVG 渲染成功不代表 PPTX 合格。"}
      </p>

      {pendingElsewhere ? (
        <div className="banner" role="status">
          <span>
            第 {slideById(studio.deck, pendingElsewhere.pageId).page} 页还有未决定的候选。这一页没有被改写。
          </span>
          <button type="button" onClick={() => studio.goToPage(pendingElsewhere.pageId)}>
            回到对照
          </button>
        </div>
      ) : null}

      {showCompare && candidate ? (
        <div className="compare" data-testid="compare">
          <div className="compare-bar">
            <div>
              <p className="eyebrow">对照</p>
              <p className="compare-note">未自动采纳。左侧是当前版本，右侧才是候选。</p>
            </div>
            <div className="segmented" role="group" aria-label="对照方式">
              <button
                type="button"
                data-testid="compare-side"
                className={studio.compareMode === "side" ? "is-active" : ""}
                aria-pressed={studio.compareMode === "side"}
                onClick={() => studio.setCompareMode("side")}
              >
                并排
              </button>
              <button
                type="button"
                data-testid="compare-overlay"
                className={studio.compareMode === "overlay" ? "is-active" : ""}
                aria-pressed={studio.compareMode === "overlay"}
                onClick={() => studio.setCompareMode("overlay")}
              >
                叠加
              </button>
            </div>
            <div className="decision">
              <button type="button" className="btn-ghost" data-testid="reject" onClick={studio.reject} disabled={studio.busy !== null}>
                退回
              </button>
              <button type="button" className="btn-primary" data-testid="accept" onClick={studio.accept} disabled={studio.busy !== null}>
                {studio.busy === "export" ? "正在导出…" : "采纳"}
              </button>
            </div>
          </div>
          {studio.compareMode === "side" ? (
            <div className="compare-grid">
              <figure>
                <figcaption>
                  <span>当前版本</span>
                  <strong data-testid="compare-current-title">{currentTitle}</strong>
                </figcaption>
                <SlideSvg svg={version.svg} label={`当前版本 ${currentTitle}`} testId="compare-current" />
              </figure>
              <figure>
                <figcaption>
                  <span>{native ? "候选 · 确定性替换" : "候选 · 模拟执行"}</span>
                  <strong data-testid="compare-candidate-title">{candidate.title}</strong>
                </figcaption>
                <SlideSvg svg={candidate.svg} label={`候选 ${candidate.title}`} testId="compare-candidate" />
              </figure>
            </div>
          ) : (
            <div className="overlay-stage">
              <SlideSvg svg={version.svg} label={`当前版本 ${currentTitle}`} testId="overlay-current" />
              <div className="overlay-candidate">
                <SlideSvg svg={candidate.svg} label={`候选 ${candidate.title}`} testId="overlay-candidate" />
              </div>
              <p className="overlay-caption">候选以半透明叠在当前版本上。默认对照仍是并排。</p>
            </div>
          )}
          <p className="compare-footnote">
            {native
              ? "这次候选只改选中的文本框，按页码和形状编号定位。另一处相同文字不会改。采纳前不会写 PPTX。"
              : "这次候选只改标题文字。正文、数字和图表应保持原样。第 1 页和第 3 页不在本次范围内。"}
          </p>
        </div>
      ) : (
        <div className="single-stage">
          {inspected ? (
            <div className="banner" role="status">
              <span>
                正在回看 {inspected.label}。当前版本仍是「{currentTitle}」，没有被替换。
              </span>
              <button type="button" data-testid="close-inspect" onClick={studio.closeInspect}>
                回到当前版本
              </button>
            </div>
          ) : null}
          <p className="stage-kicker">
            第 {page.page} 页 · {inspected ? inspected.label : version.label}
          </p>
          <SlideSvg
            svg={shownSvg}
            label={`第 ${page.page} 页 ${shownTitle}`}
            interactive={!inspected}
            interactiveMode={native ? "shape" : "title"}
            selectedTitle={studio.selected?.kind === "title" && !inspected}
            selectedShapeId={studio.selected?.kind === "shape" && !inspected ? studio.selected.shapeId : null}
            selectableShapeIds={shapeIds}
            onSelectTitle={studio.selectTitle}
            onSelectShape={studio.selectShape}
            onClearSelection={studio.clearSelection}
            testId="slide-stage"
          />
          <p className="stage-hint">
            {native
              ? "点击文本框即可选中。选中后按形状编号替换这一框的文字。"
              : page.id === "p2"
                ? "点击标题即可选中。选中后只在侧栏里改这一行字。"
                : "这一页没有可局部改写的标题元素。请回到第 2 页演示局部修改。"}
          </p>
        </div>
      )}
      <p className="status-line" role="status" data-testid="status-line">
        {studio.statusLine}
      </p>
    </section>
  );
}
