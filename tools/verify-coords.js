// 使い方: node tools/verify-coords.js
// 日本語版Wikipediaの座標と照合し、3km以上ずれている/見つからないスポットを表示する。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console });
['data/prefectures.js', 'js/util.js', 'data/spots.js'].forEach((f) =>
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }));
const { SPOTS_BASE, util } = ctx.ZK;
const UA = { 'User-Agent': 'zekkei-map-personal/1.0 (personal hobby project)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Wikipediaの記事名が違うスポットはここで指定する(id: 記事名)
const TITLE = {
  s09: '河童橋', s10: '黒部峡谷鉄道', s14: '美瑛町', s16: '函館山', s22: '蔵王連峰', s23: '立石寺',
  s26: '裏磐梯', s33: '鋸山_(千葉県)', s43: '足助町',
};

(async () => {
  let bad = 0;
  for (const s of SPOTS_BASE) {
    const title = TITLE[s.id] || s.name.replace(/\(.*\)$/, '').replace(/^屋久島 /, '');
    const u = 'https://ja.wikipedia.org/w/api.php?' + new URLSearchParams({
      action: 'query', prop: 'coordinates', titles: title, redirects: '1', format: 'json', formatversion: '2' });
    try {
      let j;
      for (let k = 0; ; k++) { // レート制限(非JSON応答)時は待って再試行
        const txt = await (await fetch(u, { headers: UA })).text();
        try { j = JSON.parse(txt); break; } catch (e) { if (k >= 5) throw e; await sleep(3000 * (k + 1)); }
      }
      const c = (((j.query || {}).pages || [])[0] || {}).coordinates;
      if (!c || !c.length) { console.log(`?  ${s.id} ${s.name}: Wikipediaに座標なし(記事名「${title}」)`); bad++; }
      else {
        const d = util.haversine(s, { lat: c[0].lat, lng: c[0].lon });
        if (d > 3) { console.log(`NG ${s.id} ${s.name}: ${d.toFixed(1)}km ずれ  正: ${c[0].lat},${c[0].lon}  現: ${s.lat},${s.lng}`); bad++; }
      }
    } catch (e) { console.log(`?  ${s.id} ${s.name}: ${e.message}`); bad++; }
    await sleep(500);
  }
  console.log(`\n確認が必要: ${bad}件 / ${SPOTS_BASE.length}件`);
})();
