// Dựng bản đồ theo ô 48px: nền gạch + đường mòn nối các điểm quan trọng + ao hồ + vật cản + cảnh vật.
// Toàn bộ phần sinh bố cục là hàm thuần (chạy được trong Node để kiểm thử); chỉ buildMap mới dùng Phaser.
import { CELL, THEMES } from './themes.js';
import { MONSTERS } from './data.js';

// Mỗi khu vực dùng 1 chủ đề màu; các chế độ đấu trường mượn chủ đề của khu gần nhất
export const AREA_THEME = { forest: 'forest', cave: 'cave', volcano: 'volcano', ice: 'ice', dark: 'dark', hub: 'cave', tower: 'dark', survival: 'volcano', bossrush: 'volcano', rift: 'dark', daily: 'ice' };
// Số lượng vật thể mỗi bản đồ (đầy đủ); đấu trường thưa hơn để dễ chiến đấu
const STYLE = {
  forest: { tree: 58, rock: 14, log: 10, stump: 7, bush: 48, deco: 170, mush: 14, pool: 2 },
  cave: { rock: 36, crystal: 14, log: 4, stump: 2, bush: 10, deco: 150, mush: 28, pool: 2 },
  volcano: { tree: 22, rock: 30, log: 6, stump: 3, bush: 16, deco: 120, pool: 4, crystal: 10 },
  ice: { tree: 50, rock: 18, log: 5, stump: 6, bush: 30, deco: 130, mush: 6, pool: 3, crystal: 14 },
  dark: { tree: 28, rock: 24, log: 4, stump: 2, bush: 16, deco: 120, mush: 22, pool: 3, crystal: 14 },
};
const DENSITY = { hub: 0.5, tower: 0.4, survival: 0.35, bossrush: 0.4, rift: 0.5, daily: 0.5 };
const MIN = { tree: 54, rock: 50, log: 60, stump: 44, crystal: 40, pool: 100, bush: 30, mush: 26, deco: 14 };
// Hộp va chạm nằm ở chân vật thể (người chơi đi được phía sau tán cây)
const COLL = {
  tree: s => ({ w: Math.max(14, s.w * 0.2), h: 12, dy: -6 }), rock: s => ({ w: s.w * 0.62, h: s.h * 0.38, dy: -s.h * 0.19 }),
  log: s => ({ w: s.w * 0.8, h: s.h * 0.4, dy: -s.h * 0.2 }), stump: s => ({ w: s.w * 0.6, h: s.h * 0.4, dy: -s.h * 0.2 }),
  crystal: s => ({ w: s.w * 0.55, h: s.h * 0.4, dy: -s.h * 0.2 }),
};
const SORTED = new Set(['tree', 'rock', 'log', 'stump', 'crystal', 'bush', 'mush']); // xếp lớp theo y

function rng(str) {
  let a = 2166136261;
  for (let i = 0; i < str.length; i++) a = Math.imul(a ^ str.charCodeAt(i), 16777619);
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function generateLayout(areaId, AREA, W, H) {
  const theme = AREA_THEME[areaId], T = THEMES[theme], st = STYLE[theme], dens = DENSITY[areaId] ?? 1;
  const rnd = rng(areaId), pick = a => a[Math.floor(rnd() * a.length)];
  const cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
  const portals = [AREA.portal, AREA.portal2, ...(AREA.extra || [])].filter(Boolean);
  const keep = [ // các điểm phải chừa trống: checkpoint, cổng, chỗ quái xuất hiện
    ...AREA.checkpoints.map(c => ({ x: c.x, y: c.y, r: 72 })),
    ...portals.map(p => ({ x: p.x, y: p.y, r: 80 })),
    ...AREA.spawns.map(s => ({ x: s.x, y: s.y, r: MONSTERS[s.id].boss ? 150 : 60, boss: !!MONSTERS[s.id].boss })),
  ];
  if (AREA.mode) keep.push({ x: 900, y: 520, r: 300 }); // chế độ đấu trường: giữ khoảng trống ở giữa

  // 1) Đường mòn nối checkpoint, cổng và một số điểm quái (Prim, hơi uốn lượn)
  const path = new Uint8Array(cols * rows);
  const mark = (x, y) => {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) { const px = cx + dx, py = cy + dy; if (px >= 0 && py >= 0 && px < cols && py < rows) path[py * cols + px] = 1; }
  };
  const nodes = [...AREA.checkpoints, ...portals, ...AREA.spawns.filter((s, i) => MONSTERS[s.id].boss || i % 4 === 0)];
  const done = [nodes[0]], rest = nodes.slice(1);
  while (rest.length) {
    let best = null;
    for (const r of rest) for (const d of done) { const dd = Math.hypot(r.x - d.x, r.y - d.y); if (!best || dd < best.dd) best = { r, d, dd }; }
    rest.splice(rest.indexOf(best.r), 1); done.push(best.r);
    const { r, d, dd } = best, n = Math.max(1, Math.ceil(dd / 16)), ph = rnd() * 6, amp = 18 + rnd() * 18;
    for (let i = 0; i <= n; i++) {
      const t = i / n, w = Math.sin(t * Math.PI * 2 + ph) * amp * Math.sin(t * Math.PI);
      mark(d.x + (r.x - d.x) * t - ((r.y - d.y) / dd) * w, d.y + (r.y - d.y) * t + ((r.x - d.x) / dd) * w);
    }
  }
  const onPath = (x, y, pad) => {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let dy = -pad; dy <= pad; dy++) for (let dx = -pad; dx <= pad; dx++) { const px = cx + dx, py = cy + dy; if (px >= 0 && py >= 0 && px < cols && py < rows && path[py * cols + px]) return true; }
    return false;
  };
  const nearKeep = (x, y, pad) => keep.some(k => Math.hypot(k.x - x, k.y - y) < k.r + pad);

  // 2) Nền: nhiễu giá trị chọn gạch chính / mảng rêu-đá, đường mòn dùng gạch đất
  const lw = Math.ceil(cols / 5) + 2, lat = Array.from({ length: lw * (Math.ceil(rows / 5) + 2) }, rnd);
  const noise = (cx, cy) => {
    const fx = cx / 5, fy = cy / 5, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, g = (x, y) => lat[y * lw + x];
    return (g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx) * (1 - ty) + (g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx) * ty;
  };
  const ground = [];
  for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) {
    let name;
    if (path[cy * cols + cx]) name = pick(T.path)[0];
    else { const n = noise(cx, cy), g = T.ground, r = rnd(); name = (n < 0.55 ? g[Math.floor(r * 4)] : n < 0.8 ? g[4 + Math.floor(r * 2)] : g[6 + Math.floor(r * 2)])[0]; }
    ground.push({ name, cx, cy });
  }

  // 3) Vật thể
  const props = [], blocks = [], placed = [];
  const add = (cat, s, x, y) => {
    props.push({ cat, name: s[0], x, y, w: s[1], h: s[2], sort: SORTED.has(cat) });
    placed.push({ x, y, cat });
    if (COLL[cat]) { const c = COLL[cat]({ w: s[1], h: s[2] }); blocks.push({ x, y: y + c.dy, w: c.w, h: c.h }); }
  };
  blocks.push({ x: W / 2, y: 28, w: W, h: 56 }, { x: 9, y: H / 2, w: 18, h: H }, { x: W - 9, y: H / 2, w: 18, h: H }, { x: W / 2, y: H - 8, w: W, h: 16 }); // viền bản đồ
  for (let k = 0, n = Math.round((st.pool || 0) * Math.min(1, dens * 1.5)); k < n; k++) { // ao / dung nham / băng
    for (let t = 0; t < 80; t++) {
      const s = pick(T.pool), x = 140 + rnd() * (W - 280), y = 160 + rnd() * (H - 300);
      if (nearKeep(x, y, s[1] / 2 + 40) || onPath(x, y, 2) || placed.some(p => Math.hypot(p.x - x, p.y - y) < MIN.pool)) continue;
      props.push({ cat: 'pool', name: s[0], x, y, w: s[1], h: s[2], sort: false }); placed.push({ x, y, cat: 'pool' });
      blocks.push({ x, y, w: s[1] * 0.72, h: s[2] * 0.5 }); break;
    }
  }
  const ringCat = T.tree.length ? 'tree' : 'rock'; // hàng cây/đá viền quanh bản đồ
  const ring = (x, y) => { if (!nearKeep(x, y, 24) && !onPath(x, y, 1)) add(ringCat, pick(T[ringCat]), x, y); };
  for (let x = 20; x < W; x += 52) { ring(x + rnd() * 10, 70 + rnd() * 8); ring(x + rnd() * 10, H - 24 - rnd() * 6); }
  for (let y = 120; y < H - 40; y += 52) { ring(34 + rnd() * 8, y); ring(W - 34 - rnd() * 8, y + rnd() * 8); }

  const scatter = (cat, n) => {
    const list = T[cat]; if (!list || !list.length) return;
    let count = Math.round(n * dens), tries = count * 40;
    while (count > 0 && tries-- > 0) {
      const s = pick(list), x = 36 + rnd() * (W - 72), y = 90 + rnd() * (H - 130), hard = !!COLL[cat];
      if (nearKeep(x, y, hard ? 34 : 14) || onPath(x, y, hard ? 1 : 0)) continue;
      if (placed.some(p => (hard || p.cat === cat) && Math.hypot(p.x - x, p.y - y) < (MIN[cat] + MIN[p.cat]) / 2)) continue;
      add(cat, s, x, y); count--;
    }
  };
  ['tree', 'rock', 'log', 'stump', 'crystal', 'bush', 'mush', 'deco'].forEach(c => scatter(c, st[c] || 0));
  return { theme, cols, rows, ground, props, blocks, keep };
}

// ---- Phần chạy trong game (Phaser) ----
export function buildMap(scene, areaId, AREA, W, H) {
  const L = generateLayout(areaId, AREA, W, H), key = 'th_' + L.theme; // khớp khóa atlas nạp trong preload
  const rt = scene.add.renderTexture(0, 0, L.cols * CELL, L.rows * CELL).setOrigin(0).setDepth(0);
  L.ground.forEach(g => rt.drawFrame(key, g.name, g.cx * CELL, g.cy * CELL)); // vẽ nền 1 lần
  L.props.forEach(p => {
    const im = scene.add.image(p.x, p.y, key, p.name);
    if (p.cat === 'pool') im.setDepth(1); else im.setOrigin(0.5, 1).setDepth(p.sort ? 10 + p.y : 1);
  });
  const group = scene.physics.add.staticGroup();
  L.blocks.forEach(b => group.create(b.x, b.y, 'px').setVisible(false).setDisplaySize(b.w, b.h).refreshBody());
  return group;
}
