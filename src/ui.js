import { RARITY, SLOTS, SLOT_NAME, CARDS, DECK_SIZE, DECK_LIMIT, SK_NODES, SK_MAX, spLeft, SETS, CARD_CAP, cardLvCost, EVO, STONE, RECIPES, ACHS, genItem, PETS, equip, unequip, fmt, enhanceInfo, rerollCost, rerollAffix } from './items.js';
import { exportJSON, importJSON } from './save.js';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const col = ri => (RARITY[ri] || RARITY[0]).color;

export function initUI(G, { onChange }) {
  const st = document.createElement('style');
  st.textContent = `
  #invBtn{position:fixed;top:10px;right:10px;z-index:30;padding:8px 12px;background:#1b1f2e;color:#fff;border:1px solid #fff4;border-radius:6px;font:600 13px sans-serif}
  #inv{position:fixed;inset:6% 4%;z-index:40;display:none;background:#10131ff2;color:#ddd;border:1px solid #fff4;border-radius:8px;padding:12px;overflow:auto;font:13px sans-serif}
  #inv.open{display:block} #inv h3{margin:10px 0 6px;color:#fff} #inv .cols{display:flex;flex-wrap:wrap;gap:16px}
  #inv .col{flex:1 1 280px;min-width:260px} #inv .row{padding:4px 6px;border:1px solid #fff2;border-radius:4px;margin:3px 0}
  #inv small{display:block;color:#aaa} #inv button{margin:2px 4px 0 0;background:#2a3050;color:#fff;border:1px solid #fff3;border-radius:4px;padding:3px 8px}`;
  document.head.appendChild(st);
  const btn = document.createElement('button'); btn.id = 'invBtn'; btn.textContent = 'Túi đồ (I)';
  const panel = document.createElement('div'); panel.id = 'inv';
  document.body.append(btn, panel);

  const itemHtml = (it, extra, ref) => `<div class="row"><b style="color:${col(it.ri)}">${esc(it.name)}${it.enh ? ' +' + it.enh : ''}${it.locked ? ' 🔒' : ''}</b> <small>Lv.${it.lv} · ${fmt(it.main)}${it.set && SETS[it.set] ? ' · Bộ ' + esc(SETS[it.set].name) : ''}</small>
    <small>${it.affixes.map((a, n) => (n + 1) + '. ' + esc(fmt(a))).join('<br>') || '—'}</small>${extra}<button data-a="enh" data-r="${ref}">Cường hóa</button><button data-a="rr" data-r="${ref}">Đổi dòng</button></div>`;

  function render() {
    const gear = SLOTS.map(s => {
      const it = G.eq[s];
      return it ? itemHtml(it, `<button data-a="un" data-s="${s}">Tháo (${SLOT_NAME[s]})</button>`, 's:' + s)
        : `<div class="row"><small>${SLOT_NAME[s]}: trống</small></div>`;
    }).join('');
    const inv = G.inv.map((it, i) => itemHtml(it,
      `<button data-a="eq" data-i="${i}">Mặc</button><button data-a="lock" data-i="${i}">${it.locked ? 'Mở khóa' : 'Khóa'}</button><button data-a="sell" data-i="${i}">Bán</button><button data-a="salv" data-i="${i}">Phân giải</button>`, 'i:' + i)).join('') || '<small>Trống</small>';
    const cards = G.cards.map(c => {
      const d = CARDS[c.t]; if (!d) return '';
      const ri = RARITY.findIndex(r => r.id === d.rarity), on = G.deck.includes(c.t);
      return `<div class="row"><b style="color:${col(ri)}">${esc(d.name)}${c.evo ? ' ✦' : ''}</b> <small>Lv.${c.lv || 1}/${CARD_CAP[d.rarity]} · ${'★'.repeat(c.star) || 'chưa có sao'} · ${Object.entries(d.bonus).map(([k, v]) => `+${v}% ${k.replace('_pct', '').toUpperCase()}`).join(', ')}${d.note ? esc(d.note) : ''} · ${d.kind || 'monster'}</small>
        <button data-a="deck" data-t="${esc(c.t)}">${on ? 'Bỏ khỏi bộ' : 'Trang bị'}</button><button data-a="clv" data-t="${esc(c.t)}">Lên cấp (${cardLvCost(c).gold} vàng + ${cardLvCost(c).stone} đá)</button>${c.evo ? '' : `<button data-a="cevo" data-t="${esc(c.t)}">Tiến hóa</button>`}</div>`;
    }).join('') || '<small>Chưa có thẻ</small>';
    panel.innerHTML = `<button data-a="close" style="float:right">Đóng (I)</button>
      <h3>Vàng: ${G.gold} · Túi ${G.inv.length}/${G.cap}</h3>
      <div class="cols"><div class="col"><h3>Đang mặc</h3>${gear}</div>
      <div class="col"><h3>Kho đồ</h3>${inv}</div>
      <div class="col"><h3>Thẻ bài (${G.deck.length}/${DECK_SIZE})</h3>${cards}
        <h3>Kỹ năng bị động · điểm còn: ${spLeft(G)}</h3>${Object.entries(SK_NODES).map(([k, [n, ds]]) => `<div class="row"><b>${n}</b> ${(G.sk && G.sk[k]) || 0}/${SK_MAX} <small>${ds}</small><button data-a="sk" data-k="${k}">+</button></div>`).join('')}
        <button data-a="skreset">Đặt lại (${50 * G.level} vàng)</button>
        <h3>Chế tạo · Đá nâng cấp: ${G.mat.stone}</h3>${RECIPES.map((r, k) => `<button data-a="craft" data-k="${k}">${r.name} (${r.stone} đá + ${r.gold} vàng)</button>`).join('')}
        <h3>Thành tựu</h3>${ACHS.map(a => `<div class="row">${G.ach[a.id] ? '✅' : '⬜'} <b>${a.name}</b> <small>${a.desc} · +${a.gold} vàng</small></div>`).join('')}
        <h3>Thú đồng hành</h3>${Object.entries(PETS).map(([k, p]) => { const ok = G.q[p.unlock] && G.q[p.unlock].done; return `<div class="row"><b>${p.name}</b> <small>${p.desc}${ok ? '' : ' · khóa: hoàn thành nhiệm vụ ' + p.unlock}</small>${ok ? `<button data-a="pet" data-k="${k}">${G.pet === k ? 'Cất đi' : 'Mang theo'}</button>` : ''}</div>`; }).join('')}
        <h3>Cài đặt</h3><button data-a="set" data-k="sfx">Âm thanh: ${G.set.sfx ? 'Bật' : 'Tắt'}</button><button data-a="set" data-k="music">Nhạc: ${G.set.music ? 'Bật' : 'Tắt'}</button><button data-a="set" data-k="vol">Âm lượng: ${Math.round(G.set.vol * 100)}%</button><button data-a="set" data-k="lowfx">Giảm hiệu ứng: ${G.set.lowfx ? 'Bật' : 'Tắt'}</button>
        <h3>Sao lưu</h3><button data-a="exp">Xuất backup</button><button data-a="imp">Nhập backup</button></div></div>`;
  }

  panel.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    const a = b.dataset.a, it = G.inv[+b.dataset.i];
    if (a === 'enh' || a === 'rr') {
      const r = b.dataset.r, t = r[0] === 's' ? G.eq[r.slice(2)] : G.inv[+r.slice(2)];
      if (!t) return;
      if (a === 'enh') {
        const inf = enhanceInfo(t);
        if (!inf) return alert('Đã đạt +20.');
        if (G.gold < inf.cost) return alert(`Không đủ vàng (cần ${inf.cost}).`);
        if (!confirm(`Cường hóa lên +${(t.enh || 0) + 1}?\nChi phí ${inf.cost} vàng · tỷ lệ ${inf.rate}%.\nThất bại không phá hủy trang bị.`)) return;
        G.gold -= inf.cost;
        if (Math.random() * 100 < inf.rate) { t.enh = (t.enh || 0) + 1; t.fail = 0; } else { t.fail = (t.fail || 0) + 1; alert('Thất bại (+5% tỷ lệ lần sau).'); }
      } else {
        const n = +prompt(`Đổi dòng số mấy (1-${t.affixes.length})?`);
        if (!(n >= 1 && n <= t.affixes.length)) return;
        const cost = rerollCost(t);
        if (G.gold < cost) return alert(`Không đủ vàng (cần ${cost}).`);
        const c = rerollAffix(t, n - 1);
        if (!confirm(`Đổi "${fmt(t.affixes[n - 1])}" thành "${fmt(c)}"?\nChi phí ${cost} vàng.`)) return; // xem trước, không ghi đè âm thầm
        G.gold -= cost; t.affixes[n - 1] = c;
      }
      onChange(); return render();
    }
    if (a === 'close') panel.classList.remove('open');
    else if (a === 'eq' && it) equip(G, it);
    else if (a === 'un') unequip(G, b.dataset.s);
    else if (a === 'lock' && it) it.locked = !it.locked;
    else if (a === 'sell' && it) {
      if (it.locked) return alert('Vật phẩm đang bị khóa.');
      if (it.ri >= 4 && !confirm(`Bán ${it.name}? Đây là vật phẩm hiếm.`)) return;
      if (it.ri === 6 && !confirm('Vật phẩm ANCIENT – xác nhận lần hai để bán?')) return;
      G.gold += Math.round((1 + it.ri) * it.lv * 2);
      G.inv.splice(+b.dataset.i, 1);
    } else if (a === 'pet') {
      G.pet = G.pet === b.dataset.k ? null : b.dataset.k;
    } else if (a === 'set') {
      const k = b.dataset.k;
      if (k === 'vol') G.set.vol = G.set.vol >= 1 ? 0.25 : +(G.set.vol + 0.25).toFixed(2); else G.set[k] = !G.set[k];
    } else if (a === 'clv' || a === 'cevo') {
      const c = G.cards.find(x => x.t === b.dataset.t); if (!c) return;
      const d = CARDS[c.t], cap = CARD_CAP[d.rarity];
      if (a === 'clv') {
        if ((c.lv || 1) >= cap) return alert('Thẻ đã đạt cấp tối đa.');
        const k = cardLvCost(c);
        if (G.gold < k.gold || G.mat.stone < k.stone) return alert('Không đủ vàng hoặc đá.');
        G.gold -= k.gold; G.mat.stone -= k.stone; c.lv = (c.lv || 1) + 1;
      } else {
        if (c.evo) return;
        if ((c.lv || 1) < cap || c.star < EVO.star) return alert(`Cần thẻ đạt cấp tối đa (${cap}) và ít nhất ${EVO.star} sao.`);
        if (G.gold < EVO.gold || G.mat.stone < EVO.stone) return alert('Không đủ vàng hoặc đá.');
        if (!confirm(`Tiến hóa ${d.name}? Chi phí ${EVO.gold} vàng + ${EVO.stone} đá. Sức mạnh thẻ ×1,5.`)) return;
        G.gold -= EVO.gold; G.mat.stone -= EVO.stone; c.evo = true;
      }
    } else if (a === 'salv' && it) {
      if (it.locked) return alert('Vật phẩm đang bị khóa.');
      if (it.ri >= 4 && !confirm(`Phân giải ${it.name}?`)) return;
      if (it.ri === 6 && !confirm('Vật phẩm ANCIENT – xác nhận lần hai để phân giải?')) return;
      G.mat.stone += STONE[it.ri] + Math.floor((it.enh || 0) / 2);
      G.inv.splice(+b.dataset.i, 1);
    } else if (a === 'craft') {
      const r = RECIPES[+b.dataset.k];
      if (G.gold < r.gold || G.mat.stone < r.stone) return alert('Không đủ đá hoặc vàng.');
      if (G.inv.length >= G.cap) return alert('Túi đồ đã đầy.');
      if (!confirm(`Chế tạo ${r.name}? Chi phí ${r.stone} đá + ${r.gold} vàng.`)) return; // kiểm tra nguyên liệu trước khi trừ
      G.gold -= r.gold; G.mat.stone -= r.stone; G.inv.push(genItem(G.level, r.ri));
    } else if (a === 'sk') {
      G.sk = G.sk || {}; const k = b.dataset.k;
      if (spLeft(G) <= 0 || (G.sk[k] || 0) >= SK_MAX) return;
      G.sk[k] = (G.sk[k] || 0) + 1;
    } else if (a === 'skreset') {
      const c = 50 * G.level;
      if (!Object.keys(G.sk || {}).length) return;
      if (G.gold < c) return alert(`Không đủ vàng (cần ${c}).`);
      if (!confirm(`Đặt lại toàn bộ điểm kỹ năng? Chi phí ${c} vàng.`)) return;
      G.gold -= c; G.sk = {};
    } else if (a === 'deck') {
      const t = b.dataset.t, i = G.deck.indexOf(t), kd = CARDS[t].kind || 'monster';
      const used = G.deck.filter(x => CARDS[x] && (CARDS[x].kind || 'monster') === kd).length;
      if (i >= 0) G.deck.splice(i, 1); else if (used < DECK_LIMIT[kd]) G.deck.push(t); else return alert(`Ô thẻ loại ${kd} đã đầy (${DECK_LIMIT[kd]}).`);
    } else if (a === 'exp') return exportJSON(G);
    else if (a === 'imp') {
      const f = document.createElement('input'); f.type = 'file'; f.accept = '.json';
      f.onchange = async () => {
        try {
          const d = await importJSON(f.files[0]);
          if (!confirm('Ghi đè tiến trình hiện tại bằng file backup?')) return;
          Object.assign(G, d); onChange(); render();
        } catch (err) { alert(err.message); }
      };
      return f.click();
    }
    onChange(); render();
  });

  const toggle = () => { panel.classList.toggle('open'); render(); };
  btn.addEventListener('click', toggle);
  window.addEventListener('keydown', e => { if (e.key === 'i' || e.key === 'I') toggle(); });
  return { refresh: () => panel.classList.contains('open') && render() };
}

export function pickClass(CLASSES) {
  return new Promise(res => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:50;background:#0b0d14;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font:16px sans-serif';
    d.innerHTML = '<h2>Chọn lớp nhân vật</h2>' + Object.entries(CLASSES).map(([k, c]) =>
      `<button data-k="${k}" style="padding:12px 18px;min-width:260px;background:#1b1f2e;color:#fff;border:1px solid #fff4;border-radius:8px;font:15px sans-serif">${c.name} · HP ${c.hp} · DEF ${c.def} · ${c.melee ? 'Cận chiến' : 'Tầm xa'}</button>`).join('');
    d.onclick = e => { const b = e.target.closest('button'); if (b) { d.remove(); res(b.dataset.k); } };
    document.body.appendChild(d);
  });
}
