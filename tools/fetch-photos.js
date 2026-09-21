// 使い方:
//   node tools/fetch-photos.js           → data/photos.generated.js を生成(data/photos.js は触らない。数分〜かかる)
//   node tools/fetch-photos.js --write   → data/photos.js を置き換える(既存は data/photos.backup.js に退避。
//                                          既にあれば photos.backup-YYYYMMDD-HHMMSS.js。ファイルは削除しない)
// 環境変数: FETCH_PHOTOS_LIMIT=N(先頭N件のみ処理) / COMMONS_API=URL(APIの向き先を変更)
// 警告: 再生成すると、手作業で除去した不適切な写真(s01/s26など)が復活する。
//   生成後はコンタクトシート等で必ず目視確認し、間違った写真を再度取り除くこと。
// 取得エラーが1件でもある/写真が0件のときは非0終了し、--write は拒否する。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console });
['data/prefectures.js', 'js/util.js', 'data/spots.js'].forEach((f) =>
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const LIMIT = parseInt(process.env.FETCH_PHOTOS_LIMIT || '0', 10);
const spots = LIMIT > 0 ? ctx.ZK.SPOTS_BASE.slice(0, LIMIT) : ctx.ZK.SPOTS_BASE;
const WRITE = process.argv.includes('--write');

const API = process.env.COMMONS_API || 'https://commons.wikimedia.org/w/api.php';
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
  const errIds = [];
  let n = 0;
  for (const s of spots) {
    try { map[s.id] = await photosFor(s); } catch (e) { map[s.id] = []; errIds.push(s.id); console.log(`ERR ${s.name}: ${e.message}`); }
    if (map[s.id].length) n++;
    console.log(`${s.id} ${s.name}: ${map[s.id].length}枚`);
    await sleep(300);
  }
  const out = "(function (root) {\n  (root.ZK = root.ZK || {}).PHOTOS = " + JSON.stringify(map, null, 1) + ";\n})(typeof window !== 'undefined' ? window : globalThis);\n";
  fs.writeFileSync(path.join(root, 'data', 'photos.generated.js'), out);
  console.log(`
写真あり: ${n}/${spots.length}件 → data/photos.generated.js`);
  console.log(`ERR spots: ${errIds.length}${errIds.length ? ' (ids ' + errIds.join(', ') + ')' : ''}`);
  const bad = errIds.length > 0 || n === 0;
  if (WRITE) {
    if (bad) { console.error('--write を拒否: エラーがあるか写真が0件です。data/photos.js は変更していません。'); process.exit(1); }
    const dest = path.join(root, 'data', 'photos.js');
    if (fs.existsSync(dest)) {
      let b = path.join(root, 'data', 'photos.backup.js');
      if (fs.existsSync(b)) {
        const d = new Date(), p = (x) => String(x).padStart(2, '0');
        const ts = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
        b = path.join(root, 'data', `photos.backup-${ts}.js`);
      }
      fs.copyFileSync(dest, b, fs.constants.COPYFILE_EXCL);
      console.log('backup → ' + path.relative(root, b));
    }
    fs.writeFileSync(dest, out);
    console.log('data/photos.js を更新しました');
  }
  if (bad) process.exit(1);
})();
