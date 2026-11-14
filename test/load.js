// Loads a map for the headless tests: the class maps of build/maps.json, or the Earth (build/erde.json).
const fs = require('fs'), path = require('path');
const sharp = require('/opt/npm-tools/node_modules/sharp');
const root = path.join(__dirname, '..');
async function gray(b64) {
  const r = await sharp(Buffer.from(b64, 'base64'), { limitInputPixels: false }).raw().toBuffer({ resolveWithObject: true });
  const ch = r.info.channels, n = r.info.width * r.info.height, out = new Uint8Array(n);
  if (ch === 1) out.set(r.data); else for (let i = 0; i < n; i++) out[i] = r.data[i * ch];
  return out;
}
module.exports = async function loadMap(G, id) {
  if (id === 'erde') {
    const def = JSON.parse(fs.readFileSync(path.join(root, 'build', 'erde.json'), 'utf8'));
    return G.buildWorld(def, await gray(def.png), await gray(def.mag), await gray(def.hgt));
  }
  const maps = JSON.parse(fs.readFileSync(path.join(root, 'build', 'maps.json'), 'utf8'));
  const m = maps.find((x) => x.id === id), g = await gray(m.png), cls = new Uint8Array(m.w * m.h);
  for (let i = 0; i < cls.length; i++) cls[i] = Math.round(g[i] / 85);
  return G.buildMap(m.w, m.h, cls, 12345, { id: m.id, name: m.name, nations: m.nations, lat: m.lat, lon: m.lon });
};
