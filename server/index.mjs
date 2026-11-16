/**
 * Local PPTX round-trip service.
 *
 * Import:  PPT-Master pptx_to_svg.py --roundtrip
 * Preview: deterministic text replace of one shape (page id + shape id)
 * Accept:  PPT-Master svg_to_pptx.py --roundtrip
 *
 * No model calls. Failures are returned as the process stderr/stdout.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listTextObjects, replaceShapeText } from "../src/lib/replaceShapeText.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const upstream = JSON.parse(await fs.readFile(path.join(repoRoot, "server/upstream.json"), "utf8"));
const port = Number(process.env.PORT || 8787);
const python = process.env.PYTHON || "python3";
const sessionsRoot = path.join(repoRoot, "var/sessions");
const samplePath = path.join(repoRoot, "samples/xinghe-retail-q3.pptx");
const maxBytes = 32 * 1024 * 1024;

const locks = new Map();

function pptMasterRoot() {
  const candidates = [
    process.env.PPT_MASTER_ROOT,
    path.join(repoRoot, "..", "ppt-master"),
    "/tmp/ppt-master",
    path.join(os.homedir(), "ppt-master"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    const script = path.join(candidate, "skills/ppt-master/scripts/pptx_to_svg.py");
    if (fsSyncExists(script)) return path.resolve(candidate);
  }
  return null;
}

function fsSyncExists(file) {
  return existsSync(file);
}

function gitSha(root) {
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch (error) {
    return `unknown (${error instanceof Error ? error.message : "git failed"})`;
  }
}

function fail(message) {
  const error = new Error(message);
  error.statusCode = 500;
  return error;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 180000,
    ...options,
  });
  if (result.error) {
    throw fail(`${command} 无法启动：${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = [result.stderr, result.stdout].filter(Boolean).join("\n").trim();
    throw fail(detail || `${path.basename(command)} 退出码 ${result.status}`);
  }
  return result.stdout || "";
}

function withSession(sessionId, job) {
  const previous = locks.get(sessionId) || Promise.resolve();
  const next = previous.catch(() => {}).then(job);
  locks.set(
    sessionId,
    next.then(
      () => undefined,
      () => undefined,
    ),
  );
  return next;
}

function sessionDir(sessionId) {
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
    const error = new Error("无效的会话编号");
    error.statusCode = 400;
    throw error;
  }
  return path.join(sessionsRoot, sessionId);
}

async function readManifest(sessionId) {
  const file = path.join(sessionDir(sessionId), "manifest.json");
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch (error) {
    if (error && error.code === "ENOENT") {
      const missing = new Error(`找不到会话 ${sessionId}`);
      missing.statusCode = 404;
      throw missing;
    }
    throw error;
  }
}

async function writeManifest(sessionId, manifest) {
  await fs.writeFile(
    path.join(sessionDir(sessionId), "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
}

function slideSvgPath(workspace, page) {
  const number = Number(page);
  if (!Number.isInteger(number) || number < 1) {
    const error = new Error(`页码无效：${page}`);
    error.statusCode = 400;
    throw error;
  }
  return path.join(workspace, "authoring-svg-flat", `slide_${String(number).padStart(2, "0")}.svg`);
}

function shapeNames(pptxPath) {
  const script = path.join(repoRoot, "server/shape_names.py");
  const stdout = run(python, [script, pptxPath]);
  return JSON.parse(stdout);
}

async function describeSlides(workspace, pptxPath) {
  const names = shapeNames(pptxPath);
  const dir = path.join(workspace, "authoring-svg-flat");
  const files = (await fs.readdir(dir))
    .filter((name) => /^slide_\d+\.svg$/.test(name))
    .sort();
  const slides = [];
  for (const file of files) {
    const page = Number(file.slice("slide_".length, -".svg".length));
    const svg = await fs.readFile(path.join(dir, file), "utf8");
    const pageNames = names[String(page)] || {};
    const objects = listTextObjects(svg).map((object) => ({
      shapeId: object.shapeId,
      sourceRef: object.sourceRef,
      name: pageNames[object.shapeId] || null,
      text: object.text,
    }));
    slides.push({ page, svg, objects });
  }
  return slides;
}

async function importPackage(bytes, fileName) {
  const root = pptMasterRoot();
  if (!root) {
    throw fail(
      "找不到 PPT-Master。设置 PPT_MASTER_ROOT，或按 README 把仓库克隆到 /tmp/ppt-master。",
    );
  }
  const sha = gitSha(root);
  const sessionId = randomUUID();
  const dir = sessionDir(sessionId);
  const workspace = path.join(dir, "workspace");
  await fs.mkdir(path.join(dir, "exports"), { recursive: true });
  const sourcePath = path.join(dir, "source.pptx");
  await fs.writeFile(sourcePath, bytes);
  const importer = path.join(root, "skills/ppt-master/scripts/pptx_to_svg.py");
  try {
    run(python, [
      importer,
      sourcePath,
      "-o",
      workspace,
      "--inheritance-mode",
      "both",
      "--roundtrip",
    ]);
    const slides = await describeSlides(workspace, sourcePath);
    const manifest = {
      fileName,
      upstreamRepo: upstream.repo,
      upstreamCommit: sha,
      pinnedCommit: upstream.commit,
      exports: [],
    };
    await writeManifest(sessionId, manifest);
    return {
      sessionId,
      fileName,
      upstream: {
        repo: upstream.repo,
        commit: sha,
        pinnedCommit: upstream.commit,
        matchesPin: sha === upstream.commit,
      },
      slides,
    };
  } catch (error) {
    await fs.rm(dir, { recursive: true, force: true });
    throw error;
  }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(fail("请求体超过 32MB"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        const parseError = new Error(`请求 JSON 无法解析：${error instanceof Error ? error.message : error}`);
        parseError.statusCode = 400;
        reject(parseError);
      }
    });
    request.on("error", reject);
  });
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(fail("PPTX 超过 32MB"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

async function preview(sessionId, body) {
  const manifest = await readManifest(sessionId);
  const svgPath = slideSvgPath(path.join(sessionDir(sessionId), "workspace"), body.page);
  let svg;
  try {
    svg = await fs.readFile(svgPath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      const missing = new Error(`找不到第 ${body.page} 页的 authoring SVG`);
      missing.statusCode = 404;
      throw missing;
    }
    throw error;
  }
  let replaced;
  try {
    replaced = replaceShapeText(svg, String(body.shapeId), String(body.text ?? ""));
  } catch (error) {
    const wrapped = new Error(error instanceof Error ? error.message : "无法替换文字");
    wrapped.statusCode = 400;
    throw wrapped;
  }
  if (body.previousText != null && replaced.previousText !== body.previousText) {
    const mismatch = new Error(
      `形状 ${replaced.shapeId} 当前文字是「${replaced.previousText}」，不是「${body.previousText}」。没有写入。`,
    );
    mismatch.statusCode = 409;
    throw mismatch;
  }
  return { ...replaced, page: Number(body.page), fileName: manifest.fileName };
}

async function accept(sessionId, body) {
  const root = pptMasterRoot();
  if (!root) {
    throw fail("找不到 PPT-Master，无法导出。");
  }
  const dir = sessionDir(sessionId);
  const manifest = await readManifest(sessionId);
  const workspace = path.join(dir, "workspace");
  const svgPath = slideSvgPath(workspace, body.page);
  const current = await fs.readFile(svgPath, "utf8");
  let replaced;
  try {
    replaced = replaceShapeText(current, String(body.shapeId), String(body.text ?? ""));
  } catch (error) {
    const wrapped = new Error(error instanceof Error ? error.message : "无法替换文字");
    wrapped.statusCode = 400;
    throw wrapped;
  }
  if (body.previousText != null && replaced.previousText !== body.previousText) {
    const mismatch = new Error(
      `形状 ${replaced.shapeId} 当前文字是「${replaced.previousText}」，不是「${body.previousText}」。没有导出。`,
    );
    mismatch.statusCode = 409;
    throw mismatch;
  }
  const exportIndex = manifest.exports.length + 1;
  const exportFile = `export-${exportIndex}`;
  const exportPath = path.join(dir, "exports", `${exportFile}.pptx`);
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "pptstudio-"));
  try {
    await fs.cp(workspace, temp, { recursive: true });
    const tempSvg = slideSvgPath(temp, body.page);
    await fs.writeFile(tempSvg, replaced.svg);
    const exporter = path.join(root, "skills/ppt-master/scripts/svg_to_pptx.py");
    const stdout = run(python, [
      exporter,
      temp,
      "--roundtrip",
      "--primary-language",
      "zh-CN",
      "-o",
      exportPath,
    ]);
    await fs.writeFile(svgPath, replaced.svg);
    manifest.exports.push(exportFile);
    await writeManifest(sessionId, manifest);
    const summaryLine = stdout
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("Round-trip export summary:"));
    return {
      file: exportFile,
      svg: replaced.svg,
      text: replaced.text,
      previousText: replaced.previousText,
      shapeId: replaced.shapeId,
      page: Number(body.page),
      summary: summaryLine || stdout.trim(),
      upstreamCommit: gitSha(root),
    };
  } catch (error) {
    await fs.rm(exportPath, { force: true });
    throw error;
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}

function sendJson(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
  });
  response.end(payload);
}

function sendError(response, error) {
  const status = error && error.statusCode ? error.statusCode : 500;
  const message = error instanceof Error ? error.message : String(error);
  sendJson(response, status, { error: message });
}

async function handle(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,x-filename",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/health") {
    const root = pptMasterRoot();
    const sha = root ? gitSha(root) : null;
    sendJson(response, 200, {
      ok: Boolean(root),
      pptMasterRoot: root,
      commit: sha,
      pinnedCommit: upstream.commit,
      matchesPin: sha === upstream.commit,
      repo: upstream.repo,
      python,
    });
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/import") {
    const bytes = await readBody(request);
    if (!bytes.length) throw fail("没有收到 PPTX 内容");
    const encoded = request.headers["x-filename"];
    const fileName = encoded ? decodeURIComponent(String(encoded)) : "upload.pptx";
    if (!fileName.toLowerCase().endsWith(".pptx")) {
      const error = new Error(`需要 .pptx 文件，收到的是 ${fileName}`);
      error.statusCode = 400;
      throw error;
    }
    sendJson(response, 200, await importPackage(bytes, path.basename(fileName)));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/import/sample") {
    const bytes = await fs.readFile(samplePath);
    sendJson(response, 200, await importPackage(bytes, "xinghe-retail-q3.pptx"));
    return;
  }

  const previewMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/preview$/);
  if (request.method === "POST" && previewMatch) {
    const body = await readJson(request);
    const result = await withSession(previewMatch[1], () => preview(previewMatch[1], body));
    sendJson(response, 200, result);
    return;
  }

  const acceptMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/accept$/);
  if (request.method === "POST" && acceptMatch) {
    const body = await readJson(request);
    const result = await withSession(acceptMatch[1], () => accept(acceptMatch[1], body));
    sendJson(response, 200, result);
    return;
  }

  const downloadMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/download\/([^/]+)$/);
  if (request.method === "GET" && downloadMatch) {
    const [, sessionId, file] = downloadMatch;
    const manifest = await readManifest(sessionId);
    let filePath = null;
    let downloadName = manifest.fileName;
    if (file === "original") {
      filePath = path.join(sessionDir(sessionId), "source.pptx");
    } else if (/^export-\d+$/.test(file)) {
      filePath = path.join(sessionDir(sessionId), "exports", `${file}.pptx`);
      downloadName = manifest.fileName.replace(/\.pptx$/i, `-${file}.pptx`);
    } else {
      const error = new Error(`未知的下载 ${file}`);
      error.statusCode = 400;
      throw error;
    }
    try {
      await fs.access(filePath);
    } catch {
      const missing = new Error(`文件还不存在：${file}`);
      missing.statusCode = 404;
      throw missing;
    }
    response.writeHead(200, {
      "content-type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      "cache-control": "no-store",
    });
    createReadStream(filePath).pipe(response);
    return;
  }

  sendJson(response, 404, { error: `没有这个接口 ${request.method} ${url.pathname}` });
}

const server = http.createServer((request, response) => {
  handle(request, response).catch((error) => {
    if (!response.headersSent) sendError(response, error);
    else response.destroy(error);
  });
});

server.listen(port, "0.0.0.0", () => {
  const root = pptMasterRoot();
  console.log(`pptx service http://127.0.0.1:${port}`);
  console.log(`PPT_MASTER_ROOT=${root || "(missing)"}`);
  if (root) console.log(`commit ${gitSha(root)} pinned ${upstream.commit}`);
});
