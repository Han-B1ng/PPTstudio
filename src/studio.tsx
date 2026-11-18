import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createInitialDeck } from "./deck/sampleDeck";
import {
  acceptCandidate,
  currentVersion,
  proposeTitleChange,
  rejectCandidate,
  slideById,
} from "./lib/deckState";
import { readTitleText } from "./lib/rewriteTitle";
import type { ChatMessage, DeckModel, TabId } from "./types";

export type ThemeName = "dark" | "light";
export type CompareMode = "side" | "overlay";

type Studio = {
  theme: ThemeName;
  view: "board" | "workspace";
  sidebarOpen: boolean;
  tab: TabId;
  pageId: string;
  selected: "title" | null;
  compareMode: CompareMode;
  inspectVersionId: string | null;
  openEvidenceId: string | null;
  titleDraft: string;
  chat: ChatMessage[];
  deck: DeckModel;
  statusLine: string;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setView: (view: "board" | "workspace") => void;
  setTab: (tab: TabId) => void;
  openPage: (pageId: string) => void;
  goToPage: (pageId: string) => void;
  selectTitle: () => void;
  clearSelection: () => void;
  setTitleDraft: (value: string) => void;
  setCompareMode: (mode: CompareMode) => void;
  setOpenEvidenceId: (id: string | null) => void;
  openVersion: (versionId: string) => void;
  closeInspect: () => void;
  localEdit: () => void;
  reject: () => void;
  accept: () => void;
};

const StudioContext = createContext<Studio | null>(null);

const INITIAL_CHAT: ChatMessage[] = [
  {
    id: "m0",
    role: "note",
    text: "这是本地演示对话，不连接 Codex，也不调用 PPT-Master。局部修改只会替换已选中标题的文字，并生成一份待确认候选。点「采纳」之前，当前版本保持不变。",
  },
];

export function StudioProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [view, setView] = useState<"board" | "workspace">("board");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<TabId>("chat");
  const [pageId, setPageId] = useState("p1");
  const [selected, setSelected] = useState<"title" | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>("side");
  const [inspectVersionId, setInspectVersionId] = useState<string | null>(null);
  const [openEvidenceId, setOpenEvidenceId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [deck, setDeck] = useState<DeckModel>(() => createInitialDeck());
  const [statusLine, setStatusLine] = useState("工作流没有 PPT-Master 事件，状态保持为模拟 / 未知。");
  const seq = useRef(1);

  const pushChat = (role: ChatMessage["role"], text: string) => {
    const id = `m${seq.current}`;
    seq.current += 1;
    setChat((prev) => [...prev, { id, role, text }]);
  };

  const focusPage = (nextPageId: string) => {
    setPageId(nextPageId);
    setSelected(null);
    setInspectVersionId(null);
    setOpenEvidenceId(null);
  };

  const value = useMemo<Studio>(() => {
    const localEdit = () => {
      const page = slideById(deck, pageId);
      const svg = currentVersion(page).svg;
      const title = titleDraft.replace(/\s+/g, " ").trim();
      if (selected !== "title") {
        setStatusLine("请先在页面上点击标题。");
        return;
      }
      if (inspectVersionId) {
        setStatusLine("正在回看历史版本。回到当前版本后再做局部修改。");
        return;
      }
      if (!title) {
        setStatusLine("请输入新的标题。");
        return;
      }
      if (readTitleText(svg) === title) {
        setStatusLine("这和当前标题一样。");
        return;
      }
      try {
        const next = proposeTitleChange(deck, pageId, title);
        setDeck(next);
        pushChat("user", `第 ${page.page} 页，把标题改为「${title}」。路径：局部修改。`);
        pushChat(
          "note",
          "模拟执行已生成候选，只替换了选中标题的文字。当前版本还没改。请对照后采纳或退回。未调用 Codex，也未调用 PPT-Master。",
        );
        setStatusLine("已生成候选。当前版本未改，等待采纳或退回。");
        setInspectVersionId(null);
        setCompareMode("side");
      } catch (error) {
        setStatusLine(error instanceof Error ? error.message : "未能生成候选");
      }
    };

    const reject = () => {
      if (!deck.candidate) return;
      setDeck((current) => rejectCandidate(current));
      pushChat("note", "已退回。候选丢弃，当前版本和缩略图都保持原样。");
      setStatusLine("已退回。当前版本保持不变。");
    };

    const accept = () => {
      if (!deck.candidate) return;
      const title = deck.candidate.title;
      const pageNumber = slideById(deck, deck.candidate.pageId).page;
      setDeck((current) => acceptCandidate(current));
      pushChat(
        "note",
        `已采纳第 ${pageNumber} 页的标题「${title}」。只替换了标题文字。原稿仍可在版本里打开。`,
      );
      setStatusLine("已采纳。当前页换成新版本，旧版本留在版本记录里。");
      setInspectVersionId(null);
      setTitleDraft("");
    };

    return {
      theme,
      view,
      sidebarOpen,
      tab,
      pageId,
      selected,
      compareMode,
      inspectVersionId,
      openEvidenceId,
      titleDraft,
      chat,
      deck,
      statusLine,
      toggleTheme: () => setTheme((item) => (item === "dark" ? "light" : "dark")),
      toggleSidebar: () => setSidebarOpen((item) => !item),
      setView,
      setTab,
      openPage: (nextPageId: string) => {
        focusPage(nextPageId);
        setView("workspace");
      },
      goToPage: focusPage,
      selectTitle: () => setSelected("title"),
      clearSelection: () => setSelected(null),
      setTitleDraft,
      setCompareMode,
      setOpenEvidenceId,
      openVersion: (versionId: string) => {
        const page = slideById(deck, pageId);
        if (!page.versions.some((item) => item.id === versionId)) return;
        if (versionId === page.currentVersionId) {
          setInspectVersionId(null);
          setStatusLine("已回到当前版本。");
          return;
        }
        setInspectVersionId(versionId);
        setTab("versions");
        setStatusLine("正在回看历史版本。当前版本没有被替换。");
      },
      closeInspect: () => {
        setInspectVersionId(null);
        setStatusLine("已回到当前版本。");
      },
      localEdit,
      reject,
      accept,
    };
  }, [
    theme,
    view,
    sidebarOpen,
    tab,
    pageId,
    selected,
    compareMode,
    inspectVersionId,
    openEvidenceId,
    titleDraft,
    chat,
    deck,
    statusLine,
  ]);

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): Studio {
  const studio = useContext(StudioContext);
  if (!studio) throw new Error("Studio context missing");
  return studio;
}
