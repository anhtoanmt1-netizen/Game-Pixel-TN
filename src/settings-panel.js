// BẢNG CÀI ĐẶT: lớp phủ riêng trên màn hình game (không nằm trong bảng túi đồ), dùng được cả ở menu chính.
// Bố cục gọn dựa trên icon: 3 thanh trượt âm lượng riêng, độ mờ nền, thẻ bật/tắt, tầm nhìn, sao lưu, về menu.
// ctx: { get: () => settings, change(key, value), inGame, actions: { auto, exportData, importData, toMenu }, onOpen, onClose }
import { icon, mountIconDefs } from './icons.js';
import { previewSound } from './audio.js';

const CSS = `
.sp{position:absolute;inset:0;z-index:90;display:none;align-items:center;justify-content:center;background:#000b;font-family:'Montserrat',sans-serif;color:#eadfc6;font-size:calc(var(--u,10)*.9px);user-select:none;-webkit-user-select:none}
.sp.on{display:flex;animation:spIn .28s cubic-bezier(.2,.9,.3,1)}@keyframes spIn{from{opacity:0;transform:scale(1.05)}to{opacity:1;transform:none}}
.sp *{box-sizing:border-box}
.spc{position:relative;width:min(64em,94%);max-height:92%;display:flex;flex-direction:column;border-radius:.7em;background:linear-gradient(160deg,#1b1d26,#0c0d12 70%);border:.2em solid #9c7a3c;box-shadow:0 0 0 .15em #231707,0 0 0 .3em #6b4a1a,0 0 3em #000,inset 0 0 2.5em #000;overflow:hidden}
.sph{display:flex;align-items:center;gap:.7em;padding:.7em 1.1em;background:linear-gradient(180deg,#2a2112,#16120b);border-bottom:.1em solid #3d2f14}
.sph h2{margin:0;font-size:1.35em;letter-spacing:.14em;color:#ffe7b0;text-shadow:0 .1em .2em #000;flex:1;display:flex;align-items:center;gap:.5em}
.spx{width:2.1em;height:2.1em;border:.1em solid #6b4a1a;border-radius:50%;background:#14110a;color:#e6bf6a;cursor:pointer;font:800 1em Montserrat,sans-serif}.spx:hover{background:#3a1a14;color:#fff}
.spb{display:grid;grid-template-columns:1fr 1fr;gap:.9em;padding:1em 1.1em;overflow:auto;touch-action:pan-y}
@media (max-aspect-ratio:4/3){.spb{grid-template-columns:1fr}}
.spk{border:.1em solid #3d2f14;border-radius:.6em;background:linear-gradient(160deg,#171922,#0d0e13);padding:.7em .9em;display:flex;flex-direction:column;gap:.55em}
.spk h4{margin:0 0 .1em;font-size:.85em;letter-spacing:.14em;color:#e6bf6a;display:flex;align-items:center;gap:.45em}
.sps{display:grid;grid-template-columns:2.4em 1fr 3em;gap:.6em;align-items:center}
.sps .ib{width:2.4em;height:2.4em;border-radius:.5em;border:.1em solid #4a3a1c;background:#12100a;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s}
.sps .ib:hover{filter:brightness(1.3)}.sps .ib.mute{opacity:.5;filter:grayscale(.6)}
.sps .nm{font-size:.82em;font-weight:700;color:#cfc3a8;margin-bottom:.15em}.sps .vl{text-align:right;font-weight:800;color:#ffe7b0;font-size:.95em}
.sps input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:.85em;margin:0;border-radius:1em;outline:none;cursor:pointer;touch-action:pan-y;background:linear-gradient(90deg,var(--c,#ffb44a) var(--p,50%),#2a2418 var(--p,50%));box-shadow:inset 0 .1em .25em #000}
.sps input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:1.7em;height:1.7em;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--c,#ffb44a) 70%);border:.16em solid #3b2a10;box-shadow:0 .1em .4em #000}
.sps input[type=range]::-moz-range-thumb{width:1.5em;height:1.5em;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,var(--c,#ffb44a) 70%);border:.16em solid #3b2a10}
.spt{display:grid;grid-template-columns:repeat(3,1fr);gap:.5em}
.spt .t{display:flex;flex-direction:column;align-items:center;gap:.3em;padding:.55em .3em;border:.1em solid #4a3a1c;border-radius:.55em;background:#12100a;cursor:pointer;font-weight:700;font-size:.78em;text-align:center;color:#b9a77d;transition:all .18s;position:relative}
.spt .t:hover{filter:brightness(1.25)}
.spt .t.on{color:#fff;border-color:var(--c,#ffb44a);background:linear-gradient(180deg,color-mix(in srgb,var(--c,#ffb44a) 30%,#12100a),#12100a);box-shadow:0 0 .9em color-mix(in srgb,var(--c,#ffb44a) 45%,transparent)}
.spt .t small{font-size:.8em;font-weight:600;opacity:.75;line-height:1.2}
.spt .t i{position:absolute;right:.35em;top:.3em;font-style:normal;font-size:.8em;font-weight:800}
.spt.act .t{color:#e6dac0}
.spf{display:flex;align-items:center;gap:.7em;padding:.8em 1.1em;border-top:.1em solid #3d2f14;background:linear-gradient(0deg,#2a2112,#16120b)}
.spf .sp-sp{flex:1}
.spbtn{display:flex;align-items:center;gap:.5em;padding:.5em 1.1em;border:.12em solid #9c7a3c;border-radius:.55em;background:linear-gradient(180deg,#4a3a22,#2a2014);color:#ffe7b0;font:700 .9em Montserrat,sans-serif;cursor:pointer}
.spbtn:hover{filter:brightness(1.25)}.spbtn.red{border-color:#b04030;background:linear-gradient(180deg,#5a2418,#2e120c);color:#ffc0b0}.spbtn.sec{background:#15120c;border-color:#4a3a1c;color:#b9a77d}
.spcf{position:absolute;inset:0;z-index:5;background:#000c;display:none;align-items:center;justify-content:center}.spcf.on{display:flex}
.spcf>div{background:linear-gradient(160deg,#2a1814,#140b09);border:.16em solid #b04030;border-radius:.7em;padding:1.2em 1.6em;max-width:80%;text-align:center;box-shadow:0 0 2em #000}
.spcf p{margin:.3em 0 1em;line-height:1.5;color:#e8d5c0}.spcf .r{display:flex;gap:.6em;justify-content:center}
.spnote{font-size:.72em;color:#8d8470;line-height:1.4}
`;

const TILE_C = { lowfx: '#ff9a3c', minimap: '#7be08a', bgCombat: '#ff6a5a' };

export function createSettingsPanel(host, ctx) {
  mountIconDefs();
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const el = document.createElement('div'); el.className = 'sp'; host.appendChild(el);
  const S = () => ctx.get();
  const fit = () => el.style.setProperty('--u', Math.max((host.clientWidth || 1000) / 100, 8));
  window.addEventListener('resize', fit);
  const saved = {}; // giá trị trước khi tắt tiếng bằng nút loa, để bật lại đúng mức

  const slider = (key, ic, name, color) => { const v = Math.round((S()[key] || 0) * 100); return `<div class="sps" style="--c:${color}"><div class="ib${v ? '' : ' mute'}" data-sp="mute" data-k="${key}" title="Bật/tắt">${icon(v || key !== 'sfxVol' ? ic : 'soundoff', '1.5em')}</div><div><div class="nm">${name}</div><input type="range" min="0" max="100" step="1" value="${v}" data-sp="range" data-k="${key}" style="--p:${v}%"></div><div class="vl" data-v="${key}">${v}%</div></div>`; };
  const tile = (key, ic, name, sub) => { const on = !!S()[key]; return `<div class="t${on ? ' on' : ''}" data-sp="tog" data-k="${key}" style="--c:${TILE_C[key] || '#ffb44a'}">${icon(ic, '1.9em')}${name}<small>${sub}</small><i>${on ? 'BẬT' : 'TẮT'}</i></div>`; };
  const zoomT = (k, name, sub) => `<div class="t${S().zoom === k ? ' on' : ''}" data-sp="zoom" data-k="${k}" style="--c:#6fb6ff">${icon('zoom', k === 'near' ? '1.5em' : k === 'wide' ? '1.9em' : '2.3em')}${name}<small>${sub}</small></div>`;

  function render() {
    const g = ctx.inGame, s = S(), dim = Math.round(s.bgDim * 100);
    el.innerHTML = `<div class="spc"><div class="sph"><h2>${icon('gear', '1.5em')}<span>CÀI ĐẶT</span></h2><button class="spx" data-sp="close" title="Đóng (Esc)">✕</button></div>
      <div class="spb">
        <div class="spk"><h4>${icon('sound', '1.3em')} ÂM THANH</h4>${slider('sfxVol', 'sound', 'Âm thanh hiệu ứng', '#4ad8f0')}${slider('musicVol', 'music', 'Âm thanh nền', '#b78bff')}${slider('uiVol', 'bell', 'Âm thanh khác (giao diện, Lò Rèn)', '#ffd34d')}</div>
        <div class="spk"><h4>${icon('dim', '1.3em')} HIỂN THỊ &amp; CHIẾN ĐẤU</h4>
          <div class="spt">${zoomT('near', 'Gần', 'Tầm nhìn')}${zoomT('wide', 'Rộng', 'Tầm nhìn')}${zoomT('ultra', 'Siêu rộng', 'Tầm nhìn')}</div>
          <div class="spt">${tile('minimap', 'map', 'Bản đồ nhỏ', 'Góc màn hình')}${tile('lowfx', 'skilldmg', 'Giảm hiệu ứng', 'Máy yếu')}${tile('bgCombat', 'swords', 'Chiến đấu nền', 'Đánh khi mở bảng')}</div>
          <div class="sps" style="--c:#9fb4ff"><div class="ib" data-sp="dimreset" title="Mặc định">${icon('dim', '1.5em')}</div><div><div class="nm">Độ mờ nền sau các bảng</div><input type="range" min="0" max="100" step="1" value="${dim}" data-sp="range" data-k="bgDim" style="--p:${dim}%"></div><div class="vl" data-v="bgDim">${dim}%</div></div>
          <div class="spnote">Chiến đấu nền: nhân vật tự đánh quái trong tầm khi bạn mở túi đồ hoặc cài đặt. Tắt thì game tạm dừng như thường.</div></div>
        ${g ? `<div class="spk" style="grid-column:1/-1"><h4>${icon('save', '1.3em')} NHÂN VẬT &amp; DỮ LIỆU</h4><div class="spt act" style="grid-template-columns:repeat(3,1fr)"><div class="t" data-sp="act" data-a="auto">${icon('auto', '1.9em')}Cài đặt Auto<small>Phạm vi, nhặt, bán</small></div><div class="t" data-sp="act" data-a="exportData">${icon('export', '1.9em')}Xuất sao lưu<small>Tải file .json</small></div><div class="t" data-sp="act" data-a="importData">${icon('import', '1.9em')}Nhập sao lưu<small>Thay nhân vật này</small></div></div></div>` : ''}
      </div>
      <div class="spf">${g ? `<button class="spbtn red" data-sp="menu">${icon('home', '1.4em')} Về màn hình chính</button>` : ''}<span class="sp-sp"></span><button class="spbtn" data-sp="close">Xong</button></div>
      <div class="spcf" data-cf><div><div style="font-size:1.1em;font-weight:800;color:#ffd0c0">${icon('home', '1.6em')}<br>Về màn hình chính?</div><p>Tiến trình nhân vật sẽ được lưu.<br>Bạn có thể tiếp tục bất cứ lúc nào từ danh sách nhân vật.</p><div class="r"><button class="spbtn red" data-sp="menu-go">Lưu và thoát</button><button class="spbtn sec" data-sp="menu-no">Ở lại</button></div></div></div></div>`;
  }
  // Kéo thanh trượt: áp dụng ngay, không dựng lại giao diện (để không ngắt thao tác kéo)
  el.addEventListener('input', e => {
    const r = e.target.closest('[data-sp=range]'); if (!r) return; const k = r.dataset.k, v = +r.value;
    r.style.setProperty('--p', v + '%'); const lab = el.querySelector(`[data-v=${k}]`); if (lab) lab.textContent = v + '%';
    ctx.change(k, v / 100); const ib = r.closest('.sps').querySelector('.ib'); if (ib && k !== 'bgDim') ib.classList.toggle('mute', v === 0);
  });
  el.addEventListener('change', e => { const r = e.target.closest('[data-sp=range]'); if (!r) return; if (r.dataset.k === 'sfxVol') previewSound('sfx'); else if (r.dataset.k === 'uiVol') previewSound('ui'); });
  el.addEventListener('click', e => {
    if (e.target === el) return close();
    const b = e.target.closest('[data-sp]'); if (!b) return; const k = b.dataset.k;
    switch (b.dataset.sp) {
      case 'close': return close();
      case 'mute': { const cur = S()[k]; if (cur > 0) { saved[k] = cur; ctx.change(k, 0); } else ctx.change(k, saved[k] || 0.5); return render(); }
      case 'tog': ctx.change(k, !S()[k]); return render();
      case 'zoom': ctx.change('zoom', k); return render();
      case 'dimreset': ctx.change('bgDim', 0.85); return render();
      case 'act': close(); return ctx.actions && ctx.actions[b.dataset.a] && ctx.actions[b.dataset.a]();
      case 'menu': return el.querySelector('[data-cf]').classList.add('on');
      case 'menu-no': return el.querySelector('[data-cf]').classList.remove('on');
      case 'menu-go': close(); return ctx.actions && ctx.actions.toMenu && ctx.actions.toMenu();
    }
  });
  // Khi mở: Esc đóng, mọi phím khác bị chặn để không lọt xuống game
  window.addEventListener('keydown', e => { if (!el.classList.contains('on')) return; e.stopPropagation(); if (e.key === 'Escape') close(); }, true);

  function open() { if (el.classList.contains('on')) return; fit(); render(); el.classList.add('on'); ctx.onOpen && ctx.onOpen(); }
  function close() { if (!el.classList.contains('on')) return; el.classList.remove('on'); ctx.onClose && ctx.onClose(); }
  return { open, close, refresh: () => el.classList.contains('on') && render(), isOpen: () => el.classList.contains('on'), el };
}
