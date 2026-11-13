// Logic túi đồ thuần (kiểm thử được trong Node): icon theo loại/độ hiếm, lọc, sắp xếp, bán/phân giải nhanh, mặc đồ kéo-thả.
import { RARITY, STONE, SETS } from './items.js';

// Sprite icon: 6 cột = bậc màu của bộ ảnh (xám, lục, lam, tím, đỏ, vàng); 12 hàng = loại trang bị
const ROW = { sword: 0, bow: 1, staff: 2, blades: 3, helmet: 4, boots: 5, ring: 6, cloak: 7, necklace: 8, gloves: 9, hat: 10, book: 11 };
const WEAPON_BY_CLASS = { knight: 'sword', elf: 'bow', mage: 'staff', rogue: 'blades' };
// 7 độ hiếm của game → 6 bậc màu của ảnh. Legendary = vàng (cột 5), Mythic = đỏ (cột 4), Ancient = đỏ + hiệu ứng lửa
export const RCOL = [0, 1, 2, 3, 5, 4, 4];
export function iconKey(it, classId) {
  if (it.slot === 'weapon') return WEAPON_BY_CLASS[it.wt || classId] || 'sword';
  if (it.slot === 'helmet') return (it.wt || classId) === 'mage' ? 'hat' : 'helmet';
  if (it.slot === 'accessory') return 'book';
  if (it.slot === 'armor') return 'cloak'; // bộ icon chưa có giáp ngực: tạm dùng áo choàng
  return it.slot === 'ring' ? 'ring' : it.slot; // boots, gloves, necklace, cloak
}
export function iconPos(it, classId) {
  const r = ROW[iconKey(it, classId)] ?? 0, c = RCOL[Math.min(it.ri, 6)];
  return { row: r, col: c, fire: it.ri === 6 };
}
// Style nền sprite theo %: sheet 6×12 ô
export const iconStyle = (it, classId) => {
  const p = iconPos(it, classId);
  return `background-position:${(p.col / 5) * 100}% ${(p.row / 11) * 100}%;`;
};
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
const NOUN = { weapon: { mage: 'Trượng', knight: 'Kiếm', elf: 'Cung', rogue: 'Song đao' }, helmet: { mage: 'Mũ phù thủy', _: 'Mũ giáp' }, armor: 'Giáp', gloves: 'Găng tay', boots: 'Giày', necklace: 'Dây chuyền', ring: 'Nhẫn', cloak: 'Áo choàng', accessory: 'Sách phép' };
export function itemName(it, classId) {
  let n = NOUN[it.slot] || it.slot; if (typeof n === 'object') n = n[it.wt || classId] || n._ || Object.values(n)[0];
  const set = it.set && SETS[it.set];
  return `${n} ${RARITY[Math.min(it.ri, 6)].name}${set ? ' · ' + set.name : ''}`;
}
