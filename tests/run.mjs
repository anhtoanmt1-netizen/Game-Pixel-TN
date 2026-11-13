// Kiểm thử tự động (GDD mục 47). Chạy: npm test  hoặc  node tests/run.mjs  (cần Node 18+)
import assert from 'node:assert/strict';
import { calcDamage, rollCrit, rollDodge } from '../src/combat.js';
import * as I from '../src/items.js';
import { CFG, CLASSES, MONSTERS, AREAS, QUESTS } from '../src/data.js';
import { valid } from '../src/save.js';
import { MAPS, DEFS, CLASS_PAL } from '../src/sprites.js';
import { generateLayout, AREA_THEME, paintGround, GROUND_S } from '../src/maps.js';
import { THEMES, CELL } from '../src/themes.js';
import fs from 'node:fs';
import { buildNav, findPath, los } from '../src/nav.js';
import { frameFor } from '../src/charanim.js';
import { CHARS } from '../src/chars.js';

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('  ok  ' + name); } catch (e) { fail++; console.log('FAIL  ' + name + '\n      ' + e.message); } };
const withRandom = (v, fn) => { const o = Math.random; Math.random = () => v; try { return fn(); } finally { Math.random = o; } };
const newG = () => ({ level: 1, exp: 0, gold: 0, inv: [], eq: {}, cards: [], deck: [], pity: 0, cap: 300, q: {}, sk: {}, mat: { stone: 0 } });
const mage = CLASSES.mage;

console.log('Chiến đấu');
test('công thức sát thương khớp ví dụ GDD (≈333)', () => assert.equal(calcDamage(1000, 2, 500), 333));
test('sát thương tối thiểu là 1', () => assert.equal(calcDamage(1, 0.01, 99999), 1));
test('Crit bị chặn ở trần 75%', () => { assert.equal(withRandom(0.74, () => rollCrit(500, 75)), true); assert.equal(withRandom(0.76, () => rollCrit(500, 75)), false); });
test('Dodge bị chặn ở trần 45%', () => { assert.equal(withRandom(0.44, () => rollDodge(500, 45)), true); assert.equal(withRandom(0.46, () => rollDodge(500, 45)), false); });

console.log('Cấp độ');
test('EXP(L) = 100·L^1.65 khớp bảng GDD', () => { assert.equal(I.expNeed(1), 100); assert.equal(I.expNeed(10), 4467); assert.equal(I.expNeed(100), 199526); });

console.log('Trang bị');
test('số dòng thuộc tính nằm đúng khoảng theo độ hiếm, không trùng loại', () => {
  for (let ri = 0; ri < I.RARITY.length; ri++) for (let k = 0; k < 300; k++) {
    const it = I.genItem(30, ri), [lo, hi] = I.RARITY[ri].lines;
    assert.ok(it.affixes.length >= lo && it.affixes.length <= hi, `ri=${ri} n=${it.affixes.length}`);
    assert.equal(new Set(it.affixes.map(a => a.type)).size, it.affixes.length);
    assert.ok(it.affixes.every(a => a.v > 0) && it.main.v > 0);
  }
});
test('instanceId luôn duy nhất (5000 món)', () => { const ids = new Set(); for (let i = 0; i < 5000; i++) ids.add(I.genItem(10, 0).id); assert.equal(ids.size, 5000); });
test('Ancient luôn đủ 6 dòng', () => assert.equal(I.genItem(50, 6).affixes.length, 6));
test('pity: sau 30 lần không ra Epic thì ép Epic+ rồi reset', () => {
  const G = { pity: 29 };
  const ri = withRandom(0.99, () => I.rollRarity(G));
  assert.ok(ri >= 3); assert.equal(G.pity, 0);
});
test('rollRarity tôn trọng mức tối thiểu', () => assert.ok(withRandom(0.99, () => I.rollRarity({ pity: 0 }, 2)) >= 2));
test('nhẫn vào ring1 rồi ring2; thay đồ trả đồ cũ về túi', () => {
  const G = newG(), a = I.genItem(5, 1, 'ring'), b = I.genItem(5, 1, 'ring'), c = I.genItem(5, 1, 'ring');
  G.inv.push(a, b, c);
  I.equip(G, a); I.equip(G, b);
  assert.equal(G.eq.ring1.id, a.id); assert.equal(G.eq.ring2.id, b.id);
  I.equip(G, c);
  assert.equal(G.eq.ring1.id, c.id); assert.ok(G.inv.some(x => x.id === a.id));
  assert.equal(G.inv.length + Object.keys(G.eq).length, 3); // không mất / nhân đôi vật phẩm
});
test('không tháo đồ khi túi đã đầy', () => {
  const G = newG(); G.cap = 0; G.eq.weapon = I.genItem(5, 1, 'weapon');
  I.unequip(G, 'weapon'); assert.ok(G.eq.weapon);
});

console.log('Chỉ số & trần');
test('derive áp trần Crit/Dodge/Lifesteal/CDR', () => {
  const G = newG(), it = I.genItem(10, 4, 'weapon');
  it.affixes = [{ type: 'crit_rate', v: 500 }, { type: 'dodge', v: 500 }, { type: 'lifesteal', v: 500 }];
  G.eq.weapon = it; G.sk = { haste: 5 }; G.level = 100;
  const d = I.derive(mage, G, CFG);
  assert.ok(d.crit <= 75 && d.dodge <= 45 && d.lifesteal <= 25 && d.cdr <= 40);
});
test('bộ Dragon Knight: 2 món tăng HP, 4 món tăng ATK, 6 món mở Hỏa Long', () => {
  const G = newG(), base = I.derive(mage, G, CFG);
  const mk = kind => { const it = I.genItem(5, 2, kind, 'dragon'); it.main.v = 0; it.affixes = []; return it; };
  ['weapon', 'helmet'].forEach(k => G.eq[k] = mk(k));
  const two = I.derive(mage, G, CFG);
  assert.ok(two.maxHp > base.maxHp); assert.equal(two.dragonFire, 0);
  ['armor', 'gloves'].forEach(k => G.eq[k] = mk(k));
  assert.ok(I.derive(mage, G, CFG).matk > two.matk);
  ['boots', 'cloak'].forEach(k => G.eq[k] = mk(k));
  assert.equal(I.derive(mage, G, CFG).dragonFire, 1);
});
test('Thức tỉnh cộng thuộc tính đặc biệt; Đột phá nâng chỉ số chính', () => {
  const G = newG(), it = I.genItem(20, 4, 'weapon'); it.affixes = [];
  G.eq.weapon = it;
  const a = I.derive(mage, G, CFG);
  it.trans = true; const b = I.derive(mage, G, CFG);
  assert.ok(b.matk > a.matk);
  it.awaken = { type: 'cdr', v: 5 }; assert.equal(I.derive(mage, G, CFG).cdr, 5);
});
test('thẻ bài: sao/cấp/tiến hóa làm tăng chỉ số, ô thẻ ngoài kho không có tác dụng', () => {
  const G = newG(); G.level = 10;
  const none = I.derive(mage, G, CFG); G.deck = ['wolf'];
  assert.equal(I.derive(mage, G, CFG).matk, none.matk); // chưa sở hữu
  I.addCard(G, 'wolf'); const owned = I.derive(mage, G, CFG);
  assert.ok(owned.matk > none.matk);
  G.cards[0].lv = 10; const lv = I.derive(mage, G, CFG); assert.ok(lv.matk > owned.matk);
  G.cards[0].evo = true; assert.ok(I.derive(mage, G, CFG).matk > lv.matk);
});
test('thẻ trùng tăng sao, tối đa 5', () => { const G = newG(); for (let i = 0; i < 10; i++) I.addCard(G, 'wolf'); assert.equal(G.cards[0].star, 5); assert.equal(G.cards.length, 1); });

console.log('Nâng cấp & kinh tế');
test('cường hóa: tỷ lệ theo bậc, bảo hiểm +5%/lần thất bại, dừng ở +20 (+25 khi Đột phá)', () => {
  const it = I.genItem(10, 3, 'weapon');
  assert.equal(I.enhanceInfo(it).rate, 90);
  it.enh = 7; assert.equal(I.enhanceInfo(it).rate, 70);
  it.fail = 2; assert.equal(I.enhanceInfo(it).rate, 80);
  it.fail = 99; assert.ok(I.enhanceInfo(it).rate <= 95);
  it.enh = 20; assert.equal(I.enhanceInfo(it), null);
  it.trans = true; assert.ok(I.enhanceInfo(it));
  it.enh = 25; assert.equal(I.enhanceInfo(it), null);
});
test('đổi dòng thuộc tính không tạo loại trùng', () => {
  for (let k = 0; k < 300; k++) {
    const it = I.genItem(20, 4, 'weapon'), i = k % it.affixes.length, c = I.rerollAffix(it, i);
    assert.ok(!it.affixes.some((a, j) => j !== i && a.type === c.type));
  }
});
test('chế tạo luôn đắt hơn đá thu về từ phân giải (không có vòng lặp lãi)', () => {
  I.RECIPES.forEach(r => assert.ok(r.stone > I.STONE[r.ri], r.name));
});

console.log('Lưu dữ liệu');
test('kiểm tra hợp lệ file lưu/backup', () => {
  assert.ok(valid(newG()));
  assert.ok(!valid(null)); assert.ok(!valid({ level: 'x' })); assert.ok(!valid({ level: 1, inv: [] }));
});
test('tiến trình chịu được vòng JSON (lưu → tải)', () => {
  const G = newG(); G.eq.weapon = I.genItem(9, 5, 'weapon', 'dragon'); I.addCard(G, 'wolf_king');
  const back = JSON.parse(JSON.stringify(G));
  assert.deepEqual(I.derive(mage, back, CFG), I.derive(mage, G, CFG));
});

console.log('Toàn vẹn dữ liệu game');
test('mọi spawn tham chiếu quái tồn tại', () => Object.values(AREAS).forEach(a => a.spawns.forEach(s => assert.ok(MONSTERS[s.id], s.id))));
test('mọi cổng dẫn tới khu vực tồn tại; mọi khu vực có checkpoint', () => Object.entries(AREAS).forEach(([k, a]) => {
  assert.ok(a.checkpoints.length > 0, k);
  [a.portal, a.portal2, ...(a.extra || [])].filter(Boolean).forEach(p => assert.ok(AREAS[p.to], `${k} → ${p.to}`));
}));
test('điều kiện mở khóa và nhiệm vụ tham chiếu đúng', () => {
  const ids = new Set(QUESTS.map(q => q.id));
  Object.values(AREAS).forEach(a => { if (a.need) assert.ok(ids.has(a.need), a.need); });
  QUESTS.forEach(q => { assert.ok(MONSTERS[q.target], q.target); if (q.after) assert.ok(ids.has(q.after)); });
});
test('mọi quái có thẻ bài tương ứng; boss summon trỏ tới quái có thật', () => Object.entries(MONSTERS).forEach(([k, m]) => {
  assert.ok(I.CARDS[k], 'thẻ ' + k); if (m.summon) assert.ok(MONSTERS[m.summon]);
}));
test('4 lớp có kỹ năng hợp lệ', () => Object.values(CLASSES).forEach(c => assert.ok(c.skill && c.range > 0)));

console.log('Đồ họa');
test('mọi bản đồ sprite là 12×12 và chỉ dùng ký tự có trong bảng màu', () => {
  const pals = [...Object.entries(CLASS_PAL).map(([k, p]) => [k, p]), ...DEFS.map(d => [d[1], d[2]])];
  Object.entries(MAPS).forEach(([k, m]) => { assert.equal(m.length, 12, k); m.forEach(r => assert.equal(r.length, 12, k + ': ' + r)); });
  pals.forEach(([k, p]) => MAPS[k].forEach(r => [...r].forEach(ch => assert.ok(ch === '.' || p[ch], `${k}: thiếu màu '${ch}'`))));
});
test('mọi quái và mọi lớp đều có texture tương ứng', () => {
  const keys = new Set(DEFS.map(d => d[0]));
  Object.values(MONSTERS).forEach(m => assert.ok(keys.has(m.tex), m.tex));
  Object.keys(CLASSES).forEach(c => assert.ok(MAPS[c] && CLASS_PAL[c], c));
});

console.log('Bản đồ');
const W = CFG.world.w, H = CFG.world.h;
test('mọi khu vực có chủ đề màu và atlas tồn tại, đủ frame', () => Object.keys(AREAS).forEach(id => {
  const th = AREA_THEME[id]; assert.ok(THEMES[th], id);
  const fr = JSON.parse(fs.readFileSync(new URL(`../assets/${th}.json`, import.meta.url))).frames;
  Object.values(THEMES[th]).flat().forEach(([n]) => assert.ok(fr[n], `${th}:${n}`));
}));
test('bố cục bản đồ xác định, nền mịn vẽ ra đúng kích thước và màu hợp lệ', () => {
  const a = generateLayout('forest', AREAS.forest, W, H), b = generateLayout('forest', AREAS.forest, W, H);
  assert.deepEqual(a.props, b.props); assert.equal(a.path.length, a.cols * a.rows);
  const g = paintGround(a, W, H), g2 = paintGround(b, W, H); assert.equal(g.w, Math.ceil(W / GROUND_S)); assert.equal(g.data.length, g.w * g.h * 4);
  assert.deepEqual(Array.from(g.data.slice(0, 400)), Array.from(g2.data.slice(0, 400)));
  let mn = 255, mxx = 0; for (let i = 0; i < g.data.length; i += 4 * 97) { mn = Math.min(mn, g.data[i], g.data[i + 1], g.data[i + 2]); mxx = Math.max(mxx, g.data[i], g.data[i + 1], g.data[i + 2]); } assert.ok(mn > 40 && mxx < 250);
});
test('bản đồ gọn: ít vật thể, không dồn cụm quá dày', () => Object.keys(AREAS).forEach(id => {
  const L = generateLayout(id, AREAS[id], W, H); assert.ok(L.props.length <= 330, `${id}: ${L.props.length} vật thể`);
  const flat = L.props.filter(p => p.cat === 'deco').length; assert.ok(flat <= 100, `${id}: ${flat} deco`);
}));
test('mọi bản đồ: vật cản không đè điểm cần chừa; người chơi đi được từ điểm xuất phát tới mọi cổng, checkpoint, chỗ quái', () => {
  Object.keys(AREAS).forEach(id => {
    const L = generateLayout(id, AREAS[id], W, H), R = 11, G = 24, gw = Math.ceil(W / G), gh = Math.ceil(H / G);
    const blocked = (x, y) => L.blocks.some(b => Math.abs(x - b.x) < b.w / 2 + R && Math.abs(y - b.y) < b.h / 2 + R);
    L.keep.forEach(k => assert.ok(!blocked(k.x, k.y), `${id}: điểm (${k.x},${k.y}) bị chặn`));
    const seen = new Uint8Array(gw * gh), st = AREAS[id].checkpoints[0], q = [[Math.floor(st.x / G), Math.floor(st.y / G)]];
    seen[q[0][1] * gw + q[0][0]] = 1;
    while (q.length) { const [cx, cy] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh || seen[ny * gw + nx] || blocked(nx * G + G / 2, ny * G + G / 2)) continue; seen[ny * gw + nx] = 1; q.push([nx, ny]); } }
    L.keep.forEach(k => assert.ok(seen[Math.floor(k.y / G) * gw + Math.floor(k.x / G)], `${id}: không tới được (${k.x},${k.y})`));
  });
});
test('quái thường đã nhân đôi, boss giữ 1 con; hồi sinh nhanh hơn', () => {
  assert.ok(AREAS.forest.spawns.filter(s => s.id === 'wolf').length >= 10);
  assert.ok(AREAS.cave.spawns.filter(s => s.id === 'spider').length >= 12);
  assert.equal(AREAS.volcano.spawns.filter(s => s.id === 'fire_dragon').length, 1);
  assert.equal(MONSTERS.wolf.respawn, 8); assert.equal(MONSTERS.wolf_king.respawn, 24);
});

console.log('Giao diện');
import { LAYOUT } from '../src/layout.js';
import * as INV from '../src/inv.js';
import { SLOTS } from '../src/items.js';
test('layout: đủ ô và nằm trong khung 16:9', () => {
  assert.equal(LAYOUT.igrid.length, 42); assert.deepEqual(Object.keys(LAYOUT.eslots).sort(), [...SLOTS].sort());
  assert.equal(LAYOUT.dslots.length, 16); assert.equal(LAYOUT.srows.length, 16); assert.equal(LAYOUT.tabs.length, 5); assert.equal(LAYOUT.itabs.length, 7);
  assert.equal(LAYOUT.round.length, 7); assert.equal(LAYOUT.diamond.length, 7); assert.equal(LAYOUT.bags.length, 6);
  const all = [...LAYOUT.igrid, ...Object.values(LAYOUT.eslots), ...LAYOUT.dslots, ...LAYOUT.srows, ...LAYOUT.tabs, ...LAYOUT.itabs, ...LAYOUT.round, ...LAYOUT.diamond, ...LAYOUT.bags, LAYOUT.track, LAYOUT.stage];
  all.forEach(r => { assert.ok(r[0] >= 0 && r[1] >= 0 && r[0] + r[2] <= 100.01 && r[1] + r[3] <= 100.01, JSON.stringify(r)); });
});
test('icon trang bị: mọi loại x mọi độ hiếm x mọi lớp ra đúng ô trong sprite 6×12', () => {
  for (const cls of Object.keys(CLASSES)) for (let ri = 0; ri < 7; ri++) for (const slot of ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'necklace', 'ring', 'cloak', 'accessory']) {
    const p = INV.iconPos({ slot, ri }, cls); assert.ok(p.row >= 0 && p.row <= 11 && p.col >= 0 && p.col <= 5, `${cls} ${slot} ${ri}`);
  }
  assert.equal(INV.iconKey({ slot: 'weapon' }, 'mage'), 'staff'); assert.equal(INV.iconKey({ slot: 'weapon' }, 'elf'), 'bow');
  assert.equal(INV.iconKey({ slot: 'helmet' }, 'mage'), 'hat'); assert.equal(INV.iconKey({ slot: 'accessory' }, 'rogue'), 'book');
  assert.equal(INV.iconPos({ slot: 'ring', ri: 6 }, 'mage').fire, true);
});
test('lọc / sắp xếp túi', () => {
  const inv = [I.genItem(5, 0, 'weapon'), I.genItem(9, 3, 'ring'), I.genItem(7, 5, 'boots'), I.genItem(3, 3, 'weapon')]; inv[2].locked = true;
  assert.equal(INV.filterInv(inv, { group: 'weapon' }).length, 2); assert.equal(INV.filterInv(inv, { group: 'locked' }).length, 1);
  assert.equal(INV.filterInv(inv, { rarity: 3 }).length, 2); assert.equal(INV.filterInv(inv, { group: 'armor' }).length, 1);
  INV.sortInv(inv, 'rarity'); assert.ok(inv.every((x, i) => !i || inv[i - 1].ri >= x.ri));
  INV.sortInv(inv, 'level'); assert.ok(inv.every((x, i) => !i || inv[i - 1].lv >= x.lv));
});
test('bán / phân giải nhanh không bao giờ động tới đồ khóa và đúng tổng', () => {
  const G = newG(); G.inv = [I.genItem(5, 0, 'weapon'), I.genItem(5, 1, 'ring'), I.genItem(5, 2, 'boots'), I.genItem(5, 1, 'ring')]; G.inv[1].locked = true;
  const l = INV.quickList(G.inv, { maxRi: 1 }); assert.equal(l.length, 2); assert.ok(l.every(x => !x.locked && x.ri <= 1));
  const t = INV.quickTotals(l); assert.equal(t.gold, l.reduce((a, x) => a + INV.sellValue(x), 0));
  INV.applyRemove(G, l); assert.equal(G.inv.length, 2); assert.ok(G.inv.some(x => x.locked));
  assert.equal(INV.quickList(G.inv, { maxRi: 5, kinds: new Set(['boots']) }).length, 1);
});
test('kéo-thả: mặc đúng ô, từ chối sai ô, hoán đổi, không mất đồ', () => {
  const G = newG(), w = I.genItem(5, 2, 'weapon'), r1 = I.genItem(5, 2, 'ring'), r2 = I.genItem(5, 2, 'ring'), h = I.genItem(5, 2, 'helmet');
  G.inv = [w, r1, r2, h];
  assert.equal(INV.equipTo(G, w, 'helmet'), false); assert.equal(G.inv.length, 4);            // sai ô
  assert.equal(INV.equipTo(G, w, 'weapon'), true); assert.equal(INV.equipTo(G, r1, 'ring2'), true); assert.equal(G.eq.ring2.id, r1.id);
  assert.equal(INV.equipTo(G, r2, 'ring2'), true); assert.ok(G.inv.some(x => x.id === r1.id)); // hoán đổi về túi
  assert.equal(INV.moveEq(G, 'ring2', 'ring1'), true); assert.equal(G.eq.ring1.id, r2.id);     // đổi nhẫn trái/phải
  assert.equal(INV.moveEq(G, 'weapon', 'helmet'), false);
  assert.equal(G.inv.length + Object.keys(G.eq).length, 4);
});
try { // kiểm thử khói cho bảng giao diện với DOM giả (không có trình duyệt thật)
  const created = [];
  const mk = () => { const o = { style: { setProperty() {} }, dataset: {}, listeners: {}, _html: '', clientWidth: 1000,
    classList: { s: new Set(), add(c) { this.s.add(c); }, remove(c) { this.s.delete(c); }, contains(c) { return this.s.has(c); }, toggle() {} },
    appendChild() {}, remove() {}, addEventListener(t, f) { this.listeners[t] = f; }, querySelector: () => null, querySelectorAll: () => [], getContext: () => ({}) };
    Object.defineProperty(o, 'innerHTML', { get() { return this._html; }, set(v) { this._html = v; this._fc = null; } });
    Object.defineProperty(o, 'firstChild', { get() { return this._fc || (this._fc = mk()); } }); created.push(o); return o; };
  globalThis.document = { head: mk(), body: mk(), createElement: () => mk(), getElementById: () => null, elementFromPoint: () => null };
  globalThis.window = { addEventListener() {}, confirm: () => true, prompt: () => '1' }; globalThis.alert = () => {}; globalThis.prompt = () => '1'; globalThis.confirm = () => true;
  const { initBoard } = await import('../src/board.js');
  const G = newG(); G.classId = 'mage'; G.level = 30; G.gold = 99999; G.set = { sfx: true, music: true, vol: 0.5, lowfx: false, zoom: 'near', minimap: true }; G.st = { kills: 0, boss: 0 }; G.ach = {}; G.pet = null; G.mat = { stone: 500 }; G.area = 'forest';
  for (let ri = 0; ri < 7; ri++) G.inv.push(I.genItem(20, ri), I.genItem(20, ri, 'weapon', 'dragon')); I.addCard(G, 'wolf'); I.addCard(G, 'sc_power'); G.q = { q1: { p: 5, done: true } };
  let changed = 0, traveled = null;
  const api = initBoard(G, { ps: () => ({ hp: 100, maxHp: 200 }), onChange: () => { changed++; }, msg() {}, travel: id => { traveled = id; }, toggleAuto() {} });
  const root = created.find(e => e.id === 'ui'), board = root.firstChild;
  api.open(); const html = () => board.innerHTML, click = d => board.listeners.click({ target: { closest: () => ({ dataset: { ...d } }) } });
  const must = (s, why) => assert.ok(html().includes(s), why || s);
  must('MẶC ĐỒ'); must('Tấn Công'); must('data-drop="eq:weapon"'); must('data-drop="eq:accessory"'); must('Sinh Lực');
  assert.ok((html().match(/data-from="inv"/g) || []).length === 14, 'túi hiển thị đủ 14 món');
  for (const [t, s] of [['skill', 'Kỹ năng bị động'], ['card', 'Bộ thẻ'], ['quest', 'Nhiệm vụ'], ['map', 'Dịch chuyển'], ['equip', 'Tấn Công']]) { click({ a: 'tab', t }); must(s, 'tab ' + t); }
  for (const [m, s] of [['set', 'Tầm nhìn'], ['pets', 'Thú đồng hành'], ['craft', 'Chế tạo'], ['ach', 'Thành tựu'], ['filter', 'Lọc'], ['quick', 'Bán nhanh']]) { click({ a: m === 'quick' ? 'quick' : 'modal', m, mode: 'sell' }); must(s, 'modal ' + m); click({ a: 'closemodal' }); }
  const id0 = G.inv[0].id; click({ a: 'sel', id: id0 }); must('Cường hóa'); must('Phân giải');
  click({ a: 'lock', id: id0 }); assert.equal(G.inv[0].locked, true); click({ a: 'lock', id: id0 });
  const w = G.inv.find(x => x.slot === 'weapon'); click({ a: 'equip', id: w.id }); assert.equal(G.eq.weapon.id, w.id);
  const gold0 = G.gold, victim = G.inv.find(x => x.ri === 0); click({ a: 'sell', id: victim.id }); assert.ok(G.gold > gold0 && !G.inv.includes(victim));
  const n0 = G.inv.length, lockedBefore = G.inv.filter(x => x.locked).length; G.inv[0].locked = true;
  click({ a: 'quick', mode: 'sell' }); click({ a: 'qri', v: '5' }); click({ a: 'qgo' }); assert.ok(G.inv.length < n0 && G.inv.some(x => x.locked), 'bán nhanh giữ đồ khóa');
  click({ a: 'grp', g: 'weapon' }); assert.ok(html().includes('data-from="inv"')); click({ a: 'clearf' });
  click({ a: 'sk', k: 'power' }); assert.equal(G.sk.power, 1);
  click({ a: 'travel', id: 'cave' }); assert.equal(traveled, 'cave');
  assert.ok(changed > 5); pass++; console.log('  ok  bảng giao diện (DOM giả): mọi tab, hộp thoại và thao tác chính chạy đúng');
} catch (e) { fail++; console.log('FAIL  bảng giao diện (DOM giả)\n      ' + (e.stack || e.message).split('\n').slice(0, 4).join('\n      ')); }

console.log('Nhân vật & Auto');
test('dò đường vòng qua tường có khe hở; không cắt ngang vật cản', () => {
  const blocks = [{ x: 500, y: 300, w: 40, h: 500 }], nav = buildNav(blocks, 1000, 600);
  assert.equal(los(nav, 300, 300, 700, 300), false);
  const p = findPath(nav, 300, 300, 700, 300); assert.ok(p && p.length >= 2, 'có đường');
  let a = { x: 300, y: 300 }; for (const b of p) { assert.ok(los(nav, a.x, a.y, b.x, b.y), 'đoạn thông'); a = b; }
  assert.ok(Math.hypot(a.x - 700, a.y - 300) < 30);
  assert.equal(findPath(buildNav([{ x: 500, y: 300, w: 40, h: 700 }], 1000, 600), 300, 300, 700, 300), null); // tường kín
});
test('mọi bản đồ: từ điểm xuất phát dò được đường tới mọi cổng, checkpoint, chỗ quái', () => {
  Object.keys(AREAS).forEach(id => {
    const L = generateLayout(id, AREAS[id], W, H), nav = buildNav(L.blocks, W, H), s = AREAS[id].checkpoints[0];
    L.keep.forEach(k => assert.ok(findPath(nav, s.x, s.y, k.x, k.y), `${id}: không có đường tới (${k.x},${k.y})`));
  });
});
test('hoạt ảnh: khung hình luôn tồn tại trong atlas và hướng lật đúng', () => {
  for (const cls of Object.keys(CHARS)) {
    const fr = JSON.parse(fs.readFileSync(new URL(`../assets/chars/${cls}.json`, import.meta.url))).frames;
    for (const dir of ['up', 'down', 'left', 'right']) for (const moving of [true, false]) for (const tt of [0, 0.3, 1.7]) {
      const r = frameFor(cls, { dir, moving, t: tt, aimRight: true }); assert.ok(fr[r.name], `${cls} ${r.name}`);
      assert.equal(r.flipX, dir === 'right' && (moving || true) && r.name === 'left');
    }
    for (const kind of ['atk', 'skl']) for (let p = 0; p <= 1; p += 0.1) for (const aimRight of [true, false]) {
      const r = frameFor(cls, { dir: 'down', moving: false, t: 0, aimRight, lunge: 10, atk: { kind, p } }); assert.ok(fr[r.name], `${cls} ${kind} ${r.name}`);
      assert.equal(r.flipX, aimRight !== (CHARS[cls].face[kind] === 'right'));
    }
  }
});
test('may mắn tăng tỷ lệ rơi đồ từ bậc Hiếm; tôn trọng mức tối thiểu', () => {
  const share = luck => { let n = 0; for (let i = 0; i < 30000; i++) { if (I.rollRarity({ pity: -1e9 }, 0, luck) >= 2) n++; } return n / 30000; };
  const a = share(0), b = share(100); assert.ok(b > a * 1.6, `${a} → ${b}`);
  assert.ok(I.rollRarity({ pity: -1e9 }, 3, 0) >= 3);
});
test('chỉ số may mắn: có dòng thuộc tính, bị chặn ở 100%, hiển thị tiếng Việt', () => {
  const G = newG(), it = I.genItem(10, 4, 'ring'); it.affixes = [{ type: 'luck', v: 500 }]; G.eq.ring1 = it; G.level = 10;
  assert.equal(I.derive(CLASSES.mage, G, CFG).luck, 100); assert.equal(I.fmt({ type: 'luck', v: 4 }), '+4% May mắn');
  assert.ok(I.fmt({ type: 'crit_rate', v: 2 }).includes('chí mạng'));
  let seen = false; for (let i = 0; i < 3000 && !seen; i++) seen = I.genItem(30, 5, 'ring').affixes.some(a => a.type === 'luck'); assert.ok(seen);
});
test('tên trang bị tiếng Việt khớp icon', () => {
  assert.equal(INV.itemName({ slot: 'weapon', ri: 2 }, 'mage'), 'Trượng Hiếm'); assert.equal(INV.itemName({ slot: 'helmet', ri: 0 }, 'knight'), 'Mũ giáp Thường');
  assert.ok(INV.itemName({ slot: 'accessory', ri: 4, set: 'dragon' }, 'elf').includes('Sách phép'));
});

console.log(`\n${pass} đạt, ${fail} lỗi`);
process.exit(fail ? 1 : 0);
