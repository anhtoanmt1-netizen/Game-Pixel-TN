// Logic túi đồ thuần (kiểm thử được trong Node): icon theo loại/độ hiếm, lọc, sắp xếp, bán/phân giải nhanh, mặc đồ kéo-thả.
import { RARITY, STONE, SETS } from './items.js';

// Sprite icon (assets/ui/equip.png, dựng bởi tools/build_equip.py): EQUIP_COLS cột = bậc màu, mỗi hàng = một loại trang bị
import { EQUIP_ROWS, EQUIP_COLS, EQUIP_CELL } from './equipicons.js';
export { EQUIP_COLS, EQUIP_CELL };
const ROW = Object.fromEntries(EQUIP_ROWS.map((k, i) => [k, i]));
// Vũ khí và vật phẩm chuyên dụng của từng lớp (ô Phụ kiện = tay phụ): mỗi lớp có hình riêng, không dùng chung
export const CLASS_GEAR = {
  knight: { weapon: 'sword', accessory: 'shield', helmet: 'helmet' },
  elf:    { weapon: 'bow', accessory: 'quiver', helmet: 'helmet' },
  mage:   { weapon: 'book', accessory: 'orb', helmet: 'hat' },
  rogue:  { weapon: 'blades', accessory: 'mask', helmet: 'helmet' },
};
// 7 độ hiếm của game ↔ 7 cột bậc màu của ảnh (cột 6 = Cổ đại, ánh lửa cam)
export const RCOL = [0, 1, 2, 3, 5, 4, 6];
export function iconKey(it, classId) {
  const g = CLASS_GEAR[it.cls || classId] || CLASS_GEAR.knight;
  if (g[it.slot]) return g[it.slot];
  return it.slot === 'ring' ? 'ring' : it.slot; // armor, gloves, boots, necklace, cloak dùng chung hình
}
export function iconPos(it, classId) {
  const r = ROW[iconKey(it, classId)] ?? 0, c = RCOL[Math.min(it.ri, 6)];
  return { row: r, col: c, fire: false };
}
// Style nền sprite theo %: sheet EQUIP_COLS × hàng
export const iconStyle = (it, classId) => {
  const p = iconPos(it, classId);
  return `background-position:${(p.col / (EQUIP_COLS - 1)) * 100}% ${(p.row / (EQUIP_ROWS.length - 1)) * 100}%;`;
};
// Style nền cho một hình trong sheet theo tên hàng (vd 'ring') và cột bậc màu
export const sheetStyle = (key, col = 5) => `background-position:${(col / (EQUIP_COLS - 1)) * 100}% ${((ROW[key] ?? 0) / (EQUIP_ROWS.length - 1)) * 100}%;`;
export const classGear = (cid, slot) => (CLASS_GEAR[cid] || CLASS_GEAR.knight)[slot];
export const glowColor = it => RARITY[Math.min(it.ri, 6)].color;

// Nhóm loại cho thanh tab túi đồ
export const KIND_GROUPS = [
  { id: 'all', name: 'Tất cả', test: () => true },
  { id: 'weapon', name: 'Vũ khí', test: it => it.slot === 'weapon' },
  { id: 'armor', name: 'Giáp', test: it => ['helmet', 'armor', 'gloves', 'boots', 'cloak'].includes(it.slot) },
  { id: 'neck', name: 'Dây chuyền', test: it => it.slot === 'necklace' },
  { id: 'ring', name: 'Nhẫn', test: it => it.slot === 'ring' },
  { id: 'acc', name: 'Phụ kiện', test: it => it.slot === 'accessory' },
  { id: 'locked', name: 'Đã khóa', test: it => !!it.locked },
];
export function filterInv(inv, f = {}) {
  const g = KIND_GROUPS.find(x => x.id === (f.group || 'all')) || KIND_GROUPS[0];
  const q = (f.text || '').trim().toLowerCase();
  return inv.filter(it => g.test(it) && (f.rarity == null || f.rarity === 'all' || it.ri === f.rarity) && (!q || it.name.toLowerCase().includes(q)));
}
export const itemScore = it => it.main.v * (1 + 0.05 * (it.enh || 0)) + it.affixes.reduce((a, x) => a + x.v * (['atk', 'hp', 'def'].includes(x.type) ? 1 : 6), 0) + (it.awaken ? it.awaken.v * 8 : 0);
export const sellValue = it => Math.round((1 + it.ri) * it.lv * 2) + (it.enh || 0) * it.lv;
export const salvageGain = it => STONE[Math.min(it.ri, 6)] + Math.floor((it.enh || 0) / 2);
export const SORTS = {
  new: ['Mới nhất', null],
  rarity: ['Độ hiếm', (a, b) => b.ri - a.ri || b.lv - a.lv],
  level: ['Cấp trang bị', (a, b) => b.lv - a.lv || b.ri - a.ri],
  type: ['Loại', (a, b) => a.slot.localeCompare(b.slot) || b.ri - a.ri],
  power: ['Sức mạnh', (a, b) => itemScore(b) - itemScore(a)],
  name: ['Tên A-Z', (a, b) => a.name.localeCompare(b.name)],
};
// Sắp xếp tại chỗ (bền vững, lưu cùng tiến trình). 'new' đảo ngược để món mới nhất lên đầu
export function sortInv(inv, mode) {
  if (mode === 'new') inv.reverse(); else if (SORTS[mode] && SORTS[mode][1]) inv.sort(SORTS[mode][1]);
  return inv;
}
// Chọn đồ để bán/phân giải nhanh: không bao giờ động tới đồ đã khóa
export function quickList(inv, { maxRi = 1, kinds = null, maxLv = Infinity } = {}) {
  return inv.filter(it => !it.locked && it.ri <= maxRi && it.lv <= maxLv && (!kinds || kinds.has(it.slot)));
}
export const quickTotals = list => ({ n: list.length, gold: list.reduce((a, it) => a + sellValue(it), 0), stone: list.reduce((a, it) => a + salvageGain(it), 0) });
export function applyRemove(G, list) { const ids = new Set(list.map(i => i.id)); G.inv = G.inv.filter(i => !ids.has(i.id)); }

// Kéo-thả
export const canEquip = (it, slot) => it.slot === 'ring' ? (slot === 'ring1' || slot === 'ring2') : it.slot === slot;
export function equipTo(G, it, slot) { // mặc đúng ô; ô đã có đồ thì hoán đổi về túi
  if (!canEquip(it, slot)) return false;
  const old = G.eq[slot];
  G.inv = G.inv.filter(x => x.id !== it.id);
  if (old) G.inv.push(old);
  G.eq[slot] = it; return true;
}
export function moveEq(G, from, to) { // kéo giữa hai ô trang bị (đổi nhẫn trái/phải)
  const a = G.eq[from]; if (!a || from === to || !canEquip(a, to)) return false;
  const b = G.eq[to]; if (b && !canEquip(b, from)) return false;
  if (b) G.eq[from] = b; else delete G.eq[from];
  G.eq[to] = a; return true;
}

// Tên hiển thị tiếng Việt, khớp với icon (vũ khí theo lớp nhân vật); không phụ thuộc tên cũ đã lưu
const NOUN = {
  weapon: { knight: 'Kiếm', elf: 'Cung', mage: 'Sách Phép', rogue: 'Song Đao' },
  accessory: { knight: 'Khiên', elf: 'Túi Tên', mage: 'Cầu Ánh Sáng', rogue: 'Mặt Nạ Sát Thủ' },
  helmet: { knight: 'Mũ Giáp', elf: 'Mũ Cung Thủ', mage: 'Mũ Phù Thủy', rogue: 'Mũ Sát Thủ' },
  armor: { knight: 'Giáp Trụ', elf: 'Giáp Da', mage: 'Giáp Pháp Sư', rogue: 'Giáp Bóng Đêm' },
  gloves: 'Găng Tay', boots: 'Giày', necklace: 'Dây Chuyền', ring: 'Nhẫn', cloak: 'Áo Choàng',
};
export function itemName(it, classId) {
  let n = NOUN[it.slot] || it.slot; if (typeof n === 'object') n = n[it.cls || it.wt || classId] || n._ || Object.values(n)[0];
  const set = it.set && SETS[it.set];
  return `${n} ${RARITY[Math.min(it.ri, 6)].name}${set ? ' · ' + set.name : ''}`;
}

// ---- Thẻ bài: bộ lọc theo bậc / loại / cấp độ và bán hàng loạt (không bao giờ bán thẻ đang dùng, đã khóa hoặc đã tiến hóa) ----
export const CARD_RV = [10, 25, 60, 150, 400, 1000, 2500];
export const cardRi = def => RARITY.findIndex(r => r.id === def.rarity);
export const cardValue = (cd, def) => Math.round(CARD_RV[cardRi(def)] * (1 + 0.6 * ((cd.lv || 1) - 1)) * (1 + 0.5 * (cd.star || 0)) * (cd.evo ? 3 : 1));
export const CARD_LV = { all: ['Mọi cấp', () => true], a: ['Cấp 1–5', l => l <= 5], b: ['Cấp 6–10', l => l >= 6 && l <= 10], c: ['Cấp 11–20', l => l >= 11 && l <= 20], d: ['Cấp 21+', l => l >= 21] };
export function filterCards(G, CARDS, f = {}) {
  return G.cards.filter(cd => {
    const def = CARDS[cd.t]; if (!def) return false;
    return (f.rar == null || f.rar === 'all' || cardRi(def) === f.rar) && (!f.kind || f.kind === 'all' || (def.kind || 'monster') === f.kind) && (CARD_LV[f.lv || 'all'] || CARD_LV.all)[1](cd.lv || 1);
  });
}
export const cardSellList = (G, CARDS, f) => filterCards(G, CARDS, f).filter(cd => !G.deck.includes(cd.t) && !cd.locked && !cd.evo);
