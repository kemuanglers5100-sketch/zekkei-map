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
})(typeof window !== 'undefined' ? window : globalThis);
