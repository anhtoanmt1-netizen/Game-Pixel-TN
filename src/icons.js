// Bộ ICON vector đồng bộ (SVG nội tuyến, lưới 64×64): viền tối + tô gradient, sắc nét ở mọi kích thước.
// Mỗi icon có hình riêng thể hiện đúng chức năng. Dùng: icon('enhance', '2em') → chuỗi HTML <svg>.
// Gradient dùng chung nằm trong một <svg> ẩn (mountIconDefs), gọi một lần khi khởi động giao diện.
const INK = '#1b1209';
const GRAD = {
  gold: ['#fff4c2', '#f4bb3c', '#a8650f'], steel: ['#ffffff', '#b9c4dc', '#5d6a88'], red: ['#ffb4a2', '#e2432f', '#7d1710'],
  blue: ['#c2e8ff', '#3f8cff', '#1b3f9a'], green: ['#ccffb8', '#4fc24a', '#1d6a2a'], violet: ['#ecd6ff', '#9a5cf0', '#4a1f8f'],
  wood: ['#e0a96e', '#8a5a2c', '#4a2c12'], dark: ['#5a5470', '#2c2838', '#15121c'], ember: ['#fff0a0', '#ff8a2a', '#b0310f'],
  cyan: ['#e6ffff', '#4ad8f0', '#127a96'], paper: ['#fff6dc', '#e8cf98', '#9a7a3c'], white: ['#ffffff', '#f0f0fa', '#b8b8cc'],
};
export const mountIconDefs = () => {
  if (typeof document === 'undefined' || document.getElementById('ei-defs')) return;
  const g = Object.entries(GRAD).map(([k, [a, b, c]]) => `<linearGradient id="ei-${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`).join('');
  const d = document.createElement('div'); d.id = 'ei-defs'; d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML = `<svg width="0" height="0" aria-hidden="true"><defs>${g}<radialGradient id="ei-glow"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs></svg>`;
  document.body.appendChild(d);
};
const F = k => `url(#ei-${k})`;
// p: hình có viền; l: đường nét dày có viền (cung, tay cầm...); star: sao nhiều cánh
const p = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const l = (d, color, w = 5) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 4.4}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
const hl = (d, o = 0.55) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="stroke:#fff"/>`; // vệt sáng không viền
const star = (cx, cy, R, r, n, fill) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = Math.PI * i / n - Math.PI / 2, k = i % 2 ? r : R; d += (i ? 'L' : 'M') + (cx + Math.cos(a) * k).toFixed(1) + ' ' + (cy + Math.sin(a) * k).toFixed(1); } return p(d + 'Z', fill); };
const spark = (cx, cy, s, fill = F('gold')) => p(`M${cx} ${cy - s}L${cx + s * .28} ${cy - s * .28}L${cx + s} ${cy}L${cx + s * .28} ${cy + s * .28}L${cx} ${cy + s}L${cx - s * .28} ${cy + s * .28}L${cx - s} ${cy}L${cx - s * .28} ${cy - s * .28}Z`, fill, 'stroke-width="1.6"');
const gear = (cx, cy, R, r, n, fill) => { let d = ''; for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, w = Math.PI / n * .55, pt = (a, k) => `${(cx + Math.cos(a) * k).toFixed(1)} ${(cy + Math.sin(a) * k).toFixed(1)}`; d += `${i ? 'L' : 'M'}${pt(a0 - w, r)}L${pt(a0 - w * .7, R)}L${pt(a0 + w * .7, R)}L${pt(a0 + w, r)}`; } return p(d + 'Z', fill); };

export const ICONS = {
  // ---------- Hệ thống phát triển trang bị ----------
  enhance: () => p('M3 30 L12 27 H52 L48 38 H21 C15 38 8 35 3 30Z', F('steel')) + p('M22 38 H46 C45 43 41 44 39 45 V51 H28 V45 C25 44 23 42 22 38Z', F('dark')) + p('M17 51 H50 V58 H17Z', F('steel')) + hl('M8 30 L14 29 H48', .6)
    + `<g transform="rotate(38 40 14)">${p('M37 8 H43 V34 H37Z', F('wood'))}${p('M27 2 H53 V14 H27Z', F('steel'))}${p('M27 2 H33 V14 H27Z', F('red'))}</g>` + spark(14, 14, 9) + spark(55, 36, 5, F('ember')),
  reroll: () => l('M12 30 A20 20 0 0 1 46 16', '#f4bb3c', 6) + p('M40 6 L58 16 L42 28Z', F('gold')) + l('M52 34 A20 20 0 0 1 18 48', '#4ad8f0', 6) + p('M24 58 L6 48 L22 36Z', F('cyan'))
    + p('M32 22 L42 32 L32 42 L22 32Z', F('violet')) + hl('M32 24 L40 32', .7),
  awaken: () => p('M2 32 C12 14 52 14 62 32 C52 50 12 50 2 32Z', F('white')) + `<circle cx="32" cy="32" r="12.5" fill="${F('violet')}" stroke="${INK}" stroke-width="2.4"/><circle cx="32" cy="32" r="6" fill="#120a24"/><circle cx="28" cy="28" r="3" fill="#fff"/>`
    + [[32, 4, 32, 12], [14, 8, 18, 15], [50, 8, 46, 15], [4, 20, 10, 24], [60, 20, 54, 24]].map(([a, b, c, d]) => `<path d="M${a} ${b}L${c} ${d}" stroke="${INK}" stroke-width="6.4" stroke-linecap="round"/><path d="M${a} ${b}L${c} ${d}" stroke="#ffd34d" stroke-width="3.4" stroke-linecap="round"/>`).join('') + spark(32, 58, 5, F('cyan')),
  transcend: () => `<circle cx="32" cy="36" r="21" fill="none" stroke="${INK}" stroke-width="10.4"/><circle cx="32" cy="36" r="21" fill="none" stroke="${F('gold')}" stroke-width="6" stroke-dasharray="28 9" stroke-linecap="round"/>`
    + p('M32 10 L48 30 H38 V50 H26 V30 H16Z', F('ember')) + hl('M32 14 L22 28', .7) + spark(52, 10, 6) + spark(10, 14, 4, F('cyan')),
  // ---------- Hệ thống chính ----------
  equip: () => p('M32 4 C38 6 42 10 42 16 C38 14 34 14 32 14 C30 14 26 14 22 16 C22 10 26 6 32 4Z', F('red')) + p('M10 36 C10 20 20 12 32 12 C44 12 54 20 54 36 V56 H42 L40 46 H24 L22 56 H10Z', F('steel')) + p('M16 32 H48 V40 H16Z', F('dark')) + p('M30 12 H34 V32 H30Z', F('gold')) + hl('M15 30 C15 22 21 16 28 15', .8),
  weapon: () => p('M50 6 L58 6 L58 14 L28 44 L20 36Z', F('steel')) + p('M14 36 L28 50 L22 56 L8 42Z', F('gold')) + p('M10 44 L20 54 L10 62 L2 54Z', F('wood')) + hl('M54 10 L26 38', .7),
  skill: () => star(32, 32, 28, 10, 8, F('ember')) + `<circle cx="32" cy="32" r="9" fill="${F('gold')}" stroke="${INK}" stroke-width="2.4"/>` + spark(32, 32, 5, F('white')),
  stats: () => p('M6 8 H58 V56 H6Z', F('dark'), 'rx="4"') + p('M14 40 H22 V50 H14Z', F('green')) + p('M27 28 H35 V50 H27Z', F('gold')) + p('M40 16 H48 V50 H40Z', F('red')) + hl('M12 12 H52', .35),
  gold: () => `<circle cx="32" cy="32" r="26" fill="${F('gold')}" stroke="${INK}" stroke-width="2.6"/><circle cx="32" cy="32" r="19" fill="none" stroke="#a8650f" stroke-width="3"/>` + star(32, 32, 11, 4.5, 5, '#fff2b0') + hl('M14 22 C18 14 26 10 34 10', .8),
  stone: () => p('M32 4 L50 20 L44 54 L32 60 L20 54 L14 20Z', F('blue')) + p('M32 4 L50 20 L32 26 L14 20Z', F('cyan')) + p('M32 26 L44 54 L32 60Z', F('dark'), 'fill-opacity=".35"') + hl('M20 22 L32 8', .8) + spark(46, 12, 5, F('white')),
  lock: () => l('M20 28 V20 A12 12 0 0 1 44 20 V28', '#c8d0e4', 5) + p('M12 28 H52 V58 H12Z', F('gold'), 'stroke-linejoin="round"') + `<circle cx="32" cy="41" r="5" fill="#2a1a08"/><path d="M30 44 H34 V51 H30Z" fill="#2a1a08"/>`,
  bag: () => p('M20 6 H44 L40 18 H24Z', F('wood')) + p('M24 18 H40 C54 26 58 40 54 52 C52 58 46 60 32 60 C18 60 12 58 10 52 C6 40 10 26 24 18Z', F('wood')) + p('M22 20 H42 V26 H22Z', F('gold')) + hl('M16 36 C18 30 20 28 24 26', .45) + spark(32, 44, 7),
  card: () => p('M12 4 H52 V60 H12Z', F('violet'), 'stroke-linejoin="round"') + p('M18 10 H46 V54 H18Z', F('dark'), 'fill-opacity=".6"') + star(32, 32, 13, 5.5, 5, F('gold')) + hl('M15 8 V50', .4),
  quest: () => p('M14 8 H50 C54 8 54 14 50 14 V50 C50 56 54 56 54 58 H20 C16 58 14 54 14 50Z', F('paper')) + p('M10 6 H20 V14 H10Z', F('wood'), 'rx="3"') + `<path d="M34 18 V38" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M34 18 V38" stroke="#e2432f" stroke-width="5.4" stroke-linecap="round"/><circle cx="34" cy="48" r="4.6" fill="#e2432f" stroke="${INK}" stroke-width="2"/>`,
  map: () => p('M4 14 L22 8 L42 14 L60 8 V50 L42 56 L22 50 L4 56Z', F('paper')) + `<path d="M22 8 V50 M42 14 V56" stroke="#9a7a3c" stroke-width="2" fill="none"/>` + p('M44 18 C36 18 34 28 44 38 C54 28 52 18 44 18Z', F('red')) + `<circle cx="44" cy="25" r="3.2" fill="#fff"/>`,
  daily: () => p('M6 12 H58 V58 H6Z', F('paper'), 'rx="5"') + p('M6 12 H58 V26 H6Z', F('red')) + p('M16 4 H22 V16 H16Z', F('steel')) + p('M42 4 H48 V16 H42Z', F('steel')) + star(32, 42, 11, 5, 8, F('gold')),
  trophy: () => p('M16 6 H48 V26 C48 38 40 44 32 44 C24 44 16 38 16 26Z', F('gold')) + l('M16 12 H8 C8 24 12 28 18 30', '#d99a2b', 3.6) + l('M48 12 H56 C56 24 52 28 46 30', '#d99a2b', 3.6) + p('M28 44 H36 V52 H28Z', F('gold')) + p('M18 52 H46 V60 H18Z', F('wood')) + hl('M22 12 V26', .7),
  paw: () => ['M12 28', 'M24 16', 'M40 16', 'M52 28'].map((m, i) => `<ellipse cx="${[12, 24, 40, 52][i]}" cy="${[27, 15, 15, 27][i]}" rx="6" ry="8" fill="${F('wood')}" stroke="${INK}" stroke-width="2.4" transform="rotate(${[-25, -8, 8, 25][i]} ${[12, 24, 40, 52][i]} ${[27, 15, 15, 27][i]})"/>`).join('') + p('M32 30 C44 30 52 44 48 52 C44 58 38 54 32 54 C26 54 20 58 16 52 C12 44 20 30 32 30Z', F('wood')),
  craft: () => `<g transform="rotate(-35 32 32)">${p('M29 10 H35 V58 H29Z', F('wood'))}${p('M14 4 H50 V20 H14Z', F('steel'))}${p('M14 4 H24 V20 H14Z', F('dark'))}</g>` + p('M44 38 L54 44 L48 56 L38 50Z', F('cyan')) + spark(14, 50, 6),
  gear: () => gear(32, 32, 28, 22, 8, F('steel')) + `<circle cx="32" cy="32" r="11" fill="${F('dark')}" stroke="${INK}" stroke-width="2.4"/>` + hl('M12 26 C14 18 20 12 28 10', .6),
  auto: () => l('M10 32 A22 22 0 0 1 48 16', '#4fc24a', 6) + p('M44 4 L60 16 L42 24Z', F('green')) + l('M54 32 A22 22 0 0 1 16 48', '#4fc24a', 6) + p('M20 60 L4 48 L22 40Z', F('green')) + p('M26 22 L44 32 L26 42Z', F('gold')),
  zoom: () => `<circle cx="26" cy="26" r="18" fill="#9fd8ff" fill-opacity=".35" stroke="${INK}" stroke-width="8.4"/><circle cx="26" cy="26" r="18" fill="none" stroke="${F('gold')}" stroke-width="4.4"/>` + l('M40 40 L56 56', '#8a5a2c', 7) + hl('M14 20 C16 14 20 11 25 10', .85),
  save: () => p('M6 6 H48 L58 16 V58 H6Z', F('blue')) + p('M16 6 H44 V22 H16Z', F('steel')) + p('M36 9 H41 V19 H36Z', F('dark')) + p('M14 34 H50 V58 H14Z', F('paper')) + `<path d="M20 42 H44 M20 49 H38" stroke="#9a7a3c" stroke-width="2.4" stroke-linecap="round"/>`,
  sell: () => `<ellipse cx="32" cy="48" rx="24" ry="10" fill="${F('gold')}" stroke="${INK}" stroke-width="2.6"/>` + `<ellipse cx="32" cy="38" rx="24" ry="10" fill="${F('gold')}" stroke="${INK}" stroke-width="2.6"/>` + `<ellipse cx="32" cy="28" rx="24" ry="10" fill="${F('gold')}" stroke="${INK}" stroke-width="2.6"/>` + `<ellipse cx="32" cy="28" rx="15" ry="5.5" fill="none" stroke="#a8650f" stroke-width="2.4"/>` + p('M44 4 H58 V16 H64 L51 30 L38 16 H44Z', F('green'), 'transform="translate(-6 -2) scale(.8)"'),
  salvage: () => p('M30 8 L46 22 L40 44 L24 40 L16 22Z', F('blue')) + `<path d="M30 8 L32 26 L24 40 M32 26 L46 22" stroke="${INK}" stroke-width="2.4" fill="none"/>` + p('M44 46 L56 52 L48 60 L38 54Z', F('cyan')) + p('M8 44 L18 48 L12 58 L4 52Z', F('cyan')) + spark(52, 14, 6, F('ember')),
  filter: () => p('M4 8 H60 L38 32 V54 L26 60 V32Z', F('steel')) + hl('M10 12 H54', .6),
  sort: () => p('M6 8 H58 V16 H6Z', F('gold')) + p('M6 24 H46 V32 H6Z', F('steel')) + p('M6 40 H34 V48 H6Z', F('wood')) + p('M46 40 H58 L52 56Z', F('green')),
  clear: () => p('M4 8 H60 L38 32 V54 L26 60 V32Z', F('steel'), 'fill-opacity=".8"') + l('M40 40 L58 58 M58 40 L40 58', '#e2432f', 5),
  all: () => [[6,6],[24,6],[42,6],[6,24],[24,24],[42,24],[6,42],[24,42],[42,42]].map(([x,y],i)=>p(`M${x} ${y}H${x+16}V${y+16}H${x}Z`,F(['gold','steel','blue','green','violet','red','wood','cyan','ember'][i]),'rx="3"')).join(''),
  portal: () => `<circle cx="32" cy="32" r="26" fill="#1a1030" stroke="${INK}" stroke-width="2.4"/>` + l('M32 10 A22 22 0 1 1 10 32', '#9a5cf0', 6) + l('M32 20 A12 12 0 1 1 20 32', '#4ad8f0', 5) + `<circle cx="32" cy="32" r="4" fill="#fff"/>`,
  look: () => p('M32 6 C46 6 54 18 52 32 C52 46 44 58 32 58 C20 58 12 46 12 32 C10 18 18 6 32 6Z', F('dark')) + p('M16 26 C20 14 44 14 48 26 C44 36 20 36 16 26Z', F('violet')) + spark(32, 26, 7, F('white')),
  // ---------- Chỉ số ----------
  heart: () => p('M32 56 C8 40 6 22 17 14 C24 9 30 13 32 19 C34 13 40 9 47 14 C58 22 56 40 32 56Z', F('red')) + hl('M16 20 C18 16 22 14 26 16', .8),
  atk: () => p('M52 4 L60 4 L60 12 L28 44 L20 36Z', F('steel')) + p('M12 38 L26 52 L18 60 L4 46Z', F('gold')) + hl('M54 8 L26 38', .7),
  def: () => p('M32 4 L56 12 V30 C56 46 46 55 32 60 C18 55 8 46 8 30 V12Z', F('blue')) + p('M32 12 L48 18 V30 C48 40 42 47 32 52Z', F('steel'), 'fill-opacity=".5"') + p('M30 18 H34 V44 H30Z', F('gold')) + p('M22 28 H42 V32 H22Z', F('gold')),
  crit: () => star(32, 32, 30, 12, 8, F('red')) + star(32, 32, 16, 7, 8, F('gold')) + `<circle cx="32" cy="32" r="4" fill="#fff"/>`,
  critdmg: () => star(32, 30, 26, 10, 6, F('ember')) + `<path d="M24 26 L32 38 L40 26" stroke="${INK}" stroke-width="7.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 26 L32 38 L40 26" stroke="#fff" stroke-width="3.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  dodge: () => l('M6 20 H40 C50 20 50 8 42 8', '#4ad8f0', 5) + l('M6 34 H48 C58 34 58 46 50 46', '#9fe8ff', 5) + l('M6 48 H32 C40 48 40 58 33 58', '#4ad8f0', 5),
  lifesteal: () => p('M32 4 C32 4 12 26 12 40 C12 52 21 60 32 60 C43 60 52 52 52 40 C52 26 32 4 32 4Z', F('red')) + hl('M20 38 C20 32 24 26 28 22', .8) + `<path d="M32 34 V50 M24 42 H40" stroke="#fff" stroke-width="5" stroke-linecap="round" style="stroke:#fff"/>`,
  heal: () => p('M22 4 H42 V22 H60 V42 H42 V60 H22 V42 H4 V22 H22Z', F('green')) + hl('M26 8 V24 H8', .55),
  luck: () => ['M32 30 C20 30 14 18 24 12 C30 8 34 14 32 30', 'M34 32 C34 20 46 14 52 24 C56 30 50 34 34 32', 'M32 34 C44 34 50 46 40 52 C34 56 30 50 32 34', 'M30 32 C30 44 18 50 12 40 C8 34 14 30 30 32'].map(d => p(d, F('green'))).join('') + l('M32 34 C32 44 30 52 24 60', '#4fc24a', 3.4),
  exp: () => star(32, 32, 28, 12, 5, F('gold')) + hl('M32 10 L38 26', .7),
  speed: () => p('M38 2 L14 36 H28 L24 62 L50 26 H36Z', F('gold')) + hl('M36 6 L20 32', .7),
  cdr: () => p('M12 4 H52 V10 H12Z M12 54 H52 V60 H12Z', F('wood')) + p('M16 10 H48 C48 28 36 28 36 32 C36 36 48 36 48 54 H16 C16 36 28 36 28 32 C28 28 16 28 16 10Z', F('cyan'), 'fill-opacity=".55"') + p('M22 50 H42 C40 42 36 40 32 40 C28 40 24 42 22 50Z', F('gold')),
  boss: () => p('M6 46 L10 16 L22 30 L32 10 L42 30 L54 16 L58 46Z', F('gold')) + p('M6 46 H58 V56 H6Z', F('wood')) + `<circle cx="32" cy="40" r="4.5" fill="${F('red')}" stroke="${INK}" stroke-width="1.8"/>`,
  skilldmg: () => p('M32 4 C38 16 52 20 50 38 C48 54 36 60 28 60 C16 60 8 50 12 38 C14 30 20 28 22 20 C26 24 28 22 28 18 C28 12 30 8 32 4Z', F('ember')) + p('M30 30 C34 38 42 40 40 48 C38 56 30 56 26 52 C22 46 26 40 30 30Z', F('gold')) + hl('M20 36 C20 30 24 26 26 22', .55),
  dragon: () => p('M8 44 C4 28 14 12 30 10 L40 4 L38 16 C52 18 60 30 56 44 C52 54 40 58 30 56 C22 58 12 54 8 44Z', F('red')) + p('M24 26 L34 30 L24 34Z', F('gold')) + `<circle cx="42" cy="26" r="3" fill="#fff"/>` + spark(14, 12, 6, F('ember')),
  clover: () => ICONS.luck(),
  check: () => l('M12 34 L26 48 L52 16', '#6bff8a', 8),
  cross: () => l('M14 14 L50 50 M50 14 L14 50', '#ff5b5b', 8),
  arrow: () => p('M6 24 H36 V12 L60 32 L36 52 V40 H6Z', F('gold')),
  lvl: () => p('M32 4 L58 30 H42 V58 H22 V30 H6Z', F('green')) + hl('M32 10 L14 28', .6),
};
export const icon = (name, size = '1em', cls = '') => {
  const f = ICONS[name]; if (!f) return '';
  return `<svg class="ei ${cls}" viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true" style="overflow:visible"><g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">${f()}</g></svg>`;
};
// Biểu tượng cho từng loại chỉ số (dòng thuộc tính, bảng chỉ số)
export const STAT_ICON = { atk: 'atk', matk: 'atk', hp: 'heart', def: 'def', crit_rate: 'crit', crit: 'crit', crit_damage: 'critdmg', lifesteal: 'lifesteal', dodge: 'dodge', exp_bonus: 'exp', gold_bonus: 'gold', luck: 'luck',
  atk_pct: 'atk', hp_pct: 'heart', skill_dmg: 'skilldmg', cdr: 'cdr', heal_kill: 'heal', boss_dmg: 'boss', dragon_fire: 'dragon', speed: 'speed' };
export const statIcon = (type, size = '1.2em') => icon(STAT_ICON[type] || 'stats', size);
