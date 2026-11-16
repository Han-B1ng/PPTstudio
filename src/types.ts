export type EvidenceGrade = "已验证" | "Agent 自述" | "推断" | "未知";

export type EvidenceRecord = {
  id: string;
  grade: EvidenceGrade;
  title: string;
  kind: string;
  note: string | null;
  /** Null means there is no manuscript or asset to open. */
  excerpt: string | null;
};

export type VersionRecord = {
  id: string;
  label: string;
  svg: string;
  note: string;
  /** Server download token. Null on the SVG demo, which has no PPTX. */
  pptxFile: string | null;
};

export type SlideObject = {
  shapeId: string;
  sourceRef: string;
  name: string | null;
};

export type SlideRecord = {
  id: string;
  page: number;
  kicker: string;
  fallbackTitle: string;
  evidenceSummary: string;
  versions: VersionRecord[];
  currentVersionId: string;
  evidence: EvidenceRecord[];
  objects: SlideObject[];
};

export type Candidate = {
  pageId: string;
  svg: string;
  title: string;
  baseVersionId: string;
  /** Null on the SVG demo, where the only target is the title element. */
  shapeId: string | null;
};

export type DeckKind = "svg-demo" | "pptx";

export type DeckModel = {
  kind: DeckKind;
  sessionId: string | null;
  fileName: string | null;
  slides: SlideRecord[];
  candidate: Candidate | null;
};

export type TabId = "chat" | "evidence" | "versions";

export type ChatMessage = {
  id: string;
  role: "user" | "note";
  text: string;
};
