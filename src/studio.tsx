import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createInitialDeck } from "./deck/sampleDeck";
import { deckFromImport, importNote } from "./lib/nativeDeck";
import {
  acceptCandidate,
  currentVersion,
  proposeShapeCandidate,
  proposeTitleChange,
  rejectCandidate,
  slideById,
} from "./lib/deckState";
import { acceptShape, importPptxFile, importSamplePptx, previewShape } from "./lib/pptxApi";
import { readShapeText } from "./lib/replaceShapeText";
import { readTitleText } from "./lib/rewriteTitle";
import type { ChatMessage, DeckModel, TabId } from "./types";

export type ThemeName = "dark" | "light";
export type CompareMode = "side" | "overlay";
export type Selection = { kind: "title" } | { kind: "shape"; shapeId: string } | null;
export type Busy = "import" | "preview" | "export" | null;

type Studio = {
  theme: ThemeName;
  view: "board" | "workspace";
  sidebarOpen: boolean;
  tab: TabId;
  pageId: string;
  selected: Selection;
  compareMode: CompareMode;
  inspectVersionId: string | null;
  openEvidenceId: string | null;
  titleDraft: string;
  chat: ChatMessage[];
  deck: DeckModel;
  statusLine: string;
  lastError: string | null;
  busy: Busy;
  latestPptxFile: string | null;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setView: (view: "board" | "workspace") => void;
  setTab: (tab: TabId) => void;
  openPage: (pageId: string) => void;
  goToPage: (pageId: string) => void;
  selectTitle: () => void;
  selectShape: (shapeId: string) => void;
  clearSelection: () => void;
  setTitleDraft: (value: string) => void;
  setCompareMode: (mode: CompareMode) => void;
  setOpenEvidenceId: (id: string | null) => void;
  openVersion: (versionId: string) => void;
  closeInspect: () => void;
  dismissError: () => void;
  importFile: (file: File) => void;
  importSample: () => void;
  openSvgDemo: () => void;
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

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function StudioProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>("dark");
  const [view, setView] = useState<"board" | "workspace">("board");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tab, setTab] = useState<TabId>("chat");
  const [pageId, setPageId] = useState("p1");
  const [selected, setSelected] = useState<Selection>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>("side");
  const [inspectVersionId, setInspectVersionId] = useState<string | null>(null);
  const [openEvidenceId, setOpenEvidenceId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [deck, setDeck] = useState<DeckModel>(() => createInitialDeck());
  const [statusLine, setStatusLine] = useState("工作流没有 PPT-Master 事件，状态保持为模拟 / 未知。");
  const [lastError, setLastError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [latestPptxFile, setLatestPptxFile] = useState<string | null>(null);
  const seq = useRef(1);
  const request = useRef(0);

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
    const openSvgDemo = () => {
      request.current += 1;
      setDeck(createInitialDeck());
      setChat(INITIAL_CHAT);
      seq.current = 1;
      setPageId("p1");
      setSelected(null);
      setView("board");
      setTab("chat");
      setInspectVersionId(null);
      setOpenEvidenceId(null);
      setTitleDraft("");
      setLatestPptxFile(null);
      setBusy(null);
      setLastError(null);
      setStatusLine("已回到 SVG 演示。这一支不导出 PPTX。");
    };

    const takeImport = async (load: () => Promise<Awaited<ReturnType<typeof importSamplePptx>>>) => {
      const token = ++request.current;
      setBusy("import");
      setLastError(null);
      setStatusLine("正在用 PPT-Master 导入 PPTX。");
      try {
        const result = await load();
        if (token !== request.current) return;
        const next = deckFromImport(result);
        setDeck(next);
        setChat([{ id: "m0", role: "note", text: importNote(result) }]);
        seq.current = 1;
        setPageId(next.slides[0]?.id ?? "slide-1");
        setSelected(null);
        setView("board");
        setTab("chat");
        setInspectVersionId(null);
        setOpenEvidenceId(null);
        setTitleDraft("");
        setLatestPptxFile(null);
        const short = result.upstream.commit.slice(0, 12);
        setStatusLine(
          result.upstream.matchesPin
            ? `已导入。PPT-Master ${short}。没有调用模型。`
            : `已导入。PPT-Master ${short}，与锁定提交不一致。`,
        );
      } catch (error) {
        if (token !== request.current) return;
        const message = messageFrom(error, "导入失败");
        setLastError(message);
        setStatusLine(message);
      } finally {
        if (token === request.current) setBusy(null);
      }
    };

    const previewNative = async () => {
      if (deck.kind !== "pptx" || !deck.sessionId) return;
      const page = slideById(deck, pageId);
      if (selected?.kind !== "shape") {
        setStatusLine("请先在页面上点击一个文本框。");
        return;
      }
      if (inspectVersionId) {
        setStatusLine("正在回看历史版本。回到当前版本后再做局部修改。");
        return;
      }
      const shape = page.objects.find((item) => item.shapeId === selected.shapeId);
      if (!shape) {
        setStatusLine(`这一页没有形状 ${selected.shapeId}。`);
        return;
      }
      const previousText = readShapeText(currentVersion(page).svg, shape.shapeId);
      const title = titleDraft.replace(/\s+/g, " ").trim();
      if (!title) {
        setStatusLine("请输入新的文字。");
        return;
      }
      if (previousText === title) {
        setStatusLine("这和当前文字一样。");
        return;
      }
      const token = ++request.current;
      setBusy("preview");
      setLastError(null);
      try {
        const result = await previewShape({
          sessionId: deck.sessionId,
          page: page.page,
          shapeId: shape.shapeId,
          text: title,
          previousText: previousText ?? "",
        });
        if (token !== request.current) return;
        setDeck(proposeShapeCandidate(deck, page.id, shape.shapeId, result.svg, result.text));
        const name = shape.name ? `（${shape.name}）` : "";
        pushChat(
          "user",
          `第 ${page.page} 页，形状 ${shape.shapeId}${name}，把文字改为「${result.text}」。路径：局部修改。`,
        );
        pushChat(
          "note",
          "候选只替换了这个形状的文字，按页码和形状编号定位。当前版本还没改，也还没有导出 PPTX。没有调用模型。",
        );
        setStatusLine("已生成候选。当前版本未改，等待采纳或退回。");
        setCompareMode("side");
        setInspectVersionId(null);
      } catch (error) {
        if (token !== request.current) return;
        const message = messageFrom(error, "未能生成候选");
        setLastError(message);
        setStatusLine(message);
      } finally {
        if (token === request.current) setBusy(null);
      }
    };

    const acceptNative = async () => {
      const candidate = deck.candidate;
      const shapeId = candidate?.shapeId;
      if (deck.kind !== "pptx" || !deck.sessionId || !candidate || !shapeId) return;
      const page = slideById(deck, candidate.pageId);
      const base = page.versions.find((item) => item.id === candidate.baseVersionId);
      const previousText = base ? readShapeText(base.svg, shapeId) : null;
      if (!previousText) {
        setStatusLine("找不到候选所基于的原稿文字。");
        return;
      }
      const token = ++request.current;
      setBusy("export");
      setLastError(null);
      setStatusLine("正在把选中文本框的 a:t 写回上一份已采纳的 PPTX。");
      try {
        const result = await acceptShape({
          sessionId: deck.sessionId,
          page: page.page,
          shapeId,
          text: candidate.title,
          previousText,
        });
        if (token !== request.current) return;
        setDeck((current) => {
          if (!current.candidate) return current;
          return acceptCandidate(
            {
              ...current,
              candidate: { ...current.candidate, svg: result.svg, title: result.text },
            },
            result.file,
          );
        });
        setLatestPptxFile(result.file);
        pushChat(
          "note",
          `已采纳第 ${page.page} 页形状 ${candidate.shapeId} 的文字「${result.text}」。${result.summary} 预览来自 PPT-Master 导入的 SVG，写回是 OOXML 文本补丁。没有调用模型。原稿仍可在版本里打开。`,
        );
        setStatusLine(result.summary);
        setInspectVersionId(null);
        setTitleDraft("");
      } catch (error) {
        if (token !== request.current) return;
        const message = messageFrom(error, "导出失败");
        setLastError(message);
        setStatusLine(message);
      } finally {
        if (token === request.current) setBusy(null);
      }
    };

    const localEdit = () => {
      if (busy) return;
      if (deck.kind === "pptx") {
        void previewNative();
        return;
      }
      const page = slideById(deck, pageId);
      const svg = currentVersion(page).svg;
      const title = titleDraft.replace(/\s+/g, " ").trim();
      if (selected?.kind !== "title") {
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
        const message = messageFrom(error, "未能生成候选");
        setLastError(message);
        setStatusLine(message);
      }
    };

    const reject = () => {
      if (!deck.candidate) return;
      request.current += 1;
      setBusy(null);
      setDeck((current) => rejectCandidate(current));
      pushChat(
        "note",
        deck.kind === "pptx"
          ? "已退回。候选丢弃，没有导出 PPTX。当前版本和缩略图保持原样。"
          : "已退回。候选丢弃，当前版本和缩略图都保持原样。",
      );
      setStatusLine("已退回。当前版本保持不变。");
    };

    const accept = () => {
      if (!deck.candidate) return;
      if (deck.kind === "pptx") {
        void acceptNative();
        return;
      }
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
      lastError,
      busy,
      latestPptxFile,
      toggleTheme: () => setTheme((item) => (item === "dark" ? "light" : "dark")),
      toggleSidebar: () => setSidebarOpen((item) => !item),
      setView,
      setTab,
      openPage: (nextPageId: string) => {
        focusPage(nextPageId);
        setView("workspace");
      },
      goToPage: focusPage,
      selectTitle: () => setSelected({ kind: "title" }),
      selectShape: (shapeId: string) => {
        const page = slideById(deck, pageId);
        const shape = page.objects.find((item) => item.shapeId === shapeId);
        if (!shape) {
          setSelected(null);
          setStatusLine("这个形状没有可替换的单段文本。");
          return;
        }
        setSelected({ kind: "shape", shapeId });
        const name = shape.name ? ` · ${shape.name}` : "";
        setStatusLine(`已选中第 ${page.page} 页形状 ${shapeId}${name}。`);
      },
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
      dismissError: () => setLastError(null),
      importFile: (file: File) => {
        void takeImport(() => importPptxFile(file));
      },
      importSample: () => {
        void takeImport(() => importSamplePptx());
      },
      openSvgDemo,
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
    lastError,
    busy,
    latestPptxFile,
  ]);

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio(): Studio {
  const studio = useContext(StudioContext);
  if (!studio) throw new Error("Studio context missing");
  return studio;
}
