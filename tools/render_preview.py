#!/usr/bin/env python3
"""Paints the built world the way the game will, to judge the design without starting the game.
    python3 tools/render_preview.py <erde_W.npz> <out.png>
The colours here are the reference for terrainColor() in src/06_view.js."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage
d = np.load(sys.argv[1]); cls, mag, hgt = d["cls"], d["mag"].astype(np.float32), d["hgt"].astype(np.float32)
H, W = cls.shape
cover = cls & 7; river = (cls & 8) > 0; big = (cls & 16) > 0; taiga = (cls & 32) > 0; jungle = (cls & 64) > 0; snow = (cls & 128) > 0
land = cover > 0
#                 water        grass            farm             forest          desert           tundra           ice              swamp
BASE = np.array([[0, 0, 0], [178, 205, 134], [208, 214, 146], [112, 154, 98], [230, 213, 164], [180, 181, 158], [241, 246, 249], [132, 168, 150]], np.float32)
rgb = BASE[cover]
rgb[taiga] = (92, 132, 106); rgb[jungle] = (78, 142, 90)
# height: the harder the ground, the more it turns to bare rock
t = np.clip((mag - 9) / 19, 0, 1)[..., None]
rock = np.array([158, 148, 134], np.float32)
ice = cover == 6
rgb = np.where(ice[..., None], rgb, rgb * (1 - 0.6 * t) + rock * 0.6 * t)
rgb[snow] = rgb[snow] * 0.12 + np.array([244, 246, 248], np.float32) * 0.88
# Relief shading from the real height at half resolution (what the game ships), lit from the
# north-west. tanh keeps plains flat and calm and stops the great ranges from turning black.
h2 = hgt[:H // 2 * 2, :W // 2 * 2].reshape(H // 2, 2, W // 2, 2).mean(axis=(1, 3))
e = (np.round(h2) / 255.0) ** 2 * 8850.0
gx = np.roll(e, -1, 1) - np.roll(e, 1, 1); gy = np.roll(e, -1, 0) - np.roll(e, 1, 0)
sh = np.tanh((gx + gy) / 900.0)
lum2 = 1 + np.where(sh > 0, 0.16, 0.24) * sh
lum = ndimage.zoom(lum2, (H / lum2.shape[0], W / lum2.shape[1]), order=1)
lum[~land] = 1
rgb *= lum[..., None]
# rivers
rc = np.array([96, 160, 212], np.float32)
rgb[river] = rgb[river] * 0.25 + rc * 0.75
rgb[big] = (74, 142, 204)
# water: light near the coast, deep blue far out
dist = ndimage.distance_transform_edt(~land).astype(np.float32)
k = np.clip(dist / 26, 0, 1)[..., None] ** 0.8
sea = np.array([98, 166, 206], np.float32) * (1 - k) + np.array([38, 88, 146], np.float32) * k
rgb = np.where(land[..., None], rgb, sea)
img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB")
img.save(sys.argv[2])
if len(sys.argv) > 3:
    for spec in sys.argv[3:]:
        name, x, y, w, h, z = spec.split(",")
        x, y, w, h, z = int(x), int(y), int(w), int(h), int(z)
        img.crop((x, y, x + w, y + h)).resize((w * z, h * z), Image.NEAREST).save(sys.argv[2].replace(".png", f"_{name}.png"))
import json, io, base64, os
js = sys.argv[1].replace(".npz", ".json")
if os.path.exists(js):
    d = json.load(open(js)); buf = io.BytesIO()
    img.resize((264, round(264 * H / W)), Image.LANCZOS).save(buf, "PNG", optimize=True)
    d["thumb"] = base64.b64encode(buf.getvalue()).decode()
    json.dump(d, open(js, "w"), ensure_ascii=False, separators=(",", ":"))
print("ok", W, H)
