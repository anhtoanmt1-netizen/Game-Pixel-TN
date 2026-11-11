import { CFG, CLASSES, SKILLS, MONSTERS, AREAS, QUESTS } from './data.js';
import { calcDamage, rollCrit, rollDodge } from './combat.js';
import { TOUCH } from './touch.js';
import { lookStage, PETS, ACHS, RARITY, CARDS, derive, expNeed, genItem, rollRarity, addCard } from './items.js';
import { save, load } from './save.js';
import { initBoard, pickClass } from './board.js';
import { initHud } from './hud.js';
import { initAudio, sfx } from './audio.js';
import { buildSprites } from './sprites.js';
import { buildMap, AREA_THEME } from './maps.js';

// Trạng thái tiến trình người chơi (được lưu vào IndexedDB)
const G = Object.assign({ level: 1, exp: 0, gold: 0, inv: [], eq: {}, cards: [], deck: [], pity: 0, cap: 300, q: {}, area: 'forest', sk: {}, mat: { stone: 0 }, st: { kills: 0, boss: 0 }, ach: {}, set: { sfx: true, music: true, vol: 0.5, lowfx: false, zoom: 'near', minimap: true }, pet: null, look: null, petLv: {} }, await load() || {});
if (!G.classId) { G.classId = await pickClass(CLASSES); await save(G); }
CFG.classId = G.classId;
G.set = { sfx: true, music: true, vol: 0.5, lowfx: false, zoom: 'near', minimap: true, ...G.set };
const AREA = AREAS[G.area] || AREAS.forest;
const AREA_ID = AREAS[G.area] ? G.area : 'forest';
const CHECKPOINTS = AREA.checkpoints, SPAWNS = AREA.spawns;

const dist = (a, b) => Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);

const scaled = (d, k) => ({ ...d, hp: Math.round(d.hp * k), atk: Math.round(d.atk * k), exp: Math.round(d.exp * k), gold: Math.round(d.gold * k) });

const FLOOR_MODES = ['tower', 'bossrush', 'rift', 'daily'];
const recKey = m => (m === 'tower' ? 'best' : 'rec_' + m);

class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  // ---------- Texture tạm bằng code (thay bằng sprite thật ở giai đoạn Polish) ----------
  preload() { // chỉ nạp atlas của chủ đề màu khu vực hiện tại
    const t = AREA_THEME[AREA_ID];
    this.load.atlas('th_' + t, `assets/${t}.png`, `assets/${t}.json`);
  }

  makeTextures() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const tex = (key, w, h, fn) => { g.clear(); fn(g); g.generateTexture(key, w, h); };
    tex('grass', 64, 64, g => { g.fillStyle(0x3b6b3a).fillRect(0, 0, 64, 64); g.fillStyle(0x437a41).fillRect(0, 0, 32, 32).fillRect(32, 32, 32, 32); });
    tex('tree', 32, 40, g => { g.fillStyle(0x5a3a1a).fillRect(12, 24, 8, 16); g.fillStyle(0x1f4d2a).fillCircle(16, 14, 14); });
    tex('player', 28, 28, g => { g.fillStyle(0x4a7bff).fillRoundedRect(2, 2, 24, 24, 6); g.fillStyle(0xffffff).fillRect(16, 9, 6, 6); });
    tex('wolf', 28, 28, g => { g.fillStyle(0x8a8f99).fillRoundedRect(2, 4, 24, 20, 6); g.fillStyle(0xff4040).fillRect(17, 9, 4, 4); });
    tex('boss', 72, 72, g => { g.fillStyle(0x5b2a2a).fillRoundedRect(4, 8, 64, 56, 14); g.fillStyle(0xffd34d).fillRect(44, 22, 9, 9); });
    tex('bolt', 10, 10, g => { g.fillStyle(0x9fd0ff).fillCircle(5, 5, 5); });
    tex('fire', 20, 20, g => { g.fillStyle(0xff7a1a).fillCircle(10, 10, 10); g.fillStyle(0xffd34d).fillCircle(10, 10, 5); });
    tex('cp', 40, 40, g => { g.lineStyle(3, 0x6ee7ff).strokeCircle(20, 20, 17); g.fillStyle(0x6ee7ff, 0.25).fillCircle(20, 20, 17); });
    tex('cave', 64, 64, g => { g.fillStyle(0x2b2b36).fillRect(0, 0, 64, 64); g.fillStyle(0x33333f).fillRect(0, 0, 32, 32).fillRect(32, 32, 32, 32); });
    tex('rock', 32, 32, g => { g.fillStyle(0x6b6b78).fillCircle(16, 18, 14); g.fillStyle(0x8a8a99).fillCircle(12, 13, 6); });
    tex('spider', 28, 28, g => { g.fillStyle(0x3a2a4a).fillCircle(14, 14, 10); g.fillStyle(0x66ff66).fillRect(15, 9, 4, 4); g.lineStyle(2, 0x3a2a4a).strokeCircle(14, 14, 13); });
    tex('spider_queen', 72, 72, g => { g.fillStyle(0x2a1a3a).fillCircle(36, 36, 26); g.fillStyle(0x66ff66).fillRect(40, 24, 9, 9); g.lineStyle(4, 0x2a1a3a).strokeCircle(36, 36, 33); });
    tex('portal', 48, 48, g => { g.lineStyle(4, 0xb066ff).strokeCircle(24, 24, 20); g.fillStyle(0xb066ff, 0.3).fillCircle(24, 24, 20); });
    tex('lava', 64, 64, g => { g.fillStyle(0x3a1410).fillRect(0, 0, 64, 64); g.fillStyle(0x4a1a12).fillRect(0, 0, 32, 32).fillRect(32, 32, 32, 32); g.fillStyle(0xff6a1a, 0.5).fillRect(10, 40, 14, 4); });
    tex('obsid', 32, 32, g => { g.fillStyle(0x201c28).fillCircle(16, 18, 14); g.fillStyle(0x5a4a7a).fillCircle(12, 13, 5); });
    tex('imp', 28, 28, g => { g.fillStyle(0xd64a1a).fillCircle(14, 15, 10); g.fillStyle(0xffd34d).fillRect(15, 10, 4, 4); g.fillStyle(0xd64a1a).fillTriangle(6, 8, 10, 0, 12, 8).fillTriangle(16, 8, 20, 0, 24, 8); });
    tex('dragon', 80, 80, g => { g.fillStyle(0x8a1a12).fillRoundedRect(6, 12, 68, 58, 18); g.fillStyle(0xffd34d).fillRect(50, 26, 10, 10); g.fillStyle(0xff7a1a).fillTriangle(10, 12, 20, 0, 30, 12).fillTriangle(50, 12, 60, 0, 70, 12); });
    const tile = (k, a, b) => tex(k, 64, 64, g => { g.fillStyle(a).fillRect(0, 0, 64, 64); g.fillStyle(b).fillRect(0, 0, 32, 32).fillRect(32, 32, 32, 32); });
    const obs = (k, a, b) => tex(k, 32, 32, g => { g.fillStyle(a).fillCircle(16, 18, 14); g.fillStyle(b).fillCircle(12, 13, 5); });
    tile('ice', 0x9fc8e8, 0xb0d6f0); obs('iceobs', 0xcfe8ff, 0xffffff);
    tile('void', 0x14101e, 0x1b1528); obs('voidobs', 0x2a1f40, 0x6a3fa0);
    tex('frost_wolf', 28, 28, g => { g.fillStyle(0xcfe8ff).fillRoundedRect(2, 4, 24, 20, 6); g.fillStyle(0x2a6fff).fillRect(17, 9, 4, 4); });
    tex('ice_king', 76, 76, g => { g.fillStyle(0x6fb6e8).fillRoundedRect(4, 8, 68, 60, 14); g.fillStyle(0xffffff).fillRect(46, 24, 9, 9); g.fillTriangle(10, 8, 20, 0, 30, 8).fillTriangle(46, 8, 56, 0, 66, 8); });
    tex('shade', 28, 28, g => { g.fillStyle(0x4a2a6a).fillCircle(14, 14, 11); g.fillStyle(0xff4aff).fillRect(9, 10, 4, 4).fillRect(16, 10, 4, 4); });
    tex('ma_vuong', 88, 88, g => { g.fillStyle(0x2a0f3a).fillRoundedRect(6, 10, 76, 70, 20); g.fillStyle(0xff4040).fillRect(30, 30, 10, 10).fillRect(50, 30, 10, 10); g.fillStyle(0x8a3fd0).fillTriangle(10, 10, 22, 0, 34, 10).fillTriangle(54, 10, 66, 0, 78, 10); });
    tex('px', 2, 2, g => { g.fillStyle(0xffffff).fillRect(0, 0, 2, 2); }); // khối va chạm vô hình
    g.destroy();
    buildSprites(this, CFG.classId); // thay hình khối tạm bằng pixel art (cùng tên texture)
  }

  create() {
    this.makeTextures();
    const { w: W, h: H } = CFG.world;
    this.physics.world.setBounds(0, 0, W, H);

    // Điểm hồi sinh
    CHECKPOINTS.forEach(c => this.add.image(c.x, c.y, 'cp').setDepth(1));
    this.portals = [AREA.portal, AREA.portal2, ...(AREA.extra || [])].filter(Boolean); this.portalT = 0;
    this.portals.forEach(p => {
      this.add.image(p.x, p.y, 'portal').setDepth(1);
      this.add.text(p.x, p.y + 34, AREAS[p.to].name, { fontFamily: 'Montserrat, sans-serif', fontStyle: 'bold', fontSize: '12px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(2);
    });

    // Bản đồ: nền gạch 48px, đường mòn, ao hồ, cây/đá/cảnh vật theo chủ đề màu của khu vực
    const built = buildMap(this, AREA_ID, AREA, W, H);
    this.trees = built.group;

    // Người chơi
    const c = CLASSES[CFG.classId];
    this.p = this.physics.add.sprite(CHECKPOINTS[0].x, CHECKPOINTS[0].y, 'player').setDepth(5).setCollideWorldBounds(true);
    this.p.body.setSize(20, 20);
    this.ps = {
      ...c, maxHp: c.hp * CFG.hpScale, hp: c.hp * CFG.hpScale,
      atkCd: 0, skillCd: 0, dodgeCd: 0, dashT: 0, iframes: 0,
    };
    this.face = new Phaser.Math.Vector2(1, 0);
    this.target = null;
    this.drops = [];
    this.autoAll = true; // Nhặt đồ: P đổi giữa tự động hết / E cho đồ hiếm
    this.applyStats(true);
    this.board = initBoard(G, {
      ps: () => this.ps, msg: t => this.msg(t), toggleAuto: () => this.toggleAuto(), travel: id => this.travelTo(id),
      onChange: () => { this.applyStats(); this.syncPet(); this.applyZoom(); this.persist(); },
      onOpen: () => this.scene.pause(), onClose: () => this.scene.resume(),
    });
    initAudio(() => G.set, G.area);
    this.syncPet();
    window.addEventListener('beforeunload', () => this.persist());
    this.auto = false;
    this.playerDead = false;
    this.stats = { kills: 0, exp: 0, gold: 0 };
    this.telegraphs = [];

    // Quái, đạn
    this.enemies = this.physics.add.group();
    this.projs = this.physics.add.group();
    SPAWNS.forEach(s => this.spawn(s.id, s.x, s.y));
    if (FLOOR_MODES.includes(AREA.mode)) { this.floor = 0; this.floorWait = false; this.nextFloor(); }
    if (AREA.mode === 'survival') { this.wave = 0; this.waveT = 3; }
    this.physics.add.collider(this.p, this.trees);
    this.physics.add.collider(this.enemies, this.trees);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.projs, this.trees, pr => pr.destroy());
    this.physics.add.overlap(this.projs, this.enemies, (pr, e) => this.onProjHit(pr, e));

    // Camera: theo nhân vật, giới hạn trong bản đồ
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H).startFollow(this.p, true, 0.1, 0.1);

    // Điều khiển
    this.keys = this.input.keyboard.addKeys('W,A,S,D,J,Q,E,P,Z,M,TAB,ONE,SPACE');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.on('pointerdown', ptr => {
      if (ptr.event && ptr.event.target && ptr.event.target.closest && ptr.event.target.closest('#touch')) return;
      const wp = ptr.positionToCamera(cam);
      const hit = this.enemies.getChildren().filter(e => e.active && !e.dead && Math.hypot(e.x - wp.x, e.y - wp.y) < 36)
        .sort((a, b) => dist(a, wp) - dist(b, wp))[0];
      this.target = hit || null; // click quái = khóa mục tiêu; click đất = bỏ khóa
    });

    // HUD là DOM trong khung 16:9 (hud.js); ở đây chỉ còn lớp đồ họa nằm trong thế giới
    this.gfx = this.add.graphics().setDepth(5000);
    this.hudApi = initHud(document.getElementById('stage'), { bag: () => this.board.toggle(), zoom: () => this.cycleZoom(), auto: () => this.toggleAuto(), set: () => this.board.open('equip', 'set') });
    this.hudApi.setMap({ W, H, theme: AREA_THEME[AREA_ID], blocks: built.layout.blocks, portals: this.portals, checkpoints: CHECKPOINTS });
    this.applyZoom();
    if (this.pendingMsg) this.hudApi.msg(this.pendingMsg);
  }

  applyZoom() { this.cameras.main.setZoom({ near: 1.5, wide: 1.0, ultra: 0.7 }[G.set.zoom] || 1.5); } // gần / rộng / siêu rộng
  cycleZoom() {
    G.set.zoom = { near: 'wide', wide: 'ultra', ultra: 'near' }[G.set.zoom || 'near'];
    this.msg('Tầm nhìn: ' + { near: 'Gần', wide: 'Rộng', ultra: 'Siêu rộng' }[G.set.zoom]); this.applyZoom(); this.persist();
  }
  toggleAuto() { this.auto = !this.auto; this.msg(this.auto ? 'Auto Battle: BẬT' : 'Auto Battle: TẮT'); }
  travelTo(id) { if (this.traveling) return; this.traveling = true; G.area = id; this.msg('Đang dịch chuyển...'); save(G).then(() => location.reload()); }

  msg(t) { if (this.hudApi) this.hudApi.msg(t); else this.pendingMsg = t; }

  popup(x, y, text, color = '#fff') {
    if (G.set.lowfx && color === '#ffffff') return; // giảm hiệu ứng: bỏ số sát thương thường
    const t = this.add.text(x, y, String(text), { fontFamily: 'Montserrat, sans-serif', fontStyle: 'bold', fontSize: '16px', color, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(5000);
    this.tweens.add({ targets: t, y: y - 34, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  // ---------- Tiến trình, rơi đồ, lưu ----------
  applyStats(full) {
    const s = this.ps, r = full ? 1 : s.hp / s.maxHp;
    Object.assign(s, derive(CLASSES[CFG.classId], G, CFG));
    s.hp = Math.max(1, Math.round(s.maxHp * r));
  }

  persist() { save(G); }

  gainExp(n) {
    G.exp += Math.round(n * (1 + this.ps.exp_bonus / 100));
    let up = false;
    while (G.exp >= expNeed(G.level) && G.level < 100) { G.exp -= expNeed(G.level); G.level++; up = true; }
    if (up) { sfx('level'); this.applyStats(); this.ps.hp = this.ps.maxHp; this.msg(`LÊN CẤP ${G.level}! (+1 điểm kỹ năng – mở Túi đồ I)`); this.persist(); }
  }

  dropLoot(e) {
    const boss = e.d.boss, out = [];
    const rift = AREA.mode === 'rift'; // Elite Rift: luôn rơi đồ, tối thiểu Epic
    const n = boss ? 2 : (rift || Math.random() < 0.45 ? 1 : 0);
    for (let i = 0; i < n; i++) out.push({ item: genItem(G.level + (boss ? 3 : 0), rollRarity(G, boss ? 2 : (rift ? 3 : 0)), undefined, e.id === 'fire_dragon' && Math.random() < 0.5 ? 'dragon' : undefined) });
    if (Math.random() < (boss ? 1 : 0.1)) out.push({ card: e.id });
    const extra = Object.keys(CARDS).filter(k => CARDS[k].kind); // thẻ kỹ năng / di vật
    if (Math.random() < (boss ? 0.6 : 0.04)) out.push({ card: extra[Math.floor(Math.random() * extra.length)] });
    out.forEach(o => {
      const hex = o.card ? 0x6ee7ff : parseInt(RARITY[o.item.ri].color.slice(1), 16);
      const d = this.add.rectangle(e.x + Phaser.Math.Between(-24, 24), e.y + Phaser.Math.Between(-24, 24), 12, 12, hex).setStrokeStyle(1, 0xffffff).setDepth(2);
      Object.assign(d, o, { low: o.card ? false : o.item.ri <= 1 });
      this.drops.push(d);
    });
  }

  updateDrops() {
    const k = this.keys, E = Phaser.Input.Keyboard.JustDown(k.E);
    if (Phaser.Input.Keyboard.JustDown(k.P)) { this.autoAll = !this.autoAll; this.msg(this.autoAll ? 'Nhặt: tự động mọi đồ' : 'Nhặt: tự động đồ thường, nhấn E cho đồ hiếm'); }
    this.drops = this.drops.filter(d => {
      if (this.playerDead || (dist(this.p, d) > 40 && !(this.pet && PETS[G.pet].magnet && dist(this.pet, d) < 60))) return true; // thú đồng hành cũng nhặt đồ
      if (!(this.autoAll || d.low || E)) return true;
      if (d.card) { addCard(G, d.card); this.msg(`Nhận thẻ: ${CARDS[d.card].name}`); }
      else if (G.inv.length >= G.cap) { this.msg('Túi đồ đã đầy!'); return true; }
      else { G.inv.push(d.item); this.msg(`Nhặt: ${d.item.name}`); }
      d.destroy(); sfx('pick'); this.board.refresh(); this.persist();
      return false;
    });
  }

  // ---------- Quái vật ----------
  spawn(id, x, y, summoned = false, scale = 0) {
    const d = scale ? scaled(MONSTERS[id], scale) : MONSTERS[id];
    const e = this.enemies.create(x, y, d.tex).setDepth(4).setCollideWorldBounds(true);
    Object.assign(e, { d, id, hp: d.hp, home: { x, y }, state: 'idle', t: 0, cd: 0, wind: 0, dead: false, invuln: 0, summoned, phase: 0, enraged: false, aoeT: 3, wander: { x, y, t: 0 } });
    if (d.boss) e.body.setSize(54, 54);
    return e;
  }

  moveTo(e, tgt, speed) { this.physics.moveToObject(e, tgt, speed); }

  updateEnemy(e, dt) {
    if (!e.active || e.dead) return;
    e.setDepth(10 + e.y); // đứng sau/trước cây theo vị trí y
    const d = e.d, P = this.p, alive = !this.playerDead;
    const dp = dist(e, P), dh = dist(e, e.home);
    e.cd = Math.max(0, e.cd - dt);
    if (e.invuln > 0) { e.invuln -= dt; e.setAlpha(0.6); } else e.setAlpha(1);
    const speed = d.speed * (e.enraged ? 1.4 : 1);

    if (d.boss) this.bossLogic(e, dt, alive);

    switch (e.state) {
      case 'idle': // tuần tra nhẹ quanh điểm gốc
        e.wander.t -= dt;
        if (e.wander.t <= 0) e.wander = { x: e.home.x + Phaser.Math.Between(-60, 60), y: e.home.y + Phaser.Math.Between(-60, 60), t: Phaser.Math.FloatBetween(1.5, 3.5) };
        if (dist(e, e.wander) > 6) this.moveTo(e, e.wander, speed * 0.3); else e.body.setVelocity(0, 0);
        if (alive && dp < d.detect) e.state = 'chase'; // Detect → Chase
        break;
      case 'chase':
        if (!alive || (!d.boss && dh > d.leash)) { e.state = 'return'; break; }
        if (dp <= d.attackRange) {
          e.body.setVelocity(0, 0);
          if (e.cd <= 0) { e.state = 'attack'; e.wind = 0.4; }
        } else this.moveTo(e, P, speed);
        break;
      case 'attack': // có độ trễ ra đòn để người chơi kịp né
        e.body.setVelocity(0, 0);
        e.wind -= dt;
        e.setTint(0xffaaaa);
        if (e.wind <= 0) {
          e.clearTint();
          if (dist(e, P) <= d.attackRange + 14) this.hurtPlayer(d.atk, false, d.fx);
          e.cd = d.attackCd; e.state = 'cooldown'; e.t = 0.3;
        }
        break;
      case 'cooldown':
        e.body.setVelocity(0, 0);
        e.t -= dt;
        if (e.t <= 0) e.state = 'chase';
        break;
      case 'return':
        this.moveTo(e, e.home, speed * 1.2);
        e.hp = Math.min(d.hp, e.hp + d.hp * 0.2 * dt);
        if (dh < 8) { e.body.setVelocity(0, 0); e.state = 'idle'; }
        else if (alive && !d.boss && dp < d.detect * 0.6 && dh < d.leash * 0.8) e.state = 'chase';
        else if (alive && d.boss && dp < d.detect) e.state = 'chase';
        break;
    }
  }

  bossLogic(e, dt, alive) {
    const d = e.d, ratio = e.hp / d.hp;
    if (e.phase < 1 && ratio <= 0.6) {
      e.phase = 1; e.invuln = 1.2;
      this.msg(`${d.name} triệu hồi đàn con!`);
      for (let i = 0; i < 2; i++) this.spawn(d.summon || 'wolf', e.x + (i ? 70 : -70), e.y + 40, true);
    }
    if (e.phase < 2 && ratio <= 0.3) {
      e.phase = 2; e.enraged = true; e.invuln = 1.2;
      this.msg(`${d.name} nổi cuồng!`);
    }
    if (!alive || e.state === 'idle' || e.state === 'return') return;
    e.aoeT -= dt;
    if (e.aoeT <= 0) { // tấn công diện rộng CÓ CẢNH BÁO
      const n = e.enraged ? 3 : (d.aoeN || 1);
      for (let i = 0; i < n; i++) {
        const off = i ? Phaser.Math.Between(-130, 130) : 0;
        this.telegraphs.push({ x: this.p.x + off, y: this.p.y + (i ? Phaser.Math.Between(-130, 130) : 0), r: 90, t: 0, dur: 1.0, dmg: d.atk * 1.8, fx: d.aoeFx });
      }
      e.aoeT = e.enraged ? 2.5 : 4;
    }
  }

  updateTelegraphs(dt) {
    this.telegraphs = this.telegraphs.filter(z => {
      z.t += dt;
      const k = Math.min(1, z.t / z.dur);
      this.gfx.fillStyle(0xff2020, 0.15 + 0.25 * k).fillCircle(z.x, z.y, z.r);
      this.gfx.lineStyle(2, 0xff5050, 0.9).strokeCircle(z.x, z.y, z.r * k);
      this.gfx.lineStyle(2, 0xff5050, 0.9).strokeCircle(z.x, z.y, z.r);
      if (z.t < z.dur) return true;
      if (!this.playerDead && dist(this.p, z) <= z.r) this.hurtPlayer(z.dmg, true, z.fx);
      return false;
    });
  }

  // ---------- Sát thương ----------
  hurtPlayer(raw, ignoreStatDodge, fx) {
    const s = this.ps;
    if (this.playerDead || s.iframes > 0) return; // đang lướt né = miễn sát thương
    if (!ignoreStatDodge && rollDodge(s.dodge, CFG.dodgeCap)) { this.popup(this.p.x, this.p.y - 20, 'Né!', '#8ff'); return; }
    const dmg = calcDamage(raw, 1, s.def);
    s.hp = Math.max(0, s.hp - dmg);
    this.popup(this.p.x, this.p.y - 20, dmg, '#ff6b6b'); sfx('hurt');
    this.p.setTint(0xff8888); this.time.delayedCall(80, () => this.p.clearTint());
    if (fx === 'slow') s.slowT = 2;
    if (fx === 'freeze') { s.freezeT = 1; this.msg('Bị đóng băng!'); }
    if (s.hp <= 0) this.playerDie();
  }

  playerDie() {
    this.playerDead = true;
    this.p.body.setVelocity(0, 0); this.p.setAlpha(0.4);
    this.msg('Bạn đã bị hạ gục – hồi sinh tại điểm gần nhất (không mất đồ)');
    this.time.delayedCall(1500, () => {
      const cp = [...CHECKPOINTS].sort((a, b) => dist(a, this.p) - dist(b, this.p))[0];
      this.p.setPosition(cp.x, cp.y).setAlpha(1);
      this.ps.hp = this.ps.maxHp; this.ps.iframes = 2;
      this.playerDead = false; this.target = null;
      if (AREA.mode === 'survival') { this.enemies.clear(true, true); this.wave = 0; this.waveT = 3; } // thua thì làm lại từ đợt 1
      this.enemies.getChildren().forEach(e => { if (e.active && !e.dead && e.state !== 'idle') e.state = 'return'; });
    });
  }

  hitEnemy(e, mult) {
    if (!e.active || e.dead) return;
    if (e.invuln > 0) { this.popup(e.x, e.y - 24, 'Miễn nhiễm', '#aaa'); return; }
    const s = this.ps, crit = rollCrit(s.crit, CFG.critCap);
    let dmg = calcDamage(s.matk, mult, e.d.def);
    if (crit) dmg = Math.round(dmg * s.critDmg);
    if (e.d.boss && s.boss_dmg) dmg = Math.round(dmg * (1 + s.boss_dmg / 100));
    e.hp -= dmg;
    if (s.lifesteal) s.hp = Math.min(s.maxHp, s.hp + Math.min(dmg * s.lifesteal / 100, s.maxHp * 0.03)); // trần hồi 3% HP/đòn
    this.popup(e.x, e.y - 24, dmg, crit ? '#ffd34d' : '#ffffff'); sfx(crit ? 'crit' : 'hit');
    if (e.state === 'idle') e.state = 'chase';
    e.setTintFill(0xffffff); this.time.delayedCall(60, () => e.active && e.clearTint());
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    e.dead = true; e.body.setVelocity(0, 0);
    this.stats.kills++; G.st.kills++; if (e.d.boss && !e.summoned) G.st.boss++; if (this.ps.heal_kill) this.ps.hp = Math.min(this.ps.maxHp, this.ps.hp + this.ps.maxHp * this.ps.heal_kill / 100); this.gainExp(e.d.exp); G.gold += Math.round(e.d.gold * (1 + this.ps.gold_bonus / 100)); this.dropLoot(e); if (!e.summoned) this.questKill(e.id);
    this.popup(e.x, e.y - 40, `+${e.d.exp} EXP`, '#9f9');
    if (this.target === e) this.target = null;
    if (e.d.boss) this.msg('BOSS bị tiêu diệt!');
    if (e.summoned) { e.destroy(); return; }
    e.disableBody(true, true);
    this.time.delayedCall(e.d.respawn * 1000, () => {
      e.enableBody(true, e.home.x, e.home.y, true, true);
      Object.assign(e, { hp: e.d.hp, state: 'idle', dead: false, phase: 0, enraged: false, invuln: 0, aoeT: 3 });
    });
  }

  onProjHit(pr, e) {
    if (!e.active || e.dead || pr.hit.has(e)) return;
    pr.hit.add(e);
    this.hitEnemy(e, pr.mult);
    if (!pr.pierce) pr.destroy();
  }

  // ---------- Người chơi ----------
  drawAura() { // ngoại hình tiến hóa: chỉ là hiệu ứng hình ảnh
    const st = lookStage(G); if (!st) return;
    const cols = [0, 0x6fb6ff, 0x6ee7ff, 0xffd34d, 0xff4aff], c = cols[st], p = this.p;
    const r = 18 + (st >= 4 ? 3 * Math.sin(this.time.now / 200) : 0);
    this.gfx.lineStyle(2, c, 0.8).strokeCircle(p.x, p.y, r);
    if (st >= 2) this.gfx.fillStyle(c, 0.12).fillCircle(p.x, p.y, r + 4);
  }

  syncPet() {
    const def = PETS[G.pet], ok = def && G.q[def.unlock] && G.q[def.unlock].done;
    if (this.pet && (!ok || this.petId !== G.pet)) { this.pet.destroy(); this.pet = null; }
    if (ok && !this.pet) { this.pet = this.add.circle(this.p.x - 24, this.p.y, 7, def.color).setStrokeStyle(1, 0xffffff).setDepth(5); this.petId = G.pet; }
  }

  updatePet(dt) {
    if (!this.pet) return;
    const k = Math.min(1, dt * 5);
    this.pet.x += (this.p.x - 26 - this.pet.x) * k; this.pet.y += (this.p.y + 10 - this.pet.y) * k;
    this.pet.setDepth(10 + this.pet.y);
    if (PETS[G.pet].shoot && !this.playerDead && (this.petT = (this.petT || 0) - dt) <= 0) {
      const t = this.nearestEnemy(300);
      if (t) { this.fire('bolt', 0.6, 420, false, t, this.pet); this.petT = 2; }
    }
  }

  nextWave() {
    const w = ++this.wave, tier = Math.min(4, Math.floor((w - 1) / 4)), sc = 1 + 0.15 * (w - 1);
    const mobs = ['wolf', 'spider', 'imp', 'frost_wolf', 'shade'], n = Math.min(14, 2 + w);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Phaser.Math.Between(300, 450);
      const x = Phaser.Math.Clamp(this.p.x + Math.cos(a) * r, 60, CFG.world.w - 60), y = Phaser.Math.Clamp(this.p.y + Math.sin(a) * r, 60, CFG.world.h - 60);
      const e = this.spawn(mobs[tier], x, y, true, sc);
      e.d.leash = 99999; e.state = 'chase'; // quái sinh tồn luôn truy đuổi
    }
    G.st.surv = Math.max(G.st.surv || 0, w); G.gold += 15 * w; G.mat.stone += Math.floor(w / 2);
    this.msg(`Đợt ${w}! +${15 * w} vàng`); this.persist();
  }

  nextFloor() {
    const f = ++this.floor, m = AREA.mode;
    const mobs = ['wolf', 'spider', 'imp', 'frost_wolf', 'shade'], bosses = ['wolf_king', 'spider_queen', 'fire_dragon', 'ice_king', 'ma_vuong'];
    let tier = Math.min(4, Math.floor((f - 1) / 5)), sc = 1 + 0.2 * (f - 1), boss = f % 5 === 0, n = boss ? 4 : Math.min(12, 3 + f), elite = false;
    if (m === 'bossrush') { tier = (f - 1) % 5; sc = 1 + 0.15 * Math.floor((f - 1) / 5); boss = true; n = 0; } // lần lượt từng boss
    if (m === 'rift') { sc = 2 + 0.3 * (f - 1); elite = true; } // quái tinh anh, độ khó cao
    if (m === 'daily') { tier = Math.min(4, Math.floor(G.level / 20)); sc = 1 + 0.15 * (f - 1); boss = f === 5; n = boss ? 3 : 3 + f; }
    for (let i = 0; i < n; i++) {
      const e = this.spawn(mobs[tier], Phaser.Math.Between(CFG.world.w * 0.2, CFG.world.w * 0.82), Phaser.Math.Between(CFG.world.h * 0.15, CFG.world.h * 0.7), true, sc);
      if (elite) e.setTint(0xffb0b0);
    }
    if (boss) this.spawn(bosses[tier], CFG.world.w / 2, CFG.world.h * 0.25, true, sc);
    this.msg(`Tầng ${f}${boss ? ' – BOSS' : ''}${elite ? ' (Tinh anh)' : ''}`);
  }

  questDone(id) { return !!(G.q[id] && G.q[id].done); }

  questKill(id) {
    QUESTS.forEach(q => {
      if (q.target !== id || this.questDone(q.id) || (q.after && !this.questDone(q.after))) return;
      const st = G.q[q.id] || (G.q[q.id] = { p: 0, done: false });
      if (++st.p < q.n) return;
      st.done = true; this.gainExp(q.reward.exp); G.gold += q.reward.gold;
      this.msg(`Hoàn thành: ${q.name}${q.unlock ? ' – mở khóa ' + AREAS[q.unlock].name : ''}`);
      this.persist();
    });
  }

  questText() {
    if (FLOOR_MODES.includes(AREA.mode)) return `Tầng ${this.floor} · Kỷ lục ${G.st[recKey(AREA.mode)] || 0}`;
    if (AREA.mode === 'survival') return `Đợt ${this.wave} · Kỷ lục ${G.st.surv || 0}`;
    const q = QUESTS.find(x => !this.questDone(x.id) && (!x.after || this.questDone(x.after)));
    return q ? `Nhiệm vụ: ${q.name} ${(G.q[q.id] || { p: 0 }).p}/${q.n}` : 'Đã hoàn thành mọi nhiệm vụ';
  }

  updatePortal(dt) {
    const pt = this.portals.find(p => dist(this.p, p) <= 40);
    if (!pt || this.playerDead || this.traveling) { this.portalT = 0; return; }
    const to = AREAS[pt.to];
    if (to.need && !this.questDone(to.need)) { // khu vực chưa mở khóa
      if (!this.lockMsg) {
        this.lockMsg = true; this.msg(`${to.name} bị khóa: hoàn thành "${QUESTS.find(q => q.id === to.need).name}"`);
        this.time.delayedCall(3000, () => { this.lockMsg = false; });
      }
      return;
    }
    this.portalT += dt;
    if (this.portalT >= 1) {
      this.traveling = true; G.area = pt.to; this.msg('Đang dịch chuyển...');
      save(G).then(() => location.reload());
    }
  }

  meleeHit(mult, radius) {
    const p = this.p;
    const c = this.add.circle(p.x, p.y, radius, 0xffffff, G.set.lowfx ? 0 : 0.25).setDepth(4000);
    this.tweens.add({ targets: c, alpha: 0, duration: 150, onComplete: () => c.destroy() });
    this.enemies.getChildren().forEach(e => { if (e.active && !e.dead && dist(p, e) <= radius + 14) this.hitEnemy(e, mult); });
  }

  castSkill(sk, t) {
    sfx('skill');
    const twin = G.deck.includes('sc_twin') && G.cards.some(c => c.t === 'sc_twin');
    sk = { ...sk, mult: sk.mult * (1 + this.ps.skillDmg / 100), radius: sk.radius ? sk.radius * (twin ? 1.3 : 1) : undefined };
    if (sk.type === 'proj') {
      this.fire(sk.tex, sk.mult, sk.speed, sk.pierce, t);
      if (twin) this.time.delayedCall(150, () => this.fire(sk.tex, sk.mult * 0.6, sk.speed, sk.pierce, t));
      return;
    }
    if (sk.dash) {
      if (t) this.face.set(t.x - this.p.x, t.y - this.p.y).normalize();
      this.ps.dashT = 0.15; this.ps.iframes = Math.max(this.ps.iframes, 0.25);
      this.time.delayedCall(150, () => this.meleeHit(sk.mult, sk.radius));
    } else this.meleeHit(sk.mult, sk.radius);
  }

  nearestEnemy(range) {
    let best = null, bd = range;
    this.enemies.getChildren().forEach(e => {
      if (!e.active || e.dead) return;
      const d = dist(this.p, e);
      if (d < bd) { bd = d; best = e; }
    });
    return best;
  }

  fire(tex, mult, speed, pierce, tgt, src = this.p) {
    const dir = tgt ? new Phaser.Math.Vector2(tgt.x - src.x, tgt.y - src.y).normalize() : this.face.clone();
    const pr = this.projs.create(src.x, src.y, tex).setDepth(4000);
    pr.body.setAllowGravity(false);
    pr.setVelocity(dir.x * speed, dir.y * speed);
    Object.assign(pr, { mult, pierce, hit: new Set(), life: 1.3 });
  }

  updatePlayer(dt) {
    const s = this.ps, k = this.keys, cu = this.cursors;
    const once = TOUCH.once;
    // Di chuyển tự do
    const v = new Phaser.Math.Vector2(
      (k.D.isDown || cu.right.isDown ? 1 : 0) - (k.A.isDown || cu.left.isDown ? 1 : 0),
      (k.S.isDown || cu.down.isDown ? 1 : 0) - (k.W.isDown || cu.up.isDown ? 1 : 0));
    if (TOUCH.x || TOUCH.y) v.set(TOUCH.x, TOUCH.y);
    if (v.length() > 1) v.normalize();

    // Mục tiêu khóa
    if (this.target && (!this.target.active || this.target.dead || dist(this.p, this.target) > 600)) this.target = null;
    if (Phaser.Input.Keyboard.JustDown(k.TAB)) {
      const list = this.enemies.getChildren().filter(e => e.active && !e.dead && e !== this.target && dist(this.p, e) < 500)
        .sort((a, b) => dist(this.p, a) - dist(this.p, b));
      this.target = list[0] || null;
    }
    if (Phaser.Input.Keyboard.JustDown(k.Q) || once.auto) { this.auto = !this.auto; once.auto = false; this.msg(this.auto ? 'Auto Battle: BẬT' : 'Auto Battle: TẮT'); }

    // Auto: tự tiến lại gần mục tiêu khi người chơi không điều khiển
    const autoTarget = this.auto ? (this.target || this.nearestEnemy(420)) : null;
    if (this.auto && v.lengthSq() < 0.01 && autoTarget && dist(this.p, autoTarget) > s.range * 0.8) {
      v.set(autoTarget.x - this.p.x, autoTarget.y - this.p.y).normalize();
    }
    if (v.lengthSq() > 0.01) this.face.copy(v).normalize();

    // Né (lướt + miễn sát thương ngắn)
    if ((Phaser.Input.Keyboard.JustDown(k.SPACE) || once.dodge) && s.dodgeCd <= 0 && !(s.freezeT > 0)) {
      s.dashT = 0.18; s.iframes = 0.3; s.dodgeCd = 1.2;
    }
    once.dodge = false;
    if (s.dashT > 0) this.p.setVelocity(this.face.x * 440, this.face.y * 440);
    else { const mv = s.freezeT > 0 ? 0 : s.slowT > 0 ? 0.6 : 1; this.p.setVelocity(v.x * s.speed * mv, v.y * s.speed * mv); }

    // Tấn công
    const manual = k.J.isDown || TOUCH.atk;
    const t = this.target || (manual || this.auto ? this.nearestEnemy(s.range) : null);
    const inRange = t && dist(this.p, t) <= s.range;
    if (s.atkCd <= 0 && (inRange && (this.target || manual || this.auto) || (manual && !t))) {
      if (s.melee) this.meleeHit(s.basicMult, 60); else this.fire('bolt', s.basicMult, 420, false, inRange ? t : null);
      s.atkCd = 0.6;
    }
    // Kỹ năng
    const sk = SKILLS[s.skill];
    const wantSkill = Phaser.Input.Keyboard.JustDown(k.ONE) || once.skill ||
      (this.auto && s.skillCd <= 0 && inRange && !(t && t.d.boss && false));
    once.skill = false;
    if (wantSkill && s.skillCd <= 0) {
      this.castSkill(sk, inRange ? t : null);
      s.skillCd = sk.cooldown * (1 - s.cdr / 100);
    }
  }

  updateHud() {
    const s = this.ps, sk = SKILLS[s.skill], v = this.cameras.main.worldView;
    const boss = this.enemies.getChildren().find(e => e.active && !e.dead && e.d.boss && e.state !== 'idle');
    this.hudApi.update({
      lv: G.level, hp: s.hp, maxHp: s.maxHp, xpPct: Math.min(100, G.exp / expNeed(G.level) * 100),
      info: `${AREA.name}\nVàng ${G.gold.toLocaleString('vi-VN')} · Túi ${G.inv.length}/${G.cap}\n${this.questText()}`,
      boss: boss ? { name: boss.d.name, hp: boss.hp, max: boss.d.hp } : null,
      cdSkill: Math.max(0, s.skillCd) / (sk.cooldown * (1 - s.cdr / 100)), cdDodge: Math.max(0, s.dodgeCd) / 1.2, auto: this.auto, showMini: G.set.minimap,
      enemies: this.enemies.getChildren().filter(e => e.active && !e.dead).map(e => ({ x: e.x, y: e.y, boss: !!e.d.boss })),
      drops: this.drops, px: this.p.x, py: this.p.y, view: { x: v.x, y: v.y, w: v.width, h: v.height },
    });
  }

  drawBars() {
    // Thanh máu quái trong thế giới
    this.enemies.getChildren().forEach(e => {
      if (!e.active || e.dead || e.hp >= e.d.hp) return;
      const w = e.d.boss ? 60 : 30, x = e.x - w / 2, y = e.y - e.displayHeight / 2 - 8;
      this.gfx.fillStyle(0x000000, 0.7).fillRect(x - 1, y - 1, w + 2, 6);
      this.gfx.fillStyle(0xe14646).fillRect(x, y, w * Math.max(0, e.hp / e.d.hp), 4);
    });
    // Khung chọn mục tiêu
    if (this.target && this.target.active) this.gfx.lineStyle(2, 0xffd34d).strokeCircle(this.target.x, this.target.y, 22);

    this.updateHud();
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05), s = this.ps;
    if (Phaser.Input.Keyboard.JustDown(this.keys.Z)) this.cycleZoom();
    if (Phaser.Input.Keyboard.JustDown(this.keys.M)) { G.set.minimap = !G.set.minimap; this.persist(); }
    s.atkCd -= dt; s.skillCd -= dt; s.dodgeCd -= dt; s.iframes -= dt; s.dashT -= dt;
    s.slowT = (s.slowT || 0) - dt; s.freezeT = (s.freezeT || 0) - dt;
    this.gfx.clear();
    if (!this.playerDead) this.updatePlayer(dt); else this.p.setVelocity(0, 0);
    this.p.setDepth(10 + this.p.y);
    this.p.setAlpha(this.playerDead ? 0.4 : (s.iframes > 0 ? 0.6 : 1));
    const chill = s.freezeT > 0 || s.slowT > 0;
    if (chill !== this.chilled) { this.chilled = chill; if (chill) this.p.setTint(0x9fd8ff); else this.p.clearTint(); }
    this.enemies.getChildren().slice().forEach(e => this.updateEnemy(e, dt));
    this.projs.getChildren().slice().forEach(pr => { pr.life -= dt; if (pr.life <= 0) pr.destroy(); });
    this.updateTelegraphs(dt);
    this.drawBars();
    this.drawAura();
    this.updateDrops();
    this.updatePortal(dt);
    this.updatePet(dt);
    if (AREA.mode === 'survival' && !this.playerDead && (this.waveT -= dt) <= 0) { this.waveT = 15; this.nextWave(); }
    // Bộ Dragon Knight 6 món: Hỏa Long phun lửa quanh người mỗi 8 giây
    this.dragonT = this.ps.dragonFire ? (this.dragonT || 0) + dt : 0;
    if (this.dragonT >= 8 && !this.playerDead) { this.dragonT = 0; this.meleeHit(3.0, 130); this.msg('Hỏa Long phun lửa!'); }
    if (FLOOR_MODES.includes(AREA.mode) && !this.floorWait && !this.playerDead && !this.enemies.getChildren().some(e => e.active && !e.dead)) {
      this.floorWait = true;
      const f = this.floor, m = AREA.mode, k = recKey(m);
      G.st[k] = Math.max(G.st[k] || 0, f);
      if (m === 'daily') { // phụ bản hàng ngày: 5 tầng, thưởng lớn 1 lần mỗi ngày (không bắt buộc)
        if (f >= 5) {
          const today = new Date().toISOString().slice(0, 10);
          if (G.st.daily !== today) { G.st.daily = today; G.gold += 1500; G.mat.stone += 150; this.msg('Hoàn thành phụ bản ngày! +1500 vàng, +150 đá'); }
          else this.msg('Hoàn thành! Hôm nay bạn đã nhận thưởng phụ bản.');
          this.persist(); return; // dừng tại đây, quay về qua cổng
        }
      } else {
        const gold = (m === 'bossrush' ? 100 : m === 'rift' ? 40 : 20) * f, stone = (m === 'bossrush' ? 5 : m === 'rift' ? 2 : 1) * f;
        G.gold += gold; G.mat.stone += stone;
        this.msg(`Hoàn thành tầng ${f}! +${gold} vàng, +${stone} đá`);
      }
      this.persist();
      this.time.delayedCall(2000, () => { this.floorWait = false; this.nextFloor(); });
    }
    this.achT = (this.achT || 0) + dt;
    if (this.achT > 2) {
      this.achT = 0;
      ACHS.forEach(a => { if (!G.ach[a.id] && a.ok(G)) { G.ach[a.id] = true; G.gold += a.gold; this.msg(`Thành tựu: ${a.name} (+${a.gold} vàng)`); this.persist(); } });
    }
    this.saveT = (this.saveT || 0) + dt;
    if (this.saveT > 10) { this.saveT = 0; this.persist(); } // tự động lưu
  }
}

await Promise.race([document.fonts.load('700 14px Montserrat'), new Promise(r => setTimeout(r, 2500))]).catch(() => {}); // font Montserrat cho chữ trong game
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0d14',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 }, // luôn 16:9, vừa mọi màn hình
  physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
  scene: GameScene,
});
