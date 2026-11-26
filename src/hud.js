// HUD trên màn chơi: thanh HP/EXP, thông tin, boss, thông báo, bản đồ nhỏ, nút nhanh, hồi chiêu. Toàn bộ là DOM trong khung 16:9.
import { fmt2 } from './items.js';
import { icon, mountIconDefs } from './icons.js';
const THEME_BG = { forest: '#2f5a2a', cave: '#393c47', volcano: '#4a2a1c', ice: '#c9dce8', dark: '#241a36' };
export function initHud(stage, h) {
  mountIconDefs();
  const css = document.createElement('style');
  css.textContent = `
  #hud{position:absolute;inset:0;pointer-events:none;font-family:'Montserrat',sans-serif;color:#f1e6cc;font-size:calc(var(--u,10)*.85px);z-index:20}
  #hud *{box-sizing:border-box}#hud .pl{position:relative;background:url(assets/ui/plate_big.png) center/100% 100% no-repeat;aspect-ratio:640/172;width:100%}
  #hud .pl.s{background-image:url(assets/ui/plate_small.png);aspect-ratio:621/109;width:82%;margin-top:.3em}
  #hud .bar{position:absolute;left:19%;right:6%;top:30%;bottom:30%;background:#0c0a08;border-radius:.3em;overflow:hidden}#hud .pl.s .bar{left:7%;right:7%;top:27%;bottom:27%}
  #hud .bar i{display:block;height:100%;width:50%;background:linear-gradient(90deg,#a52a1a,#ef5a3a)}#hud .pl.s .bar i{background:linear-gradient(90deg,#b8641a,#ffb24a)}
  #hud .tx{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:700;text-shadow:0 0 .3em #000,0 0 .3em #000;font-size:.85em}
  #hud .lv{position:absolute;left:4%;top:30%;bottom:30%;width:14%;display:flex;align-items:center;justify-content:center;font-weight:800;color:#ffe08a;font-size:.85em;text-shadow:0 0 .3em #000}
  #hl{position:absolute;left:.9%;top:1.4%;width:23.5%}
  #hinfo{margin-top:.5em;font-weight:600;font-size:.78em;line-height:1.5;text-shadow:0 0 .35em #000,0 0 .35em #000,0 0 .35em #000;white-space:pre-line}
  #boss{position:absolute;left:33%;top:2%;width:34%;height:3.4%;background:#0c0a08cc;border:.15em solid #8b6a35;border-radius:.4em;display:none;overflow:hidden}
  #boss i{display:block;height:100%;background:linear-gradient(90deg,#8a1a1a,#e14646)}#boss span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.8em;text-shadow:0 0 .3em #000}
  #toast{position:absolute;left:50%;top:9.5%;transform:translateX(-50%);font-weight:800;font-size:1.35em;text-shadow:0 0 .4em #000,0 0 .4em #000;opacity:0;transition:opacity .4s;white-space:nowrap;color:#ffe9b0}
  #mapname{position:absolute;right:.9%;top:1.2%;width:16.5%;height:3.6%;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:.5em;padding:0 .7em;background:linear-gradient(180deg,#2a2218e6,#15110cf0);border:.15em solid #8b6a35;border-radius:.4em;box-shadow:0 0 .6em #000;white-space:nowrap;overflow:hidden}
  #mapname b{font-weight:800;font-size:.95em;color:#f1d9a0;text-shadow:0 0 .3em #000;overflow:hidden;text-overflow:ellipsis}#mapname small{font-weight:600;font-size:.72em;color:#bda77a}
  #mini{position:absolute;right:.9%;top:5.4%;width:16.5%;aspect-ratio:214/140;border:.18em solid #8b6a35;border-radius:.4em;background:#000;box-shadow:0 0 .8em #000}
  #hbtns{position:absolute;right:.9%;top:25.4%;display:flex;gap:.5em;pointer-events:auto}
  #hbtns button{width:calc(var(--u,10)*3.3px);height:calc(var(--u,10)*3.3px);border:.16em solid #8b6a35;background:radial-gradient(circle,#2e261b,#14110c 75%);cursor:pointer;box-shadow:0 0 .6em #000,inset 0 0 .5em #000;padding:.22em;display:flex;align-items:center;justify-content:center;border-radius:.4em}
  #hbtns button:hover{filter:brightness(1.35) drop-shadow(0 0 .5em #ffb44a)}#hbtns button.on{outline:.15em solid #ffb44a}
  #cds{position:absolute;left:50%;bottom:2.2%;transform:translateX(-50%);display:flex;gap:1em}
  #cds div{width:calc(var(--u,10)*4px);height:calc(var(--u,10)*4px);border-radius:50%;border:.17em solid #8b6a35;background:#0c0a08cc;display:flex;align-items:center;justify-content:center;font-weight:800;position:relative;overflow:hidden}
  #cds div b{position:absolute;inset:0;background:conic-gradient(#0009 var(--p,0%),transparent 0)}#cds div span{position:relative;font-size:.75em;text-shadow:0 0 .3em #000}
  #help{position:absolute;left:.9%;bottom:1.2%;font-size:.62em;opacity:.75;text-shadow:0 0 .3em #000}@media (pointer:coarse){#help{display:none}}`;
  document.head.appendChild(css);
  stage.insertAdjacentHTML('beforeend', `<div id="hud"><div id="hl"><div class="pl"><div class="lv"></div><div class="bar"><i></i></div><div class="tx"></div></div><div class="pl s"><div class="bar"><i></i></div><div class="tx"></div></div><div id="hinfo"></div></div>
   <div id="boss"><i></i><span></span></div><div id="toast"></div><div id="mapname"><b></b><small></small></div><canvas id="mini" width="214" height="140"></canvas>
   <div id="hbtns"><button data-h="bag" title="Nhân vật & túi đồ (I)">${icon('bag','100%')}</button><button data-h="zoom" title="Tầm nhìn (Z)">${icon('zoom','100%')}</button><button data-h="auto" title="Auto battle (Q) · giữ để cài đặt (R)">${icon('auto','100%')}</button><button data-h="set" title="Cài đặt">${icon('gear','100%')}</button></div>
   <div id="cds"><div id="cdk"><b></b><span>${icon('skill','70%')}</span></div><div id="cdd"><b></b><span>${icon('dodge','70%')}</span></div></div><div id="help">WASD đi · J/click đánh · 1 kỹ năng · Space né · Tab khóa · Q auto · Z tầm nhìn · M bản đồ nhỏ · I túi đồ</div></div>`);
  const $ = s => stage.querySelector(s);
  const hp = $('.pl:not(.s)'), xp = $('.pl.s'), mini = $('#mini'), mc = mini.getContext('2d'), toast = $('#toast');
  let staticMap = null, tt = null, last = {};
  const set = (el, k, v, fn) => { if (last[k] !== v) { last[k] = v; fn(el, v); } };
  const bar = stage.querySelector('#hbtns'); let lpT = null, lpFired = false;
  bar.addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.h !== 'auto' && h[b.dataset.h]) h[b.dataset.h](); });
  bar.addEventListener('pointerdown', e => { const b = e.target.closest('button'); if (!b || b.dataset.h !== 'auto') return; lpFired = false; lpT = setTimeout(() => { lpFired = true; if (h.autoCfg) h.autoCfg(); }, 450); }); // giữ nút Auto: mở cài đặt
  bar.addEventListener('pointerup', e => { const b = e.target.closest('button'); if (b && b.dataset.h === 'auto') { clearTimeout(lpT); if (!lpFired && h.auto) h.auto(); } });
  ['pointerleave', 'pointercancel'].forEach(ev => bar.addEventListener(ev, () => clearTimeout(lpT)));
  return {
    msg(t) { toast.textContent = t; toast.style.opacity = 1; clearTimeout(tt); tt = setTimeout(() => { toast.style.opacity = 0; }, 1800); },
    setMap(m) { // m: {W,H,theme,blocks,portals,checkpoints}
      const c = document.createElement('canvas'); c.width = 214; c.height = 140; const x = c.getContext('2d'), sx = 214 / m.W, sy = 140 / m.H;
      x.fillStyle = THEME_BG[m.theme] || '#333'; x.fillRect(0, 0, 214, 140);
      m.blocks.forEach(b => { if (b.w < m.W * .5) { x.fillStyle = b.water ? 'rgba(70,160,230,.95)' : 'rgba(0,0,0,.45)'; x.fillRect((b.x - b.w / 2) * sx, (b.y - b.h / 2) * sy, Math.max(1, b.w * sx), Math.max(1, b.h * sy)); } });
      x.fillStyle = '#6ee7ff'; m.checkpoints.forEach(p => x.fillRect(p.x * sx - 2, p.y * sy - 2, 4, 4));
      x.fillStyle = '#c07aff'; m.portals.forEach(p => { x.beginPath(); x.arc(p.x * sx, p.y * sy, 3.5, 0, 7); x.fill(); });
      staticMap = { c, W: m.W, H: m.H };
    },
    update(s) {
      set(hp.querySelector('.lv'), 'lv', 'Lv' + s.lv, (e, v) => { e.textContent = v; });
      hp.querySelector('.bar i').style.width = Math.max(0, s.hp / s.maxHp * 100) + '%';
      set(hp.querySelector('.tx'), 'hp', Math.ceil(s.hp) + '/' + Math.round(s.maxHp), (e, v) => { e.textContent = v; });
      xp.querySelector('.bar i').style.width = s.xpPct + '%';
      set(xp.querySelector('.tx'), 'xp', 'EXP ' + fmt2(s.xpPct) + '%', (e, v) => { e.textContent = v; });
      set($('#hinfo'), 'info', s.info, (e, v) => { e.textContent = v; });
      set($('#mapname b'), 'area', s.area, (e, v) => { e.textContent = v; });
      set($('#mapname small'), 'pos', `X${Math.round(s.px / 64)} · Y${Math.round(s.py / 64)}`, (e, v) => { e.textContent = v; });
      const b = $('#boss'); b.style.display = s.boss ? 'block' : 'none';
      if (s.boss) { b.querySelector('i').style.width = Math.max(0, s.boss.hp / s.boss.max * 100) + '%'; set(b.querySelector('span'), 'bn', s.boss.name, (e, v) => { e.textContent = v; }); }
      $('#cdk b').style.setProperty('--p', s.cdSkill * 100 + '%'); $('#cdd b').style.setProperty('--p', s.cdDodge * 100 + '%');
      $('[data-h=auto]').classList.toggle('on', !!s.auto);
      mini.style.display = s.showMini ? '' : 'none';
      if (!s.showMini || !staticMap) return;
      const { W, H } = staticMap, sx = 214 / W, sy = 140 / H;
      mc.drawImage(staticMap.c, 0, 0);
      mc.fillStyle = '#ff5b5b'; s.enemies.forEach(e => { if (e.boss) { mc.fillStyle = '#ffd34d'; mc.fillRect(e.x * sx - 3, e.y * sy - 3, 6, 6); mc.fillStyle = '#ff5b5b'; } else mc.fillRect(e.x * sx - 1.5, e.y * sy - 1.5, 3, 3); });
      mc.fillStyle = '#e8d28a'; s.drops.forEach(d => mc.fillRect(d.x * sx - 1, d.y * sy - 1, 2, 2));
      mc.strokeStyle = 'rgba(255,255,255,.55)'; mc.strokeRect(s.view.x * sx, s.view.y * sy, s.view.w * sx, s.view.h * sy);
      mc.fillStyle = '#fff'; mc.beginPath(); mc.arc(s.px * sx, s.py * sy, 3.2, 0, 7); mc.fill(); mc.strokeStyle = '#000'; mc.stroke();
    },
  };
}
