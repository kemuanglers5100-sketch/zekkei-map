// 使い方: node tools/build-map.js  → data/japan-map.js を生成
const fs = require('fs');
const path = require('path');

const URL_GEOJSON = 'https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson';
const W = 560;
const LON0 = 122, LAT0 = 46, C = Math.cos((38 * Math.PI) / 180);
const OKI = { dLon: -3, dLat: 4 };            // 沖縄を九州の西の海上にずらして表示(見た目が悪ければ調整)
const idOf = (f) => Number(f.properties.id);

(async () => {
  const res = await fetch(URL_GEOJSON);
  if (!res.ok) throw new Error('取得失敗 ' + res.status);
  const gj = await res.json();
  const raw = (lon, lat, id) => {
    if (id === 47) { lon += OKI.dLon; lat += OKI.dLat; }
    return [(lon - LON0) * C, LAT0 - lat];
  };
  // ポリゴン一覧(東京の小笠原など離島の遠方ポリゴンは除外)
  const items = [];
  for (const f of gj.features) {
    const id = idOf(f);
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const rings of polys) {
      if (id === 13 && rings[0].every((p) => p[1] < 32)) continue;
      items.push({ id, rings });
    }
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const bboxOf = { 47: [Infinity, -Infinity, Infinity, -Infinity] };
  for (const { id, rings } of items) for (const [lon, lat] of rings[0]) {
    const [x, y] = raw(lon, lat, id);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    if (id === 47) { const b = bboxOf[47]; b[0] = Math.min(b[0], x); b[1] = Math.max(b[1], x); b[2] = Math.min(b[2], y); b[3] = Math.max(b[3], y); }
  }
  const k = W / (maxX - minX);
  const tf = (lon, lat, id) => { const [x, y] = raw(lon, lat, id); return [(x - minX) * k, (y - minY) * k]; };
  const byId = {};
  for (const { id, rings } of items) {
    let d = '';
    for (const ring of rings) {
      let px = null, py = null, seg = '';
      for (const [lon, lat] of ring) {
        const [x, y] = tf(lon, lat, id);
        const rx = +x.toFixed(1), ry = +y.toFixed(1);
        if (rx === px && ry === py) continue;
        seg += (seg ? 'L' : 'M') + rx + ' ' + ry; px = rx; py = ry;
      }
      d += seg + 'Z';
    }
    byId[id] = (byId[id] || '') + d;
  }
  const ids = Object.keys(byId).map(Number).sort((a, b) => a - b);
  if (ids.length !== 47 || ids[0] !== 1 || ids[46] !== 47) throw new Error('都道府県が47件揃いません: ' + ids.length);
  const b = bboxOf[47], pad = 6;
  const H = Math.ceil((maxY - minY) * k);
  // 沖縄の枠: 余白padを付けつつ viewBox(0..W, 0..H)内に収める
  const ix0 = Math.max(0, (b[0] - minX) * k - pad), iy0 = Math.max(0, (b[2] - minY) * k - pad);
  const ix1 = Math.min(W, (b[1] - minX) * k + pad), iy1 = Math.min(H, (b[3] - minY) * k + pad);
  const inset = { x: +ix0.toFixed(1), y: +iy0.toFixed(1), w: +(ix1 - ix0).toFixed(1), h: +(iy1 - iy0).toFixed(1) };
  const map = {
    W, H,
    prefs: ids.map((id) => ({ id, d: byId[id] })),
    inset,
    proj: { lon0: LON0, lat0: LAT0, c: C, k, ox: minX, oy: minY },
    okinawa: OKI,
  };
  const out = "(function (root) {\n  (root.ZK = root.ZK || {}).MAP = " + JSON.stringify(map) + ";\n})(typeof window !== 'undefined' ? window : globalThis);\n";
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'japan-map.js'), out);
  console.log(`生成しました: W=${map.W} H=${map.H} size=${(out.length / 1024).toFixed(0)}KB`);
})();
