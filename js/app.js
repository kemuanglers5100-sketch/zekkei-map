(function (root) {
  const ZK = root.ZK, U = ZK.util;
  const base = ZK.SPOTS_BASE.map((s) => Object.assign({}, s, { photos: (ZK.PHOTOS && ZK.PHOTOS[s.id]) || s.photos }));
  const store = ZK.store.create(ZK.store.defaultStorage(), base);
  const state = { season: U.seasonOf(new Date()), f: {}, q: '', sort: 'rating', pos: null, pins: false,
    rankTab: 'all', rankPref: 1, randomWant: false, pick: null };
  const $ = (s) => document.getElementById(s);
  const app = (ZK.app = { store, state, spots: () => store.spots(), records: () => store.records(), rerender });

  function renderSeasons() {
    const items = [['', '🗾 すべて'], ['春', '🌸 春'], ['夏', '🌊 夏'], ['秋', '🍁 秋'], ['冬', '❄️ 冬']];
    $('seasons').innerHTML = items.map(([v, l]) => `<button data-season="${v}" class="${(state.season || '') === v ? 'on' : ''}">${l}</button>`).join('');
  }
  function render(keepScroll) {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    const key = parts[0] || 'home';
    const rawArg = parts.slice(1).join('/');
    let arg;
    try { arg = decodeURIComponent(rawArg); } catch (_) { arg = rawArg; }
    const known = Object.prototype.hasOwnProperty.call(ZK.views, key);
    const v = known ? ZK.views[key] : ZK.views.home;
    const el = $('view');
    el.innerHTML = v.render(arg);
    v.bind(el, arg);
    renderSeasons();
    document.querySelectorAll('#tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.r === (known ? key : 'home')));
    $('q').value = state.q;
    if (!keepScroll) window.scrollTo(0, 0);
  }
  function rerender() { const y = window.scrollY; render(true); window.scrollTo(0, y); }

  $('seasons').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-season]');
    if (b) { state.season = b.dataset.season || null; rerender(); }
  });
  $('searchForm').addEventListener('submit', (e) => {
    e.preventDefault();
    state.q = $('q').value.trim();
    if (location.hash === '#/list') rerender(); else location.hash = '#/list';
  });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-action="status"]');
    if (!a) return;
    e.preventDefault();
    const cur = store.record(a.dataset.id).status;
    store.setRecord(a.dataset.id, { status: cur === a.dataset.status ? '' : a.dataset.status });
    rerender();
  });
  window.addEventListener('hashchange', () => render(false));
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  render(false);
})(typeof window !== 'undefined' ? window : globalThis);
