// Dựng bản đồ theo ô 48px: nền gạch + đường mòn nối các điểm quan trọng + ao hồ + vật cản + cảnh vật.
// Toàn bộ phần sinh bố cục là hàm thuần (chạy được trong Node để kiểm thử); chỉ buildMap mới dùng Phaser.
import { CELL, THEMES } from './themes.js';
import { MONSTERS } from './data.js';

// Mỗi khu vực dùng 1 chủ đề màu; các chế độ đấu trường mượn chủ đề của khu gần nhất
export const AREA_THEME = { forest: 'forest', cave: 'cave', volcano: 'volcano', ice: 'ice', dark: 'dark', hub: 'cave', tower: 'dark', survival: 'volcano', bossrush: 'volcano', rift: 'dark', daily: 'ice' };
export const GROUND_S = 6; // 1 điểm ảnh nền = 6px thế giới, phóng to mịn (LINEAR) nên nền mềm, không lộ ô
// Bảng màu dịu cho từng chủ đề: nền chính / nền phụ / mảng sáng / đường mòn
const PAL = {
  forest: { a: [128, 174, 92], b: [112, 158, 86], l: [152, 194, 110], p: [214, 198, 152] },
  cave: { a: [112, 118, 132], b: [96, 102, 118], l: [134, 140, 154], p: [152, 158, 172] },
  volcano: { a: [110, 82, 70], b: [94, 68, 58], l: [130, 100, 84], p: [148, 116, 96] },
  ice: { a: [226, 236, 244], b: [208, 222, 236], l: [242, 248, 253], p: [247, 251, 254] },
  dark: { a: [66, 56, 94], b: [52, 44, 78], l: [84, 74, 114], p: [98, 88, 130] },
};
// Bố cục theo CỤM cho gọn mắt: [số cụm, số vật mỗi cụm, bán kính cụm]; vật đơn lẻ dùng [n, 1, 1]
const STYLE = {
  forest: { tree: [10, 7, 190], rock: [5, 2, 70], bush: [8, 3, 70], deco: [12, 7, 80], mush: [4, 3, 45], stump: [3, 1, 1], log: [3, 1, 1], lone: [12, 1, 1], pool: 2 },
  cave: { rock: [11, 3, 110], crystal: [8, 3, 60], mush: [9, 4, 55], deco: [4, 1, 1], pool: 2 },
  volcano: { tree: [6, 4, 130], rock: [10, 3, 100], crystal: [5, 2, 60], deco: [6, 1, 1], pool: 3 },
  ice: { tree: [10, 6, 170], rock: [6, 2, 80], crystal: [7, 3, 60], mush: [3, 3, 45], stump: [3, 1, 1], bush: [4, 2, 50], pool: 2 },
  dark: { tree: [7, 4, 140], rock: [8, 3, 100], crystal: [7, 3, 60], mush: [8, 4, 55], deco: [4, 1, 1], pool: 2 },
};
const DENSITY = { hub: 0.5, tower: 0.4, survival: 0.35, bossrush: 0.4, rift: 0.5, daily: 0.5 };
const MIN = { tree: 56, rock: 52, log: 64, stump: 44, crystal: 40, pool: 130, bush: 34, mush: 30, deco: 22 };
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
  if (AREA.mode) keep.push({ x: W / 2, y: H * 0.43, r: 420 }); // chế độ đấu trường: giữ khoảng trống ở giữa

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

  // 2) Vật thể theo cụm
  const props = [], blocks = [], placed = [];
  const add = (cat, s, x, y) => {
    props.push({ cat, name: s[0], x, y, w: s[1], h: s[2], sort: SORTED.has(cat) });
    placed.push({ x, y, cat });
    if (COLL[cat]) { const c = COLL[cat]({ w: s[1], h: s[2] }); blocks.push({ x, y: y + c.dy, w: c.w, h: c.h }); }
  };
  blocks.push({ x: W / 2, y: 28, w: W, h: 56 }, { x: 9, y: H / 2, w: 18, h: H }, { x: W - 9, y: H / 2, w: 18, h: H }, { x: W / 2, y: H - 8, w: W, h: 16 }); // viền bản đồ
  for (let k = 0, n = Math.round((st.pool || 0) * Math.min(1, dens * 1.5)); k < n; k++) { // ao / dung nham / băng
    for (let t = 0; t < 80; t++) {
      const s = pick(T.pool), x = 220 + rnd() * (W - 440), y = 240 + rnd() * (H - 480);
      if (nearKeep(x, y, s[1] / 2 + 60) || onPath(x, y, 3) || placed.some(p => Math.hypot(p.x - x, p.y - y) < MIN.pool + 120)) continue;
      props.push({ cat: 'pool', name: s[0], x, y, w: s[1], h: s[2], sort: false }); placed.push({ x, y, cat: 'pool' });
      blocks.push({ x, y, w: s[1] * 0.72, h: s[2] * 0.5 }); break;
    }
  }
  const ringCat = T.tree.length ? 'tree' : 'rock'; // một hàng cây/đá viền quanh bản đồ cho gọn
  const ring = (x, y) => { if (!nearKeep(x, y, 24) && !onPath(x, y, 1)) add(ringCat, pick(T[ringCat]), x, y); };
  for (let x = 40; x < W; x += 96) { ring(x + rnd() * 14, 72 + rnd() * 8); ring(x + rnd() * 14, H - 26 - rnd() * 6); }
  for (let y = 150; y < H - 60; y += 96) { ring(36 + rnd() * 8, y); ring(W - 36 - rnd() * 8, y + rnd() * 8); }

  const tryPlace = (cat, list, cx, cy, rad) => {
    const s = pick(list), x = cx + (rnd() * 2 - 1) * rad, y = cy + (rnd() * 2 - 1) * rad, hard = !!COLL[cat];
    if (x < 50 || x > W - 50 || y < 110 || y > H - 60 || nearKeep(x, y, hard ? 34 : 14) || onPath(x, y, hard ? 1 : 0)) return false;
    if (placed.some(p => (hard || p.cat === cat) && Math.hypot(p.x - x, p.y - y) < (MIN[cat] + MIN[p.cat]) / 2)) return false;
    add(cat, s, x, y); return true;
  };
  const clusters = (cat, [nCl, per, rad]) => {
    const list = cat === 'lone' ? T[ringCat] : T[cat]; const realCat = cat === 'lone' ? ringCat : cat;
    if (!list || !list.length) return;
    const centers = [];
    for (let k = 0, n = Math.max(dens >= 0.3 ? 1 : 0, Math.round(nCl * dens)); k < n; k++) {
      for (let t = 0; t < 80; t++) {
        const cx = 160 + rnd() * (W - 320), cy = 200 + rnd() * (H - 380);
        if (nearKeep(cx, cy, rad * 0.4 + 30) || onPath(cx, cy, 2) || centers.some(c => Math.hypot(c[0] - cx, c[1] - cy) < rad * 1.2 + 120)) continue;
        centers.push([cx, cy]);
        for (let j = 0, tries = 0; j < per && tries < per * 12; tries++) if (tryPlace(realCat, list, cx, cy, rad)) j++;
        break;
      }
    }
  };
  ['tree', 'rock', 'crystal', 'stump', 'log', 'lone', 'bush', 'mush', 'deco'].forEach(c => { if (st[c]) clusters(c, st[c]); });
  return { theme, cols, rows, path, props, blocks, keep };
}

// Nền mềm: màu dịu biến thiên chậm + đường mòn nhòe viền + vùng sáng quanh điểm quan trọng. Trả về RGBA (w×h) để phóng to mịn.
function noise2(seed) {
  const h = (x, y) => { let v = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed; v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };
  return (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (h(ix, iy) * (1 - u) + h(ix + 1, iy) * u) * (1 - v) + (h(ix, iy + 1) * (1 - u) + h(ix + 1, iy + 1) * u) * v; };
}
export function paintGround(L, W, H) {
  const S = GROUND_S, w = Math.ceil(W / S), h = Math.ceil(H / S), P = PAL[L.theme], data = new Uint8ClampedArray(w * h * 4), cs = CELL / S;
  let m = new Float32Array(w * h);
  for (let cy = 0; cy < L.rows; cy++) for (let cx = 0; cx < L.cols; cx++) if (L.path[cy * L.cols + cx]) for (let y = Math.floor(cy * cs); y < Math.min(h, Math.ceil((cy + 1) * cs)); y++) for (let x = Math.floor(cx * cs); x < Math.min(w, Math.ceil((cx + 1) * cs)); x++) m[y * w + x] = 1;
  const R = Math.round(cs * 0.7);
  for (let pass = 0; pass < 2; pass++) { // nhòe viền đường mòn (hộp 2 lượt)
    const tmp = new Float32Array(w * h);
    for (let y = 0; y < h; y++) { let acc = 0; for (let x = -R; x <= R; x++) acc += m[y * w + Math.max(0, Math.min(w - 1, x))]; for (let x = 0; x < w; x++) { tmp[y * w + x] = acc / (2 * R + 1); acc += m[y * w + Math.min(w - 1, x + R + 1)] - m[y * w + Math.max(0, x - R)]; } }
    for (let x = 0; x < w; x++) { let acc = 0; for (let y = -R; y <= R; y++) acc += tmp[Math.max(0, Math.min(h - 1, y)) * w + x]; for (let y = 0; y < h; y++) { m[y * w + x] = acc / (2 * R + 1); acc += tmp[Math.min(h - 1, y + R + 1) * w + x] - tmp[Math.max(0, y - R) * w + x]; } }
  }
  const n1 = noise2(1234567), n2 = noise2(7654321), g = rng(L.theme + 'grain');
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const wx = x * S, wy = y * S, a = n1(wx / 380, wy / 380), b = n2(wx / 140, wy / 140);
    const t = Math.max(0, Math.min(1, 0.5 + (a - 0.5) * 1.3 + (b - 0.5) * 0.3)), lt = sm(0.66, 0.92, a) * 0.4;
    let pm = Math.min(1, m[y * w + x] * 1.25) * 0.68, glow = 0;
    for (const k of L.keep) { const d = Math.hypot(k.x - wx, k.y - wy), r = k.r + 40; if (d < r) glow = Math.max(glow, (1 - d / r) * 0.07); }
    const o = (y * w + x) * 4, gr = (g() - 0.5) * 3;
    for (let c = 0; c < 3; c++) {
      let v = P.a[c] * (1 - t) + P.b[c] * t; v = v * (1 - lt) + P.l[c] * lt; v = v * (1 - pm) + P.p[c] * pm; v = v + (255 - v) * glow + gr; data[o + c] = v;
    }
    data[o + 3] = 255;
  }
  return { w, h, data };
}

// ---- Phần chạy trong game (Phaser) ----
export function buildMap(scene, areaId, AREA, W, H) {
  const L = generateLayout(areaId, AREA, W, H), key = 'th_' + L.theme, gk = 'ground_' + areaId;
  const g = paintGround(L, W, H); // nền mịn vẽ một lần
  const tex = scene.textures.createCanvas(gk, g.w, g.h), ctx = tex.getContext(), img = ctx.createImageData(g.w, g.h);
  img.data.set(g.data); ctx.putImageData(img, 0, 0); tex.refresh(); tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  scene.add.image(0, 0, gk).setOrigin(0).setScale(GROUND_S).setDepth(0);
  L.props.forEach(p => {
    const im = scene.add.image(p.x, p.y, key, p.name);
    if (p.cat === 'pool') im.setDepth(1); else im.setOrigin(0.5, 1).setDepth(p.sort ? 10 + p.y : 1);
  });
  const group = scene.physics.add.staticGroup();
  L.blocks.forEach(b => group.create(b.x, b.y, 'px').setVisible(false).setDisplaySize(b.w, b.h).refreshBody());
  return { group, layout: L };
}
