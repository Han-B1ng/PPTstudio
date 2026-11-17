import { describe, expect, it } from "vitest";
import slide2 from "./fixtures/slide_02_authoring.svg?raw";
import { sanitizeSvg } from "../src/lib/sanitizeSvg";

const ATTACK = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
  <script>alert(1)</script>
  <g id="shape-3" data-pptx-object="shape" data-pptx-source-ref="slide:3" onclick="steal()" data-pptx-frame="48 38.4 576 67.2">
    <image href="https://evil.example/pixel.png" />
    <image href="images/kept.png" />
    <a href="javascript:alert(1)"><text>link</text></a>
    <foreignObject><iframe src="https://evil.example/frame"></iframe></foreignObject>
    <text x="57.6" y="79.2" font-size="37.33">会员与即时达拉动增长</text>
  </g>
</svg>`;

describe("sanitizeSvg", () => {
  it("leaves a normal authoring text box unchanged and selectable", () => {
    expect(sanitizeSvg(slide2)).toBe(slide2);
    const safe = sanitizeSvg(ATTACK);
    expect(safe).toContain('id="shape-3"');
    expect(safe).toContain('data-pptx-source-ref="slide:3"');
    expect(safe).toContain("会员与即时达拉动增长");
    expect(safe).toContain('href="images/kept.png"');
    expect(safe.match(/data-pptx-source-ref="slide:(\d+)"/)?.[1]).toBe("3");
  });

  it("strips active content, handlers, and external resource URLs", () => {
    const safe = sanitizeSvg(ATTACK);
    expect(safe).not.toContain("<script");
    expect(safe).not.toContain("alert(1)");
    expect(safe).not.toContain("onclick");
    expect(safe).not.toContain("onload");
    expect(safe).not.toContain("steal()");
    expect(safe).not.toContain("https://evil.example");
    expect(safe).not.toContain("javascript:");
    expect(safe).not.toContain("foreignObject");
    expect(safe).not.toContain("iframe");
  });
});
