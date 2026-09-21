(function (root) {
  const ZK = root.ZK, U = ZK.util, esc = U.esc;
  const views = (ZK.views = ZK.views || {});
  let editing = null;   // null | 'new' | スポットid
  let cls = null;       // 候補の判定結果(classifyの戻り値)


  // ---- URLサニタイズ(純関数。テスト用に ZK.admin で公開) ----
  function parsePhotoLines(text, oldPhotos) {
    const old = oldPhotos || [];
    let dropped = 0;
    const photos = [];
    String(text || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean).forEach((u) => {
      const safe = U.safeUrl(u);
      if (!safe) { dropped++; return; }
      photos.push(old.find((p) => p.url === safe) || { url: safe, credit: '', license: '', page: '' });
    });
    return { photos, dropped };
  }
  function sanitizeCandidate(c) {
    const out = Object.assign({}, c);
    if ('mapUrl' in out) out.mapUrl = U.safeUrl(out.mapUrl);
    if ('photos' in out) {
      out.photos = (Array.isArray(out.photos) ? out.photos : []).filter((p) => p && typeof p === 'object')
        .map((p) => Object.assign({}, p, { url: U.safeUrl(p.url), page: U.safeUrl(p.page) })).filter((p) => p.url);
    }
    if ('sources' in out) {
      out.sources = (Array.isArray(out.sources) ? out.sources : []).filter((s) => s && typeof s === 'object')
        .map((s) => Object.assign({}, s, { url: U.safeUrl(s.url) }));
    }
    return out;
  }
  ZK.admin = { parsePhotoLines, sanitizeCandidate };

  const checks = (name, list, cur) => list.map((v) => `<label class="chk"><input type="checkbox" name="${name}" value="${esc(v)}"${(cur || []).includes(v) ? ' checked' : ''}>${esc(v)}</label>`).join('');
  const blank = () => ({ name: '', yomi: '', prefectures: [], lat: '', lng: '', rating: 3, categories: [], seasons: [], description: '', access: '', photos: [], mapUrl: '', keywords: [], sources: [] });

  function formHTML(s) {
    const prefBoxes = ZK.PREFS.map((p, i) => `<label class="chk"><input type="checkbox" name="prefectures" value="${i + 1}"${s.prefectures.includes(i + 1) ? ' checked' : ''}>${p.label}</label>`).join('');
    const badges = (s.sources || []).filter((x) => U.isBadgeKind(x.kind)).map((x) => x.label).join(',');
    return `<form id="spotForm" class="form panel"><h2>${editing === 'new' ? 'スポットを追加' : 'スポットを編集'}</h2>
      <label class="l">絶景名 *</label><input name="name" required value="${esc(s.name)}">
      <label class="l">よみ(ひらがな)</label><input name="yomi" value="${esc(s.yomi)}">
      <label class="l">都道府県 *(複数可)</label><div>${prefBoxes}</div>
      <label class="l">緯度 *</label><input name="lat" type="number" step="any" required value="${esc(s.lat)}">
      <label class="l">経度 *</label><input name="lng" type="number" step="any" required value="${esc(s.lng)}">
      <label class="l">おすすめ度</label><select name="rating">${[5, 4, 3, 2, 1].map((r) => `<option value="${r}"${s.rating === r ? ' selected' : ''}>${U.stars(r)}(${U.rankLetter(r)})</option>`).join('')}</select>
      <label class="l">カテゴリ</label><div>${checks('categories', ZK.CATEGORIES, s.categories)}</div>
      <label class="l">ベストシーズン</label><div>${checks('seasons', ZK.SEASONS, s.seasons)}</div>
      <label class="l">説明文</label><textarea name="description" rows="3">${esc(s.description)}</textarea>
      <label class="l">アクセス</label><input name="access" value="${esc(s.access)}">
      <label class="l">写真URL(1行に1つ)</label><textarea name="photos" rows="3">${esc((s.photos || []).map((p) => p.url).join('\n'))}</textarea>
      <label class="l">Google Map URL(空欄なら緯度経度から自動)</label><input name="mapUrl" value="${esc(s.mapUrl)}">
      <label class="l">キーワード(カンマ区切り)</label><input name="keywords" value="${esc((s.keywords || []).join(','))}">
      <label class="l">バッジ(例: 世界遺産,日本百名山 / カンマ区切り)</label><input name="badges" value="${esc(badges)}">
      <div class="row" style="margin-top:16px"><button class="btn" type="submit">保存</button><button class="btn ghost" type="button" data-a="cancel">キャンセル</button></div></form>`;
  }

  function readForm(form, orig) {
    const fd = new FormData(form), g = (k) => String(fd.get(k) || '').trim();
    const oldPhotos = (orig && orig.photos) || [];
    const pp = parsePhotoLines(g('photos'), oldPhotos), photos = pp.photos;
    const rawMap = g('mapUrl'), mapUrl = U.safeUrl(rawMap);
    const dropped = pp.dropped + (rawMap && !mapUrl ? 1 : 0);
    const labels = g('badges').split(/[,、]/).map((x) => x.trim()).filter(Boolean);
    const oldSrc = (orig && orig.sources) || [];
    const keep = oldSrc.filter((x) => !U.isBadgeKind(x.kind) || labels.includes(x.label));
    const add = labels.filter((l) => !keep.some((x) => x.label === l))
      .map((l) => ({ kind: U.kindOfBadge(l), label: l, url: '', year: new Date().getFullYear(), note: '' }));
    return Object.assign({}, orig || {}, {
      name: g('name'), yomi: g('yomi'), prefectures: fd.getAll('prefectures').map(Number),
      lat: parseFloat(g('lat')), lng: parseFloat(g('lng')), rating: Number(g('rating')),
      categories: fd.getAll('categories'), seasons: fd.getAll('seasons'),
      description: g('description'), access: g('access'), photos, mapUrl,
      keywords: g('keywords').split(/[,、]/).map((x) => x.trim()).filter(Boolean), sources: keep.concat(add),
      __dropped: dropped,
    });
  }

  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const KIND = { new: '新規', duplicate: '重複(出典を追加)', check: '要確認(似たスポットあり)', invalid: '不正' };
  function candHTML() {
    if (!cls) return '';
    return `<table class="tbl"><tr><th></th><th>候補</th><th>判定</th></tr>${cls.map((r, i) => `<tr>
      <td><input type="checkbox" data-i="${i}"${r.kind === 'invalid' ? ' disabled' : r.kind === 'check' ? '' : ' checked'}></td>
      <td>${esc(r.cand.name || '(名前なし)')}</td>
      <td>${KIND[r.kind]}${r.match ? `<br><small>${esc(r.match.name)}</small>` : ''}${r.errors.length ? `<br><small>${esc(r.errors.join(' / '))}</small>` : ''}</td></tr>`).join('')}</table>
      <button class="btn" data-a="apply">チェックした候補を取り込む</button>`;
  }

  views.admin = {
    render() {
      const all = ZK.app.spots();
      const orig = editing && editing !== 'new' ? all.find((s) => s.id === editing) : null;
      const rows = all.map((s) => `<tr><td>${esc(s.name)}${s.user ? ' <span class="tag">追加</span>' : ''}</td><td>${esc(U.prefLabels(s))}</td><td>${U.rankLetter(s.rating)}</td>
        <td style="white-space:nowrap"><button class="btn ghost" data-a="edit" data-id="${esc(s.id)}">編集</button> <button class="btn danger" data-a="del" data-id="${esc(s.id)}">削除</button></td></tr>`).join('');
      return `<div id="adminRoot"><h2>管理</h2>
        <div class="row"><button class="btn" data-a="new">＋ 新規追加</button><button class="btn ghost" data-a="export">JSON書き出し</button>
          <label class="btn ghost">JSON読み込み<input type="file" id="importFile" accept=".json,application/json" hidden></label></div>
        <p class="hint">記録・追加・編集はこの端末のブラウザに保存されます。端末を移すときは「書き出し→読み込み」を使ってください。</p>
        ${editing ? formHTML(orig || blank()) : ''}
        <details class="panel"><summary><b>情報源からの候補を取り込む</b></summary>
          <p class="hint">候補JSON(スポットの配列)を貼り付けるか、ファイルを選んでください。既存との重複を判定してから取り込みます。</p>
          <textarea id="candText" rows="5" style="width:100%" placeholder='[{"name":"…","prefectures":[1],"lat":43.0,"lng":141.0,"sources":[…]}]'></textarea>
          <p><input type="file" id="candFile" accept=".json,application/json"> <button class="btn" data-a="classify">判定する</button></p>
          <div id="candResult">${candHTML()}</div></details>
        <h2>登録スポット(${all.length}件)</h2><div style="overflow-x:auto"><table class="tbl"><tr><th>名前</th><th>県</th><th>評価</th><th></th></tr>${rows}</table></div></div>`;
    },
    bind(el) {
      const app = ZK.app, store = app.store, root = el.querySelector('#adminRoot');
      root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-a]');
        if (!b) return;
        const a = b.dataset.a;
        if (a === 'new') { editing = 'new'; app.rerender(); }
        else if (a === 'edit') { editing = b.dataset.id; app.rerender(); }
        else if (a === 'cancel') { editing = null; app.rerender(); }
        else if (a === 'del') {
          const s = app.spots().find((x) => x.id === b.dataset.id);
          if (s && confirm(`「${s.name}」を削除しますか?(組み込みスポットは非表示になります)`)) { store.remove(s.id); app.rerender(); }
        } else if (a === 'export') download('zekkei-backup-' + new Date().toISOString().slice(0, 10) + '.json', store.exportJSON());
        else if (a === 'classify') {
          try {
            let d = JSON.parse(root.querySelector('#candText').value);
            if (d && !Array.isArray(d) && Array.isArray(d.spots)) d = d.spots;
            if (!Array.isArray(d)) throw new Error('スポットの配列ではありません');
            cls = ZK.candidates.classify(d, app.spots());
            root.querySelector('#candResult').innerHTML = candHTML();
          } catch (err) { alert('候補を読み込めません: ' + err.message); }
        } else if (a === 'apply') {
          const picked = Array.from(root.querySelectorAll('#candResult input[data-i]:checked')).map((x) => cls[Number(x.dataset.i)]);
          picked.forEach((r) => {
            if (r.kind === 'duplicate') store.save(ZK.candidates.mergeSources(r.match, sanitizeCandidate(r.cand)));
            else store.save(ZK.candidates.normalize(sanitizeCandidate(r.cand)));
          });
          alert(`${picked.length}件を取り込みました`); cls = null; app.rerender();
        }
      });
      const form = root.querySelector('#spotForm');
      if (form) form.addEventListener('submit', (e) => {
        e.preventDefault();
        const orig = editing !== 'new' ? app.spots().find((s) => s.id === editing) : null;
        const spot = readForm(form, orig);
        const errs = ZK.candidates.validate(spot);
        if (errs.length) return alert(errs.join('\n'));
        store.save(spot); editing = null; app.rerender();
      });
      const readFile = (input, cb) => input.addEventListener('change', () => { const f = input.files[0]; if (f) f.text().then(cb); });
      readFile(root.querySelector('#importFile'), (text) => {
        if (!confirm('現在の記録・追加・編集をすべて置き換えます。よろしいですか?')) return;
        try { store.importJSON(text); alert('読み込みました'); app.rerender(); } catch (err) { alert(err.message); }
      });
      readFile(root.querySelector('#candFile'), (text) => { root.querySelector('#candText').value = text; });
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
