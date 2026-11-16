import { useStudio } from "../studio";

export function TopBar() {
  const studio = useStudio();
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true" />
        <div>
          <p className="brand-name">星河零售 2026 Q3</p>
          <p className="brand-sub">PPT Studio · 本地视觉工作台</p>
        </div>
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
      <p className="status-pill" data-testid="workflow-status" title="没有 PPT-Master 事实事件，不显示虚构进度">
        <span className="status-dot" aria-hidden="true" />
        工作流 · 模拟 / 未知
      </p>
      <div className="top-actions">
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
