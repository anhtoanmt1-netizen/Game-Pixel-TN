// Dò đường A* trên lưới 24px cho chế độ Auto: vòng qua vật cản thay vì đâm thẳng vào cây/đá. Hàm thuần, kiểm thử được.
export function buildNav(blocks, W, H, cell = 24, pad = 13) {
  const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell), blocked = new Uint8Array(cols * rows);
  for (const b of blocks) { // phình hộp va chạm thêm bán kính thân nhân vật
    const x0 = Math.max(0, Math.floor((b.x - b.w / 2 - pad) / cell)), x1 = Math.min(cols - 1, Math.floor((b.x + b.w / 2 + pad) / cell));
    const y0 = Math.max(0, Math.floor((b.y - b.h / 2 - pad) / cell)), y1 = Math.min(rows - 1, Math.floor((b.y + b.h / 2 + pad) / cell));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) blocked[y * cols + x] = 1;
  }
  return { cols, rows, cell, blocked };
}
const free = (n, cx, cy) => cx >= 0 && cy >= 0 && cx < n.cols && cy < n.rows && !n.blocked[cy * n.cols + cx];
export function los(n, x0, y0, x1, y1) { // đường thẳng có thông không
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (n.cell / 2)));
  for (let i = 0; i <= steps; i++) { const t = i / steps; if (!free(n, Math.floor((x0 + (x1 - x0) * t) / n.cell), Math.floor((y0 + (y1 - y0) * t) / n.cell))) return false; }
  return true;
}
function nearestFree(n, cx, cy, R = 5) {
  if (free(n, cx, cy)) return [cx, cy];
  for (let r = 1; r <= R; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) === r && free(n, cx + dx, cy + dy)) return [cx + dx, cy + dy];
  return null;
}
export function findPath(n, x0, y0, x1, y1, maxIter = 12000) {
  const c = n.cell, S = nearestFree(n, Math.floor(x0 / c), Math.floor(y0 / c)), Gl = nearestFree(n, Math.floor(x1 / c), Math.floor(y1 / c));
  if (!S || !Gl) return null;
  const N = n.cols * n.rows, g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N), idx = (x, y) => y * n.cols + x;
  const heap = []; // [f, id] nhị phân nhỏ nhất
  const push = it => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const h = (x, y) => { const dx = Math.abs(x - Gl[0]), dy = Math.abs(y - Gl[1]); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  g[idx(S[0], S[1])] = 0; push([h(S[0], S[1]), idx(S[0], S[1])]); let found = false;
  for (let it = 0; heap.length && it < maxIter; it++) {
    const id = pop()[1]; if (closed[id]) continue; closed[id] = 1; const cx = id % n.cols, cy = (id / n.cols) | 0;
    if (cx === Gl[0] && cy === Gl[1]) { found = true; break; }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = cx + dx, ny = cy + dy;
      if (!free(n, nx, ny) || (dx && dy && (!free(n, cx + dx, cy) || !free(n, cx, cy + dy)))) continue; // không cắt góc
      const ni = idx(nx, ny), ng = g[id] + (dx && dy ? 1.414 : 1); if (ng < g[ni]) { g[ni] = ng; from[ni] = id; push([ng + h(nx, ny), ni]); }
    }
  }
  if (!found) return null;
  const cells = []; for (let id = idx(Gl[0], Gl[1]); id !== -1; id = from[id]) cells.push([(id % n.cols) * c + c / 2, ((id / n.cols) | 0) * c + c / 2]); cells.reverse();
  const out = []; let i = 0; // kéo căng đường đi: bỏ các điểm trung gian khi nhìn thẳng được
  while (i < cells.length - 1) { let j = cells.length - 1; while (j > i + 1 && !los(n, cells[i][0], cells[i][1], cells[j][0], cells[j][1])) j--; out.push({ x: cells[j][0], y: cells[j][1] }); i = j; }
  return out;
}
