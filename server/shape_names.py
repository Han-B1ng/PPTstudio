#!/usr/bin/env python3
"""Print {page: {shapeId: name}} for a PPTX. Stdlib only."""

from __future__ import annotations

import json
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

NS = {"p": "http://schemas.openxmlformats.org/presentationml/2006/main"}
SLIDE = re.compile(r"^ppt/slides/slide(\d+)\.xml$")


def main() -> int:
    path = sys.argv[1]
    roster: dict[str, dict[str, str]] = {}
    with zipfile.ZipFile(path) as package:
        names = []
        for name in package.namelist():
            match = SLIDE.match(name)
            if match:
                names.append((int(match.group(1)), name))
        for page, name in sorted(names):
            root = ET.fromstring(package.read(name))
            page_names: dict[str, str] = {}
            for node in root.findall(".//p:cNvPr", NS):
                shape_id = node.get("id")
                shape_name = node.get("name")
                if shape_id and shape_name:
                    page_names[shape_id] = shape_name
            roster[str(page)] = page_names
    json.dump(roster, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
