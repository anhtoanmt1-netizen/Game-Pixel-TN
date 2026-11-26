// Kiểm thử tự động (GDD mục 47). Chạy: npm test  hoặc  node tests/run.mjs  (cần Node 18+)
import assert from 'node:assert/strict';
import { calcDamage, rollCrit, rollDodge } from '../src/combat.js';
import * as I from '../src/items.js';
import { CFG, CLASSES, MONSTERS, AREAS, QUESTS } from '../src/data.js';
import { valid } from '../src/save.js';
import { MAPS, DEFS, CLASS_PAL } from '../src/sprites.js';
import { generateLayout, AREA_THEME, paintGround, GROUND_S, TCELL, T as TT, TEX_NAMES } from '../src/maps.js';
import { stepSway } from '../src/wind.js';
import * as AU from '../src/auto.js';
import { DANGER } from '../src/data.js';
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
const flat = c => ({ w: 4, h: 4, data: Uint8ClampedArray.from({ length: 64 }, (_, i) => i % 4 === 3 ? 255 : c[i % 4]) });
const FLAT = { grass: flat([60, 160, 40]), dirt: flat([200, 160, 100]), sand: flat([230, 210, 140]), stone: flat([130, 130, 130]), water: flat([30, 100, 220]), shallow: flat([100, 220, 220]), meadow: flat([70, 170, 60]) };
test('bố cục xác định; nền hòa trộn đúng loại địa hình (nước xanh, đường mòn là đất)', () => {
  const a = generateLayout('forest', AREAS.forest, W, H), b = generateLayout('forest', AREAS.forest, W, H);
  assert.deepEqual(a.props, b.props); assert.deepEqual(Array.from(a.ter), Array.from(b.ter)); assert.equal(a.ter.length, a.cols * a.rows);
  const g = paintGround(a, W, H, FLAT), g2 = paintGround(b, W, H, FLAT); assert.equal(g.w, Math.ceil(W / GROUND_S)); assert.equal(g.data.length, g.w * g.h * 4);
  assert.deepEqual(Array.from(g.data.slice(0, 400)), Array.from(g2.data.slice(0, 400)));
  const px = (i) => { const x = Math.round(((i % a.cols) + 0.5) * TCELL / GROUND_S), y = Math.round((((i / a.cols) | 0) + 0.5) * TCELL / GROUND_S), o = (y * g.w + x) * 4; return [g.data[o], g.data[o + 1], g.data[o + 2]]; };
  const wi = Array.from(a.ter).findIndex((v, i) => v === TT.WATER && [1, -1, a.cols, -a.cols].every(d => a.ter[i + d] === TT.WATER)); assert.ok(wi >= 0, 'có hồ');
  const [r1, , b1] = px(wi); assert.ok(b1 > r1 + 80, 'nước phải xanh');
  const di = Array.from(a.ter).findIndex((v, i) => v === TT.DIRT && a.ter[i + 1] === TT.DIRT && a.ter[i - 1] === TT.DIRT && a.ter[i + a.cols] === TT.DIRT && a.ter[i - a.cols] === TT.DIRT); assert.ok(di >= 0, 'có đường mòn'); const [r2, , b2] = px(di); assert.ok(r2 > b2 + 50, 'đường mòn là đất');
});
test('địa hình: hồ có nước nông viền quanh và mọi ô nước đều bị chặn; cỏ chỉ mọc trên đất cỏ', () => {
  const L = generateLayout('forest', AREAS.forest, W, H);
  let nWater = 0; L.ter.forEach((v, i) => {
    const x = ((i % L.cols) + 0.5) * TCELL, y = (((i / L.cols) | 0) + 0.5) * TCELL;
    if (v === TT.WATER) { nWater++; assert.ok(L.blocks.some(b => b.water && Math.abs(b.x - x) <= b.w / 2 && Math.abs(b.y - y) <= b.h / 2), 'nước phải bị chặn'); const cx = i % L.cols, cy = (i / L.cols) | 0; if (cx > 0 && cy > 0 && cx < L.cols - 1 && cy < L.rows - 1) [1, -1, L.cols, -L.cols].forEach(d => assert.ok(L.ter[i + d] === TT.WATER || L.ter[i + d] === TT.SHALLOW, 'viền nước nông')); }
  }); assert.ok(nWater > 20);
  L.props.filter(p => p.cat === 'tuft').forEach(p => { const v = L.ter[Math.floor(p.y / TCELL) * L.cols + Math.floor(p.x / TCELL)]; assert.ok(v === TT.GRASS || v === TT.MEADOW, 'bụi cỏ trên ô ' + v); });
  Object.keys(AREAS).forEach(id => { const l = generateLayout(id, AREAS[id], W, H); l.keep.forEach(k => assert.notEqual(l.ter[Math.floor(k.y / TCELL) * l.cols + Math.floor(k.x / TCELL)], TT.WATER, id + ': nước phủ lên điểm quan trọng')); });
});
test('bản đồ gọn: ít vật thể, bố cục theo cụm, đủ bụi cỏ để lay động', () => Object.keys(AREAS).forEach(id => {
  const L = generateLayout(id, AREAS[id], W, H), solid = L.props.filter(p => p.cat !== 'tuft'); assert.ok(solid.length <= 300, `${id}: ${solid.length} vật thể`);
  assert.ok(L.props.filter(p => p.cat === 'deco').length <= 100); assert.ok(L.props.filter(p => p.cat === 'tuft').length <= 1100);
}));
test('texture địa hình đủ cho mọi chủ đề', () => { for (const th of ['forest', 'cave', 'volcano', 'ice', 'dark']) for (const n of TEX_NAMES) assert.ok(fs.existsSync(new URL(`../assets/terrain/${th}_${n}.jpg`, import.meta.url)), `${th}_${n}`); });
test('cỏ lay: gió làm lay nhẹ; người đi qua đẩy nghiêng ra xa rồi hồi lại', () => {
  const s = { x: 100, y: 100, amp: 0.13, ph: 1, ang: 0, vel: 0 }; let mx = 0;
  for (let i = 0; i < 600; i++) { stepSway(s, i / 60, 1 / 60, []); mx = Math.max(mx, Math.abs(s.ang)); } assert.ok(mx > 0.02 && mx < 0.2, 'gió ' + mx);
  const r = { x: 100, y: 100, amp: 0.13, ph: 0, ang: 0, vel: 0 }; for (let i = 0; i < 20; i++) stepSway(r, 0, 1 / 60, [{ x: 80, y: 100 }]); assert.ok(r.ang > 0.1, 'bị đẩy sang phải khi người ở bên trái ' + r.ang);
  for (let i = 0; i < 300; i++) stepSway(r, 5 + i / 60, 1 / 60, []); assert.ok(Math.abs(r.ang) < 0.2, 'hồi lại');
  const far = { x: 100, y: 100, amp: 0.13, ph: 0, ang: 0, vel: 0 }; for (let i = 0; i < 20; i++) stepSway(far, 0, 1 / 60, [{ x: 400, y: 400 }]); assert.ok(Math.abs(far.ang) < 0.1, 'ở xa không bị đẩy');
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
  assert.ok(AREAS.forest.spawns.filter(s => s.id === 'wolf').length >= 10);
  assert.ok(AREAS.cave.spawns.filter(s => s.id === 'spider').length >= 12);
  assert.equal(AREAS.volcano.spawns.filter(s => s.id === 'fire_dragon').length, 1);
  assert.equal(MONSTERS.wolf.respawn, 8); assert.equal(MONSTERS.wolf_king.respawn, 24);
});

console.log('Giao diện');
import { LAYOUT } from '../src/layout.js';
import * as INV from '../src/inv.js';
import * as EQ from '../src/equipicons.js';
import * as IC from '../src/icons.js';
import * as SV from '../src/save.js';
import { SLOTS } from '../src/items.js';
test('layout: đủ ô và nằm trong khung 16:9', () => {
  assert.equal(LAYOUT.igrid.length, 42); assert.deepEqual(Object.keys(LAYOUT.eslots).sort(), [...SLOTS].sort());
  assert.equal(LAYOUT.dslots.length, 16); assert.equal(LAYOUT.srows.length, 16); assert.equal(LAYOUT.tabs.length, 5); assert.equal(LAYOUT.itabs.length, 7);
  assert.equal(LAYOUT.round.length, 7); assert.equal(LAYOUT.diamond.length, 7); assert.equal(LAYOUT.bags.length, 6);
  const all = [...LAYOUT.igrid, ...Object.values(LAYOUT.eslots), ...LAYOUT.dslots, ...LAYOUT.srows, ...LAYOUT.tabs, ...LAYOUT.itabs, ...LAYOUT.round, ...LAYOUT.diamond, ...LAYOUT.bags, LAYOUT.track, LAYOUT.stage];
  all.forEach(r => { assert.ok(r[0] >= 0 && r[1] >= 0 && r[0] + r[2] <= 100.01 && r[1] + r[3] <= 100.01, JSON.stringify(r)); });
});
test('icon trang bị: mọi loại x mọi độ hiếm x mọi lớp ra đúng ô trong sheet 7 cột', () => {
  for (const cls of Object.keys(CLASSES)) for (let ri = 0; ri < 7; ri++) for (const slot of ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'necklace', 'ring', 'cloak', 'accessory']) {
    const p = INV.iconPos({ slot, ri }, cls); assert.ok(p.row >= 0 && p.row < EQ.EQUIP_ROWS.length && p.col >= 0 && p.col < EQ.EQUIP_COLS, `${cls} ${slot} ${ri}`);
  }
  assert.equal(INV.iconPos({ slot: 'ring', ri: 6 }, 'mage').col, 6); assert.equal(INV.iconPos({ slot: 'ring', ri: 4 }, 'mage').col, 5); // Huyền thoại = cột vàng, Thần thoại = cột đỏ
});
test('vũ khí và vật phẩm chuyên dụng: mỗi lớp một bộ hình riêng', () => {
  const want = { knight: ['sword', 'shield'], elf: ['bow', 'quiver'], mage: ['book', 'orb'], rogue: ['blades', 'mask'] };
  for (const [c, [w, a]] of Object.entries(want)) { assert.equal(INV.iconKey({ slot: 'weapon' }, c), w); assert.equal(INV.iconKey({ slot: 'accessory' }, c), a); }
  assert.equal(new Set(Object.keys(want).map(c => INV.iconKey({ slot: 'weapon' }, c))).size, 4); assert.equal(new Set(Object.keys(want).map(c => INV.iconKey({ slot: 'accessory' }, c))).size, 4);
  assert.equal(INV.iconKey({ slot: 'helmet' }, 'mage'), 'hat'); assert.equal(INV.iconKey({ slot: 'helmet' }, 'knight'), 'helmet');
  assert.equal(INV.iconKey({ slot: 'weapon', cls: 'elf' }, 'mage'), 'bow', 'trang bị ghi lớp riêng thì theo lớp đó');
  for (const k of EQ.EQUIP_ROWS) assert.ok(typeof k === 'string');
});
test('sheet equip.png khớp kích thước khai báo', () => {
  const b = fs.readFileSync(new URL('../assets/ui/equip.png', import.meta.url)), w = b.readUInt32BE(16), h = b.readUInt32BE(20);
  assert.equal(w, EQ.EQUIP_COLS * EQ.EQUIP_CELL); assert.equal(h, EQ.EQUIP_ROWS.length * EQ.EQUIP_CELL);
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
  const G = newG(); G.classId = 'mage'; G.level = 30; G.gold = 99999; G.set = { sfx: true, music: true, vol: 0.5, lowfx: false, zoom: 'near', minimap: true }; G.set.auto = AU.normAuto(); G.st = { kills: 0, boss: 0 }; G.ach = {}; G.pet = null; G.mat = { stone: 500 }; G.area = 'forest';
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
  const id0 = G.inv[0].id; click({ a: 'sel', id: id0 }); must('Cường Hóa'); must('Đổi Dòng'); must('Thức Tỉnh'); must('Đột Phá'); must('Phân giải'); must('data-a="forge"');
  click({ a: 'lock', id: id0 }); assert.equal(G.inv[0].locked, true); click({ a: 'lock', id: id0 });
  const w = G.inv.find(x => x.slot === 'weapon'); click({ a: 'equip', id: w.id }); assert.equal(G.eq.weapon.id, w.id);
  const gold0 = G.gold, victim = G.inv.find(x => x.ri === 0); click({ a: 'sell', id: victim.id }); assert.ok(G.gold > gold0 && !G.inv.includes(victim));
  const n0 = G.inv.length, lockedBefore = G.inv.filter(x => x.locked).length; G.inv[0].locked = true;
  click({ a: 'quick', mode: 'sell' }); click({ a: 'qri', v: '5' }); click({ a: 'qgo' }); assert.ok(G.inv.length < n0 && G.inv.some(x => x.locked), 'bán nhanh giữ đồ khóa');
  click({ a: 'grp', g: 'weapon' }); assert.ok(html().includes('data-from="inv"')); click({ a: 'clearf' });
  click({ a: 'sk', k: 'power' }); assert.equal(G.sk.power, 1);
  click({ a: 'travel', id: 'cave' }); assert.equal(traveled, 'cave');
  click({ a: 'modal', m: 'auto' }); must('Cài đặt Auto'); must('Auto quanh vị trí'); must('Nhặt sau khi hết quái');
  click({ a: 'au', f: 'range', v: 'far' }); assert.equal(G.set.auto.range, 'far'); click({ a: 'au', f: 'mode', v: 'around' }); assert.equal(G.set.auto.mode, 'around'); click({ a: 'au', f: 'pickWhen', v: 'after' }); assert.equal(G.set.auto.pickWhen, 'after');
  click({ a: 'au', f: 'pickMode', v: 'both' }); must('Loại cần nhặt'); must('Phẩm chất cần nhặt'); click({ a: 'aut', f: 'pickKinds', v: 'weapon' }); assert.ok(!G.set.auto.pickKinds.includes('weapon')); click({ a: 'aut', f: 'pickRar', v: '0' }); assert.ok(!G.set.auto.pickRar.includes(0));
  click({ a: 'autog', f: 'sell' }); must('Loại tự bán'); click({ a: 'au', f: 'sellMaxRi', v: '2' }); assert.equal(G.set.auto.sellMaxRi, 2); click({ a: 'autog', f: 'equip' }); assert.equal(G.set.auto.equip, true); click({ a: 'closemodal' });
  click({ a: 'wide' }); must('Bảng chỉ số'); must('May mắn'); click({ a: 'wide' }); must('Sinh Lực');
  click({ a: 'tab', t: 'card' }); must('Bán thẻ theo bộ lọc'); click({ a: 'cfr', v: '2' }); assert.equal(G.cards.length, 2); must('Thẻ Sói'); click({ a: 'cfr', v: 'all' }); click({ a: 'cfk', v: 'skill' }); assert.ok(!html().includes('Thẻ Sói')); click({ a: 'cfk', v: 'all' });
  click({ a: 'cardlock', id: 'wolf' }); assert.equal(G.cards.find(c => c.t === 'wolf').locked, true); click({ a: 'csellmodal' }); must('Bán thẻ theo bộ lọc'); const g1 = G.gold; click({ a: 'csellgo' }); assert.ok(G.cards.some(c => c.t === 'wolf') && !G.cards.some(c => c.t === 'sc_power') && G.gold > g1, 'bán thẻ chưa khóa, giữ thẻ đã khóa');
  click({ a: 'tab', t: 'equip' });
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
  assert.equal(INV.itemName({ slot: 'weapon', ri: 2 }, 'mage'), 'Sách Phép Hiếm'); assert.equal(INV.itemName({ slot: 'helmet', ri: 0 }, 'knight'), 'Mũ Giáp Thường');
  assert.equal(INV.itemName({ slot: 'accessory', ri: 3 }, 'knight'), 'Khiên Sử thi'); assert.equal(INV.itemName({ slot: 'accessory', ri: 3 }, 'rogue'), 'Mặt Nạ Sát Thủ Sử thi');
  assert.ok(INV.itemName({ slot: 'accessory', ri: 4, set: 'dragon' }, 'elf').includes('Túi Tên'));
});

console.log('Auto, thẻ, định dạng, quái');
test('định dạng số: tối đa 2 chữ số thập phân, dấu phẩy, phân cách nghìn', () => {
  assert.equal(I.fmt2(1.78), '1,78'); assert.equal(I.fmt2(1.7849), '1,78'); assert.equal(I.fmt2(1.5), '1,5'); assert.equal(I.fmt2(1234.567), '1.234,57'); assert.equal(I.fmt2(2580750), '2.580.750'); assert.equal(I.fmt2(0), '0'); assert.equal(I.fmt2(-3.456), '-3,46'); assert.equal(I.fmt({ type: 'crit_rate', v: 3.456 }), '+3,46% Tỷ lệ chí mạng');
});
test('Auto: bộ lọc nhặt theo loại / phẩm chất / cả hai', () => {
  const c = AU.normAuto({ pickMode: 'kinds', pickKinds: ['weapon', 'card'] }), w = { item: I.genItem(5, 1, 'weapon') }, r = { item: I.genItem(5, 5, 'ring') }, cd = { card: 'wolf' };
  assert.ok(AU.passesPick(c, w) && !AU.passesPick(c, r) && AU.passesPick(c, cd));
  const q = AU.normAuto({ pickMode: 'rarity', pickRar: [4, 5, 6] }); assert.ok(!AU.passesPick(q, w) && AU.passesPick(q, r));
  const b = AU.normAuto({ pickMode: 'both', pickKinds: ['ring'], pickRar: [5] }); assert.ok(AU.passesPick(b, r) && !AU.passesPick(b, w)); assert.ok(AU.passesPick(AU.normAuto(), w));
});
test('Auto: tự bán theo loại + phẩm chất, giữ đồ khóa và đồ ngoài danh sách', () => {
  const c = AU.normAuto({ sell: true, sellKinds: ['weapon', 'ring'], sellMaxRi: 2 }), a = I.genItem(5, 2, 'weapon'), b = I.genItem(5, 3, 'weapon'), r = I.genItem(5, 1, 'boots'), k = I.genItem(5, 0, 'ring'); k.locked = true;
  assert.ok(AU.shouldSell(c, a)); assert.ok(!AU.shouldSell(c, b)); assert.ok(!AU.shouldSell(c, r)); assert.ok(!AU.shouldSell(c, k)); assert.ok(!AU.shouldSell(AU.normAuto({ sell: false }), a));
});
test('Auto: chọn mục tiêu theo phạm vi (gần/xa/toàn bản đồ) và chế độ quanh vị trí / tự do', () => {
  const p = { x: 1000, y: 1000 }, en = [{ x: 1100, y: 1000 }, { x: 1500, y: 1000 }, { x: 2800, y: 1000 }];
  assert.equal(AU.pickTarget(AU.normAuto({ range: 'near', mode: 'free' }), null, p, en), en[0]);
  assert.equal(AU.pickTarget(AU.normAuto({ range: 'near', mode: 'free' }), null, p, en.slice(1)), null);
  assert.equal(AU.pickTarget(AU.normAuto({ range: 'far', mode: 'free' }), null, p, en.slice(1)), en[1]);
  assert.equal(AU.pickTarget(AU.normAuto({ range: 'map', mode: 'free' }), null, p, en.slice(2)), en[2]);
  const anchor = { x: 400, y: 400 }; assert.equal(AU.pickTarget(AU.normAuto({ range: 'near', mode: 'around' }), anchor, p, en), null, 'quanh vị trí: chỉ đánh quái gần điểm neo');
});
test('Auto: chọn vật phẩm rơi theo bộ lọc, phạm vi, túi đầy; nhặt ngay / sau khi hết quái do hành vi quyết định', () => {
  const p = { x: 0, y: 0 }, d1 = { x: 100, y: 0, item: I.genItem(5, 0, 'weapon') }, d2 = { x: 300, y: 0, item: I.genItem(5, 5, 'ring') }, d3 = { x: 50, y: 0, card: 'wolf' };
  assert.equal(AU.pickDrop(AU.normAuto(), null, p, [d1, d2], false), d1);
  assert.equal(AU.pickDrop(AU.normAuto({ pickMode: 'rarity', pickRar: [5] }), null, p, [d1, d2], false), d2);
  assert.equal(AU.pickDrop(AU.normAuto(), null, p, [d1, d3], true), d3, 'túi đầy vẫn nhặt được thẻ, không nhặt trang bị');
  assert.equal(AU.pickDrop(AU.normAuto({ mode: 'around', range: 'near' }), { x: 2000, y: 2000 }, p, [d1], false), null);
});
test('Tự trang bị: so sánh tổng thể chỉ số, chỉ mặc khi tốt hơn', () => {
  const G = newG(); G.level = 20; const mageC = CLASSES.mage, worse = I.genItem(20, 0, 'weapon'), better = I.genItem(20, 5, 'weapon'); worse.main.v = 5; better.main.v = 900; better.affixes = [{ type: 'crit_rate', v: 20 }];
  assert.equal(AU.bestSlot(G, better, mageC, CFG), 'weapon'); G.eq.weapon = better; assert.equal(AU.bestSlot(G, worse, mageC, CFG), null);
  const r1 = I.genItem(20, 3, 'ring'), r2 = I.genItem(20, 5, 'ring'); r1.main.v = 100; r2.main.v = 800; r1.affixes = []; r2.affixes = []; G.eq.ring1 = r1; G.eq.ring2 = I.genItem(20, 3, 'ring'); G.eq.ring2.main.v = 50; G.eq.ring2.affixes = [];
  assert.equal(AU.bestSlot(G, r2, mageC, CFG), 'ring2', 'thay nhẫn yếu hơn');
  const hp = I.genItem(20, 4, 'armor'); hp.main = { type: 'hp', v: 5000 }; hp.affixes = []; assert.ok(AU.combatPower(I.derive(mageC, { ...G, eq: { ...G.eq, armor: hp } }, CFG)) > AU.combatPower(I.derive(mageC, G, CFG)));
});
test('thẻ bài: lọc theo bậc / loại / cấp; bán hàng loạt bỏ qua thẻ đang dùng, đã khóa, đã tiến hóa', () => {
  const G = newG(); ['wolf', 'wolf_king', 'sc_power', 'r_scholar', 'spider'].forEach(t => I.addCard(G, t)); G.cards[0].lv = 12; G.deck = ['wolf_king']; G.cards[3].locked = true; G.cards[4].evo = true;
  assert.equal(INV.filterCards(G, I.CARDS, { rar: 2 }).length, 4); assert.equal(INV.filterCards(G, I.CARDS, { kind: 'skill' }).length, 1); assert.equal(INV.filterCards(G, I.CARDS, { lv: 'c' }).length, 1);
  const sl = INV.cardSellList(G, I.CARDS, {}); assert.deepEqual(sl.map(c => c.t).sort(), ['sc_power', 'wolf']);
  assert.ok(INV.cardValue(G.cards[0], I.CARDS.wolf) > INV.cardValue({ lv: 1, star: 0 }, I.CARDS.wolf)); assert.ok(INV.cardValue({ lv: 1, star: 0, evo: true }, I.CARDS.wolf_king) > INV.cardValue({ lv: 1, star: 0 }, I.CARDS.wolf_king));
});
test('cổng: mọi khu vực có mức nguy hiểm 0–5; khu càng khó càng nguy hiểm', () => {
  Object.keys(AREAS).forEach(id => assert.ok(DANGER[id] >= 0 && DANGER[id] <= 5, id)); assert.ok(DANGER.dark > DANGER.volcano && DANGER.volcano > DANGER.cave && DANGER.cave > DANGER.forest && DANGER.bossrush >= DANGER.dark);
});
test('quái nhiều gấp ~3–4 lần ở bản đồ thường, đi theo nhóm quanh điểm xuất hiện', () => {
  ['forest', 'cave', 'volcano', 'ice', 'dark'].forEach(id => { const mobs = AREAS[id].spawns.filter(s => !MONSTERS[s.id].boss); assert.ok(mobs.length >= 42, `${id}: ${mobs.length}`); assert.ok(mobs.filter(s => s.clone).length >= mobs.length * 0.5, 'có nhóm'); });
});

console.log('Lò Rèn: cường hóa · đổi dòng · thức tỉnh · đột phá');
const rig = (ri, cls = 'mage', slot = 'weapon', lv = 30) => { const it = I.genItem(lv, ri, slot, undefined, cls); return it; };
const rich = () => ({ ...newG(), gold: 1e9, mat: { stone: 1e6 } });
const sumTo = it => Object.values(I.itemTotals(it)).reduce((a, b) => a + b, 0);
test('vật phẩm chuyên dụng: chỉ số chính theo lớp, dòng phụ từ bể riêng', () => {
  assert.equal(rig(3, 'knight', 'accessory').main.type, 'def'); assert.equal(rig(3, 'mage', 'accessory').main.type, 'atk'); assert.equal(rig(3, 'rogue', 'accessory').main.type, 'hp');
  assert.equal(rig(3, 'elf', 'weapon').cls, 'elf');
  for (let k = 0; k < 40; k++) { const m = rig(2, 'mage', 'accessory'); assert.ok(I.poolFor('accessory', 'mage').includes(m.affixes[0].type), m.affixes[0].type); }
  assert.ok(I.CLASS_POOL.mage.accessory.includes('skill_dmg') && I.CLASS_POOL.knight.accessory.includes('def'));
});
test('cường hóa: mỗi cấp tăng chỉ số chính VÀ mọi dòng phụ', () => {
  const it = rig(4); const a = I.itemLines(it); it.enh = 1; const b = I.itemLines(it);
  assert.ok(Math.abs(b[0].v / a[0].v - (1 + I.ENH_MAIN)) < 1e-9);
  for (let k = 1; k <= it.affixes.length; k++) assert.ok(Math.abs(b[k].v / a[k].v - (1 + I.ENH_AFFIX)) < 1e-9, 'dòng ' + k);
  const d = I.diffTotals({ ...it, enh: 0 }, it); assert.ok(d.filter(x => x.delta > 0).length >= 1 + Math.min(2, it.affixes.length));
});
test('cường hóa: mốc +5/+10/... thêm thưởng theo lớp (mốc chưa đạt thì không có)', () => {
  const it = rig(4, 'mage'); it.enh = 4; assert.equal(I.itemLines(it).filter(l => l.tag.startsWith('Mốc')).length, 0);
  it.enh = 5; const m5 = I.itemLines(it).filter(l => l.tag === 'Mốc +5'); assert.deepEqual(m5.map(l => l.type).sort(), ['cdr', 'skill_dmg']);
  it.enh = 10; assert.equal(I.msCount(it), 2); const t = I.itemTotals(it); assert.ok(t.skill_dmg >= 8);
  const k = rig(4, 'knight'); k.enh = 5; assert.deepEqual(I.itemLines(k).filter(l => l.tag === 'Mốc +5').map(l => l.type).sort(), ['hp_pct', 'lifesteal']);
});
test('cường hóa: trừ vàng, thất bại không phá hủy và cộng bảo hiểm, thành công đặt lại', () => {
  const G = rich(), it = rig(3); const g0 = G.gold, inf = I.enhanceInfo(it);
  let r = I.doEnhance(G, it, () => 0.999); assert.equal(r.ok, false); assert.equal(it.enh || 0, 0); assert.equal(it.fail, 1); assert.equal(G.gold, g0 - inf.cost);
  assert.equal(I.enhanceInfo(it).rate, inf.rate + 5);
  r = I.doEnhance(G, it, () => 0); assert.equal(r.ok, true); assert.equal(it.enh, 1); assert.equal(it.fail, 0);
  const poor = { ...newG(), gold: 0 }; assert.ok(I.doEnhance(poor, rig(3)).error);
  const m = rig(3); m.enh = 4; assert.equal(I.doEnhance(G, m, () => 0).milestone, true);
});
test('đổi dòng: 3 phương án, phương án đầu giữ loại, không trùng dòng khác, chọn xong chỉ đổi đúng dòng đó', () => {
  for (let k = 0; k < 30; k++) {
    const it = rig(4, ['mage', 'knight', 'elf', 'rogue'][k % 4], k % 2 ? 'accessory' : 'weapon'), i = k % it.affixes.length;
    const o = I.rerollOptions(it, i), others = new Set(it.affixes.filter((_, j) => j !== i).map(a => a.type));
    assert.equal(o.length, 3); assert.equal(o[0].type, it.affixes[i].type); assert.equal(o[0].same, true);
    assert.equal(new Set(o.map(x => x.type)).size, 3); o.forEach(x => { assert.ok(!others.has(x.type), x.type); assert.ok(x.v > 0); });
    const before = JSON.stringify(it.affixes); I.applyReroll(it, i, o[2]); assert.deepEqual(it.affixes[i], { type: o[2].type, v: o[2].v });
    assert.equal(JSON.stringify(it.affixes.filter((_, j) => j !== i)), JSON.stringify(JSON.parse(before).filter((_, j) => j !== i)));
  }
});
test('thức tỉnh: điều kiện, 3 cấp, nội tại theo lớp, thất bại cộng bảo hiểm', () => {
  const G = rich(); const low = rig(1); assert.ok(I.doAwaken(G, low, 'first').error, 'cần Hiếm trở lên');
  const it = rig(4, 'rogue'); assert.equal(I.awkLv(it), 0); assert.equal(I.itemLines(it).some(l => l.tag === 'Nội tại'), false);
  assert.equal(I.doAwaken(G, it, 'first').ok, true); assert.equal(it.awk, 1); assert.ok(it.awaken);
  const p1 = I.itemLines(it).filter(l => l.tag === 'Nội tại'); assert.deepEqual(p1.map(l => l.type).sort(), ['crit_damage', 'crit_rate', 'dodge']);
  assert.ok(I.doAwaken(G, it, 'up').error, 'cấp 2 cần cường hóa +10'); it.enh = 10;
  let r = I.doAwaken(G, it, 'up', () => 0.99); assert.equal(r.ok, false); assert.equal(it.awkFail, 1); assert.equal(I.awakenState(it).rate, 95);
  r = I.doAwaken(G, it, 'up', () => 0); assert.equal(r.ok, true); assert.equal(it.awk, 2);
  const p2 = I.itemLines(it).filter(l => l.tag === 'Nội tại'); assert.ok(Math.abs(p2[0].v / p1[0].v - 1.6) < 1e-9);
  const old = JSON.stringify(it.awaken); let changed = false; for (let k = 0; k < 30 && !changed; k++) { I.doAwaken(G, it, 're'); changed = JSON.stringify(it.awaken) !== old; } assert.ok(changed);
});
test('đột phá: 3 bậc, nâng trần cường hóa, thêm dòng của lớp, dư chấn vào derive', () => {
  const G = rich(), it = rig(6, 'elf'); assert.equal(I.enhCap(it), 20); assert.ok(I.doTranscend(G, it).error, 'cần +15');
  it.enh = 15; const a0 = I.itemTotals(it); let r = I.doTranscend(G, it); assert.equal(r.ok, true); assert.equal(I.trTier(it), 1); assert.equal(I.enhCap(it), 25);
  const a1 = I.itemTotals(it); assert.ok(a1.crit_rate > (a0.crit_rate || 0) && a1.crit_damage > a0.crit_damage);
  assert.ok(I.doTranscend(G, it).error, 'bậc 2 cần +25'); it.enh = 25; r = I.doTranscend(G, it, () => 0.9); assert.equal(r.ok, false); assert.equal(it.trFail, 1); assert.equal(I.transState(it).rate, 90);
  r = I.doTranscend(G, it, () => 0); assert.equal(I.trTier(it), 2); it.enh = 30; I.doTranscend(G, it, () => 0); assert.equal(I.trTier(it), 3); assert.equal(I.enhCap(it), 35); assert.equal(I.transState(it).max, true);
  const g = newG(), mage = { ...CLASSES.elf, id: 'elf' }; g.eq.weapon = it; assert.equal(I.derive(mage, g, CFG).proc, 12);
  assert.equal(I.derive(mage, newG(), CFG).proc, 0);
  const old = { ...rig(4), trans: true }; assert.equal(I.trTier(old), 1, 'dữ liệu cũ trans:true = bậc 1');
});
test('mỗi lớp có bản sắc đầy đủ (mốc, nội tại, 3 bậc đột phá, tên dư chấn)', () => {
  for (const c of Object.keys(CLASSES)) { const f = I.CLASS_FX[c]; assert.ok(f, c); assert.equal(f.brk.length, 3); assert.ok(f.proc && f.passive[0] && f.passive[2]); assert.ok(Object.keys(f.ms).length >= 2); }
  const sets = Object.values(I.CLASS_FX).map(f => Object.keys(f.passive[1]).sort().join()); assert.equal(new Set(sets).size, 4, 'nội tại các lớp khác nhau');
});
test('bốn tính năng tác động lên bốn phần khác nhau của trang bị', () => {
  const base = rig(5, 'mage'); base.enh = 9;
  const enh = { ...base, enh: 10 }, awk = { ...base, awk: 1 }, trn = { ...base, trans: 1 }, rr = { ...base, affixes: base.affixes.map((a, i) => i ? a : { type: 'luck', v: 5 }) };
  assert.ok(sumTo(enh) > sumTo(base) && sumTo(awk) > sumTo(base) && sumTo(trn) > sumTo(base));
  assert.notEqual(Object.keys(I.itemTotals(awk)).join(), Object.keys(I.itemTotals(base)).join(), 'thức tỉnh thêm loại chỉ số mới');
  assert.equal(I.itemLines(rr)[0].v, I.itemLines(base)[0].v, 'đổi dòng không đụng chỉ số chính'); assert.ok(I.itemLines(enh)[0].v > I.itemLines(base)[0].v, 'cường hóa tăng chỉ số chính');
  assert.ok(I.itemLines(trn)[0].v > I.itemLines(base)[0].v && I.itemLines(awk)[0].v === I.itemLines(base)[0].v, 'đột phá tăng chỉ số chính, thức tỉnh thì không');
});
test('derive dùng đúng các dòng của trang bị (khớp itemTotals)', () => {
  const g = newG(), it = rig(4, 'knight', 'accessory'); it.enh = 7; it.awk = 1; it.awaken = { type: 'boss_dmg', v: 6 }; g.eq.accessory = it;
  const k = { ...CLASSES.knight, id: 'knight' }, d = I.derive(k, g, CFG), b = I.derive(k, newG(), CFG), t = I.itemTotals(it);
  assert.ok(Math.abs((d.boss_dmg - b.boss_dmg) - t.boss_dmg) < 1e-6); assert.ok(Math.abs((d.maxHp - b.maxHp) / b.maxHp) > 0);
});
test('lưu game: migrate v1 → v2, không đọc bản mới hơn, từ chối dữ liệu hỏng', () => {
  const v1 = { v: 1, data: { ...newG(), classId: 'mage', eq: { weapon: { ...rig(4), trans: true, awaken: { type: 'cdr', v: 3 } } }, inv: [{ ...rig(3) }] } };
  const d = SV.migrate(v1); assert.ok(d); assert.equal(d.eq.weapon.trans, 1); assert.equal(d.eq.weapon.awk, 1); assert.equal(d.eq.weapon.cls, 'mage'); assert.equal(d.inv[0].cls, 'mage');
  assert.equal(v1.data.eq.weapon.trans, true, 'không sửa bản gốc'); assert.equal(SV.migrate({ v: SV.VER, data: d }).level, d.level);
  assert.equal(SV.migrate({ v: SV.VER + 1, data: d }), null); assert.equal(SV.migrate({ v: 1, data: { level: 'x' } }), null); assert.equal(SV.migrate(null), null);
});
test('bộ icon vector: đủ hình, STAT_ICON trỏ đúng, icon lạ trả rỗng', () => {
  const need = ['enhance', 'reroll', 'awaken', 'transcend', 'equip', 'weapon', 'skill', 'stats', 'gold', 'stone', 'lock', 'bag', 'card', 'quest', 'map', 'daily', 'trophy', 'paw', 'craft', 'gear', 'auto', 'zoom', 'save', 'sell', 'salvage', 'filter', 'sort', 'clear', 'look', 'all'];
  for (const k of need) { const s = IC.icon(k, '2em'); assert.ok(s.startsWith('<svg') && s.includes('viewBox="0 0 64 64"') && s.length > 300, k); }
  for (const [t, ic] of Object.entries(IC.STAT_ICON)) assert.ok(IC.ICONS[ic], `${t} → ${ic}`);
  for (const t of ['atk', 'hp', 'def', 'crit_rate', 'crit_damage', 'lifesteal', 'dodge', 'exp_bonus', 'gold_bonus', 'luck', 'skill_dmg', 'cdr', 'boss_dmg', 'heal_kill']) assert.ok(IC.STAT_ICON[t], t);
  assert.equal(IC.icon('khong-co'), ''); assert.equal(new Set(need.map(k => IC.ICONS[k]())).size, need.length, 'mỗi icon một hình riêng');
});
console.log('Đóng gói');
test('service worker cache đủ mọi module được nạp và mọi ảnh giao diện tồn tại', () => {
  const root = new URL('../', import.meta.url), sw = fs.readFileSync(new URL('service-worker.js', root), 'utf8');
  const seen = new Set(); const walk = f => { if (seen.has(f)) return; seen.add(f); const t = fs.readFileSync(new URL(f, root), 'utf8'); for (const m of t.matchAll(/from '\.\/([\w-]+)\.js'/g)) walk(`src/${m[1]}.js`); };
  walk('src/main.js');
  for (const f of seen) { const n = f.replace('src/', '').replace('.js', ''); assert.ok(new RegExp(`'${n}'`).test(sw), `service worker thiếu ${f}`); assert.ok(fs.existsSync(new URL(f, root)), f); }
  for (const n of ['board.jpg', 'equip.png', 'plate_big.png', 'plate_small.png']) { assert.ok(sw.includes(`'${n}'`), n); assert.ok(fs.existsSync(new URL('assets/ui/' + n, root)), n); }
  const dead = fs.readdirSync(new URL('src/', root)).filter(f => f.endsWith('.js') && !seen.has('src/' + f)); assert.deepEqual(dead, [], 'mã không được dùng: ' + dead);
});
test('main.js được tách mô-đun: lõi gọn, mọi phương thức mixin có mặt trên GameScene', () => {
  const root = new URL('../', import.meta.url), main = fs.readFileSync(new URL('src/main.js', root), 'utf8');
  assert.ok(main.split('\n').length < 520, 'main.js quá dài'); assert.ok(main.includes('Object.assign(GameScene.prototype'));
  for (const g of ['loot', 'combat', 'fx', 'modes']) { const t = fs.readFileSync(new URL(`src/scene-${g}.js`, root), 'utf8'); assert.ok(t.includes(`export const ${g}Methods`), g); for (const m of t.matchAll(/^  (?:async )?([A-Za-z_]\w*)\(.*\) \{/gm)) assert.ok(!new RegExp(`^  ${m[1]}\\(`, 'm').test(main), `${m[1]} trùng trong main.js`); }
});

console.log(`\n${pass} đạt, ${fail} lỗi`);
process.exit(fail ? 1 : 0);
