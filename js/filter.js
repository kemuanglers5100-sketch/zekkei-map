(function (root) {
  const ZK = (root.ZK = root.ZK || {});
  const U = ZK.util;

  // 検索対象の文字列(項目ごとに正規化して '|' で連結)。県は短縮名+地方名(正式名は「京都」が「東京都」に当たるため使わない)
  function haystack(spot) {
    const parts = [spot.name, spot.yomi, spot.description, spot.access]
      .concat(spot.categories || [], spot.seasons || [], spot.keywords || [], U.badgesOf(spot));
    (spot.prefectures || []).forEach((id) => {
      const p = ZK.PREFS[id - 1];
      if (p) parts.push(p.label, p.region);
    });
    return parts.filter(Boolean).map(U.normalize).join('|');
  }
  // 「東京都」「静岡県」のような正式名は短縮名に置き換えてから照合する
  function token(t) {
    const p = ZK.PREFS.find((x) => x.name === t);
    return U.normalize(p ? p.label : t);
  }
  function search(spots, q) {
    const tokens = String(q || '').split(/\s+/).filter(Boolean).map(token);
    if (!tokens.length) return spots.slice();
    return spots.filter((s) => { const h = haystack(s); return tokens.every((t) => h.includes(t)); });
  }
  function apply(spots, f, records) {
    f = f || {}; records = records || {};
    return search(spots, f.q).filter((s) => {
      if (f.season && !(s.seasons || []).includes(f.season)) return false;
      if (f.prefId && !(s.prefectures || []).includes(Number(f.prefId))) return false;
      if (f.category && !(s.categories || []).includes(f.category)) return false;
      if (f.minRating && s.rating < Number(f.minRating)) return false;
      if (f.badge && !U.badgesOf(s).includes(f.badge)) return false;
      if (f.status && ((records[s.id] || {}).status || '') !== f.status) return false;
      return true;
    });
  }
  function rank(spots, opts) {
    opts = opts || {};
    return apply(spots, { season: opts.season, prefId: opts.prefId }).sort((a, b) =>
      b.rating - a.rating || U.badgesOf(b).length - U.badgesOf(a).length || a.name.localeCompare(b.name, 'ja'));
  }
  function byDistance(spots, pos) {
    return spots.map((s) => Object.assign({}, s, { distanceKm: U.haversine(pos, s) }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
  function allBadges(spots) {
    const set = new Set();
    spots.forEach((s) => U.badgesOf(s).forEach((b) => set.add(b)));
    return Array.from(set).sort();
  }
  function countByPref(spots) {
    const c = {};
    spots.forEach((s) => (s.prefectures || []).forEach((id) => { c[id] = (c[id] || 0) + 1; }));
    return c;
  }
  ZK.filter = { search, apply, rank, byDistance, allBadges, countByPref };
})(typeof window !== 'undefined' ? window : globalThis);
