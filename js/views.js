(function (root) {
  const ZK = root.ZK, U = ZK.util, F = ZK.filter, UI = ZK.ui, esc = U.esc;
  const views = (ZK.views = ZK.views || {});
  const st = () => ZK.app.state;
  const seasonLabel = () => st().season || 'すべて';

  function grid(list, recs) {
    if (!list.length) return '<p class="empty">条件に合う絶景がありません。季節を「すべて」にするか、条件をゆるめてみてください。</p>';
    return `<div class="grid">${list.map((s) => UI.card(s, recs[s.id])).join('')}</div>`;
  }
  function notFound() { return '<p class="empty">ページが見つかりません。<a class="more" href="#/">ホームへ</a></p>'; }
  ZK.viewHelpers = { grid, notFound, seasonLabel };

  views.home = {
    render() {
      const all = ZK.app.spots(), recs = ZK.app.records();
      const inSeason = F.apply(all, { season: st().season });
      const counts = F.countByPref(inSeason);
      const regions = ZK.REGIONS.map((r) => `<div class="region"><b>${r}</b>${ZK.PREFS
        .map((p, i) => ({ p, id: i + 1 })).filter((x) => x.p.region === r)
        .map((x) => `<a class="chip${counts[x.id] ? '' : ' zero'}" href="#/pref/${x.id}">${x.p.label}<i>${counts[x.id] || 0}</i></a>`).join('')}</div>`).join('');
      const top = F.rank(all, { season: st().season }).slice(0, 6);
      return `<section class="hero"><h1>${esc(seasonLabel())}の絶景を、旅しよう。</h1><p>日本全国 ${all.length} 件の絶景から、次のお出かけ先を見つけよう。</p></section>
        <section class="panel"><div class="map-head"><h2>日本地図から探す</h2>
        <label class="switch"><input type="checkbox" id="pinToggle"${st().pins ? ' checked' : ''}> 行きたいピン</label></div>
        <div id="map" class="map"></div><p class="hint">県をタップすると、その県の絶景一覧が開きます(色が濃いほど件数が多い)</p>${regions}</section>
        <section><h2>${esc(seasonLabel())}のおすすめ TOP${top.length}</h2>${grid(top, recs)}<a class="more" href="#/ranking">ランキングをもっと見る →</a></section>`;
    },
    bind(el) {
      const all = ZK.app.spots(), recs = ZK.app.records();
      const pins = st().pins ? all.filter((s) => (recs[s.id] || {}).status === 'want') : [];
      ZK.map.render(el.querySelector('#map'), {
        counts: F.countByPref(F.apply(all, { season: st().season })), pins,
        onSelect: (id) => { location.hash = '#/pref/' + id; },
      });
      el.querySelector('#pinToggle').addEventListener('change', (e) => { st().pins = e.target.checked; ZK.app.rerender(); });
    },
  };

  views.pref = {
    render(arg) {
      const id = Number(arg), p = ZK.PREFS[id - 1];
      if (!p) return notFound();
      const list = F.rank(ZK.app.spots(), { season: st().season, prefId: id });
      return `<h2>${esc(p.name)}の絶景(${esc(seasonLabel())}) — ${list.length}件</h2>${grid(list, ZK.app.records())}<a class="more" href="#/">← 日本地図へ戻る</a>`;
    },
    bind() {},
  };
  // ---- 一覧(検索・フィルター・並び替え) ----
  const opt = (v, l, cur) => `<option value="${esc(v)}"${String(cur || '') === String(v) ? ' selected' : ''}>${esc(l)}</option>`;
  const fsel = (key, label, opts) => `<label class="fsel">${label}<select data-f="${key}">${opts}</select></label>`;

  views.list = {
    render() {
      const S = st(), all = ZK.app.spots(), recs = ZK.app.records();
      let rows = F.apply(all, Object.assign({}, S.f, { q: S.q, season: S.season }), recs);
      rows = S.sort === 'distance' && S.pos ? F.byDistance(rows, S.pos) : F.rank(rows, {});
      const filters = [
        fsel('prefId', '都道府県', opt('', 'すべて', S.f.prefId) + ZK.PREFS.map((p, i) => opt(i + 1, p.label, S.f.prefId)).join('')),
        fsel('category', 'カテゴリ', opt('', 'すべて', S.f.category) + ZK.CATEGORIES.map((c) => opt(c, c, S.f.category)).join('')),
        fsel('minRating', 'おすすめ度', opt('', 'すべて', S.f.minRating) + [5, 4, 3].map((r) => opt(r, `${U.rankLetter(r)}(★${r}以上)`, S.f.minRating)).join('')),
        fsel('badge', '実績・バッジ', opt('', 'すべて', S.f.badge) + F.allBadges(all).map((b) => opt(b, b, S.f.badge)).join('')),
        fsel('status', '記録', opt('', 'すべて', S.f.status) + opt('want', '行きたい', S.f.status) + opt('done', '行った', S.f.status)),
        fsel('sort', '並び順', opt('rating', 'おすすめ順', S.sort) + opt('distance', '現在地から近い順', S.sort)),
      ].join('');
      const q = S.q ? `<p class="meta">「${esc(S.q)}」の検索結果 <a class="more" href="#/list" id="clearQ">クリア</a></p>` : '';
      return `<h2>絶景をさがす(${esc(seasonLabel())}) — ${rows.length}件</h2>${q}<div class="filters">${filters}</div>${ZK.viewHelpers.grid(rows, recs)}`;
    },
    bind(el) {
      const S = st();
      el.querySelectorAll('[data-f]').forEach((x) => x.addEventListener('change', () => {
        const k = x.dataset.f;
        if (k === 'sort') {
          S.sort = x.value;
          if (x.value === 'distance' && !S.pos) {
            if (!navigator.geolocation) { alert('この環境では現在地を取得できません'); S.sort = 'rating'; return ZK.app.rerender(); }
            navigator.geolocation.getCurrentPosition(
              (p) => { S.pos = { lat: p.coords.latitude, lng: p.coords.longitude }; ZK.app.rerender(); },
              () => { alert('現在地を取得できませんでした(位置情報の許可と、HTTPSでの表示が必要です)'); S.sort = 'rating'; ZK.app.rerender(); });
            return;
          }
        } else S.f[k] = x.value;
        ZK.app.rerender();
      }));
      const c = el.querySelector('#clearQ');
      if (c) c.addEventListener('click', (e) => { e.preventDefault(); S.q = ''; ZK.app.rerender(); });
    },
  };

  // ---- 詳細 ----
  views.spot = {
    render(id) {
      const s = ZK.app.spots().find((x) => x.id === id);
      if (!s) return ZK.viewHelpers.notFound();
      const rec = ZK.app.store.record(s.id);
      const photos = (s.photos || []).length
        ? `<div class="gallery">${s.photos.map((p, i) => `<figure>${UI.photo(s, 'big', i)}<figcaption>${esc(p.credit || '')} ${p.license ? `(${esc(p.license)})` : ''}${U.safeUrl(p.page) ? ` <a href="${esc(U.safeUrl(p.page))}" target="_blank" rel="noopener">出典</a>` : ''}</figcaption></figure>`).join('')}</div>`
        : UI.fallback(s, 'big');
      const sources = (s.sources || []).length
        ? `<h3>出典・実績</h3><ul>${s.sources.map((x) => `<li>${esc(x.label)}${x.year ? `(${esc(x.year)})` : ''}${U.safeUrl(x.url) ? ` <a href="${esc(U.safeUrl(x.url))}" target="_blank" rel="noopener">リンク</a>` : ''}${x.note ? ` — ${esc(x.note)}` : ''}</li>`).join('')}</ul>` : '';
      return `<p><button class="more" type="button" data-a="back">← 戻る</button></p>${photos}
        <h1>${esc(s.name)}</h1>
        <p class="meta">${esc(U.prefLabels(s))} · <span class="stars">${U.stars(s.rating)}</span> <span class="rank">${U.rankLetter(s.rating)}ランク</span></p>
        <p class="tags">${(s.categories || []).map((c) => `<span class="tag">${esc(c)}</span>`).join('')}${UI.badges(s)}</p>
        <div class="card-actions" style="padding:8px 0">${UI.statusButtons(s, rec)}</div>
        <div class="panel"><h3>説明</h3><p>${esc(s.description)}</p>
          <h3>ベストシーズン</h3><p>${(s.seasons || []).map((x) => `<span class="tag">${esc(x)}</span>`).join(' ')}</p>
          <h3>アクセス</h3><p>${esc(s.access)}</p>
          <h3>地図</h3><iframe class="gmap" loading="lazy" src="https://maps.google.com/maps?q=${Number(s.lat)},${Number(s.lng)}&z=13&output=embed"></iframe>
          <p><a class="btn" href="${esc(U.mapUrl(s))}" target="_blank" rel="noopener">Googleマップで開く</a></p>${sources}</div>
        <div class="panel form"><h3>メモ</h3>
          <label class="l">行った日</label><input type="date" id="visitedAt" value="${esc(rec.visitedAt)}">
          <label class="l">ひとことメモ</label><textarea id="memo" rows="3" placeholder="次に行くときのメモ、感想など">${esc(rec.memo)}</textarea></div>`;
    },
    bind(el, id) {
      const back = el.querySelector('[data-a="back"]');
      if (back) back.addEventListener('click', () => history.back());
      const save = () => ZK.app.store.setRecord(id, { memo: el.querySelector('#memo').value, visitedAt: el.querySelector('#visitedAt').value });
      const memo = el.querySelector('#memo'), date = el.querySelector('#visitedAt');
      if (memo) { memo.addEventListener('change', save); date.addEventListener('change', save); }
    },
  };
  // ---- ランキング(全国総合 / 都道府県別 / 季節別) ----
  views.ranking = {
    render() {
      const S = st(), all = ZK.app.spots();
      const tabs = [['all', '全国総合'], ['pref', '都道府県別'], ['season', '季節別']]
        .map(([k, l]) => `<button data-tab="${k}" class="${S.rankTab === k ? 'on' : ''}">${l}</button>`).join('');
      const list = (rows, n) => rows.slice(0, n).map((s, i) => UI.rankRow(s, i + 1)).join('') || '<p class="empty">該当するスポットがありません。</p>';
      let body;
      if (S.rankTab === 'pref') {
        const sel = `<label class="fsel">都道府県<select id="rankPref">${ZK.PREFS.map((p, i) => opt(i + 1, p.label, S.rankPref)).join('')}</select></label>`;
        body = `${sel}<div class="panel">${list(F.rank(all, { prefId: S.rankPref }), 10)}</div>`;
      } else if (S.rankTab === 'season') {
        body = ZK.SEASONS.map((se) => `<div class="panel"><h2>${se}のTOP5</h2>${list(F.rank(all, { season: se }), 5)}</div>`).join('');
      } else {
        body = `<div class="panel"><h2>全国総合 TOP20</h2>${list(F.rank(all, {}), 20)}</div>`;
      }
      return `<h2>絶景ランキング</h2><div class="rank-tabs">${tabs}</div>${body}
        <p class="hint">おすすめ度(★5=Sランク〜)が高い順。同点はバッジ(世界遺産・百選など)の多い順です。</p>`;
    },
    bind(el) {
      el.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { st().rankTab = b.dataset.tab; ZK.app.rerender(); }));
      const sel = el.querySelector('#rankPref');
      if (sel) sel.addEventListener('change', () => { st().rankPref = Number(sel.value); ZK.app.rerender(); });
    },
  };

  // ---- どこ行く?(ランダム提案) ----
  views.random = {
    render() {
      const S = st(), recs = ZK.app.records();
      const pool = F.apply(ZK.app.spots(), { season: S.season, status: S.randomWant ? 'want' : '' }, recs);
      const pick = pool.find((s) => s.id === S.pick);
      return `<h2>どこ行く?</h2><div class="panel pick">
        <p class="meta">候補: ${esc(seasonLabel())}の絶景 ${pool.length}件</p>
        <label class="switch" style="justify-content:center"><input type="checkbox" id="wantOnly"${S.randomWant ? ' checked' : ''}> 「行きたい」に入れたものだけ</label>
        <p><button class="btn" id="roll"${pool.length ? '' : ' disabled'}>🎲 決める!</button></p></div>
        ${pick ? `<div class="grid">${UI.card(pick, recs[pick.id])}</div>` : ''}`;
    },
    bind(el) {
      const S = st();
      el.querySelector('#wantOnly').addEventListener('change', (e) => { S.randomWant = e.target.checked; S.pick = null; ZK.app.rerender(); });
      el.querySelector('#roll').addEventListener('click', () => {
        const pool = F.apply(ZK.app.spots(), { season: S.season, status: S.randomWant ? 'want' : '' }, ZK.app.records());
        if (pool.length) S.pick = pool[Math.floor(Math.random() * pool.length)].id;
        ZK.app.rerender();
      });
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
