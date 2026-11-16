#!/usr/bin/env python3
"""Build the three-page native sample deck.

Page 2 has two text boxes with the same visible string and different shape ids
(title-left and title-right). The script uses python-pptx only to author the
source package. Editing goes through PPT-Master, not through this file.
"""

from __future__ import annotations

import sys
from pathlib import Path

from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
from pptx.util import Emu, Inches, Pt


def set_run(run, text: str, size: int, *, bold: bool = False, color: str = "141414") -> None:
    font_name = "Microsoft YaHei"
    run.text = text
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = RGBColor.from_string(color)
    run.font.name = font_name
    props = run._r.get_or_add_rPr()
    for tag in ("ea", "cs"):
        node = props.find(qn(f"a:{tag}"))
        if node is None:
            node = etree.SubElement(props, qn(f"a:{tag}"))
        node.set("typeface", font_name)


def add_box(slide, text, left, top, width, height, size, *, bold=False, color="141414", name=None):
    shape = slide.shapes.add_textbox(Inches(left), Inches(top), Inches(width), Inches(height))
    if name:
        shape.name = name
    frame = shape.text_frame
    frame.word_wrap = True
    run = frame.paragraphs[0].add_run()
    set_run(run, text, size, bold=bold, color=color)
    shape.fill.background()
    shape.line.fill.background()
    return shape


def add_rect(slide, left, top, width, height, fill: str):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor.from_string(fill)
    shape.line.fill.background()
    return shape


def build(path: Path) -> None:
    presentation = Presentation()
    presentation.slide_width = Emu(12192000)  # 13.333... in
    presentation.slide_height = Emu(6858000)  # 7.5 in
    blank = presentation.slide_layouts[6]

    cover = presentation.slides.add_slide(blank)
    add_rect(cover, 0, 0, 0.15, 7.5, "141414")
    add_box(cover, "XINGHE RETAIL", 0.6, 0.45, 6, 0.4, 14, color="6F6A62", name="kicker")
    add_box(cover, "星河零售", 0.6, 2.35, 8, 1.1, 54, bold=True, name="cover-title")
    add_box(cover, "2026 Q3 业务回顾", 0.6, 3.55, 8, 0.6, 28, color="1F4B3A", name="cover-sub")

    growth = presentation.slides.add_slide(blank)
    add_rect(growth, 0, 0, 13.333333, 0.08, "1F4B3A")
    add_box(growth, "会员与即时达拉动增长", 0.5, 0.4, 6.0, 0.7, 28, bold=True, name="title-left")
    add_box(growth, "会员与即时达拉动增长", 7.0, 0.4, 6.0, 0.7, 28, bold=True, name="title-right")
    add_box(
        growth,
        "本季 GMV 同比 +18.4%。结构比新开门店更重要。",
        0.5,
        1.3,
        8,
        0.45,
        16,
        color="4E4A44",
        name="body",
    )
    add_rect(growth, 0.5, 2.0, 3.8, 1.4, "FFFFFF")
    add_box(growth, "+18.4%", 0.7, 2.2, 3.2, 0.7, 32, bold=True, color="1F4B3A", name="metric-gmv")
    add_box(growth, "GMV 同比", 0.7, 2.85, 3.2, 0.4, 14, color="6F6A62", name="metric-gmv-label")
    add_rect(growth, 4.6, 2.0, 3.8, 1.4, "FFFFFF")
    add_box(growth, "41%", 4.8, 2.2, 3.2, 0.7, 32, bold=True, name="metric-rate")
    add_box(growth, "会员复购率", 4.8, 2.85, 3.2, 0.4, 14, color="6F6A62", name="metric-rate-label")
    add_rect(growth, 8.7, 2.0, 4.1, 1.4, "FFFFFF")
    add_box(growth, "126 万", 8.9, 2.2, 3.6, 0.7, 32, bold=True, name="metric-orders")
    add_box(growth, "即时达订单", 8.9, 2.85, 3.6, 0.4, 14, color="6F6A62", name="metric-orders-label")
    add_box(
        growth,
        "口径：可识别会员。即时达含前置仓与门店拣货。",
        0.5,
        6.6,
        10,
        0.4,
        12,
        color="6F6A62",
        name="footnote",
    )

    close = presentation.slides.add_slide(blank)
    add_rect(close, 0, 0, 13.333333, 2.4, "141414")
    add_box(close, "会后三十天", 0.6, 0.85, 10, 0.9, 40, bold=True, color="FCFCFC", name="close-title")
    add_box(close, "只保留三件必须落地的事", 0.6, 1.75, 10, 0.5, 18, color="C9C2B6", name="close-sub")
    add_box(close, "会员日第二波，只推高复购商品", 0.6, 3.05, 11, 0.5, 22, name="action-1")
    add_box(close, "即时达扩城方案，提交 12 城清单", 0.6, 3.85, 11, 0.5, 22, name="action-2")
    add_box(close, "复盘 37 家低效门店，关停或改造", 0.6, 4.65, 11, 0.5, 22, name="action-3")

    path.parent.mkdir(parents=True, exist_ok=True)
    presentation.save(path)


def main() -> int:
    destination = Path(sys.argv[1] if len(sys.argv) > 1 else "samples/xinghe-retail-q3.pptx")
    build(destination)
    print(destination.resolve())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
