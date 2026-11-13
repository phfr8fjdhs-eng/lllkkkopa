#!/usr/bin/env python3
"""Step 2 of the world map: build the playable Earth from real data.

    python3 tools/build_world.py <geo dir> <work dir> <out dir> [width]

Sources (see README, section "Die Erde"):
  * coast, lakes, rivers, country seats: Natural Earth 1:10m (public domain)
  * height of the land: Global Map Elevation (c) Geospatial Information Authority of Japan
  * what grows there: Global Map Land Cover GLCNMO and Percent Tree Cover
    (c) Geospatial Information Authority of Japan, Chiba University and Collaborating Organizations

What comes out, one value per tile:
  cover   0 water, 1 grassland, 2 farmland, 3 forest, 4 desert, 5 tundra, 6 ice, 7 swamp
  river   1 where a river runs through a land tile
  mag     0..30, how hard the ground is to cross: 0-9 lowland, 10-19 highland, 20-30 mountains
  height  0..255, real height (compressed) for the shading of the relief
"""
import json, math, sys, io, base64, time
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

GEO, WORK, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
W = int(sys.argv[4]) if len(sys.argv) > 4 else 5600
LON0, LAT_S, LAT_N = -169.2, -57.5, 79.5        # the cut runs through the Bering Strait; Antarctica is left out
T0 = time.time()
def log(*a): print(f"[{time.time() - T0:6.1f}s]", *a, flush=True)

# ---------------------------------------------------------------- projection
# Patterson cylindrical (Tom Patterson, 2014): a compromise made for world maps. Shapes stay
# familiar, and the far north is stretched far less than on Mercator, so Europe has room
# without Greenland and Siberia swallowing the map.
def pat(phi):
    p2 = phi * phi
    return phi * (1.0148 + p2 * p2 * (0.23185 + p2 * (-0.14499 + p2 * 0.02406)))
YN, YS = pat(math.radians(LAT_N)), pat(math.radians(LAT_S))
H = int(round(W * (YN - YS) / math.radians(360)))
_tab_phi = np.linspace(math.radians(-89), math.radians(89), 20001)
_tab_y = pat(_tab_phi)
def lat_of_row(j, s=1.0):                       # latitude in degrees of the middle of row j (rows of 1/s tile)
    y = YN - (np.asarray(j, dtype=np.float64) + 0.5) / (H * s) * (YN - YS)
    return np.degrees(np.interp(y, _tab_y, _tab_phi))
def px(lon, lat, s=1.0):
    return ((lon - LON0) / 360.0 * W * s, (YN - pat(math.radians(max(-89.0, min(89.0, lat))))) / (YN - YS) * H * s)
log("grid", W, H, W * H, "tiles; one tile at the equator is", round(40075 / W, 2), "km wide")

def load(n): return json.load(open(f"{GEO}/{n}.geojson"))
def polys(geom):
    if geom is None: return []
    if geom["type"] == "Polygon": return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon": return geom["coordinates"]
    return []
def lines(geom):
    if geom is None: return []
    if geom["type"] == "LineString": return [geom["coordinates"]]
    if geom["type"] == "MultiLineString": return geom["coordinates"]
    return []
def shift_of(ring):
    """Rings west of the left edge belong on the right side of the map (Chukotka, the western Aleutians)."""
    mean = sum(p[0] for p in ring) / len(ring)
    return 360.0 if mean < LON0 else 0.0
def ring_pts(ring, s):
    sh = shift_of(ring)
    return [px(p[0] + sh, p[1], s) for p in ring]
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
    return (np.asarray(ext) > 0) & ~(np.asarray(holes) > 0)
def cover_of(mask, s):                          # share of every tile that the fine mask covers
    return mask.reshape(H, s, W, s).mean(axis=(1, 3), dtype=np.float32)

# ---------------------------------------------------------------- land and water
SS = 3
land_v = load("ne_10m_land"); isl_v = load("ne_10m_minor_islands"); lakes_v = load("ne_10m_lakes")
hi = raster(land_v["features"] + isl_v["features"], SS)
landcov = cover_of(hi, SS); del hi
# Lakes: the big ones are water you can sail on. Anything smaller than a few tiles would only be
# a blue speck that splits nothing and helps nobody, so it stays land.
lk = raster(lakes_v["features"], SS)
lakecov = cover_of(lk, SS); del lk
land = landcov >= 0.5
lake = (lakecov >= 0.5) & land
lab, n = ndimage.label(lake)
sizes = ndimage.sum(lake, lab, range(1, n + 1))
MIN_LAKE = 7
lake &= np.isin(lab, [i + 1 for i, sz in enumerate(sizes) if sz >= MIN_LAKE])
land &= ~lake
log("land", int(land.sum()), "lakes kept", int((sizes >= MIN_LAKE).sum()), "of", n)

# Straits and canals that must be open to ships, as lines of water (lon, lat). On a grid of
# seven-kilometre tiles the Bosporus would otherwise silt up.
STRAITS = [
    [(-6.2, 35.9), (-5.6, 35.95), (-5.0, 36.05)],                                    # Gibraltar
    [(28.9, 40.92), (29.0, 41.05), (29.08, 41.15), (29.15, 41.3)],                   # Bosporus
    [(26.0, 39.95), (26.4, 40.2), (26.75, 40.45), (27.0, 40.55)],                    # Dardanelles
    [(43.2, 12.95), (43.45, 12.6), (43.7, 12.3)],                                    # Bab al-Mandab
    [(55.8, 26.45), (56.45, 26.58), (56.9, 26.2)],                                   # Hormuz
    [(12.65, 56.2), (12.7, 55.9), (12.75, 55.55), (12.6, 55.3)],                     # Oresund
    [(10.85, 55.85), (11.0, 55.35), (10.95, 54.85)],                                 # Great Belt
    [(9.75, 55.6), (9.85, 55.3), (10.0, 55.0)],                                      # Little Belt
    [(1.2, 51.15), (1.6, 50.95)],                                                    # Dover
    [(15.62, 38.3), (15.6, 38.0)],                                                   # Messina
    [(36.5, 45.5), (36.65, 45.15)],                                                  # Kerch
    [(141.6, 52.3), (141.75, 51.9)],                                                 # Tatar Strait
    [(140.2, 41.55), (141.2, 41.45)],                                                # Tsugaru
    [(130.8, 33.98), (131.0, 33.9)],                                                 # Kanmon
    [(-56.8, 51.6), (-56.2, 51.9)],                                                  # Belle Isle
    [(109.8, 20.2), (110.6, 20.15)],                                                 # Hainan
    [(79.5, 9.7), (79.6, 9.0)],                                                      # Palk
    [(103.6, 1.2), (104.1, 1.25)],                                                   # Singapore
    [(32.55, 29.9), (32.58, 30.3), (32.33, 30.6), (32.31, 31.0), (32.32, 31.3)],     # Suez Canal
    [(-79.55, 8.9), (-79.75, 9.1), (-79.9, 9.25), (-79.92, 9.4)],                    # Panama Canal
    [(-70.9, -52.6), (-70.4, -53.1), (-70.9, -53.8), (-71.8, -53.9), (-73.2, -53.3), (-74.6, -52.7)],  # Magellan
    [(23.0, 37.94), (22.96, 37.9)],                                                  # Corinth
    [(-123.2, 48.3), (-123.1, 48.7), (-123.3, 49.0)],                                # Haro / Georgia
    [(121.9, 38.9), (121.2, 38.7)],                                                  # Bohai
    [(9.3, 54.3), (9.9, 54.35), (10.15, 54.37)],                                     # Kiel Canal
    [(100.9, 2.5), (101.6, 2.2), (102.6, 1.6)],                                      # Malacca (narrow end)
]
cut = Image.new("L", (W, H), 0); dc = ImageDraw.Draw(cut)
for line in STRAITS:
    dc.line([px(a, b) for a, b in line], fill=255, width=2)
land &= ~(np.asarray(cut) > 0)

# Small islands that matter far more than their size: stepping stones, bases, choke points.
# On the real coastline most would be under half a tile and vanish. Each is given enough ground
# to stand a port and an airfield on (name, lon, lat, tiles across).
ISLANDS = [
    ("Malta", 14.4, 35.9, 3), ("Midway", -177.37, 28.2, 3), ("Wake", 166.63, 19.29, 3), ("Guam", 144.8, 13.45, 4),
    ("Diego Garcia", 72.42, -7.32, 3), ("Okinawa", 127.9, 26.5, 4), ("Bermuda", -64.75, 32.3, 3),
    ("Sao Miguel (Azoren)", -25.5, 37.8, 4), ("Terceira (Azoren)", -27.2, 38.72, 3), ("Madeira", -16.95, 32.75, 3),
    ("Kap Verde", -23.6, 15.1, 4), ("St. Helena", -5.7, -15.95, 3), ("Ascension", -14.35, -7.95, 3),
    ("Tristan da Cunha", -12.28, -37.1, 3), ("Suedgeorgien", -36.7, -54.3, 4), ("Male (Malediven)", 73.5, 4.2, 3),
    ("Mahe (Seychellen)", 55.5, -4.65, 3), ("Mauritius", 57.55, -20.25, 4), ("Reunion", 55.5, -21.1, 4),
    ("Sokotra", 53.9, 12.5, 4), ("Bahrain", 50.55, 26.05, 3), ("Faeroeer", -6.9, 62.0, 4), ("Jan Mayen", -8.3, 71.0, 3),
    ("Baereninsel", 19.0, 74.45, 3), ("Tahiti", -149.45, -17.65, 4), ("Samoa", -172.1, -13.75, 4), ("Tonga", -175.2, -21.15, 3),
    ("Galapagos", -91.1, -0.6, 4), ("Osterinsel", -109.35, -27.1, 3), ("Attu", 172.9, 52.9, 3), ("Adak", -176.65, 51.85, 3),
    ("Iwojima", 141.3, 24.78, 3), ("Saipan", 145.75, 15.2, 3), ("Palau", 134.55, 7.45, 3), ("Chuuk", 151.85, 7.42, 3),
    ("Kwajalein", 167.7, 8.75, 3), ("Tarawa", 173.0, 1.4, 3), ("Nauru", 166.93, -0.53, 2), ("Pitcairn", -130.1, -25.07, 2),
    ("Nassau (Bahamas)", -77.35, 25.05, 3), ("Barbados", -59.55, 13.15, 3), ("Martinique", -61.0, 14.65, 3),
    ("Curacao", -68.95, 12.15, 3), ("Gotland", 18.5, 57.5, 4), ("Bornholm", 14.9, 55.13, 3), ("Aland", 20.0, 60.2, 3),
    ("Shetland", -1.25, 60.3, 3), ("Orkney", -3.0, 59.0, 3), ("Isle of Man", -4.55, 54.2, 3), ("Helgoland", 7.89, 54.18, 2),
    ("Sansibar", 39.3, -6.1, 3), ("Komoren", 43.35, -11.65, 3), ("Jeju", 126.55, 33.38, 4), ("Tsushima", 129.3, 34.4, 3),
    ("Kinmen", 118.35, 24.45, 2), ("Hongkong", 114.15, 22.3, 3), ("Singapur", 103.82, 1.35, 3), ("Bonin", 142.2, 27.07, 2),
    ("Johnston", -169.53, 16.73, 2), ("Kiritimati", -157.4, 1.87, 3), ("Norfolk", 167.95, -29.03, 2), ("Lord Howe", 159.08, -31.55, 2),
    ("Kerguelen", 69.5, -49.3, 5), ("Amsterdam-Insel", 77.55, -37.83, 2), ("Kokosinseln", 96.85, -12.15, 2),
    ("Weihnachtsinsel", 105.65, -10.48, 3), ("Andamanen", 92.75, 11.7, 4), ("Nikobaren", 93.8, 7.0, 3), ("Lakshadweep", 72.63, 10.57, 2),
    ("Socorro", -110.97, 18.78, 2), ("Clipperton", -109.22, 10.3, 2), ("Fernando de Noronha", -32.42, -3.85, 2),
    ("Sao Tome", 6.6, 0.25, 3), ("Bioko", 8.75, 3.5, 4), ("Djerba", 10.85, 33.8, 3), ("Pantelleria", 12.0, 36.8, 2),
    ("Lampedusa", 12.6, 35.5, 2), ("Korfu", 19.85, 39.6, 3), ("Rhodos", 28.0, 36.2, 3), ("Lemnos", 25.25, 39.9, 3),
    ("Ibiza", 1.4, 38.98, 3), ("Menorca", 4.1, 39.95, 3), ("Elba", 10.25, 42.78, 2), ("Wrangel", -179.4, 71.2, 5),
    ("Pribilof", -170.3, 57.15, 2), ("St. Matthew", -172.7, 60.4, 3), ("Sachalin-Sued", 142.75, 46.6, 0),
    ("Dominica", -61.35, 15.42, 3), ("Grenada", -61.68, 12.12, 3), ("Antigua", -61.8, 17.07, 3), ("Guadeloupe", -61.55, 16.25, 3),
    ("St. Lucia", -60.98, 13.9, 3), ("Aruba", -69.97, 12.52, 2), ("Cayman", -81.25, 19.32, 2), ("Cozumel", -86.92, 20.43, 3),
    ("Catalina", -118.42, 33.38, 2), ("Vanua Levu", 179.3, -16.6, 0), ("Niue", -169.87, -19.05, 2), ("Rarotonga", -159.78, -21.23, 2),
    ("Tuvalu", 179.2, -8.52, 2), ("Yap", 138.12, 9.53, 2), ("Pohnpei", 158.22, 6.88, 3), ("Kosrae", 162.98, 5.32, 2),
    ("Majuro", 171.2, 7.1, 2), ("Wallis", -176.2, -13.28, 2), ("Marquesas", -140.1, -8.9, 3), ("Tubuai", -149.47, -23.37, 2),
    ("Mayotte", 45.15, -12.82, 2), ("Rodrigues", 63.42, -19.72, 2), ("Agalega", 56.6, -10.43, 2), ("Bouvet", 3.35, -54.42, 2),
    ("Gough", -9.93, -40.32, 2), ("Trindade", -29.33, -20.52, 2), ("Sable", -59.92, 43.93, 2), ("St. Pierre", -56.3, 46.85, 2),
]
yy, xx = np.mgrid[0:H, 0:W]
made = 0
for name, lon, lat, size in ISLANDS:
    if size <= 0: continue
    x, y = px(lon + (360.0 if lon < LON0 else 0.0), lat)
    xi, yi = int(x), int(y)
    if not (4 <= xi < W - 4 and 4 <= yi < H - 4): continue
    r = size / 2 + 0.35
    y0, y1, x0, x1 = yi - 6, yi + 7, xi - 6, xi + 7
    win = land[y0:y1, x0:x1]
    disc = (xx[y0:y1, x0:x1] + 0.5 - x) ** 2 + (yy[y0:y1, x0:x1] + 0.5 - y) ** 2 <= r * r
    if (win & disc).sum() >= disc.sum() * 0.8: continue      # already there in full
    win |= disc; made += 1
log("small islands given ground:", made, "of", len(ISLANDS))

# Tidy up: specks of land too small to stand on, puddles of sea cut off by the raster.
lab, n = ndimage.label(land)
sizes = ndimage.sum(land, lab, range(1, n + 1))
land &= ~np.isin(lab, [i + 1 for i, sz in enumerate(sizes) if sz < 4])
wlab, wn = ndimage.label(~land)
wsizes = ndimage.sum(~land, wlab, range(1, wn + 1))
land |= np.isin(wlab, [i + 1 for i, sz in enumerate(wsizes) if sz < MIN_LAKE])
lab, n = ndimage.label(land)
log("land tiles", int(land.sum()), f"({land.mean() * 100:.1f} %)", "islands and continents", n, "bodies of water", int((wsizes >= MIN_LAKE).sum()))

# ---------------------------------------------------------------- sampling the 2' grids
lat_rows = lat_of_row(np.arange(H))
lon_cols = LON0 + (np.arange(W) + 0.5) / W * 360.0
gy = (90.0 - lat_rows) * 30.0 - 0.5                           # fractional row in the 2' grid
gx = ((lon_cols + 180.0) % 360.0) * 30.0 - 0.5
GY, GX = np.meshgrid(gy, gx, indexing="ij")
def sample(name, order=1):
    a = np.load(f"{WORK}/{name}.npy").astype(np.float32)
    return ndimage.map_coordinates(a, [GY, GX], order=order, mode="grid-wrap", prefilter=False)

elev = sample("elev")
rough = sample("emax") - sample("emin")                       # height difference inside 4 km: how steep it is locally
landf = sample("landf") / 255.0
# The data and the drawn coast do not agree to the tile. Where a land tile has no height in the
# data, take it from the nearest tile that has.
have = landf > 0.2
idx = ndimage.distance_transform_edt(~have, return_distances=False, return_indices=True)
def fill(a): return a[idx[0], idx[1]]
elev = np.where(land, fill(elev), 0).astype(np.float32); rough = np.where(land, fill(rough), 0).astype(np.float32)
elev = np.maximum(elev, 0)
log("height sampled; highest tile", int(elev.max()), "m")

# Ruggedness over a wider neighbourhood: the range of heights within about 25 km.
k = 5
rug = ndimage.maximum_filter(elev, size=k) - ndimage.minimum_filter(elev, size=k)
rug = np.maximum(rug, rough)
rug = ndimage.gaussian_filter(rug, 1.0)

# How hard the ground is to cross, 0..30. Steepness counts most (the Alps), sheer altitude adds
# to it (Tibet is thin air even where it is flat). Under 10 is lowland, 10-19 highland, 20+ mountains.
score = rug / 55.0 + elev / 260.0
mag = np.clip(np.round(ndimage.gaussian_filter(score, 0.7)), 0, 30).astype(np.uint8)
mag[~land] = 0
for a, b, nme in ((0, 10, "lowland"), (10, 20, "highland"), (20, 31, "mountains")):
    log(f"  {nme}: {((mag >= a) & (mag < b) & land).sum() / land.sum() * 100:.1f} % of the land")

# ---------------------------------------------------------------- what grows there
tree = fill(sample("tree"))
g = {n: fill(sample("lc_" + n)) / 255.0 for n in ("forest", "rain", "needle", "open_tree", "shrub", "herb", "sparse", "crop", "wet", "rock", "sand", "ice")}
abslat = np.abs(lat_rows)[:, None] * np.ones((1, W), np.float32)
# Where trees give up: at sea level near 72 degrees north, 77 m lower for every degree towards
# the pole (2000 m in the Alps, 3100 m in Tibet). `cold` is 72 on that line and above it beyond.
cold = abslat + elev / 77.0
# Where snow stays all year: about 4800 m at the equator, 2800 m in the Alps, sea level in the high Arctic.
snowline = np.clip(5000.0 - 62.0 * np.maximum(abslat - 12.0, 0), 0, 5000)

GRASS, FARM, FOREST, DESERT, TUNDRA, ICE, SWAMP = 1, 2, 3, 4, 5, 6, 7
def smooth(a, s=1.2): return ndimage.gaussian_filter(a.astype(np.float32), s)
# Smoothed shares, so the map shows regions instead of salt and pepper.
f_forest = smooth(np.maximum(g["forest"], tree / 100.0 * 1.15))
# Dry land: bare rock and sand, sparse growth, and scrub (the Australian outback, the Kalahari,
# the Great Basin are scrub in the data, not sand).
f_dry = smooth(g["rock"] + g["sand"] + 0.85 * g["sparse"] + 0.55 * g["shrub"])
f_bare = smooth(g["rock"] + g["sand"] + 0.85 * g["sparse"])
f_crop = smooth(g["crop"])
f_wet = smooth(g["wet"], 1.0)
f_ice = smooth(g["ice"], 0.8)

cover = np.full((H, W), GRASS, np.uint8)
cover[f_crop >= 0.5] = FARM
cover[(f_dry >= 0.5) & (cold < 62)] = DESERT
cover[(f_bare >= 0.4) & (cold >= 62)] = TUNDRA
cover[(cold >= 72) & (f_forest < 0.3)] = TUNDRA          # above the tree line everything that is not forest
cover[f_forest >= 0.5] = FOREST
cover[f_wet >= 0.4] = SWAMP
gl = raster(load("ne_10m_glaciated_areas")["features"], 1)
cover[(f_ice >= 0.5) | gl] = ICE
cover[~land] = 0
# A region has to be big enough to matter: patches of fewer than MINP tiles take the cover of
# their surroundings. That is what keeps the map calm to look at.
MINP = {GRASS: 10, FARM: 14, FOREST: 10, DESERT: 14, TUNDRA: 12, ICE: 5, SWAMP: 14}
ALL = (GRASS, FARM, FOREST, DESERT, TUNDRA, ICE, SWAMP)
for _ in range(2):
    for c in ALL:
        m = cover == c
        lb, k = ndimage.label(m)
        if not k: continue
        sz = ndimage.sum(m, lb, range(1, k + 1))
        small = np.isin(lb, [i + 1 for i, v in enumerate(sz) if v < MINP[c]])
        if not small.any(): continue
        best = np.zeros((H, W), np.float32); pick = np.zeros((H, W), np.uint8)
        for c2 in ALL:
            if c2 == c: continue
            v = ndimage.uniform_filter((cover == c2).astype(np.float32), 7)
            up = v > best; best[up] = v[up]; pick[up] = c2
        fix = small & (pick > 0)
        cover[fix] = pick[fix]
names = ["Wasser", "Grasland", "Ackerland", "Wald", "Wüste", "Tundra", "Eis", "Sumpf"]
for c in range(1, 8): log(f"  {names[c]}: {(cover == c).sum() / land.sum() * 100:.1f} % of the land")
# Snow on the peaks, for the picture: above the snow line and steep. (A high plain like Tibet is
# cold and dry, not white.)
snow = land & (cover != ICE) & (elev > snowline) & (rug > 550)
# two shades of forest for the picture only: taiga (needle) and rain forest
taiga = (cover == FOREST) & ((smooth(g["needle"]) > 0.3) | (abslat > 52))
jungle = (cover == FOREST) & (smooth(g["rain"]) > 0.4) & (abslat < 28)

# ---------------------------------------------------------------- rivers
RIVER_RANK = int(sys.argv[5]) if len(sys.argv) > 5 else 6
rv = load("ne_10m_rivers_lake_centerlines_scale_rank")
rimg = Image.new("L", (W, H), 0); dr = ImageDraw.Draw(rimg)
big = Image.new("L", (W, H), 0); db = ImageDraw.Draw(big)
for f in rv["features"]:
    p = f["properties"]; sr = p.get("scalerank")
    if sr is None or sr > RIVER_RANK or p.get("featurecla") not in ("River", "Lake Centerline", "Canal"): continue
    for ln in lines(f["geometry"]):
        sh = shift_of(ln)
        pts = [px(q[0] + sh, q[1]) for q in ln]
        if len(pts) >= 2:
            dr.line(pts, fill=255, width=1)
            if sr <= 3: db.line(pts, fill=255, width=1)
river = (np.asarray(rimg) > 0) & land
bigriver = (np.asarray(big) > 0) & land
# a river that is one stray tile long says nothing
rl, rn = ndimage.label(river, structure=np.ones((3, 3)))
rs = ndimage.sum(river, rl, range(1, rn + 1))
river &= ~np.isin(rl, [i + 1 for i, sz in enumerate(rs) if sz < 5])
bigriver &= river
log("river tiles", int(river.sum()), "of which great rivers", int(bigriver.sum()))

# ---------------------------------------------------------------- nations
countries = load("ne_10m_admin_0_countries")
SHORT = {"Volksrepublik China": "China", "Vereinigte Staaten": "USA", "Vereinigtes Königreich": "Grossbritannien",
         "Demokratische Republik Kongo": "DR Kongo", "Republik Kongo": "Kongo", "Vereinigte Arabische Emirate": "VAE",
         "Zentralafrikanische Republik": "Zentralafrika", "Dominikanische Republik": "Dom. Republik",
         "Bosnien und Herzegowina": "Bosnien", "Republik China": "Taiwan", "Trinidad und Tobago": "Trinidad",
         "Französische Süd- und Antarktisgebiete": "", "Türkische Republik Nordzypern": "Nordzypern", "Republik Zypern": "Zypern",
         "Königreich Dänemark": "Dänemark", "Königreich der Niederlande": "Niederlande", "Staat Palästina": "Palästina",
         "Demokratische Arabische Republik Sahara": "Westsahara", "Föderierte Staaten von Mikronesien": "Mikronesien",
         "St. Vincent und die Grenadinen": "St. Vincent", "Antigua und Barbuda": "Antigua", "São Tomé und Príncipe": "São Tomé"}
sizes = ndimage.sum(land, lab, range(1, n + 1))
cands = []
for f in countries["features"]:
    p = f["properties"]
    name = (p.get("NAME_DE") or p.get("NAME") or "").replace("ß", "ss")
    name = SHORT.get(name, name)
    if not name: continue
    # Dwarf states and dependent territories would start level with France. They stay out
    # (Greenland is the exception: too large a piece of the map to leave to nobody).
    if (p.get("POP_EST") or 0) < 300_000 and name not in ("Grönland", "Island") or name in ("Macau", "Nordzypern"): continue
    if p.get("TYPE") in ("Dependency", "Lease", "Indeterminate") and name not in ("Grönland", "Puerto Rico"): continue
    lon, lat = p.get("LABEL_X"), p.get("LABEL_Y")
    if name == "Grönland": lon, lat = -51.7, 64.2          # Nuuk: the label sits on the ice cap
    if lon is None or lat is None or not (LAT_S < lat < LAT_N): continue
    if lon < LON0: lon += 360
    x, y = px(lon, lat); x = int(x); y = int(y)
    if not (6 <= x < W - 6 and 6 <= y < H - 6): continue
    best = None
    for r in range(0, 60, 2):
        ys, xs = slice(max(0, y - r), min(H, y + r + 1)), slice(max(0, x - r), min(W, x + r + 1))
        ok = land[ys, xs] & (cover[ys, xs] != ICE) & (sizes[np.maximum(lab[ys, xs], 1) - 1] >= 6)
        if ok.any():
            py, pxx = np.nonzero(ok)
            d = (py + ys.start - y) ** 2 + (pxx + xs.start - x) ** 2
            i = int(d.argmin()); best = (int(pxx[i] + xs.start), int(py[i] + ys.start)); break
    if not best: log("  no ground found for", name, lon, lat); continue
    iso = p.get("ISO_A2_EH") or p.get("ISO_A2") or ""
    if not (len(iso) == 2 and iso.isalpha()): iso = ""
    cands.append(dict(n=name, x=best[0], y=best[1], pop=p.get("POP_EST") or 0, gdp=p.get("GDP_MD") or 0, iso=iso))
cands.sort(key=lambda c: -c["pop"])
MIND = max(14, round(W / 280))
chosen = []
for c in cands:
    if all((c["x"] - o["x"]) ** 2 + (c["y"] - o["y"]) ** 2 >= MIND ** 2 for o in chosen): chosen.append(c)
    else: log("  too close to a bigger neighbour:", c["n"])
by_gdp = sorted(chosen, key=lambda c: -c["gdp"])
for i, c in enumerate(by_gdp):
    c["s"] = 3 if i < len(by_gdp) * 0.15 else (2 if i < len(by_gdp) * 0.5 else 1)
log("nations", len(chosen), "of", len(cands), "countries")

# ---------------------------------------------------------------- files for the game
# 1) classes: cover in the low three bits, river in bit 3, great river in bit 4, taiga bit 5, rain forest bit 6, snow cap bit 7
cls = cover.copy()
cls[river] |= 8; cls[bigriver] |= 16
cls[taiga] |= 32; cls[jungle] |= 64; cls[snow] |= 128
# 2) crossing cost 0..30 (bits 0-4)
# 3) real height for the shading, at half the resolution: sqrt-compressed so that lowland hills
#    keep their shape and the Himalaya still fits into a byte
hgt = np.clip(np.sqrt(np.maximum(elev, 0) / 8850.0) * 255.0, 0, 255)
hgt[~land] = 0
h2 = hgt[:H // 2 * 2, :W // 2 * 2].reshape(H // 2, 2, W // 2, 2).mean(axis=(1, 3))
def png(a, mode="L"):
    buf = io.BytesIO(); Image.fromarray(a.astype(np.uint8), mode).save(buf, "PNG", optimize=True); return buf.getvalue()
p_cls, p_mag, p_hgt = png(cls), png(mag), png(np.round(h2))
log("png bytes: classes", len(p_cls), "cost", len(p_mag), "height", len(p_hgt))
np.savez_compressed(f"{OUT}/erde_{W}.npz", cls=cls, mag=mag, hgt=np.round(hgt).astype(np.uint8), elev=elev.astype(np.int16))
world = dict(id="erde", name="Erde", w=W, h=H, v=2, png=base64.b64encode(p_cls).decode(), mag=base64.b64encode(p_mag).decode(),
             hgt=base64.b64encode(p_hgt).decode(), nations=[[c["n"], c["x"], c["y"], c["s"], c["iso"]] for c in chosen],
             credit="Natural Earth; Global Map © Geospatial Information Authority of Japan, Chiba University and Collaborating Organizations")
json.dump(world, open(f"{OUT}/erde_{W}.json", "w"), ensure_ascii=False, separators=(",", ":"))
log("written", f"{OUT}/erde_{W}.json")
