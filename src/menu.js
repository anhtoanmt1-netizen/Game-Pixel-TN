// MENU TRƯỚC KHI VÀO GAME: giới thiệu, danh sách tối đa 4 nhân vật (dữ liệu hoàn toàn riêng), tạo mới, xóa, tiếp tục.
// Không phụ thuộc Phaser. runMenu() trả về số ô nhân vật được chọn (1–4) sau khi đã đặt ô đang chơi (setActiveSlot).
import { CLASSES, AREAS, SKILLS } from './data.js';
import { SLOTS, listSlots, saveSlot, deleteSlot, newProgress, setActiveSlot, activeSlot, adoptLegacy } from './save.js';
import { loadGlobal, saveGlobal, resolveSettings } from './settings.js';
import { createSettingsPanel } from './settings-panel.js';
import { icon, mountIconDefs } from './icons.js';
import { classGear, sheetStyle } from './inv.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CLS_TXT = {
  knight: ['Giáp dày, kiếm và khiên. Đứng đầu trận tuyến, hút máu và chịu đòn giỏi.', '#6fa8ff'],
  elf: ['Cung và túi tên. Bắn từ xa, chí mạng cao, hạ quái trước khi chúng kịp tới gần.', '#7be08a'],
  mage: ['Sách phép và cầu ánh sáng. Sát thương kỹ năng lớn, hồi chiêu nhanh.', '#b79cff'],
  rogue: ['Song đao và mặt nạ sát thủ. Né tránh, chí mạng và lao tới kết liễu mục tiêu.', '#ff8a8a'],
};
const CSS = `
.mn{position:absolute;inset:0;z-index:95;overflow:hidden;background:radial-gradient(ellipse at 50% 0%,#241a3a 0%,#0e0f1a 55%,#06060a 100%);font-family:'Montserrat',sans-serif;color:#eadfc6;font-size:calc(var(--u,10)*.95px);user-select:none;-webkit-user-select:none;display:flex;flex-direction:column;align-items:center}
.mn *{box-sizing:border-box}
.mn canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.mn>*:not(canvas){position:relative;z-index:2}
.mnt{margin-top:3.2%;text-align:center}
.mnt h1{margin:0;font-size:3.1em;letter-spacing:.22em;color:#ffe7b0;text-shadow:0 0 .5em #ff9a3c,0 0 1.4em #ff6a2a88,0 .06em .1em #000;font-weight:900}
.mnt p{margin:.3em 0 0;letter-spacing:.3em;font-size:.82em;color:#b9a77d;font-weight:600}
.mnh{margin:1.6% 0 1%;font-weight:700;letter-spacing:.12em;color:#e6bf6a;font-size:.95em;text-align:center;min-height:1.4em}
.mnh.warn{color:#ffb090}
.mns{display:grid;grid-template-columns:repeat(4,1fr);gap:1.1em;width:min(88%,76em);flex:1;min-height:0;max-height:62%;align-items:stretch}
.mnc{position:relative;display:flex;flex-direction:column;border-radius:.8em;border:.16em solid #5b4520;background:linear-gradient(170deg,#1a1c28,#0b0c12);overflow:hidden;cursor:pointer;transition:transform .2s,box-shadow .2s,border-color .2s;box-shadow:0 .4em 1.2em #000a;min-height:0}
.mnc:hover{transform:translateY(-.3em);border-color:var(--c,#ffb44a);box-shadow:0 0 1.6em color-mix(in srgb,var(--c,#ffb44a) 55%,transparent),0 .6em 1.4em #000}
.mnc .pt{flex:1;min-height:0;display:flex;align-items:flex-start;justify-content:center;overflow:hidden;background:radial-gradient(ellipse at 50% 70%,color-mix(in srgb,var(--c,#555) 38%,transparent),transparent 70%);position:relative}
.mnc .pt img{height:118%;max-width:none;object-fit:contain;margin-top:-1%;filter:drop-shadow(0 .3em .5em #000)} /* ảnh gốc có bảng tên ở đáy: đẩy ra ngoài khung */
.mnc .lv{position:absolute;left:.6em;top:.6em;padding:.15em .7em;border-radius:2em;background:#000a;border:.1em solid var(--c);font-weight:800;font-size:.9em;color:#ffe7b0}
.mnc .no{position:absolute;right:.6em;top:.5em;font-weight:800;color:#8d8470;font-size:.9em}
.mnc .in{padding:.6em .8em .5em;text-align:center}
.mnc .in b{display:block;font-size:1.15em;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mnc .in span{display:block;font-size:.78em;color:#a99c80;margin-top:.1em}
.mnc .bt{display:flex;gap:.4em;padding:0 .7em .7em}
.mnbtn{display:flex;align-items:center;justify-content:center;gap:.5em;padding:.55em 1.1em;border:.12em solid #9c7a3c;border-radius:.55em;background:linear-gradient(180deg,#4a3a22,#2a2014);color:#ffe7b0;font:800 .9em Montserrat,sans-serif;letter-spacing:.06em;cursor:pointer;transition:filter .15s,transform .15s}
.mnbtn:hover{filter:brightness(1.25)}.mnbtn:active{transform:scale(.97)}
.mnbtn.go{flex:1;border-color:#6fe08a;background:linear-gradient(180deg,#2f7a3a,#164a22);color:#eaffe8}
.mnbtn.del{padding:.55em .7em;border-color:#8a3a2a;background:linear-gradient(180deg,#4a1c14,#2a0f0a);color:#ffb0a0}
.mnbtn.sec{background:#14110a;border-color:#4a3a1c;color:#cfc3a8}
.mnbtn.big{font-size:1.05em;padding:.7em 1.8em}
.mnbtn:disabled{opacity:.4;cursor:default;filter:grayscale(.7)}
.mnc.empty{border-style:dashed;border-color:#4a3f2a;background:linear-gradient(170deg,#12141c,#0a0b10);align-items:center;justify-content:center;gap:.6em;color:#8d8470;font-weight:700;letter-spacing:.08em}
.mnc.empty:hover{color:#ffe7b0;border-color:#6fe08a}
.mnc.empty .pl{opacity:.8;transition:transform .2s}.mnc.empty:hover .pl{transform:scale(1.15) rotate(90deg)}
.mnc.empty.full{opacity:.45;cursor:not-allowed}.mnc.empty.full:hover{transform:none;color:#8d8470;border-color:#4a3f2a;box-shadow:none}
.mnf{display:flex;gap:.9em;margin:2% 0 2.2%;align-items:center}
.mnv{position:absolute!important;right:1em;bottom:.6em;font-size:.7em;color:#6a6350}
.mnm{position:absolute!important;inset:0;z-index:5!important;background:#000c;display:flex;align-items:center;justify-content:center}
.mnp{background:linear-gradient(160deg,#1b1d26,#0c0d12 70%);border:.2em solid #9c7a3c;border-radius:.8em;box-shadow:0 0 0 .15em #231707,0 0 0 .3em #6b4a1a,0 0 3em #000;padding:1.2em 1.5em;max-width:92%;max-height:92%;display:flex;flex-direction:column;animation:mnIn .25s cubic-bezier(.2,.9,.3,1)}
@keyframes mnIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:none}}
.mnp h2{margin:0 0 .6em;color:#ffe7b0;letter-spacing:.12em;font-size:1.3em;display:flex;align-items:center;gap:.5em}
.mnp .bd{overflow:auto;min-height:0;touch-action:pan-y;padding-right:.3em}
.mnp .rw{display:flex;gap:.6em;justify-content:flex-end;margin-top:1em}
.mni{display:grid;grid-template-columns:1fr 1fr;gap:.6em .9em;width:min(54em,86vw)}
.mni .f{display:flex;gap:.7em;align-items:flex-start;padding:.6em .7em;border:.1em solid #3d2f14;border-radius:.6em;background:#12141b}
.mni .f b{color:#ffd98a;display:block;margin-bottom:.15em}.mni .f span{font-size:.84em;color:#bfb298;line-height:1.45}
.mni .st{grid-column:1/-1;line-height:1.6;color:#d6c9ac;font-size:.92em;padding:.2em .2em .5em}
.mnn{display:flex;gap:.7em;align-items:center;margin-bottom:.8em}
.mnn input{flex:1;padding:.6em .9em;border:.12em solid #6b4a1a;border-radius:.5em;background:#0d0e13;color:#fff;font:700 1em Montserrat,sans-serif;outline:none}.mnn input:focus{border-color:#ffb44a}
.mncl{display:grid;grid-template-columns:repeat(4,1fr);gap:.6em;width:min(56em,88vw)}
.mncl .k{border:.14em solid #3d2f14;border-radius:.7em;background:#12141b;text-align:center;padding:.5em .4em;cursor:pointer;transition:all .18s;display:flex;flex-direction:column;align-items:center}
.mncl .k .im{height:7.6em;width:100%;overflow:hidden;display:flex;justify-content:center}.mncl .k img{height:9.4em;max-width:none;object-fit:contain}.mncl .k b{margin-top:.2em}.mncl .k:hover{filter:brightness(1.2)}
.mncl .k.on{border-color:var(--c);background:linear-gradient(180deg,color-mix(in srgb,var(--c) 26%,#12141b),#12141b);box-shadow:0 0 1.2em color-mix(in srgb,var(--c) 50%,transparent)}
.mncd{display:flex;gap:1em;align-items:center;margin-top:.8em;padding:.7em .9em;border:.1em solid #3d2f14;border-radius:.6em;background:#101218}
.mncd .g{width:4.2em;height:4.2em;flex:none;border:.14em solid var(--c);border-radius:.5em;background:#0b0c10;box-shadow:inset 0 0 1em color-mix(in srgb,var(--c) 40%,transparent)}
.mncd .g i{display:block;width:100%;height:100%;background:url(assets/ui/equip.png) no-repeat;background-size:700% 1700%;filter:drop-shadow(0 .1em .2em #000)}
.mncd .tx{font-size:.88em;line-height:1.5;color:#cfc3a8}.mncd .tx b{color:#fff}
@media (max-aspect-ratio:4/3){.mns{grid-template-columns:repeat(2,1fr);max-height:70%}}
`;

export async function runMenu(host = document.getElementById('stage') || document.body) {
  mountIconDefs();
  await adoptLegacy(); // người chơi cũ: nhân vật duy nhất được chuyển vào ô 1
  const cur = activeSlot(); // đang chơi dở rồi tải lại trang (đổi bản đồ): vào thẳng game
  if (cur) return cur;

  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.className = 'mn'; host.appendChild(root);
  const fit = () => root.style.setProperty('--u', Math.max((host.clientWidth || 1000) / 100, 8));
  fit(); window.addEventListener('resize', fit);
  const set = resolveSettings({}), panel = createSettingsPanel(host, { get: () => set, change: (k, v) => { set[k] = v; saveGlobal(set); }, inGame: false });
  let slots = [], msg = '';

  return new Promise(resolve => {
    const enter = n => { setActiveSlot(n); window.removeEventListener('resize', fit); stopFx(); root.remove(); resolve(n); };
    // ---- nền: tàn lửa bay (tắt khi giảm hiệu ứng) ----
    const cv = document.createElement('canvas'); root.appendChild(cv); let fxOn = !set.lowfx && !matchMedia('(prefers-reduced-motion: reduce)').matches, raf = 0; const em = [];
    const frame = () => { if (!fxOn) return; const c = cv.getContext('2d'); if (cv.width !== cv.clientWidth) { cv.width = cv.clientWidth; cv.height = cv.clientHeight; } c.clearRect(0, 0, cv.width, cv.height);
      if (em.length < 46) em.push({ x: Math.random() * cv.width, y: cv.height + 10, v: 18 + Math.random() * 40, s: 1 + Math.random() * 2.2, a: Math.random() * 6, h: Math.random() < .5 ? '255,150,60' : '180,140,255' });
      for (let i = em.length - 1; i >= 0; i--) { const p = em[i]; p.y -= p.v / 60; p.x += Math.sin(p.a += .02) * .35; if (p.y < -10) { em.splice(i, 1); continue; } const al = Math.min(1, p.y / cv.height * 1.4) * .7; c.fillStyle = `rgba(${p.h},${al})`; c.beginPath(); c.arc(p.x, p.y, p.s, 0, 6.283); c.fill(); }
      raf = requestAnimationFrame(frame); };
    const stopFx = () => { fxOn = false; cancelAnimationFrame(raf); };
    if (fxOn) frame();

    const when = ts => { try { return new Date(ts).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); } catch { return ''; } };
    const free = () => slots.find(s => !s.data);
    function render() {
      const used = slots.filter(s => s.data).length;
      root.querySelectorAll(':scope>:not(canvas):not(.mnm)').forEach(x => x.remove());
      const cards = slots.map(s => {
        if (!s.data) return `<div class="mnc empty${free() ? '' : ' full'}" data-mn="new" data-n="${s.n}"><span class="no" style="position:absolute;right:.6em;top:.5em">${s.n}</span><span class="pl">${icon('plus', '3.2em')}</span><div>TẠO NHÂN VẬT</div><div style="font-size:.75em;font-weight:600;opacity:.7">Ô trống</div></div>`;
        const d = s.data, c = CLASSES[d.classId] || {}, col = (CLS_TXT[d.classId] || [0, '#ffb44a'])[1], a = AREAS[d.area] || AREAS.forest;
        return `<div class="mnc" data-mn="play" data-n="${s.n}" style="--c:${col}"><div class="pt"><span class="lv">Lv. ${d.level}</span><span class="no">${s.n}</span><img src="assets/chars/${d.classId}_portrait.png" alt=""></div>
          <div class="in"><b>${esc(d.name || 'Nhà Thám Hiểm')}</b><span style="color:${col};font-weight:700">${esc(c.name || d.classId)}</span><span>${icon('map', '1.1em')} ${esc(a.name)} · ${icon('gold', '1.1em')} ${Math.round(d.gold || 0).toLocaleString('vi-VN')}</span><span>Chơi lần cuối ${when(d.saved)}</span></div>
          <div class="bt"><button class="mnbtn go">${icon('play', '1.2em')} TIẾP TỤC</button><button class="mnbtn del" data-mn="del" data-n="${s.n}" title="Xóa nhân vật">${icon('trash', '1.3em')}</button></div></div>`;
      }).join('');
      root.insertAdjacentHTML('beforeend', `<div class="mnt"><h1>ETERNAL PIXEL</h1><p>HÀNH TRÌNH BẤT TẬN</p></div>
        <div class="mnh${used >= SLOTS ? ' warn' : ''}">${esc(msg) || (used >= SLOTS ? `ĐÃ ĐỦ ${SLOTS} NHÂN VẬT · XÓA MỘT NHÂN VẬT ĐỂ TẠO NHÂN VẬT MỚI` : used ? `CHỌN NHÂN VẬT ĐỂ TIẾP TỤC · ${used}/${SLOTS}` : 'CHƯA CÓ NHÂN VẬT · HÃY TẠO NHÂN VẬT ĐẦU TIÊN')}</div>
        <div class="mns">${cards}</div>
        <div class="mnf"><button class="mnbtn big sec" data-mn="intro">${icon('book', '1.4em')} Giới thiệu</button><button class="mnbtn big sec" data-mn="settings">${icon('gear', '1.4em')} Cài đặt</button></div><div class="mnv">v2 · Lưu tối đa ${SLOTS} nhân vật, mỗi nhân vật một dữ liệu riêng</div>`);
    }
    const modal = html => { closeModal(); const m = document.createElement('div'); m.className = 'mnm'; m.innerHTML = `<div class="mnp">${html}</div>`; m.addEventListener('click', e => { if (e.target === m) closeModal(); }); root.appendChild(m); return m; };
    const closeModal = () => root.querySelectorAll('.mnm').forEach(m => m.remove());

    function introModal() {
      const F = (ic, t, d) => `<div class="f">${icon(ic, '2.2em')}<div><b>${t}</b><span>${d}</span></div></div>`;
      modal(`<h2>${icon('book', '1.4em')} GIỚI THIỆU</h2><div class="bd"><div class="mni">
        <div class="st">Bóng tối từ <b style="color:#ffd98a">Vực Hắc Ám</b> đang lan khắp đại lục. Bạn là một nhà thám hiểm lên đường qua <b>5 vùng đất</b> (Rừng Cổ Đại, Hang Đá, Núi Lửa, Băng Nguyên, Vực Hắc Ám), hạ từng thủ lĩnh và đối mặt với Ma Vương. Mỗi vùng có boss riêng, nhiệm vụ mở khóa vùng kế tiếp.</div>
        ${F('swords', '4 lớp nhân vật', 'Hiệp Sĩ, Cung Thủ, Pháp Sư, Sát Thủ với vũ khí và vật phẩm chuyên dụng riêng.')}
        ${F('enhance', 'Trang bị 7 bậc và Lò Rèn', 'Cường hóa, đổi dòng, thức tỉnh, đột phá với hoạt ảnh. Bộ trang bị Hỏa Long, chế tạo và phân giải.')}
        ${F('portal', 'Sảnh Thử Thách', 'Tháp vô hạn, Sinh Tồn, Thử Thách Boss, Khe Nứt Tinh Anh và Phụ Bản Hàng Ngày.')}
        ${F('card', 'Thẻ bài, thú, kỹ năng', 'Sưu tập thẻ quái, thẻ kỹ năng, di vật; thú đồng hành; cây kỹ năng bị động.')}
        ${F('auto', 'Auto Battle', 'Tự đánh, nhặt đồ, bán và trang bị. Tùy chỉnh phạm vi và chế độ.')}
        ${F('luck', 'May mắn', 'Chỉ số may mắn càng cao, đồ và thẻ bậc cao càng dễ rơi từ quái và boss.')}
        ${F('save', 'Chơi mọi nơi', 'Máy tính và điện thoại, chơi offline. Tối đa 4 nhân vật, mỗi nhân vật một tiến trình riêng.')}
        ${F('sound', 'Điều khiển', 'WASD đi · J đánh · 1 kỹ năng · Space né · Q Auto · I túi đồ. Điện thoại: joystick và nút cảm ứng.')}
      </div></div><div class="rw"><button class="mnbtn" data-mn="close">Đã hiểu</button></div>`);
    }
    function createModal(n) {
      let pick = 'knight';
      const m = modal(`<h2>${icon('plus', '1.4em')} TẠO NHÂN VẬT · Ô ${n}</h2><div class="bd"><div class="mnn"><span style="font-weight:700;color:#e6bf6a">Tên</span><input maxlength="16" value="Nhà Thám Hiểm" placeholder="Tên nhân vật (2–16 ký tự)" data-name></div>
        <div class="mncl">${Object.entries(CLASSES).map(([k, c]) => `<div class="k" data-k="${k}" style="--c:${CLS_TXT[k][1]}"><div class="im"><img src="assets/chars/${k}_portrait.png" alt=""></div><b>${esc(c.name)}</b><span style="font-size:.75em;color:#a99c80">${c.melee ? 'Cận chiến' : 'Tầm xa'}</span></div>`).join('')}</div>
        <div class="mncd" data-detail></div></div><div class="rw"><button class="mnbtn sec" data-mn="close">Hủy</button><button class="mnbtn go big" data-mn="create">${icon('play', '1.3em')} BẮT ĐẦU HÀNH TRÌNH</button></div>`);
      const detail = () => {
        const c = CLASSES[pick], col = CLS_TXT[pick][1], sk = SKILLS[c.skill] || {};
        m.querySelectorAll('.k').forEach(x => x.classList.toggle('on', x.dataset.k === pick));
        m.querySelector('[data-detail]').style.setProperty('--c', col);
        m.querySelector('[data-detail]').innerHTML = `<div class="g"><i style="${sheetStyle(classGear(pick, 'weapon'))}"></i></div><div class="g"><i style="${sheetStyle(classGear(pick, 'accessory'))}"></i></div><div class="tx"><b style="color:${col}">${esc(c.name)}</b> · HP ${c.hp} · DEF ${c.def}<br>${esc(CLS_TXT[pick][0])}<br>Kỹ năng: <b>${esc(sk.name || '')}</b></div>`;
      };
      m.addEventListener('click', e => { const k = e.target.closest('.k'); if (k) { pick = k.dataset.k; detail(); } });
      m.querySelector('[data-mn=create]').addEventListener('click', async ev => {
        const name = m.querySelector('[data-name]').value.trim(); if (name.length < 2) { m.querySelector('[data-name]').focus(); m.querySelector('[data-name]').style.borderColor = '#ff6a5a'; return; }
        ev.target.closest('button').disabled = true;
        if (!(await saveSlot(n, newProgress(pick, name)))) { msg = 'Không lưu được nhân vật mới (bộ nhớ trình duyệt bị chặn?)'; closeModal(); return render(); }
        enter(n);
      });
      detail();
    }
    function deleteModal(n) {
      const d = slots.find(s => s.n === n).data; if (!d) return;
      const m = modal(`<h2>${icon('trash', '1.4em')} XÓA NHÂN VẬT</h2><div class="bd" style="max-width:34em;line-height:1.6">Xóa <b style="color:#ffd0c0">${esc(d.name || 'Nhà Thám Hiểm')}</b> (${esc((CLASSES[d.classId] || {}).name || '')}, Lv.${d.level})?<br><span style="color:#ff9a8a">Toàn bộ trang bị, thẻ, kỹ năng và tiến trình của nhân vật này sẽ mất vĩnh viễn.</span> Các nhân vật khác không bị ảnh hưởng.</div><div class="rw"><button class="mnbtn sec" data-mn="close">Giữ lại</button><button class="mnbtn del" style="padding:.55em 1.2em" data-mn="delgo">${icon('trash', '1.2em')} Xóa vĩnh viễn</button></div>`);
      m.querySelector('[data-mn=delgo]').addEventListener('click', async () => { await deleteSlot(n); msg = ''; closeModal(); await reload(); });
    }
    async function reload() { slots = await listSlots(); render(); }

    root.addEventListener('click', e => {
      const b = e.target.closest('[data-mn]'); if (!b) return; const n = +b.dataset.n; e.stopPropagation();
      switch (b.dataset.mn) {
        case 'play': return enter(n);
        case 'new': if (!slots.find(s => s.n === n).data) return createModal(n); msg = ''; return;
        case 'del': return deleteModal(n);
        case 'intro': return introModal();
        case 'settings': return panel.open();
        case 'close': return closeModal();
      }
    });
    // ô trống khi đã đủ 4: bấm vào chỉ hiện nhắc nhở
    root.addEventListener('click', e => { const c = e.target.closest('.mnc.empty.full'); if (c) { msg = `ĐÃ ĐỦ ${SLOTS} NHÂN VẬT · HÃY XÓA MỘT NHÂN VẬT ĐỂ TẠO MỚI`; render(); setTimeout(() => { msg = ''; render(); }, 2600); } });
    reload();
  });
}
