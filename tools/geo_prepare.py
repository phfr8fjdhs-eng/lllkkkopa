#!/usr/bin/env python3
"""Step 1 of the world map: boil the raw Global Map rasters (elevation 30", land cover 15",
tree cover 15") down to global grids of 2 arc-minutes that the map builder samples from.

    python3 tools/geo_prepare.py <dir with el/ lc/ ve/> <work dir>

Writes into the work dir, all 5400 x 10800 (row 0 = 90 N, column 0 = 180 W):
  elev.npy   int16   mean height of the land in the cell, metres (0 where there is none)
  emin.npy / emax.npy  int16  lowest and highest point in the cell (for ruggedness)
  landf.npy  uint8   share of the cell that is land, 0..255
  tree.npy   uint8   mean tree cover in per cent
  lc_<group>.npy uint8  share of the cell covered by a group of land-cover classes, 0..255
"""
import sys, glob, re, numpy as np, tifffile

SRC, OUT = sys.argv[1], sys.argv[2]
H, W = 5400, 10800

def block(a, k, fn):
    h, w = a.shape
    return fn(a.reshape(h // k, k, w // k, k), axis=(1, 3))

def origin(page):
    tp = page.tags['ModelTiepointTag'].value
    return int(round((tp[3] + 180) * 30)), int(round((90 - tp[4]) * 30))    # column, row in the 2' grid

# ---- elevation: 30" -> 2' (4 x 4)
ONLY = sys.argv[3] if len(sys.argv) > 3 else ''
elev = np.zeros((H, W), np.int16); emin = np.zeros((H, W), np.int16); emax = np.zeros((H, W), np.int16); landf = np.zeros((H, W), np.uint8)
for f in sorted(glob.glob(SRC + '/el/*.tif')):
    with tifffile.TiffFile(f) as t:
        p = t.pages[0]; x0, y0 = origin(p); a = p.asarray()
    land = (a > -9000) & (a < 9000)
    v = np.where(land, a, 0).astype(np.float32)
    cnt = block(land.astype(np.float32), 4, np.sum)
    mean = np.where(cnt > 0, block(v, 4, np.sum) / np.maximum(cnt, 1), 0)
    lo = block(np.where(land, a, 30000), 4, np.min); hi = block(np.where(land, a, -30000), 4, np.max)
    h, w = mean.shape
    elev[y0:y0 + h, x0:x0 + w] = np.round(mean)
    emin[y0:y0 + h, x0:x0 + w] = np.where(cnt > 0, lo, 0); emax[y0:y0 + h, x0:x0 + w] = np.where(cnt > 0, hi, 0)
    landf[y0:y0 + h, x0:x0 + w] = np.round(cnt / 16 * 255)
    print('el', f, x0, y0, h, w, flush=True)
for n, a in (('elev', elev), ('emin', emin), ('emax', emax), ('landf', landf)): np.save(f'{OUT}/{n}.npy', a)
del elev, emin, emax, landf

# ---- tree cover: 15" -> 2' (8 x 8)
tree = np.zeros((H, W), np.uint8)
for f in sorted(glob.glob(SRC + '/ve/*.tif')):
    with tifffile.TiffFile(f) as t:
        p = t.pages[0]; x0, y0 = origin(p); a = p.asarray()
    ok = a <= 100
    cnt = block(ok.astype(np.float32), 8, np.sum)
    m = np.where(cnt > 0, block(np.where(ok, a, 0).astype(np.float32), 8, np.sum) / np.maximum(cnt, 1), 0)
    h, w = m.shape
    tree[y0:y0 + h, x0:x0 + w] = np.round(m)
    print('ve', f, x0, y0, h, w, 'values', np.unique(a[::97, ::97])[-4:], flush=True)
np.save(f'{OUT}/tree.npy', tree); del tree

# ---- land cover (GLCNMO, 20 classes): share of each group of classes per cell
GROUPS = dict(forest=(1, 2, 3, 4, 5), rain=(1,), needle=(3, 4), open_tree=(6,), shrub=(7,), herb=(8, 9), sparse=(10,),
              crop=(11, 12, 13), wet=(14, 15), rock=(16,), sand=(17,), urban=(18,), ice=(19,), water=(20,))
acc = {g: np.zeros((H, W), np.uint8) for g in GROUPS}
for f in sorted(glob.glob(SRC + '/lc/*.tif')):
    with tifffile.TiffFile(f) as t:
        p = t.pages[0]; x0, y0 = origin(p); a = p.asarray()
    a = np.ascontiguousarray(a[::2, ::2])            # every second pixel is plenty for shares per 2' cell
    for g, codes in GROUPS.items():
        lut = np.zeros(256, np.uint8); lut[list(codes)] = 1
        fr = block(lut[a], 4, np.sum).astype(np.float32) / 16
        h, w = fr.shape
        acc[g][y0:y0 + h, x0:x0 + w] = np.round(fr * 255)
    print('lc', f, x0, y0, flush=True)
    del a
for g, a in acc.items(): np.save(f'{OUT}/lc_{g}.npy', a)
print('done')
