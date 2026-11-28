// Trang bị, thuộc tính ngẫu nhiên, thẻ bài, chỉ số dẫn xuất (GDD mục 14–24, 26, 28, 29, 44).
export const RARITY = [
  { id: 'common', name: 'Thường', color: '#ffffff', w: 55, lines: [0, 1] },
  { id: 'uncommon', name: 'Khá', color: '#4ade80', w: 25, lines: [1, 2] },
  { id: 'rare', name: 'Hiếm', color: '#4a90ff', w: 12, lines: [2, 3] },
  { id: 'epic', name: 'Sử thi', color: '#b066ff', w: 5, lines: [3, 4] },
  { id: 'legendary', name: 'Huyền thoại', color: '#ffd34d', w: 2, lines: [4, 5] },
  { id: 'mythic', name: 'Thần thoại', color: '#ff4040', w: 0.8, lines: [5, 6] },
  { id: 'ancient', name: 'Cổ đại', color: '#ff8a5c', w: 0.2, lines: [6, 6] },
];
export const SLOTS = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'necklace', 'ring1', 'ring2', 'cloak', 'accessory'];
export const SLOT_NAME = { weapon: 'Vũ khí', helmet: 'Mũ', armor: 'Giáp', gloves: 'Găng tay', boots: 'Giày', necklace: 'Dây chuyền', ring1: 'Nhẫn trái', ring2: 'Nhẫn phải', ring: 'Nhẫn', cloak: 'Áo choàng', accessory: 'Phụ kiện' };
const KINDS = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'necklace', 'ring', 'cloak', 'accessory'];
const MAIN = { weapon: 'atk', helmet: 'def', armor: 'hp', gloves: 'atk', boots: 'def', necklace: 'hp', ring: 'atk', cloak: 'def', accessory: 'hp' };
// Mỗi vị trí chỉ sinh nhóm thuộc tính phù hợp (GDD 16.3)
const POOL = {
  weapon: ['atk', 'crit_rate', 'crit_damage', 'lifesteal'], helmet: ['hp', 'def', 'exp_bonus', 'luck'], armor: ['hp', 'def'],
  gloves: ['atk', 'crit_rate', 'crit_damage'], boots: ['dodge', 'hp', 'def', 'luck'], necklace: ['hp', 'lifesteal', 'def', 'luck', 'cdr'],
  ring: ['crit_rate', 'atk', 'crit_damage', 'luck', 'skill_dmg'], cloak: ['def', 'dodge'], accessory: ['hp', 'gold_bonus', 'exp_bonus', 'atk', 'luck', 'cdr'],
};
// Vũ khí / vật phẩm chuyên dụng của từng lớp có bể dòng riêng, thể hiện lối chơi (khiên: thủ, túi tên: chí mạng, cầu: kỹ năng, mặt nạ: né)
export const CLASS_POOL = {
  knight: { weapon: ['atk', 'lifesteal', 'crit_damage', 'crit_rate'], accessory: ['def', 'hp', 'lifesteal', 'dodge'], helmet: ['hp', 'def', 'lifesteal', 'luck'] },
  elf:    { weapon: ['atk', 'crit_rate', 'crit_damage', 'luck'], accessory: ['crit_rate', 'crit_damage', 'atk', 'luck', 'gold_bonus'], helmet: ['hp', 'crit_rate', 'exp_bonus', 'luck'] },
  mage:   { weapon: ['atk', 'skill_dmg', 'crit_damage', 'cdr'], accessory: ['skill_dmg', 'cdr', 'hp', 'exp_bonus', 'luck'], helmet: ['hp', 'cdr', 'exp_bonus', 'luck'] },
  rogue:  { weapon: ['atk', 'crit_rate', 'crit_damage', 'dodge'], accessory: ['dodge', 'crit_rate', 'crit_damage', 'lifesteal', 'luck'], helmet: ['hp', 'dodge', 'crit_rate', 'luck'] },
};
const CLASS_MAIN = { accessory: { knight: 'def', elf: 'atk', mage: 'atk' } }; // chỉ số chính của vật phẩm chuyên dụng (mặc định theo MAIN)
export const poolFor = (kind, cls) => (CLASS_POOL[cls] && CLASS_POOL[cls][kind]) || POOL[kind];
const FLAT = { atk: [1.2, 3], hp: [6, 15], def: [0.8, 2] }; // [mỗi cấp, gốc]
const PCT = { crit_rate: [1, 4], crit_damage: [5, 15], lifesteal: [1, 3], dodge: [1, 3], exp_bonus: [3, 8], gold_bonus: [3, 8], luck: [2, 6], skill_dmg: [3, 10], cdr: [1, 3] };
export const LABEL = { atk: 'Tấn công', hp: 'Sinh lực', def: 'Phòng thủ', crit_rate: 'Tỷ lệ chí mạng', crit_damage: 'ST chí mạng', lifesteal: 'Hút máu', dodge: 'Né tránh', exp_bonus: 'Thưởng EXP', gold_bonus: 'Thưởng vàng', luck: 'May mắn', skill_dmg: 'ST kỹ năng', cdr: 'Giảm hồi chiêu', atk_pct: 'Tấn công', hp_pct: 'Sinh lực' };
// Nhãn cho mọi loại cộng thêm (thẻ, bộ trang bị, thú…) và tên loại thẻ
export const BONUS_LABEL = { ...LABEL, skill_dmg: 'ST kỹ năng', cdr: 'Giảm hồi chiêu', heal_kill: 'Hồi máu/hạ quái', boss_dmg: 'ST Boss', crit_rate: 'Chí mạng', dragon_fire: 'Hỏa Long' };
export const TYPE_VN = { beast: 'Thú', insect: 'Côn trùng', fire: 'Lửa', ice: 'Băng', dark: 'Bóng tối' };
export const KIND_VN = { monster: 'quái', skill: 'kỹ năng', relic: 'di vật' };
const PCT_TYPES = new Set([...Object.keys(PCT), 'atk_pct', 'hp_pct']);
// Số hiển thị: làm tròn tối đa 2 chữ số thập phân, dấu phẩy thập phân, dấu chấm phân cách nghìn (vd 1,78 · 1.234,5)
export const fmt2 = n => { const x = Math.round((+n + Number.EPSILON) * 100) / 100, p = String(Math.abs(x)).split('.'); return (x < 0 ? '-' : '') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (p[1] ? ',' + p[1] : ''); };
export const fmt = a => `+${fmt2(a.v)}${PCT_TYPES.has(a.type) ? '%' : ''} ${LABEL[a.type]}`;

const rnd = (a, b) => a + Math.random() * (b - a);
const val = (t, L, m = 1) => FLAT[t] ? Math.round((FLAT[t][0] * L + FLAT[t][1]) * rnd(0.9, 1.1) * m) : +(rnd(...PCT[t]) * m).toFixed(1);
let seq = 0; // bộ đếm tránh trùng instanceId khi sinh nhiều món trong cùng 1 ms (GDD 42)
const uid = () => 'i' + Date.now().toString(36) + (seq++).toString(36) + Math.random().toString(36).slice(2, 6);

export function genItem(L, ri, kind, set, cls) {
  kind = kind || KINDS[Math.floor(Math.random() * KINDS.length)];
  const [lo, hi] = RARITY[ri].lines, n = lo + Math.floor(Math.random() * (hi - lo + 1));
  const main = (CLASS_MAIN[kind] && CLASS_MAIN[kind][cls]) || MAIN[kind], types = [];
  const all = Object.keys(LABEL).filter(t => !t.endsWith('_pct'));
  const pool = [...poolFor(kind, cls)].sort(() => Math.random() - 0.5);
  [...pool, ...all.filter(t => !pool.includes(t)).sort(() => Math.random() - 0.5)].forEach(t => { if (types.length < n) types.push(t); });
  return {
    id: uid(), slot: kind, ri, rarity: RARITY[ri].id, lv: L, locked: false, set, cls,
    name: `${set ? SETS[set].name + ' ' : ''}${RARITY[ri].name} ${SLOT_NAME[kind]}`,
    main: { type: main, v: val(main, L, 1 + ri * 0.35) * (kind === 'weapon' ? 2 : 1) },
    affixes: types.map(t => ({ type: t, v: val(t, L, 1 + ri * 0.1) })),
  };
}

// ---------- MAY MẮN ----------
// Chỉ số May mắn (từ trang bị, thẻ, di vật...) ảnh hưởng 3 thứ: (1) bậc của đồ rơi, (2) xác suất rơi đồ/thẻ, (3) bậc của thẻ bổ sung.
//   luckMult : nhân trọng số bậc từ Hiếm trở lên; bậc càng cao hưởng càng nhiều. Ví dụ May mắn 60: Hiếm ×2, Sử thi ×3, Huyền thoại ×4, Thần thoại ×5
//   dropChance: nhân xác suất rơi (tối đa 95%). Ví dụ May mắn 150 = gấp đôi tỷ lệ rơi
export const luckMult = (luck, i) => i >= 2 ? 1 + Math.max(0, luck) / 60 * (i - 1) : 1;
export const dropChance = (base, luck) => Math.min(0.95, base * (1 + Math.max(0, luck) / 150));
// Bốc một trọng số theo danh sách; trả về chỉ số
const pickIdx = (w, rng) => { let r = rng() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; } return w.length - 1; };

// Rơi đồ: bảng trọng số + bảo đảm (pity): sau 30 lần không ra Epic+ thì ép ra (GDD 29)
export function rollRarity(G, minIdx = 0, luck = 0, rng = Math.random) {
  G.pity = (G.pity || 0) + 1;
  let ri = 0;
  if (G.pity >= 30) ri = 3;
  else ri = pickIdx(RARITY.map((x, i) => x.w * luckMult(luck, i)), rng);
  ri = Math.max(ri, minIdx);
  if (ri >= 3) G.pity = 0;
  return ri;
}
// Chọn một thẻ trong danh sách id theo trọng số độ hiếm, có nhân may mắn (thẻ bậc cao dễ ra hơn khi may mắn cao)
export function pickCardByLuck(ids, luck = 0, rng = Math.random) {
  if (!ids.length) return null;
  const ri = id => RARITY.findIndex(r => r.id === CARDS[id].rarity);
  return ids[pickIdx(ids.map(id => RARITY[ri(id)].w * luckMult(luck, ri(id))), rng)];
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
  const t = { atk: 0, def: 0, hp: 0, crit_rate: 0, crit_damage: 0, lifesteal: 0, dodge: 0, exp_bonus: 0, gold_bonus: 0, luck: 0, atk_pct: 0, hp_pct: 0, skill_dmg: 0, cdr: 0, heal_kill: 0, boss_dmg: 0, dragon_fire: 0 };
  const add = a => { if (a && t[a.type] !== undefined) t[a.type] += a.v; };
  let procSum = 0; Object.values(G.eq).forEach(it => { if (it) { for (const [k, v] of Object.entries(itemTotals(it))) add({ type: k, v }); procSum += trTier(it) * 4; } });
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
    gold_bonus: Math.min(t.gold_bonus, 100), luck: Math.min(t.luck, 100),
    dragonFire: t.dragon_fire, skillDmg: t.skill_dmg, cdr: Math.min(t.cdr, 40), heal_kill: t.heal_kill, boss_dmg: t.boss_dmg,
    speed: Math.round(c.speed * (1 + 0.03 * (sk.swift || 0))),
    proc: Math.min(30, procSum), // xác suất (%) hiệu ứng dư chấn của Đột phá
  };
}

// Bộ trang bị (GDD 17.1): bậc 2 và 4 món. Bậc 6 món (kỹ năng Hỏa Long) chưa làm.
export const SETS = { dragon: { name: 'Hiệp Sĩ Rồng', bonus: { 2: { hp_pct: 10 }, 4: { atk_pct: 15 }, 6: { dragon_fire: 1 } } } };

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
export const LOOK_NAMES = ['Sơ cấp', 'Tiến cấp', 'Tinh anh', 'Huyền thoại', 'Thần thoại'];
export const lookStage = G => {
  const max = LOOK_LV.filter(l => G.level >= l).length - 1;
  return G.look == null ? max : Math.min(G.look, max);
};

CARDS.r_clover = { name: 'Di vật Cỏ Bốn Lá', kind: 'relic', rarity: 'epic', bonus: { luck: 15 } };

// =====================================================================================================
// HỆ THỐNG PHÁT TRIỂN TRANG BỊ: Cường hóa · Đổi dòng · Thức tỉnh · Đột phá
// Mỗi tính năng tác động lên một phần KHÁC NHAU của trang bị (xem itemLines):
//   Cường hóa  → nhân chỉ số chính + MỌI dòng phụ, thêm "mốc" +5/+10/... theo lớp
//   Đổi dòng   → chọn 1 trong 3 phương án thay cho một dòng phụ (đa dạng build, không tăng sức mạnh gốc)
//   Thức tỉnh  → mở dòng đặc biệt + nội tại riêng của lớp (3 cấp)
//   Đột phá    → 3 bậc: nhân chỉ số chính, thêm dòng đột phá của lớp, nâng trần cường hóa, hiệu ứng dư chấn
// Tất cả là hàm thuần trên đối tượng trang bị, giao diện chỉ gọi và hiển thị kết quả.
// =====================================================================================================
export const ENH_MAIN = 0.06, ENH_AFFIX = 0.025;           // mỗi cấp cường hóa: +6% chỉ số chính, +2,5% mỗi dòng phụ
export const TRANS_MAIN = [1, 1.25, 1.5, 1.8];             // nhân chỉ số chính theo bậc đột phá
export const trTier = it => (it.trans === true ? 1 : Math.max(0, Math.min(3, +it.trans || 0)));
export const enhCap = it => 20 + 5 * trTier(it);

// Lớp nhân vật: bản sắc, mốc cường hóa, nội tại thức tỉnh, dòng đột phá, tên hiệu ứng dư chấn
export const CLASS_FX = {
  knight: { color: '#6fa8ff', ms: { hp_pct: 2, lifesteal: 0.5 }, passive: ['Bất Khuất', { hp_pct: 4, lifesteal: 1, boss_dmg: 3 }, 'Tăng sinh lực, hút máu và sát thương Boss'],
    brk: [{ hp_pct: 5, lifesteal: 1 }, { hp_pct: 6, boss_dmg: 8 }, { hp_pct: 8, lifesteal: 2, atk_pct: 6 }], proc: 'Phản Chấn Thuẫn' },
  elf: { color: '#7be08a', ms: { crit_rate: 1, crit_damage: 4 }, passive: ['Mắt Ưng', { crit_rate: 2, crit_damage: 8, atk_pct: 2 }, 'Tăng chí mạng, ST chí mạng và tấn công'],
    brk: [{ crit_rate: 3, crit_damage: 10 }, { atk_pct: 5, crit_damage: 15 }, { crit_rate: 4, crit_damage: 25, boss_dmg: 6 }], proc: 'Mũi Tên Dư Chấn' },
  mage: { color: '#b79cff', ms: { skill_dmg: 4, cdr: 1 }, passive: ['Tinh Thông Ma Pháp', { skill_dmg: 8, cdr: 2, atk_pct: 2 }, 'Tăng sát thương kỹ năng, giảm hồi chiêu'],
    brk: [{ skill_dmg: 10, cdr: 3 }, { skill_dmg: 15, atk_pct: 5 }, { skill_dmg: 20, cdr: 5, boss_dmg: 6 }], proc: 'Bùng Nổ Ma Lực' },
  rogue: { color: '#ff8a8a', ms: { dodge: 1, crit_rate: 1 }, passive: ['Ảnh Vũ', { dodge: 2, crit_rate: 2, crit_damage: 6 }, 'Tăng né tránh, chí mạng và ST chí mạng'],
    brk: [{ dodge: 3, crit_rate: 3 }, { crit_damage: 15, atk_pct: 5 }, { dodge: 4, crit_rate: 4, crit_damage: 20 }], proc: 'Nhát Chém Bóng' },
};
const fx = it => CLASS_FX[it.cls] || CLASS_FX.knight;
export const AWK_MULT = [0, 1, 1.6, 2.3];                  // nhân nội tại theo cấp thức tỉnh (0 = chưa thức tỉnh)
export const awkLv = it => it.awk != null ? it.awk : (it.awaken ? 1 : 0);
export const msCount = it => Math.floor((it.enh || 0) / 5);

// Mọi dòng chỉ số của một món, đã nhân theo cường hóa / đột phá. Mỗi dòng: { id, tag, type, v }.
export function itemLines(it) {
  const e = it.enh || 0, t = trTier(it), out = [];
  out.push({ id: 'main', tag: 'Chính', type: it.main.type, v: it.main.v * (1 + ENH_MAIN * e) * TRANS_MAIN[t] });
  it.affixes.forEach((a, i) => out.push({ id: 'a' + i, tag: 'Dòng ' + (i + 1), type: a.type, v: a.v * (1 + ENH_AFFIX * e) * (1 + 0.08 * t) }));
  if (it.awaken) out.push({ id: 'awk', tag: 'Thức tỉnh', type: it.awaken.type, v: it.awaken.v });
  const lv = awkLv(it);
  if (it.awk && lv) for (const [k, v] of Object.entries(fx(it).passive[1])) out.push({ id: 'pas_' + k, tag: 'Nội tại', type: k, v: v * (1 + 0.18 * it.ri) * AWK_MULT[lv] });
  for (let m = 0; m < msCount(it); m++) for (const [k, v] of Object.entries(fx(it).ms)) out.push({ id: `ms${m}_${k}`, tag: `Mốc +${5 * (m + 1)}`, type: k, v });
  for (let k = 0; k < t; k++) for (const [ty, v] of Object.entries(fx(it).brk[k])) out.push({ id: `brk${k}_${ty}`, tag: `Đột phá ${'I'.repeat(k + 1)}`, type: ty, v: v * (1 + 0.1 * it.ri) });
  return out;
}
// Tổng theo loại chỉ số (dùng cho derive và cho bảng so sánh trước/sau)
export function itemTotals(it) { const t = {}; for (const l of itemLines(it)) t[l.type] = (t[l.type] || 0) + l.v; return t; }
export const withChange = (it, ch) => ({ ...it, ...ch });
// So sánh hai trạng thái của một món: mọi chỉ số đổi → [{ type, before, after, delta, isNew }]
export function diffTotals(a, b) {
  const A = itemTotals(a), B = itemTotals(b), keys = [...new Set([...Object.keys(A), ...Object.keys(B)])];
  return keys.map(type => ({ type, before: A[type] || 0, after: B[type] || 0, delta: (B[type] || 0) - (A[type] || 0), isNew: !(type in A) })).sort((x, y) => (y.delta !== 0) - (x.delta !== 0));
}

// ---------- Cường hóa +1..+20 (+5 mỗi bậc Đột phá). Thất bại không phá hủy, cộng bảo hiểm +5% ----------
export function enhanceInfo(it) {
  const n = it.enh || 0; if (n >= enhCap(it)) return null;
  const base = n < 5 ? 90 : n < 10 ? 70 : n < 15 ? 45 : n < 20 ? 25 : n < 25 ? 15 : n < 30 ? 10 : 6;
  return { rate: Math.min(95, base + 5 * (it.fail || 0)), cost: Math.round(40 * (n + 1) * (1 + it.ri * 0.5) * Math.max(1, it.lv / 5) * (n >= 20 ? 2.5 : 1)), from: n, to: n + 1, milestone: (n + 1) % 5 === 0 };
}
export function doEnhance(G, it, rng = Math.random) {
  const inf = enhanceInfo(it); if (!inf) return { error: 'Đã đạt cấp tối đa' };
  if (G.gold < inf.cost) return { error: `Không đủ vàng (cần ${inf.cost})` };
  const before = { ...it }; G.gold -= inf.cost;
  const ok = rng() * 100 < inf.rate;
  if (ok) { it.enh = inf.to; it.fail = 0; } else it.fail = (it.fail || 0) + 1;
  return { ok, rate: inf.rate, cost: inf.cost, before, milestone: ok && inf.milestone };
}

// ---------- Đổi dòng: sinh 3 phương án (giữ loại cũ với giá trị mới + 2 loại khác), người chơi chọn 1 hoặc giữ nguyên ----------
export const rerollCost = it => Math.round(60 * (1 + it.ri) * Math.max(1, it.lv / 5));
export function rerollAffix(it, i) {
  const used = new Set(it.affixes.map((a, j) => j === i ? null : a.type));
  const all = Object.keys(LABEL).filter(t => !t.endsWith('_pct') && !used.has(t));
  const pool = poolFor(it.slot, it.cls).filter(t => !used.has(t)), from = pool.length ? pool : all;
  const type = from[Math.floor(Math.random() * from.length)];
  return { type, v: val(type, it.lv, 1 + it.ri * 0.1) };
}
export function rerollOptions(it, i, rng = Math.random) {
  const cur = it.affixes[i], used = new Set(it.affixes.filter((_, j) => j !== i).map(a => a.type));
  const shuf = a => a.map(x => [rng(), x]).sort((p, q) => p[0] - q[0]).map(p => p[1]);
  const all = Object.keys(LABEL).filter(t => !t.endsWith('_pct') && !used.has(t) && t !== cur.type);
  const fav = shuf(poolFor(it.slot, it.cls).filter(t => !used.has(t) && t !== cur.type)), rest = shuf(all.filter(t => !fav.includes(t)));
  const types = [cur.type, ...fav, ...rest].slice(0, 3);
  return types.map((type, k) => { const perfect = rng() < 0.12, v = +(val(type, it.lv, (1 + it.ri * 0.1) * (perfect ? 1.25 : 1))).toFixed(1); return { type, v, perfect, same: k === 0 }; });
}
export function applyReroll(it, i, cand) { it.affixes[i] = { type: cand.type, v: cand.v }; it.rr = (it.rr || 0) + 1; }

// ---------- Thức tỉnh: dòng đặc biệt (AW) + nội tại của lớp, 3 cấp ----------
export const AW = { boss_dmg: ['Sát thương Boss', 4, 10], skill_dmg: ['Sát thương kỹ năng', 6, 15], cdr: ['Giảm hồi chiêu', 2, 5], heal_kill: ['Hồi máu/hạ quái', 0.5, 1.5] };
export const AWK_REQ = [null, { ri: 2, enh: 0 }, { ri: 3, enh: 10 }, { ri: 4, enh: 15 }];
export const awakenCost = (it, lv = awkLv(it) + 1) => ({ gold: Math.round(150 * (1 + it.ri) * Math.max(1, it.lv / 5) * [0, 1, 2.5, 6][lv]), stone: 10 * (1 + it.ri) * [0, 1, 3, 8][lv] });
export const rerollAwakenCost = it => { const c = awakenCost(it, Math.max(1, awkLv(it))); return { gold: Math.round(c.gold * 0.6), stone: Math.round(c.stone * 0.6) }; };
export function rollAwaken() {
  const ks = Object.keys(AW), type = ks[Math.floor(Math.random() * ks.length)], [, lo, hi] = AW[type];
  return { type, v: +(lo + Math.random() * (hi - lo)).toFixed(1) };
}
export const fmtAw = a => `+${fmt2(a.v)}% ${AW[a.type][0]}`;
export const AWK_RATE = [0, 100, 85, 70];                   // tỷ lệ thành công khi lên cấp thức tỉnh 1/2/3; mỗi lần thất bại +10%
export function awakenState(it) { // trạng thái và điều kiện của bước thức tỉnh kế tiếp
  const lv = awkLv(it), next = lv + 1; if (next > 3) return { max: true, lv };
  const rq = AWK_REQ[next], why = it.ri < rq.ri ? `Cần trang bị ${RARITY[rq.ri].name} trở lên` : (it.enh || 0) < rq.enh ? `Cần cường hóa +${rq.enh}` : '';
  return { lv, next, req: rq, cost: awakenCost(it, next), why, rate: Math.min(100, AWK_RATE[next] + 10 * (it.awkFail || 0)) };
}
export function doAwaken(G, it, mode, rng = Math.random) { // mode: 'first' (lên cấp 1), 'up' (lên cấp), 're' (đổi dòng đặc biệt)
  if (mode === 're') { const c = rerollAwakenCost(it); if (!it.awaken) return { error: 'Chưa thức tỉnh' }; if (G.gold < c.gold || G.mat.stone < c.stone) return { error: 'Không đủ nguyên liệu' }; G.gold -= c.gold; G.mat.stone -= c.stone; it.awaken = rollAwaken(); return { ok: true }; }
  const st = awakenState(it); if (st.max) return { error: 'Đã thức tỉnh tối đa' }; if (st.why) return { error: st.why };
  if (G.gold < st.cost.gold || G.mat.stone < st.cost.stone) return { error: 'Không đủ nguyên liệu' };
  G.gold -= st.cost.gold; G.mat.stone -= st.cost.stone;
  if (rng() * 100 >= st.rate) { it.awkFail = (it.awkFail || 0) + 1; return { ok: false, rate: st.rate }; }
  it.awk = st.next; it.awkFail = 0; if (!it.awaken) it.awaken = rollAwaken(); return { ok: true, lv: st.next, rate: st.rate };
}

// ---------- Đột phá: 3 bậc ----------
export const TRANS_TIERS = [{ gold: 5000, stone: 300, enh: 15, ri: 4 }, { gold: 20000, stone: 1200, enh: 25, ri: 5 }, { gold: 80000, stone: 4000, enh: 30, ri: 6 }];
export const TRANS = TRANS_TIERS[0]; // giữ tên cũ cho mã đã có
export const TRANS_RATE = [100, 80, 60];                    // tỷ lệ thành công đột phá bậc I/II/III; mỗi lần thất bại +10%
export function transState(it) {
  const t = trTier(it); if (t >= 3) return { max: true, tier: t };
  const rq = TRANS_TIERS[t], why = it.ri < rq.ri ? `Cần trang bị ${RARITY[rq.ri].name} trở lên` : (it.enh || 0) < rq.enh ? `Cần cường hóa +${rq.enh}` : '';
  return { tier: t, next: t + 1, req: rq, why, rate: Math.min(100, TRANS_RATE[t] + 10 * (it.trFail || 0)) };
}
export function doTranscend(G, it, rng = Math.random) {
  const st = transState(it); if (st.max) return { error: 'Đã đột phá tối đa' }; if (st.why) return { error: st.why };
  if (G.gold < st.req.gold || G.mat.stone < st.req.stone) return { error: 'Không đủ vàng hoặc đá' };
  G.gold -= st.req.gold; G.mat.stone -= st.req.stone;
  if (rng() * 100 >= st.rate) { it.trFail = (it.trFail || 0) + 1; return { ok: false, rate: st.rate }; }
  it.trans = st.next; it.trFail = 0; return { ok: true, tier: st.next, rate: st.rate };
}
