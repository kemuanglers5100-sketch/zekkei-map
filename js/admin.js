(function (root) {
  const ZK = root.ZK;
  (ZK.views = ZK.views || {}).admin = { render: () => '<p class="empty">管理画面は準備中です。</p>', bind() {} };
})(typeof window !== 'undefined' ? window : globalThis);
