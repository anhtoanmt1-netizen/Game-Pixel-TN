// Chọn khung hình + chuyển động mượt cho nhân vật (hàm thuần, kiểm thử được). Đi: lắc/nhún theo nhịp; đánh: chuỗi khung tư thế + lao tới.
import { CHARS } from './chars.js';
export function frameFor(cls, s) {
  const c = CHARS[cls]; let name, flipX = false, dx = 0, dy = 0, rot = 0, sx = 1, sy = 1;
  if (s.atk) { // tấn công / kỹ năng: phát tuần tự các tư thế, lao nhẹ về phía mục tiêu rồi hồi lại
    const fr = c[s.atk.kind], p = Math.min(1, s.atk.p), i = Math.min(fr.length - 1, Math.floor(p * fr.length));
    name = fr[i]; flipX = s.aimRight !== (c.face[s.atk.kind] === 'right');
    const k = Math.sin(Math.PI * p); dx = (s.aimRight ? 1 : -1) * k * (s.lunge || 0); sy = 1 - 0.05 * k; sx = 1 + 0.04 * k;
  } else if (s.moving) {
    name = s.dir === 'up' ? 'up' : s.dir === 'down' ? 'down' : 'left'; flipX = s.dir === 'right';
    const w = Math.sin(s.t * 13); dy = -Math.abs(w) * 3.2; rot = w * 0.06; sx = 1 + 0.025 * Math.cos(s.t * 26); sy = 1 - 0.025 * Math.cos(s.t * 26);
  } else {
    if (s.dir === 'up') name = 'up'; else if (s.dir === 'left' || s.dir === 'right') { name = 'left'; flipX = s.dir === 'right'; }
    else name = c.idle.length > 1 ? c.idle[Math.floor(s.t * 6) % c.idle.length] : 'down';
    sy = 1 + 0.015 * Math.sin(s.t * 3); // nhịp thở
  }
  return { name, flipX, dx, dy, rot, sx, sy };
}
