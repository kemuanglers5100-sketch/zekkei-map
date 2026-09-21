(function (root) {
  const ZK = (root.ZK = root.ZK || {});
  const U = ZK.util, esc = U.esc;
  const EMOJI = { 山: '🗻', 海: '🌊', 湖: '🏞️', 滝: '💧', 夜景: '🌃', 桜: '🌸', 紅葉: '🍁', 花畑: '🌷', 神社仏閣: '⛩️', 自然遺産: '🌿', 展望台: '🔭' };

  function fallback(spot, cls) {
    const season = (spot.seasons || [])[0] || '春';
    const emoji = EMOJI[(spot.categories || [])[0]] || '🗾';
    return `<div class="ph fb ${cls || ''}" data-season="${season}"><span>${emoji}</span></div>`;
  }
  // 写真がなければ、または読み込みに失敗したら季節色グラデーションに切り替える
  function photo(spot, cls, idx) {
    const p = (spot.photos || [])[idx || 0];
    if (!p || !U.safeUrl(p.url)) return fallback(spot, cls);
    return `<img class="ph ${cls || ''}" loading="lazy" src="${esc(U.safeUrl(p.url))}" alt="${esc(spot.name)}" data-fb="${esc(fallback(spot, cls))}" onerror="ZK.ui.imgFail(this)">`;
  }
  function imgFail(img) { img.outerHTML = img.getAttribute('data-fb'); }
  const badges = (spot) => U.badgesOf(spot).map((b) => `<span class="badge">${esc(b)}</span>`).join('');
  function statusButtons(spot, rec) {
    const cur = (rec || {}).status || '';
    const b = (st, label) => `<button class="st${cur === st ? ' on' : ''}" data-action="status" data-id="${esc(spot.id)}" data-status="${st}">${label}</button>`;
    return b('want', '⭐ 行きたい') + b('done', '✅ 行った');
  }
  function card(spot, rec) {
    const dist = spot.distanceKm != null ? ` · ${spot.distanceKm.toFixed(0)}km` : '';
    return `<article class="card"><a class="card-link" href="#/spot/${esc(spot.id)}">${photo(spot)}
      <div class="card-body"><h3>${esc(spot.name)}</h3>
      <p class="meta">${esc(U.prefLabels(spot))}${dist} · <span class="stars">${U.stars(spot.rating)}</span> <span class="rank">${U.rankLetter(spot.rating)}</span></p>
      <p class="tags">${(spot.seasons || []).map((s) => `<span class="tag">${s}</span>`).join('')}${badges(spot)}</p></div></a>
      <div class="card-actions">${statusButtons(spot, rec)}</div></article>`;
  }
  function rankRow(spot, no) {
    return `<a class="rank-row" href="#/spot/${esc(spot.id)}"><span class="no">${no}</span>${photo(spot)}
      <div><b>${esc(spot.name)}</b><div class="meta">${esc(U.prefLabels(spot))} · <span class="stars">${U.stars(spot.rating)}</span> <span class="rank">${U.rankLetter(spot.rating)}</span></div>
      <div class="tags">${badges(spot)}</div></div></a>`;
  }
  ZK.ui = { photo, fallback, imgFail, badges, statusButtons, card, rankRow };
})(typeof window !== 'undefined' ? window : globalThis);
