const SP = ZK.SPOTS_BASE;

test('spots: 50件以上でidが一意', () => {
  ok(SP.length >= 50, 'count=' + SP.length);
  eq(new Set(SP.map((s) => s.id)).size, SP.length);
});
test('spots: 全件が検証を通る', () => {
  SP.forEach((s) => eq(ZK.candidates.validate(s), [], s.id + ' ' + s.name));
});
test('spots: 評価は1-5、説明・アクセスが入っている', () => {
  SP.forEach((s) => {
    ok(s.rating >= 1 && s.rating <= 5, s.name);
    ok(s.description && s.access, s.name + ' に説明かアクセスがない');
    ok(s.seasons.length > 0 && s.categories.length > 0, s.name);
  });
});
test('spots: 全47都道府県を網羅', () => {
  const have = new Set();
  SP.forEach((s) => s.prefectures.forEach((id) => have.add(id)));
  const missing = ZK.PREFS.map((p, i) => i + 1).filter((id) => !have.has(id)).map((id) => ZK.PREFS[id - 1].label);
  eq(missing, []);
});
test('spots: 指示書の例示スポットを含む', () => {
  ['富士山', '白川郷', '青い池', '竹田城跡', '高千穂峡', '兼六園', '鳥取砂丘', '厳島神社', '上高地', '黒部峡谷']
    .forEach((n) => ok(SP.some((s) => s.name === n), n + ' がない'));
});
test('spots: 全季節・全カテゴリが1件以上ある', () => {
  ZK.SEASONS.forEach((se) => ok(SP.some((s) => s.seasons.includes(se)), se));
  ZK.CATEGORIES.forEach((c) => ok(SP.some((s) => s.categories.includes(c)), c));
});
