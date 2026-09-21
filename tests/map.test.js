const M = ZK.map;
test('MAP: 47県分のパスがある', () => {
  eq(ZK.MAP.prefs.length, 47);
  ok(ZK.MAP.prefs.every((p) => p.d.startsWith('M')));
});
test('project: 位置関係(札幌は東京より上、大阪は東京より左)', () => {
  const tokyo = M.project(35.68, 139.77), sapporo = M.project(43.06, 141.35), osaka = M.project(34.70, 135.50);
  ok(sapporo[1] < tokyo[1]);
  ok(osaka[0] < tokyo[0]);
});
test('project: 全て地図の範囲内(沖縄は挿入位置)', () => {
  [[35.68, 139.77, false], [43.06, 141.35, false], [26.21, 127.68, true], [33.59, 130.40, false]].forEach(([la, lo, oki]) => {
    const [x, y] = M.project(la, lo, oki);
    ok(x >= 0 && x <= ZK.MAP.W && y >= 0 && y <= ZK.MAP.H, `${la},${lo} → ${x},${y}`);
  });
});
test('MAP: inset(沖縄の枠)がviewBox内に収まる', () => {
  const i = ZK.MAP.inset;
  ok(i.x >= 0 && i.y >= 0, `x=${i.x} y=${i.y}`);
  ok(i.x + i.w <= ZK.MAP.W && i.y + i.h <= ZK.MAP.H, `right=${i.x + i.w} bottom=${i.y + i.h}`);
});
