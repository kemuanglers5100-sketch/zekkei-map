const U = ZK.util;

test('normalize: 全角・大文字・カタカナを揃える', () => {
  eq(U.normalize('ＦＵＪＩ'), 'fuji');
  eq(U.normalize('フジ サン'), 'ふじさん');
});
test('haversine: 東京-大阪は約400km', () => {
  const d = U.haversine({ lat: 35.6812, lng: 139.7671 }, { lat: 34.7025, lng: 135.4959 });
  ok(d > 390 && d < 410, 'got ' + d);
});
test('seasonOf', () => {
  eq(U.seasonOf(new Date(2026, 3, 1)), '春');
  eq(U.seasonOf(new Date(2026, 6, 1)), '夏');
  eq(U.seasonOf(new Date(2026, 8, 21)), '秋');
  eq(U.seasonOf(new Date(2026, 11, 31)), '冬');
});
test('rankLetter / stars', () => {
  eq([5, 4, 3, 2, 1].map(U.rankLetter), ['S', 'A', 'B', 'C', 'C']);
  eq(U.stars(4), '★★★★☆');
});
test('stars: 範囲外・非整数の評価でも例外を投げずクランプする', () => {
  eq(U.stars(10), '★★★★★');
  eq(U.stars(-3), '☆☆☆☆☆');
  eq(U.stars(0), '☆☆☆☆☆');
  eq(U.stars(3.6), '★★★★☆');
  eq(U.stars(NaN), '☆☆☆☆☆');
  eq(U.stars(undefined), '☆☆☆☆☆');
});
test('prefLabels: 不正な都道府県idでも例外を投げず無視する', () => {
  eq(U.prefLabels({ prefectures: [99, 19] }), '山梨');
  eq(U.prefLabels({ prefectures: [0, -1, 48] }), '');
});
test('esc', () => { eq(U.esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;'); });
test('kindOfBadge', () => {
  eq(U.kindOfBadge('世界遺産'), 'unesco');
  eq(U.kindOfBadge('日本百名山'), 'hyakusen');
  eq(U.kindOfBadge('日本三大夜景'), 'hyakusen');
  eq(U.kindOfBadge('ミシュラン三つ星'), 'michelin');
  eq(U.kindOfBadge('口コミ'), 'other');
});
test('badgesOf: バッジ種別のみ・重複なし', () => {
  const s = { sources: [{ kind: 'unesco', label: '世界遺産' }, { kind: 'unesco', label: '世界遺産' }, { kind: 'video', label: 'x' }] };
  eq(U.badgesOf(s), ['世界遺産']);
});
test('PREFS: 47件・順序', () => {
  eq(ZK.PREFS.length, 47);
  eq(ZK.PREFS[0].name, '北海道');
  eq(ZK.PREFS[12].label, '東京');
  eq(ZK.PREFS[46].region, '九州・沖縄');
});
test('prefLabels / mapUrl', () => {
  eq(U.prefLabels(FX.A), '山梨・静岡');
  ok(U.mapUrl(FX.A).includes('35.3606,138.7274'));
  eq(U.mapUrl({ mapUrl: 'https://x.test/', lat: 1, lng: 2 }), 'https://x.test/');
});
test('safeUrl: http(s)のみ許可', () => {
  eq(U.safeUrl('https://a.test/x'), 'https://a.test/x');
  eq(U.safeUrl('  HTTP://a.test '), 'HTTP://a.test');
  ['javascript:alert(1)', 'JaVaScRiPt:x', 'data:text/html,x', '//evil.example', '', undefined, null, 5, {}].forEach((v) => eq(U.safeUrl(v), ''));
});
test('mapUrl: javascript:のmapUrlは無視して生成URLに戻す', () => {
  const g = 'https://www.google.com/maps/search/?api=1&query=1,2';
  eq(U.mapUrl({ mapUrl: 'javascript:alert(1)', lat: 1, lng: 2 }), g);
  eq(U.mapUrl({ mapUrl: 'https://ok.test/m', lat: 1, lng: 2 }), 'https://ok.test/m');
});
