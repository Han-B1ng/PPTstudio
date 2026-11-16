/**
 * Command-line proof of the native round trip.
 *
 * Import the sample with PPT-Master, replace one text box by page + shape id,
 * export, and compare OOXML. This does not call a model.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { replaceShapeText } from "../src/lib/replaceShapeText.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const upstream = JSON.parse(fs.readFileSync(path.join(repoRoot, "server/upstream.json"), "utf8"));
const python = process.env.PYTHON || "python3";
const pptMaster = process.env.PPT_MASTER_ROOT || "/tmp/ppt-master";
const sample = path.join(repoRoot, "samples/xinghe-retail-q3.pptx");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "pptstudio-prove-"));
const imported = path.join(work, "workspace");
const exported = path.join(work, "exported.pptx");

function run(args) {
  return execFileSync(python, args, { encoding: "utf8" });
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

const slidePath = path.join(imported, "authoring-svg-flat/slide_02.svg");
const original = fs.readFileSync(slidePath, "utf8");
const edited = replaceShapeText(original, "3", "即时达改写了增长结构");
if (edited.previousText !== "会员与即时达拉动增长") {
  throw new Error(`unexpected previous text ${edited.previousText}`);
}
fs.writeFileSync(slidePath, edited.svg);

const stdout = run([
  path.join(pptMaster, "skills/ppt-master/scripts/svg_to_pptx.py"),
  imported,
  "--roundtrip",
  "--primary-language",
  "zh-CN",
  "-o",
  exported,
]);
const summary = stdout.split("\n").map((line) => line.trim()).find((line) => line.startsWith("Round-trip export summary:"));
console.log(summary || stdout);

const report = execFileSync(python, ["-", sample, exported], {
  encoding: "utf8",
  input: `
import sys, zipfile
from xml.etree import ElementTree as ET
src, out = sys.argv[1], sys.argv[2]
NS = {"p": "http://schemas.openxmlformats.org/presentationml/2006/main", "a": "http://schemas.openxmlformats.org/drawingml/2006/main"}
def canon(el):
    return ET.canonicalize(ET.tostring(el, encoding="unicode"), rewrite_prefixes=True)
with zipfile.ZipFile(src) as a, zipfile.ZipFile(out) as b:
    for name in ("ppt/slides/slide1.xml", "ppt/slides/slide3.xml", "ppt/slides/_rels/slide1.xml.rels", "ppt/slides/_rels/slide2.xml.rels", "ppt/slides/_rels/slide3.xml.rels"):
        if a.read(name) != b.read(name):
            raise SystemExit(f"byte mismatch {name}")
        print("byte-identical", name)
    left = ET.fromstring(a.read("ppt/slides/slide2.xml"))
    right = ET.fromstring(b.read("ppt/slides/slide2.xml"))
    def shapes(root):
        found = {}
        for sp in root.findall(".//p:sp", NS):
            node = sp.find(".//p:cNvPr", NS)
            found[node.get("id")] = sp
        return found
    ls, rs = shapes(left), shapes(right)
    if set(ls) != set(rs):
        raise SystemExit(f"shape ids {sorted(ls)} vs {sorted(rs)}")
    for sid, shape in ls.items():
        same = canon(shape) == canon(rs[sid])
        texts = [t.text or "" for t in rs[sid].findall(".//a:t", NS)]
        print(f"shape {sid} canonical_same={same} texts={texts}")
        if sid != "3" and not same:
            raise SystemExit(f"shape {sid} changed")
        if sid == "3" and texts != ["即时达改写了增长结构"]:
            raise SystemExit(f"shape 3 texts {texts}")
        if sid == "4" and texts != ["会员与即时达拉动增长"]:
            raise SystemExit(f"shape 4 texts {texts}")
print("ok", out)
`,
});
console.log(report);
console.log(exported);
