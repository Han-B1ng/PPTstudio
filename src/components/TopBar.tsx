import { downloadUrl } from "../lib/pptxApi";
import { useStudio } from "../studio";

export function TopBar() {
  const studio = useStudio();
  const native = studio.deck.kind === "pptx";
  const download =
    native && studio.deck.sessionId && studio.latestPptxFile
      ? downloadUrl(studio.deck.sessionId, studio.latestPptxFile)
      : null;
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <p className="brand-name">{native ? studio.deck.fileName ?? "PPTX" : "星河零售 2026 Q3"}</p>
          <p className="brand-sub">PPT Studio · {native ? "原生 PPTX 回合" : "SVG 演示"}</p>
        </div>
      </div>
      <div className="source-switch">
        <button type="button" data-testid="open-svg-demo" onClick={studio.openSvgDemo} disabled={studio.busy !== null}>
          SVG 演示
        </button>
        <label className={`file-btn${studio.busy ? " is-disabled" : ""}`}>
          导入 PPTX
          <input
            type="file"
            accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            data-testid="import-file"
            disabled={studio.busy !== null}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) studio.importFile(file);
            }}
          />
        </label>
        <button
          type="button"
          data-testid="import-sample"
          onClick={studio.importSample}
          disabled={studio.busy !== null}
        >
          样例 PPTX
        </button>
      </div>
      <div className="view-switch" role="group" aria-label="浏览层级">
        <button
          type="button"
          data-testid="nav-board"
          aria-pressed={studio.view === "board"}
          className={studio.view === "board" ? "is-active" : ""}
          onClick={() => studio.setView("board")}
        >
          画板
        </button>
        <button
          type="button"
          data-testid="nav-workspace"
          aria-pressed={studio.view === "workspace"}
          className={studio.view === "workspace" ? "is-active" : ""}
          onClick={() => studio.setView("workspace")}
        >
          工作区
        </button>
      </div>
      <p
        className="status-pill"
        data-testid="workflow-status"
        title={native ? "PPT-Master 只做导入和导出，文字替换是确定性的" : "没有 PPT-Master 事实事件，不显示虚构进度"}
      >
        <span className="status-dot" aria-hidden="true" />
        {native ? "工作流 · PPT-Master round-trip / 无模型" : "工作流 · 模拟 / 未知"}
      </p>
      <div className="top-actions">
        {download ? (
          <a className="btn-primary download-link" data-testid="download-pptx" href={download}>
            下载 PPTX
          </a>
        ) : null}
        <button type="button" onClick={studio.toggleTheme}>
          {studio.theme === "dark" ? "浅色" : "深色"}
        </button>
        <button type="button" data-testid="toggle-sidebar" onClick={studio.toggleSidebar}>
          {studio.sidebarOpen ? "折叠侧栏" : "展开侧栏"}
        </button>
      </div>
    </header>
  );
}
