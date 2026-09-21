const mk = (base) => ZK.store.create(ZK.store.memoryStorage(), base || [FX.A, FX.B]);

test('store: 新規追加はuser付きで返り、idが採番される', () => {
  const s = mk();
  const saved = s.save({ name: '新スポット', prefectures: [1], lat: 43, lng: 141 });
  ok(saved.id.startsWith('u'));
  eq(s.spots().length, 3);
  ok(s.spots().find((x) => x.id === saved.id).user === true);
});
test('store: 組み込みスポットの編集は上書きとして保存', () => {
  const s = mk();
  s.save(Object.assign({}, FX.A, { rating: 3 }));
  eq(s.spots().find((x) => x.id === 'a').rating, 3);
  eq(s.spots().length, 2);
});
test('store: 組み込みスポットの削除は非表示、追加分の削除は消える', () => {
  const s = mk();
  s.remove('a');
  eq(s.spots().map((x) => x.id), ['b']);
  const n = s.save({ name: 'x', prefectures: [1], lat: 1, lng: 1 });
  s.remove(n.id);
  eq(s.spots().map((x) => x.id), ['b']);
});
test('store: 記録の保存・空にすると消える', () => {
  const s = mk();
  eq(s.record('a'), { status: '', memo: '', visitedAt: '' });
  s.setRecord('a', { status: 'want', memo: '春に行く' });
  eq(s.record('a').status, 'want');
  eq(s.record('a').memo, '春に行く');
  s.setRecord('a', { status: '', memo: '' });
  eq(Object.keys(s.records()), []);
});
test('store: 永続化(同じstorageから復元)', () => {
  const st = ZK.store.memoryStorage();
  const s1 = ZK.store.create(st, [FX.A]);
  s1.setRecord('a', { status: 'done' });
  eq(ZK.store.create(st, [FX.A]).record('a').status, 'done');
});
test('store: 書き出し→別storeへ読み込みで復元', () => {
  const s1 = mk();
  const n = s1.save({ name: '追加', prefectures: [2], lat: 40, lng: 140 });
  s1.setRecord('b', { status: 'want' });
  const s2 = mk();
  s2.importJSON(s1.exportJSON());
  ok(s2.spots().some((x) => x.id === n.id));
  eq(s2.record('b').status, 'want');
});
test('store: 不正なJSONの読み込みは例外', () => {
  const s = mk();
  throws(() => s.importJSON('これはJSONではない'));
  throws(() => s.importJSON('{"app":"other","version":1}'));
});
