(function (root) {
  const ZK = (root.ZK = root.ZK || {});
  const U = ZK.util;

  function validate(c) {
    const e = [];
    if (!c || !String(c.name || '').trim()) e.push('名前がありません');
    if (!c || !Array.isArray(c.prefectures) || !c.prefectures.length || c.prefectures.some((id) => !ZK.PREFS[id - 1])) e.push('都道府県が不正です');
    if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lng) || c.lat < 20 || c.lat > 46 || c.lng < 122 || c.lng > 154) e.push('緯度経度が日本の範囲外です');
    ((c && c.categories) || []).forEach((x) => { if (!ZK.CATEGORIES.includes(x)) e.push('不明なカテゴリ: ' + x); });
    ((c && c.seasons) || []).forEach((x) => { if (!ZK.SEASONS.includes(x)) e.push('不明な季節: ' + x); });
    return e;
  }
  function normalize(c) {
    return Object.assign({ yomi: '', categories: [], seasons: [], rating: 3, description: '', access: '',
      photos: [], mapUrl: '', keywords: [], sources: [] }, c);
  }
  // 重複: 同名 or 300m以内 / 要確認: 名前の部分一致 or 2km以内 / それ以外は新規
  function classify(cands, existing) {
    return cands.map((cand) => {
      const errors = validate(cand);
      if (errors.length) return { cand, errors, kind: 'invalid', match: null };
      const n = U.normalize(cand.name);
      let kind = 'new', match = null;
      for (const e of existing) {
        const en = U.normalize(e.name), d = U.haversine(cand, e);
        if (en === n || d < 0.3) { kind = 'duplicate'; match = e; break; }
        if ((d < 2 && (en.includes(n) || n.includes(en))) && kind !== 'duplicate') { kind = 'check'; match = e; }
      }
      return { cand, errors: [], kind, match };
    });
  }
  function mergeSources(existing, cand) {
    const key = (s) => [s.kind, s.label, s.url].join('|');
    const seen = new Set((existing.sources || []).map(key));
    const add = (cand.sources || []).filter((s) => !seen.has(key(s)));
    return Object.assign({}, existing, { sources: (existing.sources || []).concat(add) });
  }
  ZK.candidates = { validate, normalize, classify, mergeSources };
})(typeof window !== 'undefined' ? window : globalThis);
