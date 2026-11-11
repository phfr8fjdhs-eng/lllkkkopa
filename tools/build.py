#!/usr/bin/env python3
"""Assemble the single-file game page from the sources and the map data."""
import json, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
js = "\n".join((root / "src" / f).read_text() for f in
               ["00_util.js", "01_map.js", "02_path.js", "03_game.js", "04_units.js", "05_ai.js", "06_view.js", "07_ui.js"])
maps = json.loads((root / "build" / "maps.json").read_text())
html = (root / "src" / "template.html").read_text()
html = html.replace("/*__JS__*/", js).replace("/*__MAPS__*/", json.dumps(maps, ensure_ascii=False, separators=(",", ":")))
out = root / "build" / "index.html"
out.write_text(html)
print("wrote", out, len(html.encode()), "bytes")
