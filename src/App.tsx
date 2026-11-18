import { BoardView } from "./components/BoardView";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { WorkspaceView } from "./components/WorkspaceView";
import { StudioProvider, useStudio } from "./studio";

export function App() {
  return (
    <StudioProvider>
      <Shell />
    </StudioProvider>
  );
}

function Shell() {
  const studio = useStudio();
  return (
    <div className="app" data-theme={studio.theme}>
      <TopBar />
      {studio.lastError ? (
        <div className="error-banner" role="alert" data-testid="error-banner">
          <pre>{studio.lastError}</pre>
          <button type="button" onClick={studio.dismissError}>
            收起
          </button>
        </div>
      ) : null}
      <div className="shell">
        <main className="canvas">{studio.view === "board" ? <BoardView /> : <WorkspaceView />}</main>
        {studio.sidebarOpen ? <Sidebar /> : null}
      </div>
    </div>
  );
}
