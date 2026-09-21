(function (root) {
  const ZK = (root.ZK = root.ZK || {});
  const U = ZK.util;

  function project(lat, lng, isOkinawa) {
    const M = ZK.MAP, p = M.proj;
    if (isOkinawa) { lng += M.okinawa.dLon; lat += M.okinawa.dLat; }
    return [((lng - p.lon0) * p.c - p.ox) * p.k, ((p.lat0 - lat) - p.oy) * p.k];
  }
  const level = (n) => (n >= 5 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0);

  // opts: {counts:{県id:件数}, selected:県id, pins:[spot], onSelect(県id)}
  function render(el, opts) {
    const M = ZK.MAP, counts = opts.counts || {};
    const paths = M.prefs.map((p) => {
      const n = counts[p.id] || 0;
      return `<path class="pref lvl${level(n)}${opts.selected === p.id ? ' sel' : ''}" data-id="${p.id}" d="${p.d}"><title>${U.esc(ZK.PREFS[p.id - 1].name)}(${n}件)</title></path>`;
    }).join('');
    const pins = (opts.pins || []).map((s) => {
      const [x, y] = project(s.lat, s.lng, (s.prefectures || []).includes(47));
      return `<circle class="pin" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"/>`;
    }).join('');
    const i = M.inset;
    el.innerHTML = `<svg viewBox="0 0 ${M.W} ${M.H}" role="img" aria-label="日本地図"><rect class="inset" x="${i.x}" y="${i.y}" width="${i.w}" height="${i.h}" rx="6"/>${paths}${pins}</svg>`;
    el.querySelector('svg').addEventListener('click', (e) => {
      const t = e.target.closest('.pref');
      if (t && opts.onSelect) opts.onSelect(Number(t.dataset.id));
    });
  }
  ZK.map = { project, render };
})(typeof window !== 'undefined' ? window : globalThis);
