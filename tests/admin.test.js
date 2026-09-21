const A = ZK.admin;

test('parsePhotoLines: http(s)のみ残し、不正行の数を返す', () => {
  const r = A.parsePhotoLines('https://a.example/1.jpg\njavascript:alert(1)\n\r\n data:text/html,x \nhttp://b.example/2.jpg', []);
  eq(r.photos.map((p) => p.url), ['https://a.example/1.jpg', 'http://b.example/2.jpg']);
  eq(r.dropped, 2);
});
test('parsePhotoLines: 既存写真のクレジット等を保持', () => {
  const old = [{ url: 'https://a.example/1.jpg', credit: 'X', license: 'CC', page: 'https://p.example' }];
  eq(A.parsePhotoLines('https://a.example/1.jpg', old).photos[0].credit, 'X');
});
test('sanitizeCandidate: mapUrl/photos/sourcesを無害化', () => {
  const c = { name: 'x', mapUrl: 'javascript:1',
    photos: [{ url: 'https://ok.example/a.jpg', page: 'javascript:2', credit: 'c' }, { url: 'javascript:3' }],
    sources: [{ kind: 'video', label: 'v', url: 'javascript:4' }, { kind: 'video', label: 'w', url: 'https://ok.example/w' }] };
  const s = A.sanitizeCandidate(c);
  eq(s.mapUrl, ''); eq(s.photos.length, 1); eq(s.photos[0].page, ''); eq(s.photos[0].credit, 'c');
  eq(s.sources.length, 2); eq(s.sources[0].url, ''); eq(s.sources[1].url, 'https://ok.example/w');
  eq(c.mapUrl, 'javascript:1', '元は変更しない');
});
test('sanitizeCandidate: 項目がなければ追加しない', () => {
  eq(Object.keys(A.sanitizeCandidate({ name: 'x' })), ['name']);
});
test('サンプル候補: 重複/新規/不正の判定とhttps出典の保持', () => {
  // tests/sample-candidates.json と同内容(vm内ではfsが使えないため)
  const cands = [
    { name: '富士山', prefectures: [19, 22], lat: 35.3606, lng: 138.7274, sources: [{ kind: 'video', label: '動画で紹介', url: 'https://example.com/fuji', year: 2026, note: 'リンクのみ' }] },
    { name: 'サンプル新規の滝', prefectures: [1], lat: 43.5, lng: 142.5, categories: ['滝'], seasons: ['夏'], sources: [{ kind: 'hyakusen', label: '日本の滝百選', url: '', year: 2026, note: '' }] },
    { name: '', prefectures: [], lat: 0, lng: 0 },
  ];
  const spots = ZK.SPOTS_BASE;
  const r = ZK.candidates.classify(cands, spots);
  eq(r.map((x) => x.kind), ['duplicate', 'new', 'invalid']);
  eq(A.sanitizeCandidate(cands[0]).sources[0].url, 'https://example.com/fuji');
});

test('buildSpot: __dropped等の内部項目を含めず、件数は別に返す', () => {
  const v = { name: 'テスト', yomi: '', prefectures: [1], lat: '43.1', lng: '141.2', rating: '4', categories: [], seasons: [],
    description: '', access: '', photos: 'https://ok.example/a.jpg\njavascript:alert(1)\nexample.com', mapUrl: 'javascript:alert(2)', keywords: 'a,b', badges: '' };
  const r = A.buildSpot(v, null);
  eq(r.dropped, 3);
  ok(!('__dropped' in r.spot), '__dropped leaked');
  eq(r.spot.photos.map((p) => p.url), ['https://ok.example/a.jpg']);
  eq(r.spot.mapUrl, '');
  eq(r.spot.lat, 43.1); eq(r.spot.rating, 4);
  eq(ZK.candidates.validate(r.spot), []);
});
test('buildSpot: 空の緯度経度はNaNになりvalidateで弾かれる', () => {
  const r = A.buildSpot({ name: 'x', prefectures: [1], lat: '', lng: '', photos: '', mapUrl: '', keywords: '', badges: '' }, null);
  ok(ZK.candidates.validate(r.spot).length > 0);
  eq(r.dropped, 0);
});
