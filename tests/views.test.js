// I3: 不正なlat/lngがGoogleマップiframeのsrc属性を壊さないこと、
// 不正なseason文字列がUI出力でエスケープされることを確認する。
const evilSpot = Object.assign({}, FX.A, {
  id: 'evil', lat: '"><script>alert(1)</script>', lng: '1,2&z=99',
  seasons: ['"><img src=x onerror=alert(1)>'],
});

test('views.spot.render: 不正なlat/lngでも例外を投げず、iframe srcは数値化される', () => {
  ZK.app = { spots: () => [evilSpot], store: { record: () => ({ status: '', memo: '', visitedAt: '' }) } };
  const html = ZK.views.spot.render('evil');
  const m = html.match(/class="gmap"[^>]*src="https:\/\/maps\.google\.com\/maps\?q=([^"]*)&z=13&output=embed"/);
  ok(m, 'iframe src not found: ' + html.slice(0, 200));
  ok(/^(NaN|-?[\d.]+),(NaN|-?[\d.]+)$/.test(m[1]), 'src query not numeric: ' + m[1]);
  ok(!html.includes('<script>alert(1)</script>'), 'unescaped script leaked into output');
});

test('UI.card / views.spot.render: 不正なseason文字列はエスケープされる', () => {
  ZK.app = { spots: () => [evilSpot], store: { record: () => ({ status: '', memo: '', visitedAt: '' }) } };
  const cardHtml = ZK.ui.card(evilSpot, null);
  ok(!cardHtml.includes('<img src=x onerror=alert(1)>'), 'unescaped season tag in card: ' + cardHtml);
  ok(cardHtml.includes('&lt;img'), 'season should be escaped in card');

  const spotHtml = ZK.views.spot.render('evil');
  ok(!spotHtml.includes('<img src=x onerror=alert(1)>'), 'unescaped season tag in spot detail: ' + spotHtml);
});

test('UI.fallback: 不正なseasonでもdata-season属性はエスケープされる', () => {
  const html = ZK.ui.fallback({ seasons: ['"><img src=x onerror=alert(1)>'], categories: [] }, '');
  ok(!html.includes('"><img'), 'unescaped season in data-season: ' + html);
});

test('views.spot.render: 戻るリンクはjavascript:ではなくボタンでhistory.backを呼ぶ', () => {
  ZK.app = { spots: () => [FX.A], store: { record: () => ({ status: '', memo: '', visitedAt: '' }) } };
  const html = ZK.views.spot.render('a');
  ok(!html.includes('javascript:history.back()'), 'javascript: URL should be removed');
  ok(html.includes('data-a="back"'), 'back button should exist');
});
