// Bảng giao diện chính 16:9: ảnh nền do bạn cung cấp (đã xóa chữ/ô mẫu) + các lớp tương tác đặt theo % của ảnh.
import { LAYOUT as L } from './layout.js';
import { fmt2, RARITY, SLOT_NAME, LABEL, BONUS_LABEL, TYPE_VN, KIND_VN, CARDS, DECK_LIMIT, SK_NODES, SK_MAX, spLeft, SETS, RECIPES, ACHS, genItem, PETS, fmtAw, LOOK_LV, LOOK_NAMES, lookStage, CARD_CAP, cardLvCost, EVO, equip, unequip, fmt, enhanceInfo, rerollCost, derive, expNeed, RESONANCE, itemLines, awkLv, trTier, CLASS_FX } from './items.js';
import { CLASSES, CFG, AREAS, QUESTS, SKILLS, MONSTERS } from './data.js';
import { sheetStyle, classGear, cardValue, cardRi, CARD_LV, filterCards, cardSellList, itemName, iconStyle, glowColor, iconPos, KIND_GROUPS, SORTS, filterInv, sortInv, sellValue, salvageGain, quickList, quickTotals, applyRemove, canEquip, equipTo, moveEq } from './inv.js';
import { exportJSON, importJSON } from './save.js';
import { createForge, MODES } from './forge.js';
import { icon, mountIconDefs, statIcon } from './icons.js';
import { KIND_CHIPS } from './auto.js';

const TABS = [['equip', 'MẶC ĐỒ'], ['skill', 'KỸ NĂNG'], ['card', 'THẺ BÀI'], ['quest', 'NHIỆM VỤ'], ['map', 'BẢN ĐỒ']];
const AREA_ORDER = ['forest', 'cave', 'volcano', 'ice', 'dark', 'hub', 'tower', 'survival', 'bossrush', 'rift', 'daily'];
const FOOT = [78.7, 80.3, 11.3, 2.4];
const PER_PAGE = 42;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const P = r => `left:${r[0]}%;top:${r[1]}%;width:${r[2]}%;height:${r[3]}%`;
const fmtNum = n => fmt2(n);
const rcol = ri => RARITY[Math.min(ri, 6)].color;

const CSS = `
#ui{position:absolute;inset:0;display:none;z-index:40;background:#000;font-family:'Montserrat',sans-serif;color:#e8dcc4;user-select:none;-webkit-user-select:none;touch-action:none}
#ui.open{display:block}
#ui .board{position:absolute;inset:0;background:url(assets/ui/board.jpg) center/100% 100% no-repeat;font-size:calc(var(--u,10)*.85px)}
#ui .a{position:absolute;box-sizing:border-box}
#ui .c{display:flex;align-items:center;justify-content:center;text-align:center}
#ui .hit{cursor:pointer;border-radius:.4em}#ui .hit:hover{box-shadow:0 0 1.1em #ffb44a99,inset 0 0 .8em #ffb44a55}
#ui .ttl{font-weight:800;letter-spacing:.12em;color:#f1d9a0;font-size:calc(var(--u)*1.25px);text-shadow:0 .1em .3em #000}
#ui .tab{font-weight:700;letter-spacing:.08em;color:#cdbb97;font-size:calc(var(--u)*.95px);cursor:pointer}
#ui .tab.on{color:#fff3d6;background:linear-gradient(180deg,#a8661c,#6b3f10 60%,#8a5415);box-shadow:inset 0 0 .9em #ffcf7a88,0 0 .9em #e48a2277;border-radius:.3em}
#ui .srow{display:flex;justify-content:space-between;align-items:center;font-size:calc(var(--u)*.82px);font-weight:600;color:#d8ccb4;padding:0 .3em}
#ui .srow b{color:#ffd98a;font-weight:700}
#ui .bar{background:#14110d;border:1px solid #6b5a3a;border-radius:.4em;overflow:hidden}#ui .bar i{display:block;height:100%;background:linear-gradient(90deg,#b8641a,#ffb24a)}
#ui .es{border:.17em solid #8b8372;background:linear-gradient(145deg,#171a1f,#0d0f12);box-shadow:inset 0 0 1em #000c,0 0 0 1px #000;border-radius:.25em;overflow:hidden}
#ui .es .lab{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;font-size:calc(var(--u)*.7px);color:#6f695c;font-weight:600;padding:.2em}
#ui .es.f,#ui .cell.f{border-color:var(--c);box-shadow:inset 0 0 1.4em var(--c),0 0 1em var(--c);animation:gl 2.6s ease-in-out infinite}
#ui .es.f.hi,#ui .cell.f.hi{animation-duration:1.5s}
@keyframes gl{50%{filter:brightness(1.25)}}
#ui .es.ok{outline:.2em solid #6bff8a;outline-offset:-.1em}#ui .es.bad{outline:.2em solid #ff5b5b;outline-offset:-.1em}
#ui .cell{border:.12em solid transparent;border-radius:.2em;cursor:grab}
#ui .cell.f{box-shadow:inset 0 0 1.1em var(--c)}
#ui .cell.sel{outline:.18em solid #ffe08a;outline-offset:-.12em}
#ui .ic{position:absolute;inset:3%;background:url(assets/ui/equip.png) no-repeat;background-size:700% 1700%;pointer-events:none;filter:drop-shadow(0 .1em .15em #000a)}
#ui .ei{display:inline-block;vertical-align:middle;flex:none}
#ui .ovl{position:absolute;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:1}
#ui .ovl .ei{filter:drop-shadow(0 .08em .12em #000c)}
#ui .ovl.dsk{background:radial-gradient(circle,#2a2218 0%,#14110c 70%);border-radius:50%}
#ui .ovl.dmd{background:radial-gradient(circle,#2a2218 0%,#14110c 72%);clip-path:polygon(50% 2%,98% 50%,50% 98%,2% 50%)}
#ui .ovl.rct{background:linear-gradient(160deg,#1d1a14,#111010);border-radius:.25em}
#ui .forgebtns{display:grid;grid-template-columns:repeat(4,1fr);gap:.5em;margin-top:.8em}
#ui .forgebtns .fb{display:flex;flex-direction:column;align-items:center;gap:.25em;padding:.55em .3em;border:.1em solid var(--fc);border-radius:.5em;background:linear-gradient(180deg,color-mix(in srgb,var(--fc) 22%,#14110a),#14110a);color:#f3e6c4;font:700 .82em Montserrat,sans-serif;cursor:pointer;transition:all .2s}
#ui .forgebtns .fb:hover{box-shadow:0 0 1em var(--fc);transform:translateY(-.15em)}#ui .forgebtns .fb small{font-weight:600;color:#a99c80;font-size:.85em}#ui .forgebtns .fb.off{opacity:.45}
#ui .bd{position:absolute;pointer-events:none;font-size:calc(var(--u)*.7px);font-weight:800;text-shadow:0 0 .3em #000,0 0 .3em #000}
#ui .ds{border:.14em solid #5b5547;background:#0f1114;border-radius:.25em;cursor:pointer;font-size:calc(var(--u)*.66px);line-height:1.15;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#7d7766;font-weight:600;padding:.2em}
#ui .ds.f{border-color:var(--c);color:#f0e6d0;box-shadow:inset 0 0 .9em var(--c)}
#ui .cap{font-size:calc(var(--u)*.6px);color:#cbbd9c;font-weight:600;text-align:center;pointer-events:none;text-shadow:0 .1em .2em #000}
#ui .page{background:linear-gradient(160deg,#16181d,#0c0d10);border:.16em solid #8b6a35;border-radius:.5em;box-shadow:inset 0 0 2em #000,0 0 1.2em #000;padding:1.2em 1.6em;overflow:auto;font-size:calc(var(--u)*.86px);touch-action:pan-y}
#ui .page h3,#ui .modal h3{margin:.3em 0 .5em;color:#f1d9a0;font-size:1.15em;letter-spacing:.05em}
#ui .row{display:flex;align-items:center;gap:.7em;border:1px solid #3d382d;background:#13151a;border-radius:.4em;padding:.5em .8em;margin:.3em 0}
#ui .row .g{flex:1;min-width:0}#ui .row small{display:block;color:#a79d86;font-size:.82em}
#ui button.b{background:linear-gradient(180deg,#4a3a22,#2a2014);color:#ffe7b0;border:1px solid #9c7a3c;border-radius:.4em;font:700 .85em Montserrat,sans-serif;padding:.38em .8em;cursor:pointer}
#ui button.b:hover{filter:brightness(1.25)}#ui button.b:disabled{opacity:.4;cursor:default}
#ui button.b.red{border-color:#a33;color:#ffb0b0}
#ui .veil{position:absolute;inset:0;background:#000a;z-index:5;display:flex;align-items:center;justify-content:center}
#ui .modal{background:linear-gradient(160deg,#1a1c22,#0d0e11);border:.18em solid #a67c37;border-radius:.6em;box-shadow:0 0 2.5em #000,inset 0 0 2em #000;padding:1.2em 1.5em;max-width:62%;max-height:84%;overflow:auto;font-size:calc(var(--u)*.88px);touch-action:pan-y}
#ui .modal.wide{width:56%}
#ui .acts{display:flex;flex-wrap:wrap;gap:.45em;margin-top:.8em}
#ui .bigic{position:relative;width:7em;height:7em;flex:none;border:.18em solid var(--c);border-radius:.4em;background:#0d0f12;box-shadow:inset 0 0 1.4em var(--c),0 0 1.2em var(--c)}
#ui .lines div{margin:.12em 0}#ui .dim{color:#9a917c}
#ui .chip{display:inline-block;border:1px solid #6b5a3a;border-radius:2em;padding:.22em .8em;margin:.15em;cursor:pointer;font-weight:600;font-size:.85em}#ui .chip.on{background:#8a5a1a;color:#fff3d6;border-color:#ffcf7a}
#ui .ghost{position:fixed;z-index:99;width:6em;height:6em;pointer-events:none;opacity:.92;transform:translate(-50%,-50%);filter:drop-shadow(0 0 .6em #000)}
#ui .rail{background:#1a1610;border-radius:2em}#ui .rail i{position:absolute;left:8%;width:84%;border-radius:2em;background:linear-gradient(180deg,#e1a64d,#8a5a1a);box-shadow:0 0 .6em #ffb44a88}
#ui .page.wide{padding:.7em .9em;border-width:.12em;border-radius:.4em}
#ui .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:.5em .9em;margin-top:.6em}
#ui .g3 h4{margin:.1em 0 .3em;color:#e8a640;font-size:.95em;letter-spacing:.04em;border-bottom:1px solid #6b5a3a;padding-bottom:.15em}
#ui .kv{display:flex;justify-content:space-between;gap:.6em;padding:.14em .1em;border-bottom:1px solid #2c2820;font-size:.9em}#ui .kv b{color:#ffd98a;text-align:right}
`;

export function pickClass(classes) {
  return new Promise(res => {
    const d = document.createElement('div');
    d.style.cssText = "position:absolute;inset:0;z-index:60;background:#0b0d14;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.2em;font-family:'Montserrat',sans-serif;font-size:calc(var(--u,10)*1.1px)";
    d.innerHTML = '<h2 style="margin:0;letter-spacing:.1em">Chọn lớp nhân vật</h2>' + Object.entries(classes).map(([k, c]) =>
      `<button data-k="${k}" style="display:flex;align-items:center;gap:1em;padding:.5em 1.2em .5em .6em;min-width:22em;background:#1b1f2e;color:#fff;border:1px solid #fff4;border-radius:.6em;font:600 1em Montserrat,sans-serif;cursor:pointer;text-align:left"><img src="assets/chars/${k}_portrait.png" alt="" style="height:5em"><span>${c.name}<br><small style="font-weight:500;opacity:.8">HP ${c.hp} · DEF ${c.def} · ${c.melee ? 'Cận chiến' : 'Tầm xa'}</small></span></button>`).join('');
    d.onclick = e => { const b = e.target.closest('button'); if (b) { d.remove(); res(b.dataset.k); } };
    (document.getElementById('stage') || document.body).appendChild(d);
  });
}

export function initBoard(G, hooks) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'ui'; root.innerHTML = '<div class="board"></div>';
  (document.getElementById('stage') || document.body).appendChild(root);
  const board = root.firstChild;
  mountIconDefs();
  const ui = { tab: 'equip', page: 0, group: 'all', rarity: 'all', sort: 'new', sel: null, modal: null, q: { mode: 'sell', maxRi: 1, kinds: new Set() }, text: '', cf: { rar: 'all', kind: 'all', lv: 'all' }, wide: false, direct: false };
  const cls = () => CLASSES[G.classId || CFG.classId];
  const ps = () => hooks.ps ? hooks.ps() : { hp: 1, maxHp: 1 };
  const commit = () => { hooks.onChange && hooks.onChange(); render(); };
  const findItem = id => { const i = G.inv.find(x => x.id === id); if (i) return { it: i, where: 'inv' }; for (const s in G.eq) if (G.eq[s] && G.eq[s].id === id) return { it: G.eq[s], where: s }; return null; };
  const list = () => filterInv(G.inv, { group: ui.group, rarity: ui.rarity, text: ui.text });
  const pages = () => Math.max(1, Math.ceil((list().length + 1) / PER_PAGE));
  const unlocked = id => !AREAS[id].need || !!(G.q[AREAS[id].need] && G.q[AREAS[id].need].done);
  const questDone = id => !!(G.q[id] && G.q[id].done);
  // Lò Rèn: bảng cường hóa / đổi dòng / thức tỉnh / đột phá (thay các hộp confirm/alert/prompt cũ)
  const forge = createForge(root, { G, classId: () => G.classId || CFG.classId, find: findItem, commit: () => commit(), sfx: n => hooks.sfx && hooks.sfx(n), onClose: () => render() });

  // ---------- phần dựng HTML ----------
  const iconHtml = it => `<div class="ic" style="${iconStyle(it, G.classId)}"></div>`;
  const badges = it => (it.enh ? `<span class="bd" style="right:6%;top:2%;color:#ffe08a">+${it.enh}</span>` : '') + (it.locked ? `<span class="bd" style="left:6%;bottom:0;color:#fff">🔒</span>` : '') + (it.awaken ? `<span class="bd" style="left:6%;top:2%;color:#ffd34d">✦</span>` : '');
  const cellHtml = (it, r, from, extra = '') => `<div class="a cell f${it.ri >= 5 ? ' hi' : ''}${ui.sel && ui.sel.id === it.id ? ' sel' : ''}" data-drag="${it.id}" data-from="${from}" data-a="sel" data-id="${it.id}" style="${P(r)};--c:${glowColor(it)}${extra}">${iconHtml(it)}${badges(it)}</div>`;

  function equipView(d) {
    const s = ps(), c = cls(), stage = lookStage(G), pct = Math.min(100, G.exp / expNeed(G.level) * 100);
    let h = `<div class="a c" style="${P(L.stage)}"><img src="assets/chars/${G.classId || CFG.classId}_portrait.png" alt="" style="width:100%;height:92%;object-fit:contain;object-position:50% 100%;filter:drop-shadow(0 0 ${0.4 + stage * 0.6}em ${['#0000', '#6fb6ff', '#6ee7ff', '#ffd34d', '#ff4aff'][stage]})"></div>`;
    h += `<div class="a c" style="${P(L.pname)};font-weight:800;color:#3a2412;font-size:calc(var(--u)*1.05px)">Nhà Thám Hiểm</div><div class="a c" style="${P(L.psub)};font-weight:700;color:#4d3317;font-size:calc(var(--u)*.78px)">Lv. ${G.level} · ${esc(c.name)} · ${LOOK_NAMES[stage]}</div>`;
    if (ui.wide) return h + wideStats(d, s, c); // bảng chỉ số mở rộng thay cho ô trang bị/túi đồ
    for (const slot of Object.keys(L.eslots)) { // 10 ô trang bị (thả vào để mặc)
      const it = G.eq[slot];
      h += `<div class="a es${it ? ' f' + (it.ri >= 5 ? ' hi' : '') : ''}" data-drop="eq:${slot}" data-slot="${slot}" style="${P(L.eslots[slot])};--c:${it ? glowColor(it) : '#000'}">` +
        (it ? `<div class="a" style="inset:0;cursor:grab" data-drag="${it.id}" data-from="eq:${slot}" data-a="sel" data-id="${it.id}">${iconHtml(it)}${badges(it)}</div>` : `<span class="lab">${SLOT_NAME[slot]}</span>`) + '</div>';
    }
    const cnt = {}; Object.values(G.eq).forEach(it => { if (it && it.set) cnt[it.set] = (cnt[it.set] || 0) + 1; });
    h += `<div class="a c" style="${P(L.setinfo)};font-size:calc(var(--u)*.7px);color:#bfae85;font-weight:600;flex-direction:column">${Object.keys(cnt).map(k => `<div>${esc(SETS[k].name)}: <b style="color:#ffd98a">${cnt[k]}/6</b></div>`).join('') || '<span class="dim">Chưa có bộ trang bị</span>'}</div>`;
    // 16 ô thẻ/thú: 6 thẻ quái + thú + ngoại hình | 4 thẻ kỹ năng + 4 thẻ di vật
    const byKind = k => G.deck.filter(id => (CARDS[id] && CARDS[id].kind || 'monster') === k && G.cards.some(x => x.t === id));
    const slotsK = [['monster', 6, 0, 'Thẻ quái'], ['skill', 4, 8, 'Kỹ năng'], ['relic', 4, 12, 'Di vật']];
    for (const [k, n, base, name] of slotsK) {
      const ids = byKind(k);
      for (let i = 0; i < n; i++) {
        const id = ids[i], cd = id && G.cards.find(x => x.t === id), def = id && CARDS[id], col = def ? rcol(RARITY.findIndex(r => r.id === def.rarity)) : '#000';
        h += `<div class="a ds${def ? ' f' : ''}" data-a="${def ? 'selcard' : 'tab'}" data-t="card" data-id="${id || ''}" style="${P(L.dslots[base + i])};--c:${col}">${def ? `<b>${esc(def.name.replace(/^(Thẻ|Di vật) /, ''))}</b><span>${'★'.repeat(cd.star) || '·'} Lv${cd.lv || 1}</span>` : name}</div>`;
      }
    }
    const pet = PETS[G.pet];
    h += `<div class="a ds${pet ? ' f' : ''}" data-a="modal" data-m="pets" style="${P(L.dslots[6])};--c:#9fd8ff">${pet ? `<b>${esc(pet.name)}</b><span>Cấp ${(G.petLv && G.petLv[G.pet]) || 1}</span>` : 'Thú đồng hành'}</div>`;
    h += `<div class="a ds f" data-a="modal" data-m="pets" style="${P(L.dslots[7])};--c:#ffd34d"><b>Ngoại hình</b><span>${LOOK_NAMES[stage]}</span></div>`;
    // chỉ số
    h += `<div class="a" style="${P(L.stats_lv)};display:flex;justify-content:space-between;align-items:center"><b style="font-size:calc(var(--u)*1.7px);color:#ffe0a0;font-weight:800">Lv. ${G.level}</b><span style="font-size:calc(var(--u)*.8px);color:#f0c070;font-weight:700">EXP ${fmt2(pct)}%</span></div><div class="a bar" style="${P(L.stats_bar)}"><i style="width:${pct}%"></i></div>`;
    const rows = statRows(d, s, c);
    rows.forEach((r, i) => { h += `<div class="a srow" style="${P(L.srows[i])}"><span>${r[0]}</span><b>${r[1]}</b></div>`; });
    h += `<div class="a hit c" data-a="wide" title="Mở rộng bảng chỉ số" style="left:65.9%;top:19.3%;width:2.2%;height:3%;font-size:calc(var(--u)*1.1px);color:#ffd98a">⇔</div>`;
    h += `<div class="a c" style="${P(L.shead)};justify-content:flex-start;font-weight:700;color:#e8a640;font-size:calc(var(--u)*.85px)">Gia Tăng</div>`;
    ['Cài Đặt', 'Thú & Ngoại Hình', 'Thành Tựu', 'Chế Tạo'].forEach((t, i) => { h += `<div class="a hit" data-a="modal" data-m="${['set', 'pets', 'ach', 'craft'][i]}" style="${P(L.sbtn_hit[i])}"></div><div class="a c" style="${P(L.sbtn[i])};font-weight:700;color:#e6dac0;font-size:calc(var(--u)*.8px);pointer-events:none">${t}</div>`; });
    // túi đồ
    const lst = list(), pg = Math.min(ui.page, pages() - 1); ui.page = pg;
    KIND_GROUPS.forEach((g, i) => { h += `<div class="a hit" title="${g.name}" data-a="grp" data-g="${g.id}" style="${P(L.itabs[i])};${ui.group === g.id ? 'box-shadow:0 0 1em #ffb44a,inset 0 0 .8em #ffb44a88;border:1px solid #ffb44a' : ''}"></div>`; });
    h += `<div class="a c" style="${P([L.itabs[0][0] + 2.2, L.itabs[0][1] + 0.5, 4.3, L.itabs[0][3] - 1])};font-size:calc(var(--u)*.72px);font-weight:700;color:#fff3d6;pointer-events:none">${esc(KIND_GROUPS.find(g => g.id === ui.group).name)}</div>`;
    for (let i = 0; i < PER_PAGE; i++) { const it = lst[pg * PER_PAGE + i]; if (it) h += cellHtml(it, L.igrid[i], 'inv'); }
    const gr = L.igrid[0], gl = L.igrid[PER_PAGE - 1];
    h += `<div class="a" data-drop="inv" data-zone="inv" style="left:${gr[0]}%;top:${gr[1]}%;width:${gl[0] + gl[2] - gr[0]}%;height:${gl[1] + gl[3] - gr[1]}%;z-index:-1"></div>`;
    h += `<div class="a" style="${P(L.coin)};display:flex;align-items:center;font-weight:800;color:#ffe08a;font-size:calc(var(--u)*.85px)">${fmtNum(G.gold)}</div><div class="a" style="${P(L.count)};display:flex;align-items:center;justify-content:flex-end;font-weight:700;color:#d8ccb4;font-size:calc(var(--u)*.82px)">${G.inv.length} / ${G.cap}</div>`;
    h += `<div class="a c" style="${P(FOOT)};font-size:calc(var(--u)*.62px);color:#a99f88;font-weight:600;white-space:nowrap;overflow:hidden">${ui.rarity === 'all' ? 'Mọi bậc' : RARITY[ui.rarity].name} · ${SORTS[ui.sort][0]} · Trang ${pg + 1}/${pages()}</div>`;
    const tr = L.track, th = Math.max(10, 100 / pages()), tp = pages() > 1 ? pg / (pages() - 1) * (100 - th) : 0;
    h += `<div class="a rail hit" data-a="rail" style="${P(tr)}"><i style="top:${tp}%;height:${th}%"></i></div><div class="a hit" data-a="pg" data-d="-1" style="${P(L.up)}"></div><div class="a hit" data-a="pg" data-d="1" style="${P(L.down)}"></div>`;
    return h;
  }

  const STAT_KEYS = ['heart', 'lifesteal', 'heal', 'atk', 'def', 'boss', 'dodge', 'crit', 'critdmg', 'skilldmg', 'speed', 'cdr', 'exp', 'gold', 'luck', 'dragon'];
  const ov = (r, cls2, inner, sc = 0.82) => `<div class="a ovl ${cls2}" style="${P(r)};${sc !== 1 ? `transform:scale(${sc})` : ''}">${inner}</div>`;
  const overlays = () => {
    const cid = G.classId || CFG.classId; let h = '';
    const full = ui.tab === 'equip' && !ui.wide; // chỉ bảng Mặc đồ (không mở rộng) mới có hàng chỉ số, thẻ loại và túi
    if (full) L.srows.forEach((r, i) => { h += ov([r[0] - 1.9, r[1] - .1, 1.6, r[3] + .2], 'rct', icon(STAT_KEYS[i], '88%'), 1); });
    const sheet = (key, col = 5) => `<div style="width:92%;height:92%;background:url(assets/ui/equip.png) no-repeat;background-size:700% 1700%;${sheetStyle(key, col)}"></div>`;
    const tabIc = ['all', 'sheet:' + classGear(cid, 'weapon'), 'sheet:armor', 'sheet:necklace', 'sheet:ring', 'sheet:' + classGear(cid, 'accessory'), 'lock'];
    if (full) L.itabs.forEach((r, i) => { const k = tabIc[i]; h += ov(i === 0 ? [r[0] + .1, r[1] + .3, 2, r[3] - .6] : r, 'rct', k.startsWith('sheet:') ? sheet(k.slice(6)) : icon(k, '70%'), i === 0 ? 1 : .86); });
    const sets = [['daily', 'quest', 'trophy', 'card', 'craft', 'gear', 'map'], ['skill', 'paw', 'look', 'zoom', 'filter', 'auto', 'save'], ['sell', 'salvage', 'lock', 'sort', 'clear', 'bag']];
    // Tọa độ tâm các nút in sẵn trong board.jpg (đo trực tiếp từ ảnh, tính theo % khung 16:9)
    const sp = (cx, cy, w, hh) => [cx - w / 2, cy - hh / 2, w, hh];
    const RX = [18.84, 22.03, 25.17, 28.39, 31.6, 34.77, 38.04], DX = [17.64, 21.29, 24.91, 28.52, 32.2, 35.83, 39.3], BX = [84.0, 87.0, 89.7, 92.3, 94.8, 97.7];
    sets[0].forEach((k, i) => { h += ov(sp(RX[i], 87.35, 2.34, 4.2), 'dsk', icon(k, '80%'), .92); });
    sets[1].forEach((k, i) => { h += ov(sp(DX[i], 94.4, 3.2, 5.6), i < 5 ? 'dmd' : 'dsk', icon(k, i < 5 ? '68%' : '70%'), i < 5 ? .8 : .86); });
    sets[2].forEach((k, i) => { h += ov(sp(BX[i], 93.5, 2.5, 4.4), 'rct', icon(k, '82%'), .9); });
    if (full) ['gear', 'paw', 'trophy', 'craft'].forEach((k, i) => { const r = L.sbtn_hit[i]; h += ov([r[0] + .15, r[1] + .1, 1.5, r[3] - .2], 'rct', icon(k, '86%'), 1); });
    if (full) h += ov(L.coin.map((v, i) => i === 0 ? v - 1.9 : i === 2 ? 1.6 : v), 'rct', icon('gold', '90%'), 1);
    return h;
  };
  const dock = () => {
    const R = [['Hằng ngày', 'tab', 'map'], ['Nhiệm vụ', 'tab', 'quest'], ['Thành tựu', 'modal', 'ach'], ['Thẻ bài', 'tab', 'card'], ['Chế tạo', 'modal', 'craft'], ['Cài đặt', 'modal', 'set'], ['Bản đồ', 'tab', 'map']];
    const Dm = [['Kỹ năng', 'tab', 'skill'], ['Thú', 'modal', 'pets'], ['Ngoại hình', 'modal', 'pets'], ['Tầm nhìn', 'zoom', ''], ['Lọc/xếp', 'modal', 'filter'], ['Auto', 'auto', ''], ['Lưu', 'save', '']];
    const B = [['Bán nhanh', 'quick', 'sell'], ['Phân giải', 'quick', 'salv'], ['Khóa hiếm', 'lockrare', ''], ['Xếp hiếm', 'sortnow', 'rarity'], ['Bỏ lọc', 'clearf', ''], ['Túi', 'modal', 'filter']];
    let h = '';
    const mk = (arr, rects, off) => arr.forEach((x, i) => { const r = rects[i]; h += `<div class="a hit" title="${x[0]}" data-a="${x[1]}" data-m="${x[2]}" data-t="${x[2]}" data-mode="${x[2]}" style="${P(r)}"></div><div class="a cap c" style="left:${r[0] - 1.2}%;width:${r[2] + 2.4}%;top:${r[1] + r[3] + off}%;height:2%">${x[0]}</div>`; });
    mk(R, L.round, 0.4); mk(Dm, L.diamond, 0.5); mk(B, L.bags, 0.2);
    return h;
  };

  function pageView(d) {
    const r = L.panel_all; let h = `<div class="a page" style="${P(r)}">`;
    if (ui.tab === 'skill') {
      const sk = SKILLS[cls().skill]; const left = spLeft(G);
      h += `<h3>Kỹ năng chủ động · ${esc(cls().name)}</h3><div class="row"><div class="g"><b>${esc(sk.name)}</b><small>Hệ số ${sk.mult * 100}% · ${sk.type === 'proj' ? 'bắn xa' : 'diện rộng'}${sk.pierce ? ' · xuyên' : ''} · hồi ${(sk.cooldown * (1 - d.cdr / 100)).toFixed(1)}s (phím 1)</small></div></div>`;
      h += `<h3>Kỹ năng bị động · điểm còn lại: ${left}</h3>`;
      for (const [k, [n, ds]] of Object.entries(SK_NODES)) { const v = (G.sk && G.sk[k]) || 0; h += `<div class="row"><div class="g"><b>${n}</b> <span class="dim">${v}/${SK_MAX}</span><small>${ds}</small></div><button class="b" data-a="sk" data-k="${k}" ${left <= 0 || v >= SK_MAX ? 'disabled' : ''}>+</button></div>`; }
      h += `<div class="acts"><button class="b red" data-a="skreset">Đặt lại (${50 * G.level} vàng)</button></div>`;
    } else if (ui.tab === 'card') {
      const cnt = k => G.deck.filter(id => (CARDS[id] && CARDS[id].kind || 'monster') === k).length;
      h += `<h3>Bộ thẻ · Quái ${cnt('monster')}/${DECK_LIMIT.monster} · Kỹ năng ${cnt('skill')}/${DECK_LIMIT.skill} · Di vật ${cnt('relic')}/${DECK_LIMIT.relic}</h3>`;
      const ty = {}; G.deck.forEach(id => { const c = CARDS[id]; if (c && c.type && G.cards.some(x => x.t === id)) ty[c.type] = (ty[c.type] || 0) + 1; });
      h += `<div class="dim" style="margin-bottom:.6em">Cộng hưởng: ${Object.keys(RESONANCE).map(k => `${TYPE_VN[k] || k} ${ty[k] || 0}/2${(ty[k] || 0) >= 2 ? ' ✓' : ''}`).join(' · ')}</div>`;
      const clist = filterCards(G, CARDS, ui.cf), sl = cardSellList(G, CARDS, ui.cf);
      h += `<div class="dim">Bậc</div>${chips([['all', 'Tất cả'], ...RARITY.map((r, i) => [i, r.name])], ui.cf.rar, 'cfr', 'v')}<div class="dim" style="margin-top:.3em">Loại</div>${chips([['all', 'Tất cả'], ['monster', 'Thẻ quái'], ['skill', 'Thẻ kỹ năng'], ['relic', 'Di vật']], ui.cf.kind, 'cfk', 'v')}<div class="dim" style="margin-top:.3em">Cấp độ</div>${chips(Object.entries(CARD_LV).map(([k, v]) => [k, v[0]]), ui.cf.lv, 'cfl', 'v')}
        <div class="acts"><span class="dim">${clist.length} / ${G.cards.length} thẻ</span><button class="b red" data-a="csellmodal" ${sl.length ? '' : 'disabled'}>Bán thẻ theo bộ lọc (${sl.length})</button></div>`;
      h += clist.map(cd => {
        const def = CARDS[cd.t], on = G.deck.includes(cd.t), cap = CARD_CAP[def.rarity], k = cardLvCost(cd), col = rcol(cardRi(def));
        return `<div class="row" style="border-color:${col}"><div class="g"><b style="color:${col}">${esc(def.name)}${cd.evo ? ' ✦' : ''}${cd.locked ? ' 🔒' : ''}</b> <span class="dim">${KIND_VN[def.kind || 'monster']} · Lv.${cd.lv || 1}/${cap} · ${'★'.repeat(cd.star) || 'chưa có sao'}</span><small>${Object.entries(def.bonus).map(([a, v]) => `+${fmt2(v)}% ${BONUS_LABEL[a] || a}`).join(', ')}${def.note ? esc(def.note) : ''}</small></div>
        <button class="b" data-a="deck" data-id="${esc(cd.t)}">${on ? 'Gỡ' : 'Trang bị'}</button><button class="b" data-a="clv" data-id="${esc(cd.t)}">Lên cấp ${fmt2(k.gold)}g+${k.stone}đá</button>${cd.evo ? '' : `<button class="b" data-a="cevo" data-id="${esc(cd.t)}">Tiến hóa</button>`}<button class="b" data-a="cardlock" data-id="${esc(cd.t)}">${cd.locked ? 'Mở khóa' : 'Khóa'}</button><button class="b red" data-a="cardsell" data-id="${esc(cd.t)}">Bán ${fmt2(cardValue(cd, def))}g</button></div>`;
      }).join('') || '<div class="dim">Không có thẻ nào khớp bộ lọc. Hạ quái và boss để nhận thẻ.</div>';
    } else if (ui.tab === 'quest') {
      h += `<h3>Nhiệm vụ</h3>` + QUESTS.map(q => {
        const done = questDone(q.id), ready = !q.after || questDone(q.after), p = (G.q[q.id] && G.q[q.id].p) || 0, pct = done ? 100 : Math.min(100, p / q.n * 100);
        return `<div class="row" style="opacity:${ready || done ? 1 : .45}"><div class="g"><b>${done ? '✅ ' : ''}${esc(q.name)}</b> <span class="dim">${done ? 'Hoàn thành' : ready ? `${p}/${q.n}` : 'Chưa mở'}</span><small>Hạ ${esc(MONSTERS[q.target].name)} ×${q.n} · Thưởng ${fmtNum(q.reward.exp)} EXP, ${fmtNum(q.reward.gold)} vàng${q.unlock ? ' · Mở ' + AREAS[q.unlock].name : ''}</small><div class="bar" style="height:.55em;margin-top:.3em"><i style="width:${pct}%"></i></div></div></div>`;
      }).join('') + '<h3>Thành tựu</h3>' + achHtml();
    } else if (ui.tab === 'map') {
      h += `<h3>Bản đồ & chế độ chơi</h3>` + AREA_ORDER.map(id => {
        const a = AREAS[id], ok = unlocked(id), cur = G.area === id, key = a.mode ? (a.mode === 'tower' ? 'best' : 'rec_' + a.mode) : null;
        const need = a.need ? QUESTS.find(q => q.id === a.need).name : '';
        return `<div class="row" style="opacity:${ok ? 1 : .5}"><div class="g"><b>${cur ? '📍 ' : ''}${esc(a.name)}</b><small>${a.mode ? 'Chế độ thử thách' : 'Khu vực'}${key && G.st[key] ? ` · Kỷ lục: ${G.st[key]}` : ''}${ok ? '' : ` · Khóa: hoàn thành "${esc(need)}"`}</small></div><button class="b" data-a="travel" data-id="${id}" ${!ok || cur ? 'disabled' : ''}>${cur ? 'Đang ở đây' : 'Dịch chuyển'}</button></div>`;
      }).join('');
    }
    return h + '</div>';
  }
  const achHtml = () => ACHS.map(a => `<div class="row"><div class="g">${G.ach[a.id] ? '✅' : '⬜'} <b>${esc(a.name)}</b><small>${esc(a.desc)} · +${fmtNum(a.gold)} vàng</small></div></div>`).join('');

  function modalHtml() {
    const m = ui.modal, d = derive(cls(), G, CFG); let h = '';
    if (ui.sel && ui.sel.t === 'item') { const f = findItem(ui.sel.id); if (f) h = itemModal(f); else ui.sel = null; }
    if (!h && m === 'set') h = settingsModal();
    else if (!h && m === 'pets') h = petsModal();
    else if (!h && m === 'craft') h = `<h3>Chế tạo · Đá nâng cấp: ${G.mat.stone}</h3><div class="dim">Phân giải trang bị trong túi để lấy đá. Chi phí chế tạo luôn cao hơn đá thu về.</div>` + RECIPES.map((r, k) => `<div class="row"><div class="g"><b>${r.name}</b><small>${r.stone} đá + ${fmtNum(r.gold)} vàng</small></div><button class="b" data-a="craft" data-k="${k}" ${G.mat.stone < r.stone || G.gold < r.gold ? 'disabled' : ''}>Chế tạo</button></div>`).join('');
    else if (!h && m === 'ach') h = '<h3>Thành tựu</h3>' + achHtml();
    else if (!h && m === 'filter') h = filterModal();
    else if (!h && m === 'auto') h = autoModal();
    else if (!h && m === 'csell') h = cardSellModal();
    else if (!h && m === 'quick') h = quickModal();
    return h ? `<div class="a veil" data-a="veil"><div class="modal${m === 'quick' || m === 'filter' ? '' : ''}" data-keep>${h}<div class="acts"><button class="b" data-a="closemodal">Đóng</button></div></div></div>` : '';
  }
  const FLATT = new Set(['atk', 'hp', 'def']);
  const lineTxt = l => `${FLATT.has(l.type) ? '+' + Math.round(l.v) : '+' + fmt2(l.v) + '%'} ${BONUS_LABEL[l.type] || l.type}${l.type.endsWith('_pct') ? ' (%)' : ''}`;
  function itemModal({ it, where }) {
    const col = glowColor(it), eq = where !== 'inv', set = it.set && SETS[it.set], cid = G.classId || CFG.classId;
    const cur = !eq && (it.slot === 'ring' ? G.eq.ring1 || G.eq.ring2 : G.eq[it.slot]);
    const L2 = itemLines(it), main = L2[0], info = enhanceInfo(it), cfx = CLASS_FX[it.cls || cid] || CLASS_FX.knight;
    let cmp = ''; if (cur && cur.main.type === it.main.type) { const df = Math.round(main.v - itemLines(cur)[0].v); cmp = `<div class="dim">So với đang mặc: <b style="color:${df >= 0 ? '#6bff8a' : '#ff7b7b'}">${df >= 0 ? '+' : ''}${df} ${LABEL[it.main.type]}</b></div>`; }
    const cnt = set ? Object.values(G.eq).filter(x => x && x.set === it.set).length : 0;
    const row = l => `<div>${statIcon(l.type, '1.15em')} ${esc(lineTxt(l))} <span class="dim">· ${l.tag}</span></div>`;
    const groups = {}; L2.filter(l => /^(pas_|ms|brk)/.test(l.id)).forEach(l => { (groups[l.tag] = groups[l.tag] || []).push(lineTxt(l)); });
    const extra = Object.entries(groups).map(([t, a]) => `<div style="color:${t === 'Nội tại' ? '#c9a8ff' : t.startsWith('Đột') ? '#ffd34d' : '#ffb070'}">${t === 'Nội tại' ? icon('awaken', '1.1em') + ' ' + esc(cfx.passive[0]) : t}: <span class="dim">${esc(a.join(', '))}</span></div>`).join('');
    const sub = (txt, on) => `<small>${txt}</small>`;
    const fbtn = (m, t) => `<div class="fb${t.off ? ' off' : ''}" data-a="forge" data-m="${m}" data-id="${it.id}" style="--fc:${MODES[m].color}">${icon(MODES[m].icon, '2.2em')}${MODES[m].name}<small>${t.s}</small></div>`;
    return `<div style="display:flex;gap:1em"><div class="bigic" style="--c:${col}">${iconHtml(it)}</div><div class="lines" style="min-width:15em"><b style="color:${col};font-size:1.15em">${esc(itemName(it, cid))}${it.enh ? ' +' + it.enh : ''}${trTier(it) ? ' ' + '★'.repeat(trTier(it)) : ''}</b><div class="dim">Lv.${it.lv} · ${RARITY[it.ri].name} · ${SLOT_NAME[it.slot]}${eq ? ' · Đang mặc' : ''}</div>
      <div style="margin-top:.5em"><b style="color:#ffd98a">${statIcon(main.type, '1.15em')} ${esc(lineTxt(main))}</b></div>${L2.filter(l => l.id[0] === 'a' && /^a\d+$/.test(l.id)).map(row).join('') || '<div class="dim">Không có dòng phụ</div>'}${it.awaken ? `<div style="color:#ffd34d">✦ ${esc(fmtAw(it.awaken))}</div>` : ''}${extra}
      ${set ? `<div style="margin-top:.4em;color:#9fe3ff">Bộ ${esc(set.name)} (${cnt}/6): ${Object.entries(set.bonus).map(([n, b2]) => `${n} món${cnt >= +n ? ' ✓' : ''}: ${Object.entries(b2).map(([k, v]) => k === 'dragon_fire' ? 'Hỏa Long' : `+${v}% ${(BONUS_LABEL[k] || k)}`).join(', ')}`).join(' · ')}</div>` : ''}${cmp}
      <div class="dim" style="margin-top:.4em">Giá bán ${fmtNum(sellValue(it))} vàng · Phân giải +${salvageGain(it)} đá</div></div></div>
      <div class="forgebtns">${fbtn('enhance', { s: info ? `+${it.enh || 0} → +${(it.enh || 0) + 1}` : 'Tối đa' })}${fbtn('reroll', { s: `${it.affixes.length} dòng`, off: !it.affixes.length })}${fbtn('awaken', { s: `Cấp ${awkLv(it)}/3` })}${fbtn('transcend', { s: `Bậc ${trTier(it)}/3` })}</div>
      <div class="acts">${eq ? `<button class="b" data-a="unequip" data-slot="${where}">Tháo</button>` : `<button class="b" data-a="equip" data-id="${it.id}">Mặc</button>`}<button class="b" data-a="lock" data-id="${it.id}">${icon('lock', '1.1em')} ${it.locked ? 'Mở khóa' : 'Khóa'}</button>
      ${eq ? '' : `<button class="b red" data-a="sell" data-id="${it.id}">${icon('sell', '1.1em')} Bán</button><button class="b" data-a="salv" data-id="${it.id}">${icon('salvage', '1.1em')} Phân giải</button>`}</div>`;
  }
  const chips = (arr, cur, a, key) => arr.map(([v, n]) => `<span class="chip${cur === v ? ' on' : ''}" data-a="${a}" data-${key}="${v}">${n}</span>`).join('');
  const filterModal = () => `<h3>Lọc & sắp xếp túi</h3><div class="dim">Cấp bậc</div>${chips([['all', 'Tất cả'], ...RARITY.map((r, i) => [i, r.name])], ui.rarity, 'rar', 'v')}<div class="dim" style="margin-top:.6em">Loại trang bị</div>${chips(KIND_GROUPS.map(g => [g.id, g.name]), ui.group, 'grp', 'g')}<div class="dim" style="margin-top:.6em">Sắp xếp lại túi (lưu vĩnh viễn)</div>${chips(Object.entries(SORTS).map(([k, v]) => [k, v[0]]), '', 'sortnow', 'mode')}`;
  function quickModal() {
    const kinds = ui.q.kinds, lst = quickList(G.inv, { maxRi: ui.q.maxRi, kinds: kinds.size ? kinds : null }), t = quickTotals(lst);
    return `<h3>${ui.q.mode === 'sell' ? 'Bán nhanh' : 'Phân giải nhanh'}</h3><div class="dim">Đến độ hiếm</div>${chips(RARITY.slice(0, 6).map((r, i) => [i, r.name]), ui.q.maxRi, 'qri', 'v')}<div class="dim" style="margin-top:.6em">Loại (bỏ trống = tất cả)</div>${[['weapon', 'Vũ khí'], ['helmet', 'Mũ'], ['armor', 'Giáp'], ['gloves', 'Găng'], ['boots', 'Giày'], ['necklace', 'Dây chuyền'], ['ring', 'Nhẫn'], ['cloak', 'Áo choàng'], ['accessory', 'Phụ kiện']].map(([k, n]) => `<span class="chip${kinds.has(k) ? ' on' : ''}" data-a="qkind" data-k="${k}">${n}</span>`).join('')}
      <div style="margin-top:.8em">Sẽ ${ui.q.mode === 'sell' ? 'bán' : 'phân giải'} <b>${t.n}</b> món (không động tới đồ đã khóa) → <b style="color:#ffd98a">${ui.q.mode === 'sell' ? fmtNum(t.gold) + ' vàng' : t.stone + ' đá'}</b></div><div class="acts"><button class="b red" data-a="qgo" ${t.n ? '' : 'disabled'}>Xác nhận</button><button class="b" data-a="qmode">Chuyển sang ${ui.q.mode === 'sell' ? 'phân giải' : 'bán'}</button></div>`;
  }
  const settingsModal = () => `<h3>Cài đặt</h3><div class="acts"><button class="b" data-a="modal" data-m="auto">Cài đặt Auto…</button>${[['sfx', 'Âm thanh'], ['music', 'Nhạc'], ['lowfx', 'Giảm hiệu ứng'], ['minimap', 'Bản đồ nhỏ']].map(([k, n]) => `<button class="b" data-a="set" data-k="${k}">${n}: ${G.set[k] ? 'Bật' : 'Tắt'}</button>`).join('')}<button class="b" data-a="set" data-k="vol">Âm lượng: ${Math.round(G.set.vol * 100)}%</button></div>
    <h3 style="margin-top:1em">Tầm nhìn</h3><div class="acts">${[['near', 'Gần'], ['wide', 'Rộng'], ['ultra', 'Siêu rộng']].map(([k, n]) => `<button class="b${G.set.zoom === k ? '' : ''}" style="${G.set.zoom === k ? 'background:#8a5a1a' : ''}" data-a="zoomset" data-k="${k}">${n}</button>`).join('')}</div>
    <h3 style="margin-top:1em">Sao lưu</h3><div class="acts"><button class="b" data-a="exp">Xuất backup</button><button class="b" data-a="imp">Nhập backup</button></div>`;
  const petsModal = () => `<h3>Thú đồng hành</h3>` + Object.entries(PETS).map(([k, p]) => { const ok = questDone(p.unlock), lv = (G.petLv && G.petLv[k]) || 1; return `<div class="row"><div class="g"><b>${p.name}</b> <span class="dim">Cấp ${lv}/10</span><small>${p.desc}${ok ? '' : ' · Khóa: hoàn thành nhiệm vụ ' + p.unlock}</small></div>${ok ? `<button class="b" data-a="pet" data-k="${k}">${G.pet === k ? 'Cất đi' : 'Mang theo'}</button><button class="b" data-a="plv" data-k="${k}">Nâng ${200 * lv}g</button>` : ''}</div>`; }).join('') +
    `<h3 style="margin-top:1em">Ngoại hình (chỉ thay hình ảnh)</h3><div class="acts">${LOOK_NAMES.map((n, i) => G.level >= LOOK_LV[i] ? `<button class="b" style="${lookStage(G) === i ? 'background:#8a5a1a' : ''}" data-a="look" data-k="${i}">${n}</button>` : `<span class="dim">${n}: Lv.${LOOK_LV[i]}</span>`).join('')}</div>`;

  // ---------- Chỉ số: định dạng số gọn (tối đa 2 chữ số thập phân, dấu phẩy) ----------
  const statRows = (d, s, c) => [['Sinh Lực', `${fmt2(Math.ceil(s.hp))} / ${fmt2(d.maxHp)}`], ['Hút Máu', `${fmt2(d.lifesteal)}%`], ['Hồi Máu / Hạ Quái', `${fmt2(d.heal_kill)}%`],
    ['Tấn Công', fmt2(d.matk)], ['Phòng Thủ', fmt2(d.def)], ['Sát Thương Boss', `+${fmt2(d.boss_dmg)}%`], ['Né Tránh', `${fmt2(d.dodge)}%`], ['Chí Mạng', `${fmt2(d.crit)}%`], ['Sát Thương Chí Mạng', `${fmt2(d.critDmg * 100)}%`],
    ['Sát Thương Kỹ Năng', `+${fmt2(d.skillDmg)}%`], ['Tốc Độ Di Chuyển', fmt2(d.speed)],
    ['Giảm Hồi Chiêu', `${fmt2(d.cdr)}%`], ['Thưởng EXP', `+${fmt2(d.exp_bonus)}%`], ['Thưởng Vàng', `+${fmt2(d.gold_bonus)}%`], ['May Mắn', `+${fmt2(d.luck)}%`], ['Hỏa Long (bộ 6)', d.dragonFire ? 'Bật' : '—']];
  const wideStats = (d, s, c) => { // bảng mở rộng: dùng toàn bộ khu giữa, 3 cột, viền nhỏ gọn
    const cid = G.classId || CFG.classId, pct = Math.min(100, G.exp / expNeed(G.level) * 100), cnt = {};
    Object.values(G.eq).forEach(it => { if (it && it.set) cnt[it.set] = (cnt[it.set] || 0) + 1; });
    const grp = (t, arr) => `<div class="g3"><h4>${t}</h4>${arr.map(([a, b]) => `<div class="kv"><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;
    return `<div class="a page wide" style="${P(L.panel_all)}"><div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">Bảng chỉ số · Lv. ${G.level} · ${esc(c.name)}</h3><button class="b" data-a="wide">Thu gọn ⇐</button></div><div class="grid3">
      ${grp('Cơ bản', [['Cấp', G.level], ['EXP', `${fmt2(G.exp)} / ${fmt2(expNeed(G.level))} (${fmt2(pct)}%)`], ['Sinh lực', `${fmt2(Math.ceil(s.hp))} / ${fmt2(d.maxHp)}`], ['Tấn công', fmt2(d.matk)], ['Phòng thủ', fmt2(d.def)], ['Tốc độ di chuyển', fmt2(d.speed)], ['Tầm đánh', fmt2(c.range)]])}
      ${grp('Chiến đấu', [['Chí mạng', `${fmt2(d.crit)}%`], ['ST chí mạng', `${fmt2(d.critDmg * 100)}%`], ['Né tránh', `${fmt2(d.dodge)}%`], ['Hút máu', `${fmt2(d.lifesteal)}%`], ['Hồi máu/hạ quái', `${fmt2(d.heal_kill)}%`], ['ST Boss', `+${fmt2(d.boss_dmg)}%`], ['ST kỹ năng', `+${fmt2(d.skillDmg)}%`], ['Giảm hồi chiêu', `${fmt2(d.cdr)}%`]])}
      ${grp('Thưởng & tài nguyên', [['May mắn', `+${fmt2(d.luck)}%`], ['Thưởng EXP', `+${fmt2(d.exp_bonus)}%`], ['Thưởng vàng', `+${fmt2(d.gold_bonus)}%`], ['Vàng', fmt2(G.gold)], ['Đá nâng cấp', fmt2(G.mat.stone)], ['Túi đồ', `${G.inv.length} / ${G.cap}`]])}
      ${grp('Tiến trình', [['Điểm kỹ năng còn', spLeft(G)], ['Quái đã hạ', fmt2(G.st.kills)], ['Boss đã hạ', fmt2(G.st.boss)], ['Kỷ lục Tháp', fmt2(G.st.best || 0)], ['Kỷ lục Sinh tồn', fmt2(G.st.surv || 0)], ['Kỷ lục Thử thách Boss', fmt2(G.st.rec_bossrush || 0)], ['Kỷ lục Khe nứt', fmt2(G.st.rec_rift || 0)]])}
      ${grp('Bộ trang bị, thẻ, thú', [...Object.keys(cnt).map(k => [esc(SETS[k].name), `${cnt[k]}/6`]), ['Hỏa Long (bộ 6)', d.dragonFire ? 'Bật' : '—'], ['Thẻ đang dùng', `${G.deck.length}/14`], ['Thú', PETS[G.pet] ? PETS[G.pet].name : '—'], ['Ngoại hình', LOOK_NAMES[lookStage(G)]]])}
      ${grp('Trang bị đang mặc', Object.keys(L.eslots).map(sl => [SLOT_NAME[sl], G.eq[sl] ? esc(itemName(G.eq[sl], cid)) + (G.eq[sl].enh ? ' +' + G.eq[sl].enh : '') : '—']))}
    </div></div>`;
  };

  // ---------- Cài đặt Auto ----------
  const AU = (f, arr) => arr.map(([v, n]) => `<span class="chip${G.set.auto[f] === v ? ' on' : ''}" data-a="au" data-f="${f}" data-v="${v}">${n}</span>`).join('');
  const AT = (f, arr) => arr.map(([v, n]) => `<span class="chip${G.set.auto[f].includes(v) ? ' on' : ''}" data-a="aut" data-f="${f}" data-v="${v}">${n}</span>`).join('');
  const autoModal = () => { const a = G.set.auto, rarList = RARITY.map((r, i) => [i, r.name]); return `<h3>Cài đặt Auto</h3>
    <div class="dim">Phạm vi tìm quái</div>${AU('range', [['near', 'Gần'], ['far', 'Xa'], ['map', 'Toàn bản đồ']])}
    <div class="dim" style="margin-top:.5em">Chế độ di chuyển</div>${AU('mode', [['around', 'Auto quanh vị trí'], ['free', 'Auto tự do']])}
    <div class="dim" style="margin-top:.5em">Nhặt đồ</div>${AU('pickWhen', [['now', 'Nhặt ngay'], ['after', 'Nhặt sau khi hết quái']])}
    <div class="dim" style="margin-top:.5em">Bộ lọc vật phẩm nhặt</div>${AU('pickMode', [['all', 'Tất cả'], ['kinds', 'Theo loại'], ['rarity', 'Theo phẩm chất'], ['both', 'Cả hai']])}
    ${a.pickMode === 'kinds' || a.pickMode === 'both' ? `<div class="dim">Loại cần nhặt</div>${AT('pickKinds', KIND_CHIPS)}` : ''}${a.pickMode === 'rarity' || a.pickMode === 'both' ? `<div class="dim">Phẩm chất cần nhặt</div>${AT('pickRar', rarList)}` : ''}
    <div class="dim" style="margin-top:.5em">Tự động bán đồ đã nhặt</div><span class="chip${a.sell ? ' on' : ''}" data-a="autog" data-f="sell">${a.sell ? 'Đang bật' : 'Đang tắt'}</span>
    ${a.sell ? `<div class="dim">Loại tự bán (loại khác được giữ lại)</div>${AT('sellKinds', KIND_CHIPS.filter(x => x[0] !== 'card'))}<div class="dim">Tự bán đến phẩm chất (cao hơn thì giữ)</div>${AU('sellMaxRi', rarList.slice(0, 6))}` : ''}
    <div class="dim" style="margin-top:.5em">Tự động trang bị khi tốt hơn (so sánh tổng thể chỉ số)</div><span class="chip${a.equip ? ' on' : ''}" data-a="autog" data-f="equip">${a.equip ? 'Đang bật' : 'Đang tắt'}</span>
    <div class="dim" style="margin-top:.7em">Tự bán và tự trang bị chỉ hoạt động khi Auto đang bật. Giữ nút Auto hoặc nhấn R để mở bảng này.</div>`; };
  const cardSellModal = () => { const lst = cardSellList(G, CARDS, ui.cf), total = lst.reduce((a, cd) => a + cardValue(cd, CARDS[cd.t]), 0);
    return `<h3>Bán thẻ theo bộ lọc</h3><div>Sẽ bán <b>${lst.length}</b> thẻ → <b style="color:#ffd98a">${fmt2(total)} vàng</b></div><div class="dim" style="margin:.4em 0">Không bán thẻ đang trang bị, đã khóa hoặc đã tiến hóa.</div>${lst.slice(0, 14).map(cd => `<div class="row"><div class="g"><b style="color:${rcol(cardRi(CARDS[cd.t]))}">${esc(CARDS[cd.t].name)}</b> <span class="dim">Lv.${cd.lv || 1} · ${'★'.repeat(cd.star) || '—'}</span></div><span>${fmt2(cardValue(cd, CARDS[cd.t]))}g</span></div>`).join('')}${lst.length > 14 ? `<div class="dim">… và ${lst.length - 14} thẻ khác</div>` : ''}<div class="acts"><button class="b red" data-a="csellgo" ${lst.length ? '' : 'disabled'}>Xác nhận bán</button></div>`; };

  function render() {
    if (!root.classList.contains('open')) return;
    const d = derive(cls(), G, CFG);
    let h = `<div class="a c ttl" style="${P(L.title)}">ETERNAL PIXEL · ${TABS.find(t => t[0] === ui.tab)[1]}</div><div class="a hit" title="Đóng (Esc)" data-a="close" style="${P(L.close)}"></div>`;
    TABS.forEach(([id, n], i) => { h += `<div class="a c tab${ui.tab === id ? ' on' : ''}" data-a="tab" data-t="${id}" style="${P(L.tabs[i])}">${n}</div>`; });
    h += ui.tab === 'equip' ? equipView(d) : pageView(d);
    h += dock() + overlays() + modalHtml();
    board.innerHTML = h;
  }

  // ---------- thao tác ----------
  const ask = t => window.confirm(t);
  function act(a, d, ev) {
    const item = d.id && findItem(d.id), it = item && item.it;
    switch (a) {
      case 'wide': ui.wide = !ui.wide; return render();
      case 'cfr': ui.cf.rar = d.v === 'all' ? 'all' : +d.v; return render();
      case 'cfk': ui.cf.kind = d.v; return render();
      case 'cfl': ui.cf.lv = d.v; return render();
      case 'au': G.set.auto[d.f] = ['sellMaxRi'].includes(d.f) ? +d.v : d.v; return commit();
      case 'aut': { const arr = G.set.auto[d.f], v = ['pickRar'].includes(d.f) ? +d.v : d.v, i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); return commit(); }
      case 'autog': G.set.auto[d.f] = !G.set.auto[d.f]; return commit();
      case 'cardlock': { const c = G.cards.find(x => x.t === d.id); if (c) c.locked = !c.locked; return commit(); }
      case 'cardsell': { const c = G.cards.find(x => x.t === d.id); if (!c) return; if (c.locked) return alert('Thẻ đang bị khóa.'); if (G.deck.includes(c.t)) return alert('Thẻ đang được trang bị. Hãy gỡ thẻ trước khi bán.');
        const def = CARDS[c.t], v = cardValue(c, def); if (!ask(`Bán ${def.name} (Lv.${c.lv || 1}, ${c.star}★) với giá ${fmt2(v)} vàng? Thẻ sẽ biến mất khỏi bộ sưu tập.`)) return; if (c.evo && !ask('Thẻ đã TIẾN HÓA – xác nhận lần hai?')) return;
        G.gold += v; G.cards = G.cards.filter(x => x !== c); return commit(); }
      case 'csellmodal': ui.modal = 'csell'; ui.sel = null; return render();
      case 'csellgo': { const lst = cardSellList(G, CARDS, ui.cf); if (!lst.length) return; const total = lst.reduce((a, cd) => a + cardValue(cd, CARDS[cd.t]), 0);
        if (!ask(`Bán ${lst.length} thẻ → ${fmt2(total)} vàng?`)) return; if (lst.some(cd => cardRi(CARDS[cd.t]) >= 4) && !ask('Có thẻ Huyền thoại trở lên – xác nhận lần hai?')) return;
        const set = new Set(lst); G.gold += total; G.cards = G.cards.filter(cd => !set.has(cd)); ui.modal = null; return commit(); }
      case 'close': return close();
      case 'tab': if (d.t === 'equip' || d.t) { ui.tab = d.t; ui.sel = null; ui.modal = null; } return render();
      case 'grp': ui.group = d.g; ui.page = 0; return render();
      case 'rar': ui.rarity = d.v === 'all' ? 'all' : +d.v; ui.page = 0; return render();
      case 'pg': ui.page = Math.max(0, Math.min(pages() - 1, ui.page + +d.d)); return render();
      case 'rail': { const r = d.el.getBoundingClientRect(); ui.page = Math.max(0, Math.min(pages() - 1, Math.round((ev.clientY - r.top) / r.height * (pages() - 1)))); return render(); }
      case 'sel': ui.sel = { t: 'item', id: d.id }; ui.modal = null; return render();
      case 'selcard': ui.tab = 'card'; return render();
      case 'modal': ui.modal = d.m; ui.sel = null; return render();
      case 'veil': case 'closemodal': ui.modal = null; ui.sel = null; if (ui.direct) { ui.direct = false; return close(); } return render(); // mở từ phím tắt thì đóng luôn bảng
      case 'equip': if (it) { equip(G, it); ui.sel = null; } return commit();
      case 'unequip': unequip(G, d.slot); ui.sel = null; return commit();
      case 'lock': if (it) it.locked = !it.locked; return commit();
      case 'sell': if (!it) return; if (it.locked) return alert('Vật phẩm đang bị khóa.');
        if (it.ri >= 4 && !ask(`Bán ${itemName(it, G.classId || CFG.classId)}? Đây là vật phẩm hiếm.`)) return; if (it.ri === 6 && !ask('Vật phẩm ANCIENT – xác nhận lần hai để bán?')) return;
        G.gold += sellValue(it); G.inv = G.inv.filter(x => x.id !== it.id); ui.sel = null; return commit();
      case 'salv': if (!it) return; if (it.locked) return alert('Vật phẩm đang bị khóa.');
        if (it.ri >= 4 && !ask(`Phân giải ${itemName(it, G.classId || CFG.classId)}?`)) return; if (it.ri === 6 && !ask('Vật phẩm ANCIENT – xác nhận lần hai để phân giải?')) return;
        G.mat.stone += salvageGain(it); G.inv = G.inv.filter(x => x.id !== it.id); ui.sel = null; return commit();
      case 'forge': if (it) forge.open(it.id, d.m); return;
      case 'sk': { G.sk = G.sk || {}; if (spLeft(G) <= 0 || (G.sk[d.k] || 0) >= SK_MAX) return; G.sk[d.k] = (G.sk[d.k] || 0) + 1; return commit(); }
      case 'skreset': { const c = 50 * G.level; if (!Object.keys(G.sk || {}).length) return; if (G.gold < c) return alert(`Không đủ vàng (cần ${c}).`); if (!ask(`Đặt lại toàn bộ điểm kỹ năng? Chi phí ${c} vàng.`)) return; G.gold -= c; G.sk = {}; return commit(); }
      case 'deck': { const t = d.id, i = G.deck.indexOf(t), kd = CARDS[t].kind || 'monster', used = G.deck.filter(x => CARDS[x] && (CARDS[x].kind || 'monster') === kd).length;
        if (i >= 0) G.deck.splice(i, 1); else if (used < DECK_LIMIT[kd]) G.deck.push(t); else return alert(`Ô thẻ ${KIND_VN[kd]} đã đầy (${DECK_LIMIT[kd]}).`); return commit(); }
      case 'clv': case 'cevo': { const c = G.cards.find(x => x.t === d.id); if (!c) return; const df = CARDS[c.t], cap = CARD_CAP[df.rarity];
        if (a === 'clv') { if ((c.lv || 1) >= cap) return alert('Thẻ đã đạt cấp tối đa.'); const k = cardLvCost(c); if (G.gold < k.gold || G.mat.stone < k.stone) return alert('Không đủ vàng hoặc đá.'); G.gold -= k.gold; G.mat.stone -= k.stone; c.lv = (c.lv || 1) + 1; }
        else { if (c.evo) return; if ((c.lv || 1) < cap || c.star < EVO.star) return alert(`Cần thẻ đạt cấp tối đa (${cap}) và ít nhất ${EVO.star} sao.`); if (G.gold < EVO.gold || G.mat.stone < EVO.stone) return alert('Không đủ vàng hoặc đá.');
          if (!ask(`Tiến hóa ${df.name}? Chi phí ${EVO.gold} vàng + ${EVO.stone} đá. Sức mạnh thẻ ×1,5.`)) return; G.gold -= EVO.gold; G.mat.stone -= EVO.stone; c.evo = true; } return commit(); }
      case 'pet': G.pet = G.pet === d.k ? null : d.k; return commit();
      case 'plv': { G.petLv = G.petLv || {}; const lv = G.petLv[d.k] || 1; if (lv >= 10) return alert('Thú đã đạt cấp tối đa.'); const c = 200 * lv; if (G.gold < c) return alert(`Không đủ vàng (cần ${c}).`); G.gold -= c; G.petLv[d.k] = lv + 1; return commit(); }
      case 'look': G.look = +d.k; return commit();
      case 'set': if (d.k === 'vol') G.set.vol = G.set.vol >= 1 ? 0.25 : +(G.set.vol + 0.25).toFixed(2); else G.set[d.k] = !G.set[d.k]; return commit();
      case 'zoomset': G.set.zoom = d.k; return commit();
      case 'zoom': G.set.zoom = { near: 'wide', wide: 'ultra', ultra: 'near' }[G.set.zoom || 'near']; hooks.msg && hooks.msg('Tầm nhìn: ' + { near: 'Gần', wide: 'Rộng', ultra: 'Siêu rộng' }[G.set.zoom]); return commit();
      case 'auto': hooks.toggleAuto && hooks.toggleAuto(); return close();
      case 'save': hooks.onChange && hooks.onChange(); hooks.msg && hooks.msg('Đã lưu tiến trình'); return;
      case 'craft': { const r = RECIPES[+d.k]; if (G.gold < r.gold || G.mat.stone < r.stone) return alert('Không đủ đá hoặc vàng.'); if (G.inv.length >= G.cap) return alert('Túi đồ đã đầy.');
        if (!ask(`Chế tạo ${r.name}? Chi phí ${r.stone} đá + ${r.gold} vàng.`)) return; G.gold -= r.gold; G.mat.stone -= r.stone; G.inv.push(genItem(G.level, r.ri, undefined, undefined, G.classId || CFG.classId)); return commit(); }
      case 'exp': return exportJSON(G);
      case 'imp': { const f = document.createElement('input'); f.type = 'file'; f.accept = '.json'; f.onchange = async () => { try { const dd = await importJSON(f.files[0]); if (!ask('Ghi đè tiến trình hiện tại bằng file backup?')) return; Object.assign(G, dd); commit(); } catch (e) { alert(e.message); } }; return f.click(); }
      case 'travel': if (!ask(`Dịch chuyển tới ${AREAS[d.id].name}?`)) return; return hooks.travel && hooks.travel(d.id);
      case 'sortnow': { const mode = d.mode || d.m; if (!SORTS[mode]) return; sortInv(G.inv, mode); ui.sort = mode; hooks.msg && hooks.msg('Đã sắp xếp túi: ' + SORTS[mode][0]); return commit(); }
      case 'clearf': ui.group = 'all'; ui.rarity = 'all'; ui.page = 0; return render();
      case 'lockrare': { const l = G.inv.filter(x => x.ri >= 4 && !x.locked); l.forEach(x => { x.locked = true; }); hooks.msg && hooks.msg(l.length ? `Đã khóa ${l.length} món hiếm` : 'Không còn đồ hiếm chưa khóa'); return commit(); }
      case 'quick': ui.q.mode = d.mode || d.m; ui.modal = 'quick'; ui.sel = null; return render();
      case 'qri': ui.q.maxRi = +d.v; return render();
      case 'qkind': ui.q.kinds.has(d.k) ? ui.q.kinds.delete(d.k) : ui.q.kinds.add(d.k); return render();
      case 'qmode': ui.q.mode = ui.q.mode === 'sell' ? 'salv' : 'sell'; return render();
      case 'qgo': { const lst = quickList(G.inv, { maxRi: ui.q.maxRi, kinds: ui.q.kinds.size ? ui.q.kinds : null }), t = quickTotals(lst); if (!lst.length) return;
        if (!ask(`${ui.q.mode === 'sell' ? 'Bán' : 'Phân giải'} ${t.n} món → ${ui.q.mode === 'sell' ? t.gold + ' vàng' : t.stone + ' đá'}?`)) return;
        if (lst.some(x => x.ri === 6) && !ask('Có vật phẩm ANCIENT – xác nhận lần hai?')) return;
        if (ui.q.mode === 'sell') G.gold += t.gold; else G.mat.stone += t.stone; applyRemove(G, lst); ui.modal = null; return commit(); }
    }
  }

  board.addEventListener('click', e => {
    if (suppress) return;
    let el = e.target.closest('[data-a]');
    if (!el) return;
    if (el.dataset.a === 'veil' && e.target !== el) return; // chỉ đóng khi bấm nền mờ
    act(el.dataset.a, { ...el.dataset, el }, e);
  });
  board.addEventListener('wheel', e => { if (ui.tab === 'equip' && !ui.modal && !ui.sel) { e.preventDefault(); act('pg', { d: e.deltaY > 0 ? 1 : -1 }); } }, { passive: false });

  // ---------- kéo-thả (chuột và cảm ứng): giữ ~0,25s trên điện thoại để kéo ----------
  let drag = null, ghost = null, suppress = false;
  const zoneAt = (x, y) => { const e = document.elementFromPoint(x, y); return e && e.closest('[data-drop]'); };
  function startDrag(e) {
    if (!drag || drag.started) return; drag.started = true; const f = findItem(drag.id); if (!f) { drag = null; return; }
    ghost = document.createElement('div'); ghost.className = 'ghost'; ghost.innerHTML = iconHtml(f.it).replace('inset:5%', 'inset:0'); ghost.firstChild.style.position = 'absolute'; ghost.firstChild.style.inset = '0';
    root.appendChild(ghost); moveGhost(e);
    board.querySelectorAll('.es').forEach(z => { if (canEquip(f.it, z.dataset.slot)) z.classList.add('ok'); });
  }
  function moveGhost(e) { ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; }
  board.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-drag]'); if (!el || ui.modal || ui.sel) return;
    drag = { id: el.dataset.drag, from: el.dataset.from, x0: e.clientX, y0: e.clientY, started: false, timer: null };
    if (e.pointerType === 'touch') drag.timer = setTimeout(() => startDrag(e), 260);
  });
  window.addEventListener('pointermove', e => {
    if (!drag) return; const dist = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
    if (!drag.started) { if (e.pointerType !== 'touch' && dist > 6) startDrag(e); else if (e.pointerType === 'touch' && dist > 12) { clearTimeout(drag.timer); drag = null; } return; }
    moveGhost(e); e.preventDefault();
  }, { passive: false });
  window.addEventListener('pointerup', e => {
    if (!drag) return; clearTimeout(drag.timer); const dg = drag; drag = null;
    if (!dg.started) return;
    ghost && ghost.remove(); ghost = null; board.querySelectorAll('.es.ok,.es.bad').forEach(z => z.classList.remove('ok', 'bad'));
    suppress = true; setTimeout(() => { suppress = false; }, 50);
    const f = findItem(dg.id), z = zoneAt(e.clientX, e.clientY); if (!f || !z) return render();
    const to = z.dataset.drop; let ok = false;
    if (to.startsWith('eq:')) { const slot = to.slice(3); ok = dg.from === 'inv' ? equipTo(G, f.it, slot) : moveEq(G, dg.from.slice(3), slot); if (!ok) hooks.msg && hooks.msg('Không thể mặc vào ô này'); }
    else if (to === 'inv' && dg.from.startsWith('eq:')) { const before = G.inv.length; unequip(G, dg.from.slice(3)); ok = G.inv.length > before; if (!ok) hooks.msg && hooks.msg('Túi đồ đã đầy'); }
    ok ? commit() : render();
  });
  window.addEventListener('keydown', e => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'i' || e.key === 'I') toggle(); else if (e.key === 'Escape' && root.classList.contains('open')) { if (ui.modal || ui.sel) { ui.modal = null; ui.sel = null; render(); } else close(); }
  });
  const fit = () => root.style.setProperty('--u', Math.max((root.clientWidth || 1000) / 100, 8)); // cỡ chữ tối thiểu ~7px trên điện thoại nhỏ
  window.addEventListener('resize', fit);

  function open(tab, modal) { if (tab) ui.tab = tab; ui.modal = modal || null; ui.direct = !!modal; root.classList.add('open'); fit(); hooks.onOpen && hooks.onOpen(); render(); }
  function close() { root.classList.remove('open'); ui.modal = null; ui.sel = null; hooks.onClose && hooks.onClose(); }
  function toggle() { root.classList.contains('open') ? close() : open(); }
  return { open, close, toggle, refresh: render, isOpen: () => root.classList.contains('open') };
}
