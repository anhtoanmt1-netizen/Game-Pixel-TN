// Cỏ lay động theo gió và rung khi nhân vật/quái đi qua: lò xo giảm chấn cho từng bụi (hàm thuần, kiểm thử được)
export const windAngle = (t, x, y, ph) => Math.sin(t * 1.5 + x * 0.012 + y * 0.006 + ph) * 0.6 + Math.sin(t * 0.55 + x * 0.004 - y * 0.003) * 0.4;
export function stepSway(s, t, dt, actors, R = 36) {
  let push = 0;
  for (const a of actors) { // người/quái lướt qua: đẩy bụi nghiêng ra xa, càng gần càng mạnh
    const dx = s.x - a.x, dy = s.y - a.y; if (Math.abs(dx) > R || Math.abs(dy) > R) continue;
    const d = Math.hypot(dx, dy); if (d < R) push += Math.sign(dx || 1) * (1 - d / R) * 0.5;
  }
  const target = windAngle(t, s.x, s.y, s.ph) * s.amp + push * (s.amp > 0.1 ? 1 : 0.5);
  s.vel += (target - s.ang) * 60 * dt; s.vel *= Math.exp(-7 * dt); s.ang += s.vel * dt; // hơi dao động rồi lắng xuống
  return s.ang;
}
