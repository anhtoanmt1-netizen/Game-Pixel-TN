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
  mage:   { name: 'Pháp Sư',  hp: 90,  atk: 100, matk: 120, def: 70,  crit: 5,  dodge: 5,  speed: 170, range: 260, basicMult: 1.0 },
  knight: { name: 'Hiệp Sĩ',  hp: 140, atk: 100, matk: 60,  def: 130, crit: 3,  dodge: 3,  speed: 150, range: 40,  basicMult: 1.0 },
  elf:    { name: 'Cung Thủ', hp: 100, atk: 100, matk: 70,  def: 80,  crit: 8,  dodge: 8,  speed: 170, range: 300, basicMult: 1.0 },
  rogue:  { name: 'Sát Thủ',  hp: 95,  atk: 100, matk: 60,  def: 75,  crit: 12, dodge: 12, speed: 190, range: 40,  basicMult: 1.0 },
};

export const SKILLS = {
  fireball: { name: 'Fireball', mult: 2.5, cooldown: 3, speed: 380, pierce: true },
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
