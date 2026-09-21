// 使い方: node tests/run.js   (zekkei-map直下で実行)
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console });
let passed = 0;
let failed = 0;
ctx.test = (name, fn) => {
  try { fn(); passed++; console.log('  ok   ' + name); }
  catch (e) { failed++; console.log('  FAIL ' + name + '\n         ' + e.message); }
};
ctx.eq = (a, b, msg) => {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x !== y) throw new Error((msg ? msg + ': ' : '') + 'expected ' + y + ' but got ' + x);
};
ctx.ok = (v, msg) => { if (!v) throw new Error(msg || 'expected truthy'); };
ctx.throws = (fn) => { try { fn(); } catch (e) { return; } throw new Error('expected to throw'); };

const load = (f) => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
['data/prefectures.js', 'js/util.js', 'js/store.js', 'js/filter.js', 'js/candidates.js',
  'data/spots.js', 'data/photos.js', 'data/japan-map.js', 'js/map.js', 'tests/fixtures.js']
  .filter((f) => fs.existsSync(path.join(root, f)))
  .forEach(load);
fs.readdirSync(__dirname).filter((f) => f.endsWith('.test.js')).sort()
  .forEach((f) => { console.log(f); load('tests/' + f); });

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
