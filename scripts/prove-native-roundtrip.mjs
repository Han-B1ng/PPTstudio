/**
 * Prove PPT-Master import plus an OOXML text-only write-back.
 *
 * The exported PPTX is not produced by svg_to_pptx.py. One <a:t> is replaced.
 * Restoring that text makes the slide XML identical to the source.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { patchSlideXml, readShapeTextFromSlide, slidePartForPage } from "../src/lib/ooxmlTextPatch.ts";
import { readShapeText, replaceShapeText } from "../src/lib/replaceShapeText.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const upstream = JSON.parse(fs.readFileSync(path.join(repoRoot, "server/upstream.json"), "utf8"));
const python = process.env.PYTHON || "python3";
const zipScript = path.join(repoRoot, "server/pptx_zip.py");
const pptMaster = process.env.PPT_MASTER_ROOT || "/tmp/ppt-master";
const sample = path.join(repoRoot, "samples/xinghe-retail-q3.pptx");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "pptstudio-prove-"));
const imported = path.join(work, "workspace");
const once = path.join(work, "shape3.pptx");
const twice = path.join(work, "both.pptx");
const NEXT = "即时达改写了增长结构";
const ORIGINAL = "会员与即时达拉动增长";
const SECOND = "另一侧标题保持独立";

function run(args, options = {}) {
  return execFileSync(python, args, { encoding: "utf8", ...options });
}

function readEntry(pptx, name) {
  return execFileSync(python, [zipScript, "read", pptx, name], { encoding: "buffer" });
}

function writeEntry(src, dst, name, xml) {
  const payload = path.join(work, `${path.basename(dst)}.xml`);
  fs.writeFileSync(payload, xml);
  run([zipScript, "replace", src, dst, name, payload]);
}

function patchPackage(src, dst, page, shapeId, text) {
  const presentation = readEntry(src, "ppt/presentation.xml").toString("utf8");
  const rels = readEntry(src, "ppt/_rels/presentation.xml.rels").toString("utf8");
  const part = slidePartForPage(presentation, rels, page);
  const before = readEntry(src, part);
  const beforeXml = before.toString("utf8");
  const patched = patchSlideXml(beforeXml, shapeId, text);
  writeEntry(src, dst, part, patched.xml);
  return { part, previousText: patched.previousText, before };
}

const sha = execFileSync("git", ["-C", pptMaster, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
console.log(`upstream ${upstream.repo} ${sha}`);
if (sha !== upstream.commit) {
  console.error(`pinned ${upstream.commit} but checkout is ${sha}`);
  process.exit(1);
}

run([
  path.join(pptMaster, "skills/ppt-master/scripts/pptx_to_svg.py"),
  sample,
  "-o",
  imported,
  "--inheritance-mode",
  "both",
  "--roundtrip",
]);
const authoring = fs.readFileSync(path.join(imported, "authoring-svg-flat/slide_02.svg"), "utf8");
const preview = replaceShapeText(authoring, "3", NEXT);
if (preview.previousText !== ORIGINAL) throw new Error(`preview text ${preview.previousText}`);
if (readShapeText(preview.svg, "4") !== ORIGINAL) throw new Error("preview changed shape 4");
console.log("preview kept shape 4 and replaced shape 3 in the authoring SVG");

const first = patchPackage(sample, once, 2, "3", NEXT);
if (first.previousText !== ORIGINAL) throw new Error(`pptx text ${first.previousText}`);
const patchedSlide = readEntry(once, first.part).toString("utf8");
if (readShapeTextFromSlide(patchedSlide, "3") !== NEXT) throw new Error("shape 3 was not updated");
if (readShapeTextFromSlide(patchedSlide, "4") !== ORIGINAL) throw new Error("shape 4 changed");
console.log("page 2 shape 3 a:t is the new text");

const restored = patchSlideXml(patchedSlide, "3", ORIGINAL);
if (restored.xml !== first.before.toString("utf8")) {
  throw new Error("restoring the a:t did not reproduce the original slide XML");
}
console.log("restored slide 2 XML is identical, including txBox, wrap, and insets");

for (const name of [
  "ppt/slides/slide1.xml",
  "ppt/slides/slide3.xml",
  "ppt/slides/_rels/slide1.xml.rels",
  "ppt/slides/_rels/slide2.xml.rels",
  "ppt/slides/_rels/slide3.xml.rels",
]) {
  const left = readEntry(sample, name);
  const right = readEntry(once, name);
  if (!left.equals(right)) throw new Error(`byte mismatch ${name}`);
  console.log("byte-identical", name);
}

const second = patchPackage(once, twice, 2, "4", SECOND);
if (readShapeTextFromSlide(readEntry(twice, second.part).toString("utf8"), "3") !== NEXT) {
  throw new Error("second accept dropped the first edit");
}
if (readShapeTextFromSlide(readEntry(twice, second.part).toString("utf8"), "4") !== SECOND) {
  throw new Error("second accept missed shape 4");
}
const undone = patchSlideXml(patchSlideXml(readEntry(twice, second.part).toString("utf8"), "4", ORIGINAL).xml, "3", ORIGINAL);
if (undone.xml !== first.before.toString("utf8")) throw new Error("two edits did not restore cleanly");
console.log("consecutive accepts kept both edits");

const unchanged = fs.readFileSync(sample);
let failed = false;
try {
  patchPackage(sample, path.join(work, "should-not-write.pptx"), 2, "99", NEXT);
} catch (error) {
  failed = true;
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("找不到形状")) throw error;
}
if (!failed) throw new Error("missing shape should fail");
if (!fs.readFileSync(sample).equals(unchanged)) throw new Error("failed patch changed the source");
console.log("missing shape failed and left the source unchanged");
console.log(once);
console.log(twice);
