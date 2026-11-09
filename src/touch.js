// Joystick ảo + nút cho điện thoại. Đọc qua đối tượng TOUCH dùng chung.
export const TOUCH = { x: 0, y: 0, atk: false, once: { skill: false, dodge: false, auto: false } };

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
tap('bAuto', 'auto');
