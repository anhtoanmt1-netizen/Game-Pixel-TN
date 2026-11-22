// Logic Auto đánh thuần (kiểm thử được): cấu hình, chọn mục tiêu theo phạm vi, bộ lọc nhặt đồ, tự bán, tự trang bị theo tổng thể chỉ số.
import { RARITY, CARDS, derive } from './items.js';

export const AUTO_DEFAULT = {
  range: 'near',      // near | far | map — phạm vi tìm quái
  mode: 'free',       // around (quanh vị trí) | free (tự do khắp bản đồ)
  pickWhen: 'now',    // now (nhặt ngay) | after (nhặt sau khi hết quái)
  pickMode: 'all',    // all | kinds | rarity | both
  pickKinds: ['weapon', 'armor', 'neck', 'ring', 'acc', 'card'],
  pickRar: [0, 1, 2, 3, 4, 5, 6],
  sell: false, sellKinds: ['weapon', 'armor', 'neck', 'ring', 'acc'], sellMaxRi: 1, // đồ thuộc loại đã chọn và bậc ≤ sellMaxRi sẽ tự bán, còn lại giữ
  equip: false,       // tự trang bị khi đồ mới tốt hơn
};
export const AUTO_RANGE = { near: 320, far: 760, map: Infinity };   // bán kính tìm quái ở chế độ tự do
export const AUTO_LEASH = { near: 260, far: 520, map: 900 };        // bán kính quanh điểm neo ở chế độ quanh vị trí
export const normAuto = a => ({ ...AUTO_DEFAULT, ...(a || {}) });
export const searchRadius = cfg => cfg.mode === 'around' ? AUTO_LEASH[cfg.range] : AUTO_RANGE[cfg.range];

const GROUP = slot => ['helmet', 'armor', 'gloves', 'boots', 'cloak'].includes(slot) ? 'armor' : slot === 'weapon' ? 'weapon' : slot === 'necklace' ? 'neck' : slot === 'ring' ? 'ring' : slot === 'accessory' ? 'acc' : 'other';
export const kindGroup = it => GROUP(it.slot);
export const KIND_CHIPS = [['weapon', 'Vũ khí'], ['armor', 'Giáp'], ['neck', 'Dây chuyền'], ['ring', 'Nhẫn'], ['acc', 'Phụ kiện'], ['card', 'Thẻ bài']];

export function dropInfo(drop) { // drop: {item} hoặc {card}
  if (drop.card) return { group: 'card', ri: RARITY.findIndex(r => r.id === CARDS[drop.card].rarity) };
  return { group: kindGroup(drop.item), ri: drop.item.ri };
}
export function passesPick(cfg, drop) {
  if (cfg.pickMode === 'all') return true;
  const { group, ri } = dropInfo(drop), okK = cfg.pickKinds.includes(group), okR = cfg.pickRar.includes(ri);
  return cfg.pickMode === 'kinds' ? okK : cfg.pickMode === 'rarity' ? okR : okK && okR;
}
export const shouldSell = (cfg, it) => !!cfg.sell && !it.locked && cfg.sellKinds.includes(kindGroup(it)) && it.ri <= cfg.sellMaxRi;

// Mục tiêu: quái gần nhất trong bán kính (tính từ điểm neo nếu "quanh vị trí", từ nhân vật nếu "tự do")
export function pickTarget(cfg, anchor, p, enemies) {
  const R = searchRadius(cfg), o = cfg.mode === 'around' ? (anchor || p) : p; let best = null, bd = Infinity;
  for (const e of enemies) { const d = Math.hypot(e.x - o.x, e.y - o.y); if (d <= R && d < bd) { bd = d; best = e; } }
  return best;
}
// Vật phẩm rơi cần nhặt kế tiếp: gần nhất, qua bộ lọc, trong phạm vi hoạt động, túi còn chỗ
export function pickDrop(cfg, anchor, p, drops, invFull) {
  const R = cfg.mode === 'around' ? AUTO_LEASH[cfg.range] + 60 : Infinity, o = cfg.mode === 'around' ? (anchor || p) : p; let best = null, bd = Infinity;
  for (const d of drops) {
    if (invFull && d.item) continue; if (!passesPick(cfg, d)) continue;
    if (Math.hypot(d.x - o.x, d.y - o.y) > R) continue;
    const dd = Math.hypot(d.x - p.x, d.y - p.y); if (dd < bd) { bd = dd; best = d; }
  }
  return best;
}

// Sức mạnh tổng thể: tính cả sát thương kỳ vọng (chí mạng, boss, kỹ năng, hồi chiêu) lẫn sinh tồn và thưởng
export function combatPower(d) {
  const crit = Math.min(d.crit, 100) / 100, dmg = d.matk * (1 + crit * (d.critDmg - 1)) * (1 + d.boss_dmg / 250 + d.skillDmg / 300) * (1 + d.cdr / 200);
  return dmg + d.maxHp * 0.1 + d.def * 1.4 + d.dodge * 5 + d.lifesteal * 8 + d.luck * 1.5 + d.exp_bonus + d.gold_bonus * 0.6 + d.speed * 0.03;
}
export function bestSlot(G, it, cls, CFG) { // ô tốt nhất để mặc món mới (null nếu không đáng)
  const targets = it.slot === 'ring' ? ['ring1', 'ring2'] : [it.slot], base = combatPower(derive(cls, G, CFG)); let best = null, gain = base * 0.005;
  for (const s of targets) { const p = combatPower(derive(cls, { ...G, eq: { ...G.eq, [s]: it } }, CFG)) - base; if (p > gain) { gain = p; best = s; } }
  return best;
}
