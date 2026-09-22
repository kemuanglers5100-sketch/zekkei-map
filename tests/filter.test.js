const F = ZK.filter;
const L = [FX.A, FX.B, FX.C];
const ids = (l) => l.map((s) => s.id);

test('search: 空文字は全件', () => { eq(ids(F.search(L, '')), ['a', 'b', 'c']); });
test('search: 名前・よみ(ひらがな/カタカナ)', () => {
  eq(ids(F.search(L, '富士山')), ['a']);
  eq(ids(F.search(L, 'ふじさん')), ['a']);
  eq(ids(F.search(L, 'フジサン')), ['a']);
});
test('search: 都道府県名(複数県・正式名)', () => {
  eq(ids(F.search(L, '山梨')), ['a']);
  eq(ids(F.search(L, '静岡県')), ['a']);
});
test('search: 京都は東京都にヒットしない、東京都は東京にヒットする', () => {
  eq(ids(F.search(L, '京都')), ['b']);
  eq(ids(F.search(L, '東京都')), ['c']);
});
test('search: 地域名・キーワード・カテゴリ・バッジ', () => {
  eq(ids(F.search(L, '関東')), ['c']);
  eq(ids(F.search(L, '夜景')), ['c']);
  eq(ids(F.search(L, '千本鳥居')), ['b']);
  eq(ids(F.search(L, '世界遺産')), ['a']);
});
test('search: 空白区切りはAND', () => {
  eq(ids(F.search(L, '冬 夜景')), ['c']);
  eq(ids(F.search(L, '冬 千本鳥居')), []);
});
test('apply: 季節・県・カテゴリ・評価・バッジ・状態', () => {
  eq(ids(F.apply(L, { season: '冬' })), ['a', 'c']);
  eq(ids(F.apply(L, { prefId: 26 })), ['b']);
  eq(ids(F.apply(L, { category: '山' })), ['a']);
  eq(ids(F.apply(L, { minRating: 5 })), ['a']);
  eq(ids(F.apply(L, { badge: '世界遺産' })), ['a']);
  eq(ids(F.apply(L, { status: 'want' }, { b: { status: 'want' } })), ['b']);
});
test('rank: 評価の高い順', () => {
  eq(F.rank(L, {})[0].id, 'a');
  eq(F.rank(L, { season: '春' }).map((s) => s.id), ['b']);
});
test('rank: 名前がないスポットが混ざっても例外を投げない', () => {
  const noName = Object.assign({}, FX.B, { id: 'noname', name: undefined, rating: 4 });
  const r = F.rank([FX.A, noName, FX.C], {});
  eq(r.map((s) => s.id).includes('noname'), true);
});
test('byDistance: 東京から近い順', () => {
  const r = F.byDistance(L, { lat: 35.68, lng: 139.77 });
  eq(ids(r), ['c', 'a', 'b']);
  ok(r[0].distanceKm < 10);
});
test('allBadges / countByPref', () => {
  eq(F.allBadges(L), ['世界遺産']);
  eq(F.countByPref(L), { 19: 1, 22: 1, 26: 1, 13: 1 });
});
