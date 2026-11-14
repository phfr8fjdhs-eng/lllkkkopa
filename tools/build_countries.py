#!/usr/bin/env python3
"""Which country every piece of land of the Earth map lies in (for the game version «Rohstoffe»).

    python3 tools/build_countries.py <geo dir> <out dir> [width]

Reads Natural Earth 1:10m countries (public domain) and writes <out>/laender.json:
  w, h    size of the raster: half the resolution of the map (one cell = 2 x 2 tiles)
  png     one byte per cell, the number of the country (1..n); every cell has one, the sea
          and stray islands take the nearest country
  list    per country [ISO code, German name, x, y of its label in tiles]
The projection is the one of tools/build_world.py and has to stay the same.
"""
import json, math, sys, io, base64
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

GEO, OUT = sys.argv[1], sys.argv[2]
W = int(sys.argv[3]) if len(sys.argv) > 3 else 5600
LON0, LAT_S, LAT_N = -169.2, -80.0, 79.5
def pat(phi):
    p2 = phi * phi
    return phi * (1.0148 + p2 * p2 * (0.23185 + p2 * (-0.14499 + p2 * 0.02406)))
# The grid keeps the rows it had when the map ended at 57.5 S (LAT_OLD): the height of a row is
# fixed by that first cut, and Antarctica is whole rows added below. So everything north of
# 57.5 S stays on the tile it was on. The true southern edge lands within a row of LAT_S.
LAT_OLD = -57.5
YN = pat(math.radians(LAT_N))
H_OLD = int(round(W * (YN - pat(math.radians(LAT_OLD))) / math.radians(360)))
ROW = (YN - pat(math.radians(LAT_OLD))) / H_OLD
H = int(round((YN - pat(math.radians(LAT_S))) / ROW))
YS = YN - H * ROW
def px(lon, lat, s=1.0):
    return ((lon - LON0) / 360.0 * W * s, (YN - pat(math.radians(max(-89.0, min(89.0, lat))))) / (YN - YS) * H * s)
def polys(geom):
    if geom is None: return []
    if geom["type"] == "Polygon": return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon": return geom["coordinates"]
    return []
def ring_pts(ring, s):
    sh = 360.0 if sum(p[0] for p in ring) / len(ring) < LON0 else 0.0
    return [px(p[0] + sh, p[1], s) for p in ring]

SHORT = {"Volksrepublik China": "China", "Vereinigte Staaten": "USA", "Vereinigtes Königreich": "Grossbritannien",
         "Demokratische Republik Kongo": "DR Kongo", "Republik Kongo": "Kongo", "Vereinigte Arabische Emirate": "VAE",
         "Zentralafrikanische Republik": "Zentralafrika", "Dominikanische Republik": "Dom. Republik",
         "Bosnien und Herzegowina": "Bosnien", "Republik China": "Taiwan", "Trinidad und Tobago": "Trinidad",
         "Türkische Republik Nordzypern": "Nordzypern", "Republik Zypern": "Zypern",
         "Königreich Dänemark": "Dänemark", "Königreich der Niederlande": "Niederlande", "Staat Palästina": "Palästina",
         "Demokratische Arabische Republik Sahara": "Westsahara", "Föderierte Staaten von Mikronesien": "Mikronesien",
         "St. Vincent und die Grenadinen": "St. Vincent", "Antigua und Barbuda": "Antigua", "São Tomé und Príncipe": "São Tomé"}
w2, h2 = W // 2, H // 2
feats = json.load(open(f"{GEO}/ne_10m_admin_0_countries.geojson"))["features"]
img = Image.new("I", (w2, h2), 0); d = ImageDraw.Draw(img)
cand = []
for k, f in enumerate(feats):
    p = f["properties"]
    name = (p.get("NAME_DE") or p.get("NAME") or "").replace("ß", "ss")
    name = SHORT.get(name, name)
    iso = p.get("ISO_A2_EH") or p.get("ISO_A2") or ""
    if not (len(iso) == 2 and iso.isalpha()): iso = ""
    lon, lat = p.get("LABEL_X") or 0, p.get("LABEL_Y") or 0
    if name == "Grönland": lon, lat = -42.0, 72.0
    if lon < LON0: lon += 360
    cand.append((name, iso, lon, lat))
    for poly in polys(f["geometry"]):
        pts = ring_pts(poly[0], 0.5)
        if len(pts) >= 3: d.polygon(pts, fill=k + 1)
        for hole in poly[1:]:
            hp = ring_pts(hole, 0.5)
            if len(hp) >= 3: d.polygon(hp, fill=0)       # an enclave: the country drawn later fills it again
# holes punched over an enclave drawn earlier would erase it: draw every country's outer rings once more where still empty
a = np.asarray(img).copy()
img2 = Image.new("I", (w2, h2), 0); d2 = ImageDraw.Draw(img2)
for k, f in enumerate(feats):
    for poly in polys(f["geometry"]):
        if len(poly) > 1: continue
        pts = ring_pts(poly[0], 0.5)
        if len(pts) >= 3: d2.polygon(pts, fill=k + 1)
b = np.asarray(img2)
a[a == 0] = b[a == 0]
# Outlying bits with the code of their motherland (Baikonur, Clipperton ...) join it; scraps without
# a code (buffer zones, reefs) are dropped, their cells take the nearest country. Somaliland stays,
# as in the list of nations of the map.
first = {}
for k in range(1, len(feats) + 1):
    name, iso = cand[k - 1][0], cand[k - 1][1]
    if not iso:
        if name != "Somaliland": a[a == k] = 0
    elif iso in first: a[a == k] = first[iso]
    else: first[iso] = k
cnt = np.bincount(a.ravel(), minlength=len(feats) + 1)
keep = [k for k in range(1, len(feats) + 1) if cnt[k] > 0 and cand[k - 1][0]]
keep.sort(key=lambda k: -cnt[k]); keep = sorted(keep[:255])
remap = np.zeros(len(feats) + 1, dtype=np.uint8)
for i, k in enumerate(keep): remap[k] = i + 1
r = remap[a]
idx = ndimage.distance_transform_edt(r == 0, return_distances=False, return_indices=True)
r = r[idx[0], idx[1]]
lst = []
for k in keep:
    name, iso, lon, lat = cand[k - 1]
    x, y = px(lon, lat)
    lst.append([iso, name, int(min(W - 1, max(0, x))), int(min(H - 1, max(0, y)))])
buf = io.BytesIO(); Image.fromarray(r, "L").save(buf, "PNG", optimize=True)
json.dump(dict(w=w2, h=h2, png=base64.b64encode(buf.getvalue()).decode(), list=lst), open(f"{OUT}/laender.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("countries", len(lst), "raster", w2, h2, "png bytes", len(buf.getvalue()))
print([l[:2] for l in lst if not l[0]])
