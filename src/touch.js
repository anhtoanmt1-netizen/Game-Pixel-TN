// Joystick ảo + nút cho điện thoại. Đọc qua đối tượng TOUCH dùng chung.
export const TOUCH = { x: 0, y: 0, atk: false, once: { skill: false, dodge: false, auto: false, autoCfg: false } };

import { icon, mountIconDefs } from './icons.js';
mountIconDefs();
for (const [id, ic] of [['bAtk', 'atk'], ['bSkill', 'skill'], ['bDodge', 'dodge'], ['bAuto', 'auto']]) { const b = document.getElementById(id); if (b) { b.innerHTML = icon(ic, '64%'); b.style.display = 'flex'; b.style.alignItems = 'center'; b.style.justifyContent = 'center'; b.style.background = 'radial-gradient(circle,#ffffff30,#00000066)'; b.setAttribute('aria-label', id); } }
const stick = document.getElementById('stick');
const knob = document.getElementById('knob');
let activeId = null;

function setStick(e) {
  const r = stick.getBoundingClientRect();
  let dx = e.clientX - (r.left + r.width / 2);
  let dy = e.clientY - (r.top + r.height / 2);
  const max = r.width / 2;
  const len = Math.hypot(dx, dy);
  if (len > max) { dx = dx / len * max; dy = dy / len * max; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  TOUCH.x = dx / max; TOUCH.y = dy / max;
}
function resetStick() { activeId = null; knob.style.transform = ''; TOUCH.x = TOUCH.y = 0; }

stick.addEventListener('pointerdown', e => { activeId = e.pointerId; stick.setPointerCapture(e.pointerId); setStick(e); });
stick.addEventListener('pointermove', e => { if (e.pointerId === activeId) setStick(e); });
stick.addEventListener('pointerup', resetStick);
stick.addEventListener('pointercancel', resetStick);

const hold = (id, key) => {
  const b = document.getElementById(id);
  b.addEventListener('pointerdown', () => { TOUCH[key] = true; });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, () => { TOUCH[key] = false; }));
};
const tap = (id, key) => document.getElementById(id).addEventListener('pointerdown', () => { TOUCH.once[key] = true; });

hold('bAtk', 'atk');
tap('bSkill', 'skill');
tap('bDodge', 'dodge');
// Nút Auto: chạm = bật/tắt, giữ ~0,45 giây = mở bảng cài đặt Auto
{ const b = document.getElementById('bAuto'); let timer = null, fired = false;
  b.addEventListener('pointerdown', () => { fired = false; timer = setTimeout(() => { fired = true; TOUCH.once.autoCfg = true; }, 450); });
  b.addEventListener('pointerup', () => { clearTimeout(timer); if (!fired) TOUCH.once.auto = true; });
  ['pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => clearTimeout(timer))); }
