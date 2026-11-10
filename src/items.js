// Trang bị, thuộc tính ngẫu nhiên, thẻ bài, chỉ số dẫn xuất (GDD mục 14–24, 26, 28, 29, 44).
export const RARITY = [
  { id: 'common', name: 'Common', color: '#ffffff', w: 55, lines: [0, 1] },
  { id: 'uncommon', name: 'Uncommon', color: '#4ade80', w: 25, lines: [1, 2] },
  { id: 'rare', name: 'Rare', color: '#4a90ff', w: 12, lines: [2, 3] },
  { id: 'epic', name: 'Epic', color: '#b066ff', w: 5, lines: [3, 4] },
  { id: 'legendary', name: 'Legendary', color: '#ffd34d', w: 2, lines: [4, 5] },
  { id: 'mythic', name: 'Mythic', color: '#ff4040', w: 0.8, lines: [5, 6] },
  { id: 'ancient', name: 'Ancient', color: '#ff8a5c', w: 0.2, lines: [6, 6] },
];
export const SLOTS = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'necklace', 'ring1', 'ring2', 'cloak', 'accessory'];
export const SLOT_NAME = { weapon: 'Vũ khí', helmet: 'Mũ', armor: 'Giáp', gloves: 'Găng tay', boots: 'Giày', necklace: 'Dây chuyền', ring1: 'Nhẫn trái', ring2: 'Nhẫn phải', ring: 'Nhẫn', cloak: 'Áo choàng', accessory: 'Phụ kiện' };
const KINDS = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'necklace', 'ring', 'cloak', 'accessory'];
const MAIN = { weapon: 'atk', helmet: 'def', armor: 'hp', gloves: 'atk', boots: 'def', necklace: 'hp', ring: 'atk', cloak: 'def', accessory: 'hp' };
// Mỗi vị trí chỉ sinh nhóm thuộc tính phù hợp (GDD 16.3)
const POOL = {
  weapon: ['atk', 'crit_rate', 'crit_damage', 'lifesteal'], helmet: ['hp', 'def', 'exp_bonus'], armor: ['hp', 'def'],
  gloves: ['atk', 'crit_rate', 'crit_damage'], boots: ['dodge', 'hp', 'def'], necklace: ['hp', 'lifesteal', 'def'],
  ring: ['crit_rate', 'atk', 'crit_damage'], cloak: ['def', 'dodge'], accessory: ['hp', 'gold_bonus', 'exp_bonus', 'atk'],
};
const FLAT = { atk: [1.2, 3], hp: [6, 15], def: [0.8, 2] }; // [mỗi cấp, gốc]
const PCT = { crit_rate: [1, 4], crit_damage: [5, 15], lifesteal: [1, 3], dodge: [1, 3], exp_bonus: [3, 8], gold_bonus: [3, 8] };
export const LABEL = { atk: 'ATK', hp: 'HP', def: 'DEF', crit_rate: 'Crit Rate', crit_damage: 'Crit Damage', lifesteal: 'Lifesteal', dodge: 'Dodge', exp_bonus: 'EXP Bonus', gold_bonus: 'Gold Bonus', atk_pct: 'ATK', hp_pct: 'HP' };
const PCT_TYPES = new Set([...Object.keys(PCT), 'atk_pct', 'hp_pct']);
export const fmt = a => `+${a.v}${PCT_TYPES.has(a.type) ? '%' : ''} ${LABEL[a.type]}`;

const rnd = (a, b) => a + Math.random() * (b - a);
const val = (t, L, m = 1) => FLAT[t] ? Math.round((FLAT[t][0] * L + FLAT[t][1]) * rnd(0.9, 1.1) * m) : +(rnd(...PCT[t]) * m).toFixed(1);
let seq = 0; // bộ đếm tránh trùng instanceId khi sinh nhiều món trong cùng 1 ms (GDD 42)
const uid = () => 'i' + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);

export function genItem(L, ri, kind, set) {
  kind = kind || KINDS[Math.floor(Math.random() * KINDS.length)];
  const [lo, hi] = RARITY[ri].lines, n = lo + Math.floor(Math.random() * (hi - lo + 1));
  const main = MAIN[kind], types = [];
  const all = Object.keys(LABEL).filter(t => !t.endsWith('_pct'));
  const pool = [...POOL[kind]].sort(() => Math.random() - 0.5);
  [...pool, ...all.filter(t => !pool.includes(t)).sort(() => Math.random() - 0.5)].forEach(t => { if (types.length < n) types.push(t); });
  return {
    id: uid(), slot: kind, ri, rarity: RARITY[ri].id, lv: L, locked: false, set,
    name: `${set ? SETS[set].name + ' ' : ''}${RARITY[ri].name} ${SLOT_NAME[kind]}`,
    main: { type: main, v: val(main, L, 1 + ri * 0.35) * (kind === 'weapon' ? 2 : 1) },
    affixes: types.map(t => ({ type: t, v: val(t, L, 1 + ri * 0.1) })),
  };
}

// Rơi đồ: bảng trọng số + bảo đảm (pity): sau 30 lần không ra Epic+ thì ép ra (GDD 29)
export function rollRarity(G, minIdx = 0) {
  G.pity = (G.pity || 0) + 1;
  let ri = 0;
  if (G.pity >= 30) ri = 3;
  else {
    let r = Math.random() * 100;
    for (let i = 0; i < RARITY.length; i++) { r -= RARITY[i].w; if (r <= 0) { ri = i; break; } }
  }
  ri = Math.max(ri, minIdx);
  if (ri >= 3) G.pity = 0;
  return ri;
}

// Thẻ bài: mỗi mẫu 1 bản, trùng lặp = +1 sao (tối đa 5)
export const CARDS = {
  wolf: { name: 'Thẻ Sói', rarity: 'rare', bonus: { atk_pct: 4 } },
  wolf_king: { name: 'Thẻ Sói Chúa', rarity: 'legendary', bonus: { atk_pct: 10, hp_pct: 8 } },
};
export const DECK_SIZE = 14;
export const DECK_LIMIT = { monster: 6, skill: 4, relic: 4 }; // GDD 24
export function addCard(G, t) {
  const c = G.cards.find(x => x.t === t);
  if (c) { c.star = Math.min(5, c.star + 1); return c; }
  G.cards.push({ t, star: 0 }); return G.cards[G.cards.length - 1];
}

export const expNeed = L => Math.round(100 * Math.pow(L, 1.65));

export function equip(G, it) {
  const targets = it.slot === 'ring' ? ['ring1', 'ring2'] : [it.slot];
  const s = targets.find(x => !G.eq[x]) || targets[0];
  const old = G.eq[s];
  G.inv = G.inv.filter(x => x.id !== it.id);
  if (old) G.inv.push(old);
  G.eq[s] = it;
}
export function unequip(G, s) {
  if (G.eq[s] && G.inv.length < G.cap) { G.inv.push(G.eq[s]); delete G.eq[s]; }
}

// Chỉ số cuối: gốc + cộng thẳng, sau đó % (GDD 28), có áp trần (GDD 44)
export function derive(c, G, CFG) {
  const t = { atk: 0, def: 0, hp: 0, crit_rate: 0, crit_damage: 0, lifesteal: 0, dodge: 0, exp_bonus: 0, gold_bonus: 0, atk_pct: 0, hp_pct: 0, skill_dmg: 0, cdr: 0, heal_kill: 0, boss_dmg: 0, dragon_fire: 0 };
  const add = a => { if (a && t[a.type] !== undefined) t[a.type] += a.v; };
  Object.values(G.eq).forEach(it => { if (it) { add({ type: it.main.type, v: it.main.v * (1 + 0.05 * (it.enh || 0)) * (it.trans ? 1.25 : 1) }); it.affixes.forEach(add); if (it.awaken) add(it.awaken); } });
  const cnt = {};
  Object.values(G.eq).forEach(it => { if (it && it.set) cnt[it.set] = (cnt[it.set] || 0) + 1; });
  for (const k in cnt) { const sd = SETS[k]; if (sd) for (const th in sd.bonus) if (cnt[k] >= +th) for (const st in sd.bonus[th]) t[st] += sd.bonus[th][st]; }
  G.deck.forEach(id => {
    const c2 = G.cards.find(x => x.t === id), def = CARDS[id];
    if (c2 && def) for (const k in def.bonus) t[k] += def.bonus[k] * (1 + 0.25 * c2.star) * (1 + 0.05 * ((c2.lv || 1) - 1)) * (c2.evo ? 1.5 : 1);
  });
  const ty = {}; // hiệu ứng cộng hưởng theo loại thẻ quái
  G.deck.forEach(id => { const d = CARDS[id]; if (d && d.type && G.cards.some(x => x.t === id)) ty[d.type] = (ty[d.type] || 0) + 1; });
  for (const k in ty) { const r = RESONANCE[k]; if (r) for (const th in r) if (ty[k] >= +th) for (const st in r[th]) t[st] += r[th][st]; }
  const pet = PETS[G.pet];
  if (pet && G.q[pet.unlock] && G.q[pet.unlock].done) for (const k in pet.bonus) t[k] += pet.bonus[k] * (1 + 0.1 * (((G.petLv || {})[G.pet] || 1) - 1));
  const sk = G.sk || {}; // kỹ năng bị động
  t.atk_pct += 4 * (sk.power || 0); t.hp_pct += 5 * (sk.vital || 0); t.crit_rate += sk.crit || 0;
  t.skill_dmg += 6 * (sk.arcane || 0); t.cdr += 3 * (sk.haste || 0);
  const g = 1 + 0.12 * (G.level - 1);
  return {
    matk: Math.round((c[c.main || 'matk'] * g + t.atk) * (1 + t.atk_pct / 100)),
    maxHp: Math.round((c.hp * CFG.hpScale * g + t.hp) * (1 + t.hp_pct / 100)),
    def: Math.round(c.def + t.def),
    crit: Math.min(c.crit + t.crit_rate, CFG.critCap),
    critDmg: CFG.critDamage + t.crit_damage / 100,
    dodge: Math.min(c.dodge + t.dodge, CFG.dodgeCap),
    lifesteal: Math.min(t.lifesteal, 25),
    exp_bonus: Math.min(t.exp_bonus, 100),
    gold_bonus: Math.min(t.gold_bonus, 100),
    dragonFire: t.dragon_fire, skillDmg: t.skill_dmg, cdr: Math.min(t.cdr, 40), heal_kill: t.heal_kill, boss_dmg: t.boss_dmg,
    speed: Math.round(c.speed * (1 + 0.03 * (sk.swift || 0))),
  };
}

// Bộ trang bị (GDD 17.1): bậc 2 và 4 món. Bậc 6 món (kỹ năng Hỏa Long) chưa làm.
export const SETS = { dragon: { name: 'Dragon Knight', bonus: { 2: { hp_pct: 10 }, 4: { atk_pct: 15 }, 6: { dragon_fire: 1 } } } };

// Cường hóa +1..+20: không phá hủy đồ; thất bại cộng bảo hiểm +5% tỷ lệ lần sau (GDD 17)
export function enhanceInfo(it) {
  const n = it.enh || 0;
  if (n >= (it.trans ? 25 : 20)) return null; // Transcend nâng trần cường hóa lên +25
  const base = n < 5 ? 90 : n < 10 ? 70 : n < 15 ? 45 : 25;
  return { rate: Math.min(95, base + 5 * (it.fail || 0)), cost: Math.round(40 * (n + 1) * (1 + it.ri * 0.5) * Math.max(1, it.lv / 5)) };
}
export const rerollCost = it => Math.round(60 * (1 + it.ri) * Math.max(1, it.lv / 5));
export function rerollAffix(it, i) {
  const used = new Set(it.affixes.map((a, j) => j === i ? null : a.type));
  const all = Object.keys(LABEL).filter(t => !t.endsWith('_pct') && !used.has(t));
  const pool = POOL[it.slot].filter(t => !used.has(t)), from = pool.length ? pool : all;
  const type = from[Math.floor(Math.random() * from.length)];
  return { type, v: val(type, it.lv, 1 + it.ri * 0.1) };
}

CARDS.spider = { name: 'Thẻ Nhện', rarity: 'rare', bonus: { hp_pct: 5 } };
CARDS.spider_queen = { name: 'Thẻ Nhện Vương', rarity: 'legendary', bonus: { atk_pct: 6, hp_pct: 10 } };

// ---- Thẻ kỹ năng, thẻ di vật, cộng hưởng, cây kỹ năng bị động
Object.assign(CARDS.wolf, { type: 'beast' }); Object.assign(CARDS.wolf_king, { type: 'beast' });
Object.assign(CARDS.spider, { type: 'insect' }); Object.assign(CARDS.spider_queen, { type: 'insect' });
CARDS.sc_power = { name: 'Thẻ Cường Lực', kind: 'skill', rarity: 'rare', bonus: { skill_dmg: 20 } };
CARDS.sc_haste = { name: 'Thẻ Tốc Hồi', kind: 'skill', rarity: 'epic', bonus: { cdr: 10 } };
CARDS.sc_twin = { name: 'Thẻ Song Kích', kind: 'skill', rarity: 'legendary', bonus: {}, note: 'Kỹ năng bắn thêm 1 phát / mở rộng 30% phạm vi' };
CARDS.r_scholar = { name: 'Di vật Học Giả', kind: 'relic', rarity: 'rare', bonus: { exp_bonus: 15 } };
CARDS.r_greed = { name: 'Di vật Tham Lam', kind: 'relic', rarity: 'rare', bonus: { gold_bonus: 20 } };
CARDS.r_vampire = { name: 'Di vật Huyết Nguyệt', kind: 'relic', rarity: 'epic', bonus: { heal_kill: 3 } };
CARDS.r_hunter = { name: 'Di vật Thợ Săn Boss', kind: 'relic', rarity: 'legendary', bonus: { boss_dmg: 15 } };
export const RESONANCE = { beast: { 2: { atk_pct: 5 } }, insect: { 2: { hp_pct: 6 } }, fire: { 2: { atk_pct: 6 } } };

export const SK_MAX = 5;
export const SK_NODES = {
  power: ['Sức mạnh', '+4% ATK / cấp'], vital: ['Sinh lực', '+5% HP / cấp'], crit: ['Chí mạng', '+1% Crit / cấp'],
  arcane: ['Tinh thông', '+6% sát thương kỹ năng / cấp'], haste: ['Tốc hồi', '-3% hồi chiêu / cấp (tối đa 40%)'], swift: ['Nhanh nhẹn', '+3% tốc chạy / cấp'],
};
export const spLeft = G => G.level - 1 - Object.values(G.sk || {}).reduce((a, b) => a + b, 0);

CARDS.imp = { name: 'Thẻ Hỏa Quỷ', rarity: 'rare', type: 'fire', bonus: { atk_pct: 5 } };
CARDS.fire_dragon = { name: 'Thẻ Hỏa Long', rarity: 'legendary', type: 'fire', bonus: { atk_pct: 8, boss_dmg: 8 } };

// Phân giải & chế tạo: chi phí chế tạo luôn cao hơn đá thu về, tránh vòng lặp có lợi nhuận (GDD 32)
export const STONE = [1, 2, 4, 8, 16, 32, 64];
export const RECIPES = [
  { name: 'Trang bị Rare', ri: 2, stone: 20, gold: 150 },
  { name: 'Trang bị Epic', ri: 3, stone: 60, gold: 500 },
  { name: 'Trang bị Legendary', ri: 4, stone: 200, gold: 2000 },
];

// Thành tựu
const owned = G => [...G.inv, ...Object.values(G.eq)].filter(Boolean);
export const ACHS = [
  { id: 'k100', name: 'Thợ săn', desc: 'Hạ 100 quái vật', gold: 200, ok: G => G.st.kills >= 100 },
  { id: 'k1000', name: 'Đồ tể', desc: 'Hạ 1.000 quái vật', gold: 2000, ok: G => G.st.kills >= 1000 },
  { id: 'b5', name: 'Diệt Boss', desc: 'Hạ 5 boss', gold: 500, ok: G => G.st.boss >= 5 },
  { id: 'leg1', name: 'Ánh vàng', desc: 'Sở hữu 1 trang bị Legendary', gold: 500, ok: G => owned(G).some(i => i.ri >= 4) },
  { id: 'enh10', name: 'Thợ rèn', desc: 'Cường hóa trang bị lên +10', gold: 1000, ok: G => owned(G).some(i => (i.enh || 0) >= 10) },
  { id: 'cards5', name: 'Nhà sưu tầm', desc: 'Sở hữu 5 thẻ bài', gold: 500, ok: G => G.cards.length >= 5 },
  { id: 'lv20', name: 'Dày dạn', desc: 'Đạt cấp 20', gold: 800, ok: G => G.level >= 20 },
  { id: 'set6', name: 'Hỏa Long giáng thế', desc: 'Mặc đủ 6 món Dragon Knight', gold: 3000, ok: G => Object.values(G.eq).filter(i => i && i.set === 'dragon').length >= 6 },
];

CARDS.frost_wolf = { name: 'Thẻ Sói Băng', rarity: 'epic', type: 'ice', bonus: { hp_pct: 6 } };
CARDS.ice_king = { name: 'Thẻ Băng Vương', rarity: 'legendary', type: 'ice', bonus: { hp_pct: 8, boss_dmg: 8 } };
CARDS.shade = { name: 'Thẻ Ác Linh', rarity: 'epic', type: 'dark', bonus: { crit_rate: 3 } };
CARDS.ma_vuong = { name: 'Thẻ Ma Vương', rarity: 'mythic', type: 'dark', bonus: { atk_pct: 10, crit_rate: 4 } };
RESONANCE.ice = { 2: { hp_pct: 8 } }; RESONANCE.dark = { 2: { crit_rate: 5 } };
ACHS.push({ id: 'final', name: 'Huyền thoại vĩnh hằng', desc: 'Hạ Ma Vương – hoàn thành cốt truyện', gold: 10000, ok: G => !!(G.q.q10 && G.q.q10.done) });

// Nâng cấp thẻ (GDD 23): Level Up dùng vàng + đá, giới hạn theo độ hiếm; Evolution cần cấp tối đa + sao + nguyên liệu riêng
export const CARD_CAP = { common: 5, uncommon: 8, rare: 10, epic: 15, legendary: 20, mythic: 25, ancient: 30 };
export const cardLvCost = c => ({ gold: 80 * (c.lv || 1), stone: 2 * (c.lv || 1) });
export const EVO = { gold: 2000, stone: 100, star: 3 };

// Thú đồng hành (GDD 33): mở khóa theo nhiệm vụ; tăng chỉ số, nhặt đồ hoặc bắn hỗ trợ
export const PETS = {
  pup: { name: 'Sói Con', unlock: 'q2', color: 0xdddddd, bonus: { atk_pct: 5 }, magnet: true, desc: '+5% ATK, tự nhặt đồ rơi gần' },
  ember: { name: 'Tiểu Hỏa', unlock: 'q6', color: 0xff7a1a, bonus: { atk_pct: 3 }, shoot: true, desc: '+3% ATK, bắn hỗ trợ mỗi 2 giây' },
  frostling: { name: 'Băng Linh', unlock: 'q8', color: 0x9fd8ff, bonus: { hp_pct: 8 }, desc: '+8% HP' },
};

// Tiến hóa ngoại hình (GDD 10.2): chỉ thay đổi hình ảnh, không tăng sức mạnh; người chơi có thể giữ ngoại hình cũ
export const LOOK_LV = [1, 15, 40, 70, 100];
export const LOOK_NAMES = ['Basic', 'Advanced', 'Elite', 'Legendary', 'Mythic'];
export const lookStage = G => {
  const max = LOOK_LV.filter(l => G.level >= l).length - 1;
  return G.look == null ? max : Math.min(G.look, max);
};

// Awaken (mở 1 thuộc tính đặc biệt) và Transcend (đột phá trang bị cao cấp) – GDD 17
export const AW = { boss_dmg: ['Boss Damage', 4, 10], skill_dmg: ['Skill Damage', 6, 15], cdr: ['Cooldown Reduction', 2, 5], heal_kill: ['HP/Kill', 0.5, 1.5] };
export const awakenCost = it => ({ gold: Math.round(150 * (1 + it.ri) * Math.max(1, it.lv / 5)), stone: 10 * (1 + it.ri) });
export function rollAwaken() {
  const ks = Object.keys(AW), type = ks[Math.floor(Math.random() * ks.length)], [, lo, hi] = AW[type];
  return { type, v: +(lo + Math.random() * (hi - lo)).toFixed(1) };
}
export const fmtAw = a => `+${a.v}% ${AW[a.type][0]}`;
export const TRANS = { gold: 5000, stone: 300, enh: 15 };
