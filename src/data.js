// Dữ liệu tách khỏi logic để sau này chuyển sang /data/*.json dễ dàng.
export const CFG = {
  world: { w: 1800, h: 1200 },
  classId: 'mage',
  hpScale: 3, // quy đổi HP theo thang chung (GDD 9.1: hệ số thiết kế)
  critDamage: 1.5,
  dodgeCap: 45, // GDD 44
  critCap: 75,
};

export const CLASSES = {
  mage:   { name: 'Pháp Sư',  hp: 90,  atk: 100, matk: 120, def: 70,  crit: 5,  dodge: 5,  speed: 170, range: 260, basicMult: 1.0, main: 'matk', skill: 'fireball' },
  knight: { name: 'Hiệp Sĩ',  hp: 140, atk: 100, matk: 60,  def: 130, crit: 3,  dodge: 3,  speed: 150, range: 45,  basicMult: 1.1, main: 'atk', melee: true, skill: 'shield_bash' },
  elf:    { name: 'Cung Thủ', hp: 100, atk: 100, matk: 70,  def: 80,  crit: 8,  dodge: 8,  speed: 170, range: 300, basicMult: 1.0, main: 'atk', skill: 'arrow_rain' },
  rogue:  { name: 'Sát Thủ',  hp: 95,  atk: 100, matk: 60,  def: 75,  crit: 12, dodge: 12, speed: 190, range: 45,  basicMult: 0.9, main: 'atk', melee: true, skill: 'shadow_strike' },
};

export const SKILLS = {
  fireball:      { name: 'Fireball',      type: 'proj', tex: 'fire', mult: 2.5, cooldown: 3, speed: 380, pierce: true },
  shield_bash:   { name: 'Shield Bash',   type: 'aoe', radius: 95, mult: 2.2, cooldown: 5 },
  arrow_rain:    { name: 'Arrow Rain',    type: 'proj', tex: 'bolt', mult: 2.2, cooldown: 4, speed: 520, pierce: true },
  shadow_strike: { name: 'Shadow Strike', type: 'aoe', radius: 70, mult: 3.0, cooldown: 5, dash: true },
};

export const MONSTERS = {
  wolf: {
    name: 'Sói', tex: 'wolf', hp: 300, atk: 30, def: 10, speed: 90,
    detect: 170, leash: 360, attackRange: 30, attackCd: 1.2, exp: 20, gold: 5, respawn: 20,
  },
  wolf_king: {
    name: 'Sói Chúa', tex: 'boss', boss: true, hp: 3000, atk: 45, def: 30, speed: 70,
    detect: 320, leash: 9999, attackRange: 55, attackCd: 1.5, exp: 400, gold: 150, respawn: 60,
  },
};

export const CHECKPOINTS = [
  { x: 200, y: 200, name: 'Làng khởi đầu' },
  { x: 1000, y: 800, name: 'Trạm nghỉ' },
];

export const SPAWNS = [
  { id: 'wolf', x: 500, y: 450 }, { id: 'wolf', x: 700, y: 650 },
  { id: 'wolf', x: 950, y: 450 }, { id: 'wolf', x: 600, y: 900 },
  { id: 'wolf', x: 1250, y: 650 },
  { id: 'wolf_king', x: 1500, y: 300 },
];

// ---- Khu vực mới: Hang Đá + Nhện Vương
MONSTERS.spider = {
  name: 'Nhện', tex: 'spider', hp: 450, atk: 38, def: 20, speed: 100,
  detect: 190, leash: 380, attackRange: 30, attackCd: 1.1, exp: 35, gold: 8, respawn: 20,
};
MONSTERS.spider_queen = {
  name: 'Nhện Vương', tex: 'spider_queen', boss: true, hp: 5500, atk: 60, def: 45, speed: 75,
  detect: 340, leash: 9999, attackRange: 55, attackCd: 1.4, exp: 700, gold: 250, respawn: 60, summon: 'spider',
};
MONSTERS.wolf_king.summon = 'wolf';

export const AREAS = {
  forest: { name: 'Rừng Cổ Đại', tile: 'grass', obst: 'tree', checkpoints: CHECKPOINTS, spawns: SPAWNS, portal: { x: 1650, y: 1050, to: 'cave' } },
  cave: {
    name: 'Hang Đá', tile: 'cave', obst: 'rock', need: 'q2', // khóa đến khi hoàn thành nhiệm vụ q2
    checkpoints: [{ x: 200, y: 1000, name: 'Cửa hang' }, { x: 900, y: 300, name: 'Trạm sâu' }],
    spawns: [
      { id: 'spider', x: 500, y: 850 }, { id: 'spider', x: 750, y: 700 }, { id: 'spider', x: 1000, y: 900 },
      { id: 'spider', x: 650, y: 450 }, { id: 'spider', x: 1150, y: 600 }, { id: 'spider', x: 1300, y: 900 },
      { id: 'spider_queen', x: 1500, y: 300 },
    ],
    portal: { x: 150, y: 1100, to: 'forest' },
  },
};

export const QUESTS = [
  { id: 'q1', name: 'Săn Sói', target: 'wolf', n: 5, reward: { exp: 150, gold: 100 } },
  { id: 'q2', name: 'Hạ Sói Chúa', target: 'wolf_king', n: 1, after: 'q1', unlock: 'cave', reward: { exp: 500, gold: 300 } },
  { id: 'q3', name: 'Quét sạch Nhện', target: 'spider', n: 8, after: 'q2', reward: { exp: 900, gold: 400 } },
  { id: 'q4', name: 'Hạ Nhện Vương', target: 'spider_queen', n: 1, after: 'q3', reward: { exp: 2000, gold: 1000 } },
];

// ---- Núi Lửa + Hỏa Long
MONSTERS.imp = {
  name: 'Hỏa Quỷ', tex: 'imp', hp: 650, atk: 55, def: 30, speed: 110,
  detect: 200, leash: 400, attackRange: 30, attackCd: 1.0, exp: 60, gold: 12, respawn: 20,
};
MONSTERS.fire_dragon = {
  name: 'Hỏa Long', tex: 'dragon', boss: true, hp: 9000, atk: 85, def: 60, speed: 80,
  detect: 360, leash: 9999, attackRange: 60, attackCd: 1.3, exp: 1500, gold: 600, respawn: 60, summon: 'imp',
};
AREAS.cave.portal2 = { x: 1700, y: 1100, to: 'volcano' };
AREAS.volcano = {
  name: 'Núi Lửa', tile: 'lava', obst: 'obsid', need: 'q4',
  checkpoints: [{ x: 200, y: 1000, name: 'Chân núi' }, { x: 900, y: 300, name: 'Miệng núi' }],
  spawns: [
    { id: 'imp', x: 500, y: 850 }, { id: 'imp', x: 750, y: 700 }, { id: 'imp', x: 1000, y: 900 },
    { id: 'imp', x: 650, y: 450 }, { id: 'imp', x: 1150, y: 600 }, { id: 'imp', x: 1300, y: 900 },
    { id: 'imp', x: 1100, y: 350 }, { id: 'fire_dragon', x: 1500, y: 300 },
  ],
  portal: { x: 150, y: 1100, to: 'cave' },
};
QUESTS.push(
  { id: 'q5', name: 'Dọn Hỏa Quỷ', target: 'imp', n: 10, after: 'q4', reward: { exp: 3000, gold: 1500 } },
  { id: 'q6', name: 'Hạ Hỏa Long', target: 'fire_dragon', n: 1, after: 'q5', reward: { exp: 6000, gold: 3000 } },
);

// ---- Băng Nguyên (làm chậm / đóng băng) + Vực Hắc Ám (khu vực cuối)
MONSTERS.frost_wolf = {
  name: 'Sói Băng', tex: 'frost_wolf', hp: 900, atk: 70, def: 40, speed: 120, fx: 'slow', // đòn đánh làm chậm
  detect: 210, leash: 420, attackRange: 30, attackCd: 1.0, exp: 90, gold: 16, respawn: 20,
};
MONSTERS.ice_king = {
  name: 'Băng Vương', tex: 'ice_king', boss: true, hp: 13000, atk: 105, def: 80, speed: 85, fx: 'slow', aoeFx: 'freeze', // AoE đóng băng 1 giây
  detect: 380, leash: 9999, attackRange: 60, attackCd: 1.3, exp: 2500, gold: 900, respawn: 60, summon: 'frost_wolf',
};
MONSTERS.shade = {
  name: 'Ác Linh', tex: 'shade', hp: 1300, atk: 95, def: 50, speed: 130,
  detect: 230, leash: 440, attackRange: 30, attackCd: 0.9, exp: 130, gold: 22, respawn: 20,
};
MONSTERS.ma_vuong = {
  name: 'Ma Vương', tex: 'ma_vuong', boss: true, hp: 20000, atk: 130, def: 100, speed: 95, aoeN: 2, // luôn tung 2 vòng cảnh báo
  detect: 400, leash: 9999, attackRange: 65, attackCd: 1.2, exp: 5000, gold: 2000, respawn: 90, summon: 'shade',
};
const ring = (mob, boss) => [[500, 850], [750, 700], [1000, 900], [650, 450], [1150, 600], [1300, 900], [1100, 350]]
  .map(([x, y]) => ({ id: mob, x, y })).concat({ id: boss, x: 1500, y: 300 });
const cps = [{ x: 200, y: 1000, name: 'Điểm nghỉ' }, { x: 900, y: 300, name: 'Điểm sâu' }];
AREAS.volcano.portal2 = { x: 1700, y: 1100, to: 'ice' };
AREAS.ice = {
  name: 'Băng Nguyên', tile: 'ice', obst: 'iceobs', need: 'q6', checkpoints: cps, spawns: ring('frost_wolf', 'ice_king'),
  portal: { x: 150, y: 1100, to: 'volcano' }, portal2: { x: 1700, y: 1100, to: 'dark' },
};
AREAS.dark = {
  name: 'Vực Hắc Ám', tile: 'void', obst: 'voidobs', need: 'q8', checkpoints: cps, spawns: ring('shade', 'ma_vuong'),
  portal: { x: 150, y: 1100, to: 'ice' },
};
QUESTS.find(q => q.id === 'q6').unlock = 'ice';
QUESTS.push(
  { id: 'q7', name: 'Quét sạch Sói Băng', target: 'frost_wolf', n: 12, after: 'q6', reward: { exp: 8000, gold: 3000 } },
  { id: 'q8', name: 'Hạ Băng Vương', target: 'ice_king', n: 1, after: 'q7', unlock: 'dark', reward: { exp: 12000, gold: 5000 } },
  { id: 'q9', name: 'Dọn Ác Linh', target: 'shade', n: 15, after: 'q8', reward: { exp: 15000, gold: 6000 } },
  { id: 'q10', name: 'Hạ Ma Vương', target: 'ma_vuong', n: 1, after: 'q9', reward: { exp: 30000, gold: 15000 } },
);

// ---- Tháp Thử Thách (Endless): tầng vô hạn, độ khó tăng theo tầng, boss mỗi 5 tầng
AREAS.forest.portal2 = { x: 1650, y: 150, to: 'tower' };
AREAS.tower = {
  name: 'Tháp Thử Thách', mode: 'tower', tile: 'void', obst: 'voidobs', need: 'q1', // mở khóa sau nhiệm vụ đầu
  checkpoints: [{ x: 900, y: 1000, name: 'Sảnh tháp' }], spawns: [],
  portal: { x: 150, y: 1100, to: 'forest' },
};

// ---- Đấu Trường Sinh Tồn: đợt quái liên tục mỗi 15 giây, không cần dọn sạch
AREAS.tower.portal2 = { x: 1700, y: 1100, to: 'survival' };
AREAS.survival = {
  name: 'Đấu Trường Sinh Tồn', mode: 'survival', tile: 'lava', obst: 'obsid', need: 'q2',
  checkpoints: [{ x: 900, y: 600, name: 'Trung tâm' }], spawns: [],
  portal: { x: 150, y: 1100, to: 'tower' },
};

// ---- Sảnh Thử Thách: gom các chế độ (Tháp, Sinh Tồn, Boss Challenge, Elite Rift, Phụ Bản Hàng Ngày)
AREAS.forest.portal2.to = 'hub';
AREAS.tower.portal.to = 'hub'; delete AREAS.tower.portal2;
AREAS.survival.portal.to = 'hub';
const back = { x: 150, y: 1100, to: 'hub' }, mid = [{ x: 900, y: 1000, name: 'Điểm nghỉ' }];
AREAS.hub = {
  name: 'Sảnh Thử Thách', tile: 'cave', obst: 'rock', checkpoints: [{ x: 900, y: 900, name: 'Sảnh' }], spawns: [],
  portal: { x: 150, y: 1100, to: 'forest' },
  extra: [{ x: 300, y: 500, to: 'tower' }, { x: 600, y: 500, to: 'survival' }, { x: 900, y: 500, to: 'bossrush' }, { x: 1200, y: 500, to: 'rift' }, { x: 1500, y: 500, to: 'daily' }],
};
AREAS.bossrush = { name: 'Thử Thách Boss', mode: 'bossrush', tile: 'lava', obst: 'obsid', need: 'q4', checkpoints: mid, spawns: [], portal: back };
AREAS.rift = { name: 'Khe Nứt Tinh Anh', mode: 'rift', tile: 'void', obst: 'voidobs', need: 'q6', checkpoints: mid, spawns: [], portal: back };
AREAS.daily = { name: 'Phụ Bản Hàng Ngày', mode: 'daily', tile: 'ice', obst: 'iceobs', need: 'q2', checkpoints: mid, spawns: [], portal: back };
