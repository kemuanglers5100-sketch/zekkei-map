(function (root) {
  const ZK = (root.ZK = root.ZK || {});
  const KEY = 'zekkei.v1';

  function memoryStorage() {
    const m = {};
    return {
      getItem: (k) => (k in m ? m[k] : null),
      setItem: (k, v) => { m[k] = String(v); },
      removeItem: (k) => { delete m[k]; },
    };
  }
  function defaultStorage() {
    try {
      const s = root.localStorage;
      s.setItem('__zk', '1'); s.removeItem('__zk');
      return s;
    } catch (e) { return memoryStorage(); }
  }

  function create(storage, base) {
    base = base || [];
    const empty = () => ({ added: [], edits: {}, deleted: [], records: {} });
    let st;
    try { const raw = storage.getItem(KEY); st = raw ? Object.assign(empty(), JSON.parse(raw)) : empty(); }
    catch (e) { st = empty(); }
    const persist = () => storage.setItem(KEY, JSON.stringify(st));
    const isBase = (id) => base.some((s) => s.id === id);

    function spots() {
      const del = new Set(st.deleted);
      const out = base.filter((s) => !del.has(s.id))
        .map((s) => (st.edits[s.id] ? Object.assign({}, s, st.edits[s.id]) : s));
      return out.concat(st.added.map((s) => Object.assign({ user: true }, s)));
    }
    function save(spot) {
      const s = Object.assign({}, spot);
      delete s.user;
      if (!s.id) s.id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      if (isBase(s.id)) st.edits[s.id] = s;
      else {
        const i = st.added.findIndex((a) => a.id === s.id);
        if (i >= 0) st.added[i] = s; else st.added.push(s);
      }
      persist();
      return s;
    }
    function remove(id) {
      if (isBase(id)) { if (!st.deleted.includes(id)) st.deleted.push(id); delete st.edits[id]; }
      else st.added = st.added.filter((a) => a.id !== id);
      persist();
    }
    const record = (id) => Object.assign({ status: '', memo: '', visitedAt: '' }, st.records[id]);
    function setRecord(id, patch) {
      const r = Object.assign(record(id), patch);
      if (!r.status && !r.memo && !r.visitedAt) delete st.records[id]; else st.records[id] = r;
      persist();
    }
    const records = () => Object.assign({}, st.records);
    const exportJSON = () => JSON.stringify({
      app: 'zekkei-map', version: 1, exportedAt: new Date().toISOString(),
      added: st.added, edits: st.edits, deleted: st.deleted, records: st.records,
    }, null, 2);
    function importJSON(text) {
      let d;
      try { d = JSON.parse(text); } catch (e) { throw new Error('JSONとして読み込めません'); }
      if (!d || d.app !== 'zekkei-map' || d.version !== 1) throw new Error('このアプリの書き出しファイルではありません');
      if (!Array.isArray(d.added) || !Array.isArray(d.deleted)) throw new Error('データの形式が正しくありません');
      st = { added: d.added, edits: d.edits || {}, deleted: d.deleted, records: d.records || {} };
      persist();
    }
    return { spots, save, remove, record, setRecord, records, exportJSON, importJSON };
  }
  ZK.store = { create, memoryStorage, defaultStorage };
})(typeof window !== 'undefined' ? window : globalThis);
