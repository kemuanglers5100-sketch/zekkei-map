// 使い方: node tools/fetch-photos.js   → data/photos.js を生成(数分かかる)
// 検索で拾った写真が別物のことがある。生成後に必ず画面で目視確認すること。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console });
['data/prefectures.js', 'js/util.js', 'data/spots.js'].forEach((f) =>
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const spots = ctx.ZK.SPOTS_BASE;

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = { 'User-Agent': 'zekkei-map-personal/1.0 (personal hobby project)' };
const OK_LICENSE = /^(CC BY|CC BY-SA|CC0|Public domain|PD)/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (h) => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// 429/5xx は最大5回まで指数バックオフで再試行(無限ループしない)
async function fetchRetry(url, opts) {
  let last;
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch(url, opts);
      if (r.status !== 429 && r.status < 500) return r;
      last = new Error('HTTP ' + r.status);
    } catch (e) { last = e; }
    await sleep(1000 * Math.pow(2, i));
  }
  throw last;
}
async function api(params) {
  const r = await fetchRetry(API + '?' + new URLSearchParams(Object.assign({ format: 'json', formatversion: '2' }, params)), { headers: UA });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
async function reachable(url) {
  try { return (await fetchRetry(url, { method: 'HEAD', headers: UA })).ok; } catch (e) { return false; }
}
async function photosFor(spot) {
  const name = spot.name.replace(/\(.*\)$/, '');
  const s = await api({ action: 'query', list: 'search', srsearch: name + ' filetype:bitmap', srnamespace: '6', srlimit: '12' });
  const titles = ((s.query || {}).search || []).map((x) => x.title);
  if (!titles.length) return [];
  const info = await api({ action: 'query', prop: 'imageinfo', titles: titles.join('|'), iiprop: 'url|extmetadata|size', iiurlwidth: '1000' });
  const out = [];
  for (const p of (info.query || {}).pages || []) {
    const ii = (p.imageinfo || [])[0];
    if (!ii || !ii.thumburl || ii.width < ii.height) continue;          // 横長のみ
    const m = ii.extmetadata || {};
    const lic = strip((m.LicenseShortName || {}).value);
    if (!OK_LICENSE.test(lic)) continue;
    if (!(await reachable(ii.thumburl))) continue;
    out.push({ url: ii.thumburl, credit: (strip((m.Artist || {}).value) || '不明') + ' / Wikimedia Commons', license: lic, page: ii.descriptionurl });
    if (out.length >= 3) break;
  }
  return out;
}

(async () => {
  const map = {};
  let n = 0;
  for (const s of spots) {
    try { map[s.id] = await photosFor(s); } catch (e) { map[s.id] = []; console.log(`ERR ${s.name}: ${e.message}`); }
    if (map[s.id].length) n++;
    console.log(`${s.id} ${s.name}: ${map[s.id].length}枚`);
    await sleep(300);
  }
  const out = "(function (root) {\n  (root.ZK = root.ZK || {}).PHOTOS = " + JSON.stringify(map, null, 1) + ";\n})(typeof window !== 'undefined' ? window : globalThis);\n";
  fs.writeFileSync(path.join(root, 'data', 'photos.js'), out);
  console.log(`\n写真あり: ${n}/${spots.length}件 → data/photos.js`);
})();
