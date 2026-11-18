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
    <rect width="120" height="40" fill="url(#g1)" style="fill:#112233;opacity:0.5"/>
    <rect id="mixed" style="fill:#fff;position:absolute"/>
    <rect id="unknown" style="not-a-property:1"/>
    <rect id="external-style" style="fill:url(https://evil.example/p.png)"/>
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
    expect(richDoc.querySelector("rect")?.getAttribute("style")).toBe("fill:#112233;opacity:0.5");
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
    expect(safe).not.toContain("position");
    expect(safe).not.toContain("not-a-property");
    const doc = new DOMParser().parseFromString(safe, "image/svg+xml");
    expect(doc.getElementById("mixed")?.getAttribute("style")).toBeNull();
    expect(doc.getElementById("unknown")?.getAttribute("style")).toBeNull();
    expect(doc.getElementById("external-style")?.getAttribute("style")).toBeNull();
  });

  it("drops external resource references on paint attributes and keeps in-deck gradients", () => {
    const markup = `<svg xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g1"><stop offset="0" stop-color="#141414"/></linearGradient></defs>
      <rect id="deck" fill="url(#g1)" stroke="none" marker-end="url(#arrow)"/>
      <rect id="external" fill="url(https://evil.example/p.png)" stroke="url(https://evil.example/s.png)" clip-path="url(https://evil.example/c.svg)" mask="url(//evil.example/m)" filter="url(https://evil.example/f)" marker-start="url(https://evil.example/marker.svg)" marker-mid="url(https://evil.example/mid.svg)"/>
      <rect id="named" fill="red"/>
    </svg>`;
    const doc = new DOMParser().parseFromString(sanitizeSvg(markup), "image/svg+xml");
    const deck = doc.getElementById("deck");
    expect(deck?.getAttribute("fill")).toBe("url(#g1)");
    expect(deck?.getAttribute("stroke")).toBe("none");
    expect(deck?.getAttribute("marker-end")).toMatch(/url\(#arrow\)/i);
    expect(doc.querySelector("linearGradient")?.getAttribute("id")).toBe("g1");
    const external = doc.getElementById("external");
    for (const name of ["fill", "stroke", "clip-path", "mask", "filter", "marker-start", "marker-mid"]) {
      expect(external?.getAttribute(name), name).toBeNull();
    }
    expect(doc.getElementById("named")?.getAttribute("fill")).toBeNull();
    expect(sanitizeSvg(markup)).not.toContain("evil.example");
    expect(isAllowedImageReference("../images/../../etc/passwd.png")).toBe(false);
    expect(isAllowedImageReference("https://evil.example/a.png")).toBe(false);
    expect(isAllowedImageReference("../images/image1.png")).toBe(true);
  });
});
