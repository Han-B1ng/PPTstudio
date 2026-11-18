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
      <div className="shell">
        <main className="canvas">{studio.view === "board" ? <BoardView /> : <WorkspaceView />}</main>
        {studio.sidebarOpen ? <Sidebar /> : null}
      </div>
    </div>
  );
}
