#!/usr/bin/env python3
"""Read or replace one ZIP entry. Other entries are copied through."""

from __future__ import annotations

import sys
import zipfile
from pathlib import Path


def read_entry(src: str, name: str) -> None:
    with zipfile.ZipFile(src) as package:
        sys.stdout.buffer.write(package.read(name))


def replace_entry(src: str, dst: str, name: str, payload: str) -> None:
    data = Path(payload).read_bytes()
    with zipfile.ZipFile(src) as package:
        if name not in package.namelist():
            raise SystemExit(f"ZIP 里没有 {name}")
        infos = package.infolist()
        blobs = {info.filename: package.read(info.filename) for info in infos}
    blobs[name] = data
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(dst, "w") as package:
        for info in infos:
            package.writestr(info, blobs[info.filename])


def main() -> int:
    command = sys.argv[1]
    if command == "read":
        read_entry(sys.argv[2], sys.argv[3])
        return 0
    if command == "replace":
        replace_entry(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5])
        return 0
    raise SystemExit(f"未知命令 {command}")


if __name__ == "__main__":
    raise SystemExit(main())
