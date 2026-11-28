// BẢNG CHỌN BẢN ĐỒ: mở khi bấm vào bản đồ nhỏ hoặc tên bản đồ ở góc màn hình; chọn và dịch chuyển ngay, không qua nhiều bước.
// ctx: { G, travel(id), onOpen, onClose }
import { AREAS, QUESTS, DANGER } from './data.js';
import { AREA_THEME } from './maps.js';
import { icon, mountIconDefs } from './icons.js';

export const AREA_ORDER = ['forest', 'cave', 'volcano', 'ice', 'dark', 'hub', 'tower', 'survival', 'bossrush', 'rift', 'daily'];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DANGER_COL = ['#9fe3ff', '#7be08a', '#ffe08a', '#ffb050', '#ff7a4a', '#ff4a6a'];
const MODE_NAME = { tower: 'Tháp vô hạn', survival: 'Sinh tồn', bossrush: 'Thử thách Boss', rift: 'Khe nứt Tinh anh', daily: 'Phụ bản hằng ngày' };

const CSS = `
.mp{position:absolute;inset:0;z-index:88;display:none;align-items:center;justify-content:center;background:#000b;font-family:'Montserrat',sans-serif;color:#eadfc6;font-size:calc(var(--u,10)*.9px);user-select:none;-webkit-user-select:none}
.mp.on{display:flex;animation:mpIn .28s cubic-bezier(.2,.9,.3,1)}@keyframes mpIn{from{opacity:0;transform:scale(1.05)}to{opacity:1;transform:none}}
.mp *{box-sizing:border-box}
.mpc{width:min(78em,95%);max-height:92%;display:flex;flex-direction:column;border-radius:.7em;background:linear-gradient(160deg,#1b1d26,#0c0d12 70%);border:.2em solid #9c7a3c;box-shadow:0 0 0 .15em #231707,0 0 0 .3em #6b4a1a,0 0 3em #000,inset 0 0 2.5em #000;overflow:hidden}
.mph{display:flex;align-items:center;gap:.7em;padding:.7em 1.1em;background:linear-gradient(180deg,#2a2112,#16120b);border-bottom:.1em solid #3d2f14}
.mph h2{margin:0;font-size:1.35em;letter-spacing:.14em;color:#ffe7b0;flex:1;display:flex;align-items:center;gap:.5em}
.mph small{color:#a99c80;font-weight:600}
.mpx{width:2.1em;height:2.1em;border:.1em solid #6b4a1a;border-radius:50%;background:#14110a;color:#e6bf6a;cursor:pointer;font:800 1em Montserrat,sans-serif}.mpx:hover{background:#3a1a14;color:#fff}
.mpb{padding:.8em 1.1em 1em;overflow:auto;touch-action:pan-y}
.mpb h3,.mph3{margin:.7em 0 .5em;font-size:.82em;letter-spacing:.16em;color:#e6bf6a;display:flex;align-items:center;gap:.5em}.mpb h3:first-child,.mph3:first-child{margin-top:0}
`;
// CSS của thẻ bản đồ (dùng chung với tab Bản đồ trong túi đồ)
export const CARD_CSS = `
.mph3{margin:.7em 0 .5em;font-size:.82em;letter-spacing:.16em;color:#e6bf6a;display:flex;align-items:center;gap:.5em;font-weight:700}
.mpk,.mpk *{box-sizing:border-box}
.mpg{display:grid;grid-template-columns:repeat(auto-fill,minmax(14.5em,1fr));gap:.8em}
.mpk{position:relative;border:.14em solid #3d2f14;border-radius:.7em;overflow:hidden;background:#0d0e13;display:flex;flex-direction:column;cursor:pointer;transition:transform .18s,box-shadow .18s,border-color .18s;min-height:10em}
.mpk:hover:not(.lock):not(.cur){transform:translateY(-.25em);border-color:var(--c);box-shadow:0 0 1.2em color-mix(in srgb,var(--c) 55%,transparent)}
.mpk .im{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.8;filter:saturate(1.1)}
.mpk::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#0004 0%,#0008 55%,#000c 100%)}
.mpk>*:not(.im){position:relative;z-index:2}
.mpk .tp{display:flex;align-items:center;gap:.5em;padding:.6em .7em 0}
.mpk .tp b{flex:1;font-size:1.05em;color:#fff;text-shadow:0 .1em .3em #000}
.mpk .md{padding:0 .7em;font-size:.78em;color:#d3c7aa;font-weight:600;text-shadow:0 .1em .2em #000}
.mpk .dg{padding:.3em .7em 0;font-size:.78em;display:flex;align-items:center;gap:.4em;color:var(--c);font-weight:700}
.mpk .ft{margin-top:auto;padding:.6em .7em .7em;display:flex;align-items:center;gap:.5em;justify-content:space-between;font-size:.8em}
.mpk .rc{color:#ffd98a;font-weight:700;text-shadow:0 .1em .2em #000}
.mpk .go{padding:.4em .9em;border:.1em solid var(--c);border-radius:.5em;background:linear-gradient(180deg,color-mix(in srgb,var(--c) 50%,#14110a),#14110a);color:#fff;font-weight:800;letter-spacing:.06em;font-size:.95em}
.mpk.cur{border-color:#6fe08a;cursor:default;box-shadow:0 0 1em #6fe08a66}.mpk.cur .go{border-color:#6fe08a;background:#14301a;color:#9ff0b0}
.mpk.lock{cursor:not-allowed}.mpk.lock .im{filter:grayscale(1);opacity:.25}.mpk.lock .go{border-color:#5a4a30;background:#14110a;color:#9a8e72}
.mpk .lk{position:absolute!important;right:.6em;top:.6em;z-index:3}
`;

const unlockedIn = (G, id) => !AREAS[id].need || !!(G.q[AREAS[id].need] && G.q[AREAS[id].need].done);
// Thẻ một bản đồ. attr(id, ok, cur) trả về chuỗi thuộc tính hành động (vd data-mp="go" hoặc data-a="travel")
export function mapCardHtml(G, id, attr) {
  const a = AREAS[id], ok = unlockedIn(G, id), cur = G.area === id, col = DANGER_COL[DANGER[id] || 0], key = a.mode ? (a.mode === 'tower' ? 'best' : 'rec_' + a.mode) : null;
  const need = a.need ? (QUESTS.find(q => q.id === a.need) || {}).name : '', rec = key && G.st[key] ? G.st[key] : 0, th = AREA_THEME[id] || 'forest';
  const ic = a.mode ? (a.mode === 'tower' ? 'trophy' : a.mode === 'daily' ? 'daily' : a.mode === 'survival' ? 'swords' : a.mode === 'rift' ? 'portal' : 'boss') : id === 'hub' ? 'home' : 'map';
  const dn = Math.max(1, DANGER[id] || 0), stars = '●'.repeat(dn) + '○'.repeat(5 - dn);
  return `<div class="mpk${cur ? ' cur' : ''}${ok ? '' : ' lock'}" ${attr(id, ok, cur)} data-id="${id}" style="--c:${col}"><div class="im" style="background-image:url(assets/terrain/${th}_grass.jpg)"></div>
    <div class="tp">${icon(ic, '1.7em')}<b>${esc(a.name)}</b></div><div class="md">${a.mode ? MODE_NAME[a.mode] || 'Chế độ thử thách' : id === 'hub' ? 'Sảnh trung tâm' : 'Khu vực khám phá'}</div>
    <div class="dg">${icon('boss', '1.2em')} Nguy hiểm <span style="letter-spacing:.1em">${stars}</span></div>${ok ? '' : `<span class="lk">${icon('lock', '1.7em')}</span>`}
    <div class="ft"><span class="rc">${ok ? (rec ? `${icon('trophy', '1.1em')} Kỷ lục ${rec}` : '') : `Hoàn thành "${esc(need)}"`}</span><span class="go">${cur ? 'ĐANG Ở ĐÂY' : ok ? 'DỊCH CHUYỂN' : 'KHÓA'}</span></div></div>`;
}
export function mapGridHtml(G, attr) {
  const zones = AREA_ORDER.filter(id => !AREAS[id].mode), modes = AREA_ORDER.filter(id => AREAS[id].mode);
  return `<h3 class="mph3">${icon('map', '1.3em')} KHU VỰC</h3><div class="mpg">${zones.map(id => mapCardHtml(G, id, attr)).join('')}</div><h3 class="mph3">${icon('portal', '1.3em')} CHẾ ĐỘ THỬ THÁCH</h3><div class="mpg">${modes.map(id => mapCardHtml(G, id, attr)).join('')}</div>`;
}

export function createMapPicker(host, ctx) {
  mountIconDefs();
  const st = document.createElement('style'); st.textContent = CSS + CARD_CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.className = 'mp'; host.appendChild(el);
  const G = ctx.G, fit = () => el.style.setProperty('--u', Math.max((host.clientWidth || 1000) / 100, 8));
  window.addEventListener('resize', fit);
  function render() {
    el.innerHTML = `<div class="mpc"><div class="mph"><h2>${icon('map', '1.5em')}<span>CHỌN BẢN ĐỒ</span><small>${esc((AREAS[G.area] || AREAS.forest).name)}</small></h2><button class="mpx" data-mp="close" title="Đóng (Esc)">✕</button></div>
      <div class="mpb">${mapGridHtml(G, (id, ok, cur) => `data-mp="${ok && !cur ? 'go' : ''}"`)}</div></div>`;
  }
  el.addEventListener('click', e => {
    if (e.target === el) return close();
    const b = e.target.closest('[data-mp]'); if (!b) { const k = e.target.closest('.mpk.lock'); if (k) k.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], 240); return; }
    if (b.dataset.mp === 'close') return close();
    if (b.dataset.mp === 'go') { close(); ctx.travel(b.dataset.id); }
  });
  window.addEventListener('keydown', e => { if (!el.classList.contains('on')) return; e.stopPropagation(); if (e.key === 'Escape') close(); }, true);
  function open() { if (el.classList.contains('on')) return; fit(); render(); el.classList.add('on'); ctx.onOpen && ctx.onOpen(); }
  function close() { if (!el.classList.contains('on')) return; el.classList.remove('on'); ctx.onClose && ctx.onClose(); }
  return { open, close, isOpen: () => el.classList.contains('on'), refresh: () => el.classList.contains('on') && render() };
}
