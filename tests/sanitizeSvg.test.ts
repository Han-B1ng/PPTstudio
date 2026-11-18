/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import slide2 from "./fixtures/slide_02_authoring.svg?raw";
import { isAllowedImageReference, sanitizeSvg } from "../src/lib/sanitizeSvg";

const ATTACK = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
  <script>alert(1)</script>
  <style>@import "https://evil.example/x.css"; text { behavior: url(https://evil.example/b); }</style>
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#141414"/>
      <stop offset="1" stop-color="#1F4B3A"/>
    </linearGradient>
  </defs>
  <g id="shape-3" data-pptx-object="shape" data-pptx-source-ref="slide:3" onclick="steal()" data-pptx-frame="48 38.4 576 67.2">
    <rect width="120" height="40" fill="url(#g1)" style="fill:url(https://evil.example/p.png)"/>
    <image href="https://evil.example/pixel.png"/>
    <image href="../images/../secret.png"/>
    <image href="../images/image1.png"/>
    <image href="data:image/png;base64,iVBORw0KGgo="/>
    <image href="data:image/svg+xml;base64,PHN2Zy8+"/>
    <a href="javascript:alert(1)"><text>link</text></a>
    <foreignObject><iframe src="https://evil.example/frame"></iframe></foreignObject>
    <text x="57.6" y="79.2" font-size="37.33">会员与即时达拉动增长</text>
  </g>
</svg>`;

describe("sanitizeSvg", () => {
  it("keeps a normal text box selectable and keeps gradients and deck images", () => {
    const safe = sanitizeSvg(slide2);
    const doc = new DOMParser().parseFromString(safe, "image/svg+xml");
    const title = doc.querySelector('[data-pptx-source-ref="slide:3"]');
    expect(title?.textContent).toContain("会员与即时达拉动增长");
    expect(title?.getAttribute("id")).toBe("shape-3");

    const rich = sanitizeSvg(ATTACK);
    const richDoc = new DOMParser().parseFromString(rich, "image/svg+xml");
    const box = richDoc.querySelector('[data-pptx-source-ref="slide:3"]');
    expect(box?.textContent).toContain("会员与即时达拉动增长");
    const gradient = richDoc.querySelector("linearGradient");
    expect(gradient?.getAttribute("id")).toBe("g1");
    expect(gradient?.querySelectorAll("stop")).toHaveLength(2);
    expect(richDoc.querySelector("rect")?.getAttribute("fill")).toBe("url(#g1)");
    const images = [...richDoc.querySelectorAll("image")].map((node) => node.getAttribute("href"));
    expect(images).toEqual(["../images/image1.png", "data:image/png;base64,iVBORw0KGgo="]);
  });

  it("strips active content, external resources, traversal paths, and unsafe styles", () => {
    const safe = sanitizeSvg(ATTACK);
    expect(safe).not.toContain("<script");
    expect(safe).not.toContain("<style");
    expect(safe).not.toContain("alert(1)");
    expect(safe).not.toContain("onclick");
    expect(safe).not.toContain("onload");
    expect(safe).not.toContain("steal()");
    expect(safe).not.toContain("https://evil.example");
    expect(safe).not.toContain("javascript:");
    expect(safe).not.toContain("foreignObject");
    expect(safe).not.toContain("iframe");
    expect(safe).not.toContain("behavior");
    expect(safe).not.toContain("@import");
    expect(safe).not.toContain("secret.png");
    expect(safe).not.toContain("svg+xml");
    expect(isAllowedImageReference("../images/../../etc/passwd.png")).toBe(false);
    expect(isAllowedImageReference("https://evil.example/a.png")).toBe(false);
    expect(isAllowedImageReference("../images/image1.png")).toBe(true);
  });
});
