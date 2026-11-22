// Bản đồ tự nhiên theo VÙNG CHỦ ĐỀ: làng khởi đầu (sân đá, hàng rào), đồng hoa, hồ + bãi cát + sông có ford/cầu, rừng dày, vách đá.
// Địa hình là lưới ô 64px (cỏ, đồng hoa, đất, cát, đá, nước, nước nông) được hòa trộn mềm bằng texture liền mạch lấy từ 2 bảng gạch.
// Phần sinh bố cục là hàm thuần (chạy được trong Node để kiểm thử); chỉ buildMap mới dùng Phaser.
import { THEMES } from './themes.js';
import { MONSTERS } from './data.js';
import { buildNav, findPath } from './nav.js';

export const TCELL = 64, GROUND_S = 2;
export const T = { GRASS: 0, DIRT: 1, SAND: 2, STONE: 3, WATER: 4, SHALLOW: 5, MEADOW: 6 };
export const TEX_NAMES = ['grass', 'dirt', 'sand', 'stone', 'water', 'shallow', 'meadow']; // theo thứ tự giá trị T
export const AREA_THEME = { forest: 'forest', cave: 'cave', volcano: 'volcano', ice: 'ice', dark: 'dark', hub: 'cave', tower: 'dark', survival: 'volcano', bossrush: 'volcano', rift: 'dark', daily: 'ice' };
const DENSITY = { hub: 0.5, tower: 0.4, survival: 0.35, bossrush: 0.4, rift: 0.5, daily: 0.5 };
const RIVER = new Set(['forest', 'ice']);
const TUFT = { forest: 0.55, ice: 0.12, volcano: 0.07, dark: 0.12, cave: 0.03 }; // mật độ bụi cỏ trên mỗi ô cỏ
// Công thức bố trí theo loại vùng: [loại, số cụm, số vật mỗi cụm, bán kính cụm]
const RECIPE = {
  forest: { village: [['bush', 2, 3, 60], ['tree', 2, 1, 1], ['fence', 1, 3, 70]], meadow: [['deco', 4, 7, 90], ['bush', 1, 3, 60], ['rockc', 1, 1, 1], ['pondp', 1, 1, 1]], dense: [['tree', 3, 8, 200], ['bush', 2, 3, 70], ['mush', 1, 3, 40]], cliff: [['cliffline', 1, 5, 0], ['rockc', 2, 1, 1], ['tree', 1, 4, 120]], lake: [['bush', 2, 2, 60]], open: [['tree', 2, 1, 1], ['rockc', 1, 1, 1]] },
  cave: { village: [['rockc', 2, 1, 1]], meadow: [['crystal', 3, 3, 60], ['mush', 3, 4, 60]], dense: [['rockc', 4, 2, 90], ['mush', 2, 4, 55]], cliff: [['cliffline', 1, 5, 0], ['crystal', 2, 3, 50]], lake: [['crystal', 1, 2, 50]], open: [['rockc', 2, 1, 1], ['crystal', 1, 2, 40]] },
  volcano: { village: [['rockc', 2, 1, 1]], meadow: [['crystal', 2, 2, 50], ['deco', 2, 1, 1]], dense: [['tree', 3, 4, 140], ['rockc', 2, 2, 80]], cliff: [['cliffline', 1, 5, 0], ['crystal', 1, 2, 50]], lake: [['rockc', 1, 1, 1]], open: [['rockc', 2, 1, 1], ['deco', 2, 1, 1]] },
  ice: { village: [['tree', 2, 1, 1], ['rockc', 1, 1, 1]], meadow: [['crystal', 3, 3, 60], ['bush', 2, 2, 50]], dense: [['tree', 3, 7, 170], ['bush', 1, 2, 50]], cliff: [['cliffline', 1, 5, 0], ['crystal', 1, 3, 50]], lake: [['crystal', 2, 2, 50]], open: [['tree', 2, 1, 1], ['rockc', 1, 1, 1]] },
  dark: { village: [['rockc', 2, 1, 1]], meadow: [['crystal', 3, 3, 60], ['mush', 3, 4, 55]], dense: [['tree', 3, 5, 150], ['rockc', 2, 2, 80]], cliff: [['cliffline', 1, 5, 0], ['mush', 1, 4, 50]], lake: [['mush', 1, 3, 50]], open: [['tree', 1, 1, 1], ['rockc', 1, 1, 1]] },
};
const MIN = { tree: 58, rock: 52, rockc: 84, cliff: 112, fence: 92, crystal: 42, pondp: 240, bush: 40, mush: 30, deco: 22 };
// Hộp va chạm đặt ở chân vật thể (đi được phía sau tán cây)
const COLL = {
  tree: s => ({ w: Math.max(14, s.w * 0.2), h: 12, dy: -6 }), cliff: s => ({ w: s.w * 0.78, h: s.h * 0.3, dy: -s.h * 0.15 }),
  rockc: s => ({ w: s.w * 0.6, h: s.h * 0.32, dy: -s.h * 0.16 }), crystal: s => ({ w: s.w * 0.55, h: s.h * 0.4, dy: -s.h * 0.2 }), fence: s => ({ w: s.w * 0.9, h: 12, dy: -8 }),
};
const SORTED = new Set(['tree', 'cliff', 'rockc', 'crystal', 'bush', 'mush', 'deco', 'tuft', 'fence']); // xếp lớp theo y
const SWAY = { tuft: 0.13, deco: 0.07, bush: 0.025 };                                                      // biên độ lay của gió

function rng(str) {
  let a = 2166136261;
  for (let i = 0; i < str.length; i++) a = Math.imul(a ^ str.charCodeAt(i), 16777619);
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function noise2(seed) {
  const h = (x, y) => { let v = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed; v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };
  return (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (h(ix, iy) * (1 - u) + h(ix + 1, iy) * u) * (1 - v) + (h(ix, iy + 1) * (1 - u) + h(ix + 1, iy + 1) * u) * v; };
}

export function generateLayout(areaId, AREA, W, H) {
  const theme = AREA_THEME[areaId], TH = THEMES[theme], dens = DENSITY[areaId] ?? 1, rnd = rng(areaId), pick = a => a[Math.floor(rnd() * a.length)];
  const cols = Math.ceil(W / TCELL), rows = Math.ceil(H / TCELL), N = cols * rows, arena = !!AREA.mode, rec = RECIPE[theme];
  const portals = [AREA.portal, AREA.portal2, ...(AREA.extra || [])].filter(Boolean);
  const keep = [ // điểm phải chừa trống: checkpoint, cổng, chỗ quái
    ...AREA.checkpoints.map(c => ({ x: c.x, y: c.y, r: 72 })), ...portals.map(p => ({ x: p.x, y: p.y, r: 80 })),
    ...AREA.spawns.map(s => ({ x: s.x, y: s.y, r: MONSTERS[s.id].boss ? 150 : s.clone ? 26 : 90, boss: !!MONSTERS[s.id].boss })),
  ];
  if (arena) keep.push({ x: W / 2, y: H * 0.43, r: 420 });
  const nearKeep = (x, y, pad) => keep.some(k => Math.hypot(k.x - x, k.y - y) < k.r + pad);
  const cx_ = i => ((i % cols) + 0.5) * TCELL, cy_ = i => (((i / cols) | 0) + 0.5) * TCELL, cellOf = (x, y) => Math.max(0, Math.min(rows - 1, Math.floor(y / TCELL))) * cols + Math.max(0, Math.min(cols - 1, Math.floor(x / TCELL)));

  // 1) VÙNG chủ đề (Voronoi có nhiễu để ranh giới tự nhiên); làng ở chỗ xuất phát, vách đá gần boss
  const Z = [['village', .12, .2], ['meadow', .4, .3], ['lake', .62, .6], ['dense', .22, .76], ['dense', .82, .22], ['cliff', .55, .08], ['meadow', .86, .82], ['cliff', .07, .55]]
    .map(([t, x, y]) => ({ t, x: (x + (rnd() - .5) * .1) * W, y: (y + (rnd() - .5) * .1) * H }));
  Z[0].x = AREA.checkpoints[0].x + 100; Z[0].y = AREA.checkpoints[0].y + 60;
  const boss = AREA.spawns.find(s => MONSTERS[s.id].boss);
  if (boss) { const cz = Z.filter(z => z.t === 'cliff').sort((a, b) => Math.hypot(a.x - boss.x, a.y - boss.y) - Math.hypot(b.x - boss.x, b.y - boss.y))[0]; cz.x = boss.x; cz.y = Math.max(160, boss.y - 200); }
  const nz = noise2(917), zone = new Uint8Array(N), zcells = Z.map(() => []);
  for (let i = 0; i < N; i++) {
    const x = cx_(i), y = cy_(i), px = x + (nz(x / 300, y / 300) - .5) * 280, py = y + (nz(x / 300 + 9, y / 300 + 5) - .5) * 280;
    let b = 0, bd = 1e9; Z.forEach((z, k) => { const d = Math.hypot(px - z.x, py - z.y); if (d < bd) { bd = d; b = k; } });
    zone[i] = b; zcells[b].push(i);
  }
  const ter = new Uint8Array(N); // mặc định cỏ
  for (let i = 0; i < N; i++) if (Z[zone[i]].t === 'meadow') ter[i] = T.MEADOW;

  // 2) NƯỚC: hồ trong vùng hồ (tránh các điểm cần chừa) + sông (rừng, băng) chảy ra cạnh bản đồ
  const water = new Uint8Array(N), lakes = [];
  if (!arena) for (const z of Z.filter(z => z.t === 'lake')) {
    let cx = z.x, cy = z.y; const R = 4.4 + rnd() * 1.4, ph = rnd() * 6;
    for (let t = 0; t < 80 && keep.some(k => Math.hypot(k.x - cx, k.y - cy) < k.r + R * TCELL + 110); t++) { cx = 320 + rnd() * (W - 640); cy = 320 + rnd() * (H - 640); }
    for (let i = 0; i < N; i++) { const x = cx_(i), y = cy_(i), a = Math.atan2(y - cy, x - cx), rr = R * TCELL * (0.8 + 0.13 * Math.sin(a * 3 + ph) + 0.08 * Math.sin(a * 5 + ph * 2)); if (Math.hypot(x - cx, y - cy) < rr) water[i] = 1; }
    lakes.push({ x: cx, y: cy, R });
    if (RIVER.has(theme)) { // sông uốn lượn tới cạnh gần nhất
      const ex = [[0, cy], [W, cy], [cx, H]].sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))[0], n = 48, amp = 110 + rnd() * 60, p2 = rnd() * 6;
      const horiz = ex[1] === cy, nxv = horiz ? 0 : 1, nyv = horiz ? 1 : 0;
      for (let s = 0; s <= n; s++) {
        const tt = s / n, wv = Math.sin(tt * 7 + p2) * amp * Math.min(1, tt * 2), x = cx + (ex[0] - cx) * tt + nxv * wv, y = cy + (ex[1] - cy) * tt + nyv * wv;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const i = cellOf(x + dx * TCELL, y + dy * TCELL); if (Math.hypot(cx_(i) - x, cy_(i) - y) < 1.2 * TCELL) water[i] = 1; }
      }
    }
  }
  for (let i = 0; i < N; i++) if (water[i] && nearKeep(cx_(i), cy_(i), 20)) water[i] = 0; // không bao giờ phủ nước lên điểm quan trọng
  // 3) ĐƯỜNG MÒN (Prim, hơi uốn lượn): đất; giao với nước thì thành ford nông
  const path = new Uint8Array(N);
  const mark = (x, y) => { const cx = Math.floor(x / TCELL), cy = Math.floor(y / TCELL); for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) { const px = cx + dx, py = cy + dy; if (px >= 0 && py >= 0 && px < cols && py < rows) path[py * cols + px] = 1; } };
  const link = (a, b, amp = 18 + rnd() * 18) => { const dd = Math.hypot(b.x - a.x, b.y - a.y) || 1, n = Math.max(1, Math.ceil(dd / 20)), ph = rnd() * 6; for (let i = 0; i <= n; i++) { const t = i / n, w = Math.sin(t * Math.PI * 2 + ph) * amp * Math.sin(t * Math.PI); mark(a.x + (b.x - a.x) * t - ((b.y - a.y) / dd) * w, a.y + (b.y - a.y) * t + ((b.x - a.x) / dd) * w); } };
  const nodes = [...AREA.checkpoints, ...portals, ...AREA.spawns.filter((s, i) => MONSTERS[s.id].boss || i % 4 === 0)], done = [nodes[0]], rest = nodes.slice(1);
  while (rest.length) { let best = null; for (const r of rest) for (const d of done) { const dd = Math.hypot(r.x - d.x, r.y - d.y); if (!best || dd < best.dd) best = { r, d, dd }; } rest.splice(rest.indexOf(best.r), 1); done.push(best.r); link(best.d, best.r); }
  const finish = () => { // dựng lại địa hình từ nước + đường
    for (let i = 0; i < N; i++) { if (ter[i] === T.WATER || ter[i] === T.SHALLOW || ter[i] === T.SAND || ter[i] === T.DIRT || ter[i] === T.STONE) ter[i] = Z[zone[i]].t === 'meadow' ? T.MEADOW : T.GRASS; }
    for (let i = 0; i < N; i++) if (water[i]) ter[i] = T.WATER;
    const nb = (i, f) => { const x = i % cols, y = (i / cols) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if ((dx || dy) && X >= 0 && Y >= 0 && X < cols && Y < rows && f(Y * cols + X)) return true; } return false; };
    const sh = []; for (let i = 0; i < N; i++) if (ter[i] !== T.WATER && nb(i, j => ter[j] === T.WATER)) sh.push(i); sh.forEach(i => { ter[i] = T.SHALLOW; });   // nước nông viền hồ
    const sd = []; for (let i = 0; i < N; i++) if ((ter[i] === T.GRASS || ter[i] === T.MEADOW) && nb(i, j => ter[j] === T.SHALLOW)) sd.push(i); sd.forEach(i => { ter[i] = T.SAND; }); // bãi cát
    for (let i = 0; i < N; i++) if (path[i]) ter[i] = ter[i] === T.WATER ? T.SHALLOW : (ter[i] === T.SHALLOW ? T.SHALLOW : T.DIRT);                // đường mòn / ford
    keep.forEach(k => { const R = k.boss ? 200 : (k.r === 72 || k.r === 80 ? 130 : 0); if (!R) return; for (let i = 0; i < N; i++) if (ter[i] !== T.WATER && ter[i] !== T.SHALLOW && Math.hypot(cx_(i) - k.x, cy_(i) - k.y) < R) ter[i] = T.STONE; }); // sân đá quanh checkpoint/cổng, đấu trường boss
  };
  const waterBlocks = () => { // khối va chạm của nước: gộp theo dãy ô, có lề 8px hai bên để đi sát bờ
    const out = [];
    for (let r = 0; r < rows; r++) { let s = -1; for (let c = 0; c <= cols; c++) { const w = c < cols && ter[r * cols + c] === T.WATER; if (w && s < 0) s = c; if (!w && s >= 0) { out.push({ x: ((s + c) / 2) * TCELL, y: (r + 0.5) * TCELL, w: (c - s) * TCELL - 16, h: TCELL, water: true }); s = -1; } } }
    return out;
  };
  finish();
  // 4) Đảm bảo mọi điểm quan trọng đi tới được: nếu nước chặn thì mở thêm ford nối tới điểm gần nhất đã tới được
  const edgeBlocks = [{ x: W / 2, y: 28, w: W, h: 56 }, { x: 9, y: H / 2, w: 18, h: H }, { x: W - 9, y: H / 2, w: 18, h: H }, { x: W / 2, y: H - 8, w: W, h: 16 }];
  for (let round = 0; round < 6; round++) {
    const nav = buildNav([...edgeBlocks, ...waterBlocks()], W, H), s0 = keep[0], bad = keep.filter(k => !findPath(nav, s0.x, s0.y, k.x, k.y));
    if (!bad.length) break;
    const good = keep.filter(k => !bad.includes(k)); bad.forEach(k => { const g = good.sort((a, b) => Math.hypot(a.x - k.x, a.y - k.y) - Math.hypot(b.x - k.x, b.y - k.y))[0]; link(k, g, 0); }); finish();
  }
  const blocks = [...edgeBlocks, ...waterBlocks()];

  // 5) Vật thể theo vùng
  const props = [], placed = [];
  const onPath = (x, y, pad) => { const cx = Math.floor(x / TCELL), cy = Math.floor(y / TCELL); for (let dy = -pad; dy <= pad; dy++) for (let dx = -pad; dx <= pad; dx++) { const px = cx + dx, py = cy + dy; if (px >= 0 && py >= 0 && px < cols && py < rows && path[py * cols + px]) return true; } return false; };
  const add = (cat, s, x, y) => {
    props.push({ cat, name: s[0], x, y, w: s[1], h: s[2], sort: SORTED.has(cat), sway: SWAY[cat] || 0 }); placed.push({ x, y, cat });
    if (COLL[cat]) { const c = COLL[cat]({ w: s[1], h: s[2] }); blocks.push({ x, y: y + c.dy, w: c.w, h: c.h }); }
  };
  const bad = t => t === T.WATER || t === T.SHALLOW;
  const tryPlace = (cat, list, cx, cy, rad) => {
    const s = pick(list), x = cx + (rnd() * 2 - 1) * rad, y = cy + (rnd() * 2 - 1) * rad, hard = !!COLL[cat];
    if (x < 60 || x > W - 60 || y < 200 || y > H - 70 || bad(ter[cellOf(x, y)]) || nearKeep(x, y, hard ? 34 : 14) || onPath(x, y, hard ? 1 : 0)) return false;
    if (placed.some(p => (hard || p.cat === cat) && Math.hypot(p.x - x, p.y - y) < ((MIN[cat] || 40) + (MIN[p.cat] || 40)) / 2)) return false;
    add(cat, s, x, y); return true;
  };
  if (TH.cliff.length) for (let x = 70; x < W - 40; x += 104) { const s = pick(TH.cliff), y = 150 + rnd() * 12; if (!nearKeep(x, y, 40)) add('cliff', s, x + rnd() * 10, y); } // vách đá viền phía bắc
  const ringCat = TH.tree.length ? 'tree' : 'rockc'; // các cạnh còn lại: một hàng cây/đá
  const ring = (x, y) => { if (!nearKeep(x, y, 24) && !onPath(x, y, 1) && !bad(ter[cellOf(x, y)])) add(ringCat, pick(TH[ringCat]), x, y); };
  for (let x = 60; x < W; x += 112) ring(x + rnd() * 14, H - 28 - rnd() * 6);
  for (let y = 260; y < H - 60; y += 112) { ring(38 + rnd() * 8, y); ring(W - 38 - rnd() * 8, y + rnd() * 8); }
  const cluster = (cat, cells, per, rad) => {
    const realList = TH[cat === 'cliffline' ? 'cliff' : cat]; if (!realList || !realList.length) return;
    for (let t = 0; t < 40; t++) {
      const i = cells[Math.floor(rnd() * cells.length)], cx = cx_(i) + (rnd() - .5) * TCELL, cy = cy_(i) + (rnd() - .5) * TCELL;
      if (cy < 220 || nearKeep(cx, cy, rad * 0.4 + 30) || onPath(cx, cy, 2) || bad(ter[cellOf(cx, cy)])) continue;
      if (cat === 'cliffline') { const ang = (rnd() - .5) * 0.5; for (let j = 0, k = 0; j < per && k < per * 8; k++) { const dx = (j - per / 2) * 118, ok = tryPlace('cliff', realList, cx + dx * Math.cos(ang), cy + dx * Math.sin(ang) * 0.4, 8); if (ok) j++; } }
      else if (cat === 'pondp') { const s = pick(realList); if (!nearKeep(cx, cy, s[1] / 2 + 60) && !onPath(cx, cy, 3) && !placed.some(p => p.cat === 'pondp' && Math.hypot(p.x - cx, p.y - cy) < MIN.pondp)) { props.push({ cat: 'pondp', name: s[0], x: cx, y: cy, w: s[1], h: s[2], sort: false, sway: 0 }); placed.push({ x: cx, y: cy, cat: 'pondp' }); blocks.push({ x: cx, y: cy, w: s[1] * 0.7, h: s[2] * 0.5 }); } }
      else for (let j = 0, k = 0; j < per && k < per * 12; k++) if (tryPlace(cat, realList, cx, cy, rad)) j++;
      return;
    }
  };
  Z.forEach((z, zi) => { const cells = zcells[zi]; if (!cells.length) return; for (const [cat, n, per, rad] of (rec[z.t] || [])) for (let k = 0, m = Math.round(n * dens); k < m; k++) cluster(cat, cells, per, rad); });
  if (!arena) for (let i = 0; i < N; i++) if (zone[i] !== undefined && Z[zone[i]].t === 'open') cluster('tree', [i], 1, 60); // (hiếm) phòng khi có vùng trống
  // cầu bắc qua ford (nơi đường mòn cắt nước)
  if (TH.bridge.length >= 2) {
    const ford = new Uint8Array(N), seen = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (path[i] && ter[i] === T.SHALLOW && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const x = (i % cols) + dx, y = ((i / cols) | 0) + dy; return x >= 0 && y >= 0 && x < cols && y < rows && ter[y * cols + x] === T.WATER; })) ford[i] = 1;
    for (let i = 0; i < N; i++) if (ford[i] && !seen[i]) {
      const q = [i], comp = []; seen[i] = 1;
      while (q.length) { const c = q.pop(); comp.push(c); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const x = (c % cols) + dx, y = ((c / cols) | 0) + dy, j = y * cols + x; if (x >= 0 && y >= 0 && x < cols && y < rows && ford[j] && !seen[j]) { seen[j] = 1; q.push(j); } } }
      const mx = comp.reduce((a, c) => a + cx_(c), 0) / comp.length, my = comp.reduce((a, c) => a + cy_(c), 0) / comp.length, wl = comp.reduce((a, c) => a + (ter[c - 1] === T.WATER || ter[c + 1] === T.WATER ? 1 : 0), 0), wv = comp.reduce((a, c) => a + (ter[c - cols] === T.WATER || ter[c + cols] === T.WATER ? 1 : 0), 0);
      const s = wv > wl ? TH.bridge[1] : TH.bridge[0]; props.push({ cat: 'bridge', name: s[0], x: mx, y: my + s[2] / 2, w: s[1], h: s[2], sort: false, sway: 0, bridge: true });
    }
  }
  // bụi cỏ (lay động theo gió): rải trên ô cỏ / đồng hoa, thưa dần ở chỗ đất, cát, đá
  if (TH.tuft.length && TUFT[theme]) for (let i = 0; i < N; i++) {
    const t = ter[i]; if (t !== T.GRASS && t !== T.MEADOW) continue;
    const m = (t === T.MEADOW ? 1.8 : 1) * TUFT[theme] * (0.6 + 0.8 * rnd()), k = Math.floor(m) + (rnd() < m % 1 ? 1 : 0);
    for (let j = 0; j < k; j++) { const x = cx_(i) + (rnd() - .5) * TCELL, y = cy_(i) + (rnd() - .5) * TCELL; if (y < 210 || nearKeep(x, y, 6) || blocks.some(b => !b.water && Math.abs(b.x - x) < b.w / 2 + 6 && Math.abs(b.y - y) < b.h / 2 + 6 && b.w < 400)) continue; const s = pick(TH.tuft); props.push({ cat: 'tuft', name: s[0], x, y, w: s[1], h: s[2], sort: true, sway: SWAY.tuft }); }
  }
  return { theme, cols, rows, ter, zone, zones: Z, props, blocks, keep, path };
}

// ---- Vẽ nền: mỗi điểm ảnh hòa trộn mềm giữa các loại địa hình lân cận (có méo nhiễu cho đường biên tự nhiên) ----
export function paintGround(L, W, H, tex) {
  const S = GROUND_S, w = Math.ceil(W / S), h = Math.ceil(H / S), data = new Uint8ClampedArray(w * h * 4), { cols, rows, ter } = L;
  const n1 = noise2(1234567), n2 = noise2(7654321), n3 = noise2(555), n4 = noise2(999), tx = TEX_NAMES.map(n => tex[n]);
  const raw = new Float32Array(7), acc = new Float32Array(7), ss = x => x * x * (3 - 2 * x);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const wx = x * S, wy = y * S;
    const u = (wx + (n1(wx / 260, wy / 260) - .5) * 80 + (n2(wx / 90, wy / 90) - .5) * 26) / TCELL - 0.5, v = (wy + (n1(wx / 260 + 31, wy / 260 + 17) - .5) * 80 + (n2(wx / 90 + 7, wy / 90 + 3) - .5) * 26) / TCELL - 0.5;
    const i0 = Math.floor(u), j0 = Math.floor(v), fx = u - i0, fy = v - j0; raw.fill(0);
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) { const ci = Math.max(0, Math.min(cols - 1, i0 + dx)), cj = Math.max(0, Math.min(rows - 1, j0 + dy)); raw[ter[cj * cols + ci]] += (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy); }
    let sum = 0; for (let t = 0; t < 7; t++) { const a = raw[t]; acc[t] = a > 0 ? ss(Math.max(0, Math.min(1, (a - 0.22) / 0.56))) : 0; sum += acc[t]; }
    if (sum < 1e-4) { acc.set(raw); sum = 1; }
    let r = 0, g = 0, b = 0;
    for (let t = 0; t < 7; t++) if (acc[t] > 0) { const T_ = tx[t], k = ((wy % T_.h | 0) * T_.w + (wx % T_.w | 0)) * 4, wgt = acc[t] / sum; r += T_.data[k] * wgt; g += T_.data[k + 1] * wgt; b += T_.data[k + 2] * wgt; }
    const sh = raw[T.SHALLOW]; // ngấn sóng trắng nơi nước nông gặp bãi cát
    if (sh > 0.36 && sh < 0.56 && raw[T.SAND] > 0.28) { const f = (1 - Math.abs(sh - 0.46) / 0.1) * (0.45 + 0.55 * n3(wx / 22, wy / 22)) * 0.6; r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    const m = 1 + (n4(wx / 700, wy / 700) - 0.5) * 0.12, o = (y * w + x) * 4;
    data[o] = r * m; data[o + 1] = g * m; data[o + 2] = b * m; data[o + 3] = 255;
  }
  return { w, h, data };
}

// ---- Phần chạy trong game (Phaser) ----
export function buildMap(scene, areaId, AREA, W, H) {
  const L = generateLayout(areaId, AREA, W, H), key = 'th_' + L.theme, gk = 'ground_' + areaId;
  const tex = {}; // lấy điểm ảnh của 7 texture địa hình đã nạp
  TEX_NAMES.forEach(n => { const src = scene.textures.get(`tr_${L.theme}_${n}`).getSourceImage(), c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.drawImage(src, 0, 0); tex[n] = { w: c.width, h: c.height, data: x.getImageData(0, 0, c.width, c.height).data }; });
  const g = paintGround(L, W, H, tex), ct = scene.textures.createCanvas(gk, g.w, g.h), ctx = ct.getContext(), img = ctx.createImageData(g.w, g.h);
  img.data.set(g.data); ctx.putImageData(img, 0, 0); ct.refresh(); ct.setFilter(Phaser.Textures.FilterMode.LINEAR);
  scene.add.image(0, 0, gk).setOrigin(0).setScale(GROUND_S).setDepth(0);
  const sways = [];
  L.props.forEach(p => {
    const im = scene.add.image(p.x, p.y, key, p.name);
    if (p.cat === 'pondp') im.setDepth(1); else if (p.bridge) im.setDepth(2); else im.setOrigin(0.5, p.sway > 0.1 ? 0.92 : 1).setDepth(p.sort ? 10 + p.y : 1);
    if (p.sway) sways.push({ im, x: p.x, y: p.y, amp: p.sway, ph: (p.x * 0.37 + p.y * 0.19) % 6.283, ang: 0, vel: 0 });
  });
  const group = scene.physics.add.staticGroup();
  L.blocks.forEach(b => group.create(b.x, b.y, 'px').setVisible(false).setDisplaySize(b.w, b.h).refreshBody());
  return { group, layout: L, sways };
}
