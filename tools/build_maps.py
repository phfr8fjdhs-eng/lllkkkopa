#!/usr/bin/env python3
"""Rasterise public-domain Natural Earth data into compact class maps for the game.
Class per tile: 0 water, 1 plain land, 2 plateau, 3 mountain range."""
import json, math, sys, io, base64
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

GEO = sys.argv[1]
OUT = sys.argv[2]

def load(n): return json.load(open(f"{GEO}/{n}.geojson"))
land = load("ne_50m_land"); lakes = load("ne_50m_lakes")
regions = load("ne_50m_geography_regions_polys"); countries = load("ne_110m_admin_0_countries")

def merc(lat):
    lat = max(-85.0, min(85.0, lat))
    return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))

def polys(geom):
    if geom is None: return []
    if geom["type"] == "Polygon": return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon": return geom["coordinates"]
    return []

MAPS = [
    dict(id="welt", name="Welt", lon=(-168.5, 191.5), lat=(-56.0, 75.0), tiles=740_000, nations=62, mind=20),
    dict(id="europa", name="Europa", lon=(-25.0, 52.0), lat=(29.5, 72.0), tiles=560_000, nations=44, mind=17),
    dict(id="asien", name="Asien", lon=(38.0, 150.0), lat=(-11.0, 62.0), tiles=560_000, nations=40, mind=18),
    dict(id="afrika", name="Afrika", lon=(-20.0, 54.0), lat=(-36.0, 38.5), tiles=520_000, nations=44, mind=18),
    dict(id="nordamerika", name="Nordamerika", lon=(-170.0, -50.0), lat=(6.0, 73.0), tiles=560_000, nations=24, mind=18),
    dict(id="suedamerika", name="Südamerika", lon=(-93.0, -30.0), lat=(-57.0, 14.0), tiles=520_000, nations=20, mind=18),
    dict(id="ozeanien", name="Ozeanien", lon=(92.0, 180.0), lat=(-48.0, 24.0), tiles=540_000, nations=24, mind=18),
    dict(id="mittelmeer", name="Mittelmeer", lon=(-10.5, 42.5), lat=(29.0, 47.5), tiles=520_000, nations=36, mind=16),
]

STRAITS = [
    [(-6.2, 35.9), (-5.6, 35.95), (-5.0, 36.05)],                    # Gibraltar
    [(28.95, 40.95), (29.0, 41.05), (29.08, 41.15), (29.15, 41.28)],  # Bosporus
    [(26.05, 39.98), (26.4, 40.2), (26.75, 40.45), (26.95, 40.5)],    # Dardanellen
    [(43.2, 12.95), (43.45, 12.6), (43.7, 12.3)],                     # Bab al-Mandab
    [(55.8, 26.45), (56.45, 26.58), (56.9, 26.2)],                    # Hormus
    [(12.65, 56.2), (12.7, 55.9), (12.75, 55.55), (12.6, 55.3)],      # Öresund
    [(10.85, 55.85), (11.0, 55.35), (10.95, 54.85)],                  # Grosser Belt
    [(1.2, 51.15), (1.6, 50.95)],                                     # Dover
    [(15.62, 38.28), (15.6, 38.05)],                                  # Messina
    [(36.5, 45.45), (36.65, 45.2)],                                   # Kertsch
    [(141.6, 52.3), (141.8, 51.9)],                                   # Tatarensund
    [(140.2, 41.55), (141.2, 41.45)],                                 # Tsugaru
    [(130.8, 33.98), (131.0, 33.9)],                                  # Kanmon
    [(-56.8, 51.6), (-56.2, 51.9)],                                   # Belle Isle
    [(109.8, 20.2), (110.6, 20.15)],                                  # Hainan
    [(79.55, 9.6), (79.6, 9.05)],                                     # Palk
]

SHORT = {"Volksrepublik China": "China", "Vereinigte Staaten": "USA", "Vereinigtes Königreich": "Grossbritannien",
         "Demokratische Republik Kongo": "DR Kongo", "Republik Kongo": "Kongo", "Vereinigte Arabische Emirate": "VAE",
         "Zentralafrikanische Republik": "Zentralafrika", "Dominikanische Republik": "Dom. Republik",
         "Bosnien und Herzegowina": "Bosnien", "Republik China": "Taiwan", "Trinidad und Tobago": "Trinidad",
         "Französische Süd- und Antarktisgebiete": "", "Äquatorialguinea": "Äquatorialguinea",
         "Türkische Republik Nordzypern": "Nordzypern", "Republik Zypern": "Zypern", "Königreich Dänemark": "Dänemark",
         "Königreich der Niederlande": "Niederlande", "Staat Palästina": "Palästina", "Demokratische Arabische Republik Sahara": "Westsahara"}

def build(m):
    lon0, lon1 = m["lon"]; lat0, lat1 = m["lat"]
    my1, my0 = merc(lat1), merc(lat0)
    aspect = math.radians(lon1 - lon0) / (my1 - my0)
    W = int(round(math.sqrt(m["tiles"] * aspect))); H = int(round(W / aspect))
    SS = 3
    def px(lon, lat, s=1.0):
        return ((lon - lon0) / (lon1 - lon0) * W * s, (my1 - merc(lat)) / (my1 - my0) * H * s)
    def ring_pts(ring, s):
        lons = [p[0] for p in ring]
        mean = sum(lons) / len(lons)
        shift = 0.0
        if mean < lon0 - 1e-9 and mean + 360 <= lon1 + 20: shift = 360.0
        elif mean > lon1 + 1e-9 and mean - 360 >= lon0 - 20: shift = -360.0
        return [px(p[0] + shift, p[1], s) for p in ring]
    def raster(features, s, filt=None):
        ext = Image.new("L", (W * s, H * s), 0); d = ImageDraw.Draw(ext)
        holes = Image.new("L", (W * s, H * s), 0); dh = ImageDraw.Draw(holes)
        for f in features:
            if filt and not filt(f): continue
            for poly in polys(f["geometry"]):
                pts = ring_pts(poly[0], s)
                if len(pts) >= 3: d.polygon(pts, fill=255)
                for hole in poly[1:]:
                    hp = ring_pts(hole, s)
                    if len(hp) >= 3: dh.polygon(hp, fill=255)
        return np.asarray(ext, dtype=np.uint8), np.asarray(holes, dtype=np.uint8)
    le, lh = raster(land["features"], SS)
    lk, lkh = raster(lakes["features"], SS)
    hi = (le > 0) & ~(lh > 0)
    hi &= ~((lk > 0) & ~(lkh > 0))
    cov = hi.reshape(H, SS, W, SS).mean(axis=(1, 3))
    isl = cov >= 0.5
    # open the important straits
    cut = Image.new("L", (W, H), 0); dc = ImageDraw.Draw(cut)
    for line in STRAITS:
        pts = [px(a, b) for a, b in line]
        if all(-5 < x < W + 5 and -5 < y < H + 5 for x, y in pts):
            dc.line(pts, fill=255, width=2)
    isl &= ~(np.asarray(cut) > 0)
    # drop tiny islands and ponds
    lab, n = ndimage.label(isl)
    sizes = ndimage.sum(isl, lab, range(1, n + 1))
    small = np.isin(lab, [i + 1 for i, sz in enumerate(sizes) if sz < 12])
    isl &= ~small
    wlab, wn = ndimage.label(~isl)
    wsizes = ndimage.sum(~isl, wlab, range(1, wn + 1))
    ponds = np.isin(wlab, [i + 1 for i, sz in enumerate(wsizes) if sz < 30])
    isl |= ponds
    # mountain and plateau regions
    mt, _ = raster(regions["features"], 1, lambda f: f["properties"]["FEATURECLA"] in ("Range/mtn",))
    pl, _ = raster(regions["features"], 1, lambda f: f["properties"]["FEATURECLA"] in ("Plateau", "Foothills"))
    cls = np.zeros((H, W), dtype=np.uint8)
    cls[isl] = 1
    cls[isl & (pl > 0)] = 2
    cls[isl & (mt > 0)] = 3
    # nations
    lab, n = ndimage.label(isl)
    sizes = ndimage.sum(isl, lab, range(1, n + 1))
    cands = []
    for f in countries["features"]:
        p = f["properties"]
        name = (p.get("NAME_DE") or p.get("NAME") or "").replace("ß", "ss")
        name = SHORT.get(name, name)
        if not name: continue
        lon, lat = p.get("LABEL_X"), p.get("LABEL_Y")
        if lon is None or lat is None: continue
        if lon < lon0: lon += 360
        if lon > lon1: lon -= 360
        if not (lon0 < lon < lon1 and lat0 < lat < lat1): continue
        x, y = px(lon, lat); x = int(x); y = int(y)
        if not (6 <= x < W - 6 and 6 <= y < H - 6): continue
        best = None
        for r in range(0, 10):
            for yy in range(max(0, y - r), min(H, y + r + 1)):
                for xx in range(max(0, x - r), min(W, x + r + 1)):
                    if isl[yy, xx] and sizes[lab[yy, xx] - 1] >= 120:
                        d = (xx - x) ** 2 + (yy - y) ** 2
                        if best is None or d < best[0]: best = (d, xx, yy)
            if best: break
        if not best: continue
        iso = p.get("ISO_A2_EH") or p.get("ISO_A2") or ""
        if not (len(iso) == 2 and iso.isalpha()): iso = ""
        cands.append(dict(n=name, x=best[1], y=best[2], pop=p.get("POP_EST") or 0, gdp=p.get("GDP_MD") or 0, iso=iso))
    cands.sort(key=lambda c: -c["pop"])
    chosen = []
    for c in cands:
        if len(chosen) >= m["nations"]: break
        if all((c["x"] - o["x"]) ** 2 + (c["y"] - o["y"]) ** 2 >= m["mind"] ** 2 for o in chosen): chosen.append(c)
    by_gdp = sorted(chosen, key=lambda c: -c["gdp"])
    for i, c in enumerate(by_gdp):
        c["s"] = 3 if i < len(by_gdp) * 0.15 else (2 if i < len(by_gdp) * 0.5 else 1)
    img = Image.fromarray((cls * 85).astype(np.uint8), "L")
    buf = io.BytesIO(); img.save(buf, "PNG", optimize=True)
    # preview
    pal = np.array([[70, 132, 180], [190, 214, 138], [212, 196, 150], [236, 236, 236]], dtype=np.uint8)
    prev = Image.fromarray(pal[cls], "RGB"); dp = ImageDraw.Draw(prev)
    for c in chosen: dp.ellipse((c["x"] - 2, c["y"] - 2, c["x"] + 2, c["y"] + 2), fill=(200, 30, 30))
    prev.save(f"{OUT}/preview_{m['id']}.png")
    print(m["id"], W, H, W * H, "land", int(isl.sum()), f"{isl.mean():.2f}", "png", len(buf.getvalue()), "nations", len(chosen),
          "waterbodies", int((wsizes >= 30).sum()), "islands", int((sizes >= 12).sum()))
    return dict(id=m["id"], name=m["name"], w=W, h=H, png=base64.b64encode(buf.getvalue()).decode(),
                nations=[[c["n"], c["x"], c["y"], c["s"], c["iso"]] for c in chosen])

out = [build(m) for m in MAPS]
json.dump(out, open(f"{OUT}/maps.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("total json bytes", len(json.dumps(out)))
