export type ImportedObject = {
  shapeId: string;
  sourceRef: string;
  name: string | null;
  text: string;
};

export type ImportedSlide = {
  page: number;
  svg: string;
  objects: ImportedObject[];
};

export type ImportResult = {
  sessionId: string;
  fileName: string;
  upstream: {
    repo: string;
    commit: string;
    pinnedCommit: string;
    matchesPin: boolean;
  };
  slides: ImportedSlide[];
};

export type PreviewResult = {
  svg: string;
  previousText: string;
  text: string;
  shapeId: string;
  sourceRef: string;
  page: number;
};

export type AcceptResult = PreviewResult & {
  file: string;
  summary: string;
  upstreamCommit: string;
};

async function errorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const body = JSON.parse(text) as { error?: string };
    if (body.error) return body.error;
  } catch {
    /* The service sometimes has nothing but plain text. */
  }
  const trimmed = text.trim();
  return trimmed || `服务返回 ${response.status}`;
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(
      `本地 PPTX 服务没有响应。先在另一个终端运行 npm run pptx-service。${
        error instanceof Error ? error.message : ""
      }`,
    );
  }
  if (!response.ok) throw new Error(await errorMessage(response));
  return (await response.json()) as T;
}

export async function importPptxFile(file: File): Promise<ImportResult> {
  let response: Response;
  try {
    response = await fetch("/api/import", {
      method: "POST",
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "x-filename": encodeURIComponent(file.name),
      },
      body: await file.arrayBuffer(),
    });
  } catch (error) {
    throw new Error(
      `本地 PPTX 服务没有响应。先在另一个终端运行 npm run pptx-service。${
        error instanceof Error ? error.message : ""
      }`,
    );
  }
  if (!response.ok) throw new Error(await errorMessage(response));
  return (await response.json()) as ImportResult;
}

export function importSamplePptx(): Promise<ImportResult> {
  return postJson<ImportResult>("/api/import/sample", {});
}

export function previewShape(input: {
  sessionId: string;
  page: number;
  shapeId: string;
  text: string;
  previousText: string;
}): Promise<PreviewResult> {
  return postJson(`/api/sessions/${input.sessionId}/preview`, input);
}

export function acceptShape(input: {
  sessionId: string;
  page: number;
  shapeId: string;
  text: string;
  previousText: string;
}): Promise<AcceptResult> {
  return postJson(`/api/sessions/${input.sessionId}/accept`, input);
}

export function downloadUrl(sessionId: string, file: string): string {
  return `/api/sessions/${sessionId}/download/${file}`;
}
