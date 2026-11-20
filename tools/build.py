#!/usr/bin/env python3
"""Assemble the single-file game pages from the sources and the map data.

build/index.html      the classic game
build/rohstoffe.html  the game version «Rohstoffe»: the same game, plus src/03c_res.js and the
                      countries of the Earth (build/laender.json, made by tools/build_countries.py)
"""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
FILES = ["00_util.js", "01_map.js", "02_path.js", "03_game.js", "03b_posture.js", "04_units.js", "04b_rail.js", "05_ai.js", "06a_audio.js", "06_view.js", "08_net.js", "07_ui.js"]
def page(name, files, head="", title=None, ctry=None):
    js = head + "\n".join((root / "src" / f).read_text() for f in files)
    maps = json.loads((root / "build" / "maps.json").read_text())
    erde = root / "build" / "erde.json"
    if erde.exists():                                               # the Earth, built by tools/build_world.py
        e = json.loads(erde.read_text())
        if ctry: e["ctry"] = ctry
        maps.insert(0, e)
    html = (root / "src" / "template.html").read_text()
    if title: html = html.replace("<title>Grenzland</title>", "<title>" + title + "</title>")
    html = html.replace("/*__JS__*/", js).replace("/*__MAPS__*/", json.dumps(maps, ensure_ascii=False, separators=(",", ":")))
    out = root / "build" / name
    out.write_text(html)
    print("wrote", out, len(html.encode()), "bytes")
page("index.html", FILES)
laender = root / "build" / "laender.json"
if laender.exists():
    i = FILES.index("03_game.js") + 1
    page("rohstoffe.html", FILES[:i] + ["03c_res.js"] + FILES[i:], head="globalThis.G = { VARIANT: 'rohstoffe' };\n",
         title="Grenzland · Rohstoffe", ctry=json.loads(laender.read_text()))
