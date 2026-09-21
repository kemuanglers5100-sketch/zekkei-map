(function (root) {
  const ZK = (root.ZK = root.ZK || {});
  ZK.CATEGORIES = ['山', '海', '湖', '滝', '夜景', '桜', '紅葉', '花畑', '神社仏閣', '自然遺産', '展望台'];
  ZK.SEASONS = ['春', '夏', '秋', '冬'];
  const BADGE_KINDS = ['unesco', 'hyakusen', 'michelin'];

  // 検索用の正規化: 全角→半角、小文字化、カタカナ→ひらがな、空白除去
  function normalize(s) {
    return String(s == null ? '' : s).normalize('NFKC').toLowerCase()
      .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/\s+/g, '');
  }
  function haversine(a, b) {
    const R = 6371, rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function seasonOf(date) {
    const m = date.getMonth() + 1;
    return m >= 3 && m <= 5 ? '春' : m >= 6 && m <= 8 ? '夏' : m >= 9 && m <= 11 ? '秋' : '冬';
  }
  const rankLetter = (r) => (r >= 5 ? 'S' : r >= 4 ? 'A' : r >= 3 ? 'B' : 'C');
  const stars = (r) => '★'.repeat(r) + '☆'.repeat(5 - r);
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // 出典ラベルから種別を推定(hyakusen = 〜百選・百名山・三景・三名・三大〜などのリスト系)
  function kindOfBadge(label) {
    if (/世界(遺産|文化|自然)/.test(label)) return 'unesco';
    if (/ミシュラン/.test(label)) return 'michelin';
    if (/百|100|三景|三名|三大|新三/.test(label)) return 'hyakusen';
    return 'other';
  }
  const isBadgeKind = (kind) => BADGE_KINDS.includes(kind);
  function badgesOf(spot) {
    const out = [];
    (spot.sources || []).forEach((s) => { if (isBadgeKind(s.kind) && !out.includes(s.label)) out.push(s.label); });
    return out;
  }
  const prefLabels = (spot) => (spot.prefectures || []).map((id) => ZK.PREFS[id - 1].label).join('・');
  const mapUrl = (spot) => spot.mapUrl || `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;

  ZK.util = { normalize, haversine, seasonOf, rankLetter, stars, esc, kindOfBadge, isBadgeKind, badgesOf, prefLabels, mapUrl };
})(typeof window !== 'undefined' ? window : globalThis);
