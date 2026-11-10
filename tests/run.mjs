// Kiểm thử tự động (GDD mục 47). Chạy: npm test  hoặc  node tests/run.mjs  (cần Node 18+)
import assert from 'node:assert/strict';
import { calcDamage, rollCrit, rollDodge } from '../src/combat.js';
import * as I from '../src/items.js';
import { CFG, CLASSES, MONSTERS, AREAS, QUESTS } from '../src/data.js';
import { valid } from '../src/save.js';
import { MAPS, DEFS, CLASS_PAL } from '../src/sprites.js';
import { generateLayout, AREA_THEME } from '../src/maps.js';
import { THEMES, CELL } from '../src/themes.js';
import fs from 'node:fs';

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
test('bố cục bản đồ xác định (cùng khu vực cho cùng kết quả) và phủ kín lưới ô', () => {
  const a = generateLayout('forest', AREAS.forest, W, H), b = generateLayout('forest', AREAS.forest, W, H);
  assert.deepEqual(a.props, b.props); assert.equal(a.ground.length, Math.ceil(W / CELL) * Math.ceil(H / CELL));
});
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
  assert.equal(AREAS.forest.spawns.filter(s => s.id === 'wolf').length, 10);
  assert.equal(AREAS.cave.spawns.filter(s => s.id === 'spider').length, 12);
  assert.equal(AREAS.volcano.spawns.filter(s => s.id === 'fire_dragon').length, 1);
  assert.equal(MONSTERS.wolf.respawn, 8); assert.equal(MONSTERS.wolf_king.respawn, 24);
});

console.log(`\n${pass} đạt, ${fail} lỗi`);
process.exit(fail ? 1 : 0);
