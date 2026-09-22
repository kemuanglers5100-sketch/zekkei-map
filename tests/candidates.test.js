const C = ZK.candidates;
const base = { name: '新しい滝', prefectures: [1], lat: 43.0, lng: 141.0, categories: ['滝'], seasons: ['夏'] };

test('validate: 正常なら空', () => { eq(C.validate(base), []); });
test('validate: 名前なし・県不正・座標範囲外・不明カテゴリ', () => {
  ok(C.validate(Object.assign({}, base, { name: ' ' })).length > 0);
  ok(C.validate(Object.assign({}, base, { prefectures: [99] })).length > 0);
  ok(C.validate(Object.assign({}, base, { lat: 10 })).length > 0);
  ok(C.validate(Object.assign({}, base, { categories: ['宇宙'] })).length > 0);
  ok(C.validate(Object.assign({}, base, { lat: '43' })).length > 0);
});
test('normalize: 既定値を補う', () => {
  const n = C.normalize(base);
  eq(n.rating, 3); eq(n.photos, []); eq(n.sources, []);
});
test('validate: ratingが1..5の数値でなければエラー(0,10,NaN,文字列)', () => {
  [0, 10, NaN, '3'].forEach((v) => {
    ok(C.validate(Object.assign({}, base, { rating: v })).includes('評価(rating)が不正です'), 'rating ' + v);
  });
});
test('validate: rating 1..5は許容、未指定でもエラーにしない', () => {
  [1, 2, 3, 4, 5].forEach((v) => eq(C.validate(Object.assign({}, base, { rating: v })), []));
  eq(C.validate(base), []); // ratingフィールドなし
});
test('validate/normalize: categories/seasonsが配列でなくても例外を投げない', () => {
  const bad = Object.assign({}, base, { categories: 'not-an-array', seasons: 123 });
  const errs = C.validate(bad); // 例外を投げなければOK(不正な型は無視される)
  eq(Array.isArray(errs), true);
  const n = C.normalize(bad);
  eq(n.categories, []); eq(n.seasons, []);
});
test('normalize: prefecturesを数値に揃える(文字列混在でも)', () => {
  const n = C.normalize(Object.assign({}, base, { prefectures: ['1', 2] }));
  eq(n.prefectures, [1, 2]);
});
test('classify: 同名は重複', () => {
  const r = C.classify([Object.assign({}, base, { name: '富士山', lat: 35.0, lng: 138.0 })], [FX.A]);
  eq(r[0].kind, 'duplicate'); eq(r[0].match.id, 'a');
});
test('classify: 名前違いでも300m以内は重複', () => {
  const r = C.classify([Object.assign({}, base, { name: 'Mt.Fuji', lat: 35.3607, lng: 138.7275 })], [FX.A]);
  eq(r[0].kind, 'duplicate');
});
test('classify: 名前が部分一致+近い(2km以内)は要確認', () => {
  const r = C.classify([Object.assign({}, base, { name: '富士山五合目', lat: 35.375, lng: 138.7274 })], [FX.A]);
  eq(r[0].kind, 'check');
});
test('classify: 遠くて別名は新規、不正はinvalid', () => {
  eq(C.classify([base], [FX.A])[0].kind, 'new');
  eq(C.classify([{ name: '' }], [FX.A])[0].kind, 'invalid');
});
test('mergeSources: 同じ出典は重複しない', () => {
  const src = { kind: 'unesco', label: '世界遺産', url: '', year: 2026, note: '' };
  const m = C.mergeSources(FX.A, { sources: [src, { kind: 'video', label: '動画A', url: 'https://x.test', year: 2026, note: '' }] });
  eq(m.sources.length, 2);
  eq(FX.A.sources.length, 1, '元は変更しない');
});

test('validate: NaN/Infinity/文字列の緯度経度は範囲外エラー', () => {
  [NaN, Infinity, -Infinity, '43'].forEach((v) => {
    ok(C.validate(Object.assign({}, base, { lat: v })).includes('緯度経度が日本の範囲外です'), 'lat ' + v);
    ok(C.validate(Object.assign({}, base, { lng: v })).includes('緯度経度が日本の範囲外です'), 'lng ' + v);
  });
});
