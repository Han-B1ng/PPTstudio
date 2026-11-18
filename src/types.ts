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
};

export type Candidate = {
  pageId: string;
  svg: string;
  title: string;
  baseVersionId: string;
};

export type DeckModel = {
  slides: SlideRecord[];
  candidate: Candidate | null;
};

export type TabId = "chat" | "evidence" | "versions";

export type ChatMessage = {
  id: string;
  role: "user" | "note";
  text: string;
};
