import { CFG, CLASSES, SKILLS } from './data.js';
import { TOUCH } from './touch.js';
import { PETS, ACHS, derive, expNeed } from './items.js';
import { save } from './save.js';
import { initBoard } from './board.js';
import { initHud } from './hud.js';
import { EQUIP_CELL } from './inv.js';
import { buildNav, findPath, los } from './nav.js';
import { initAudio, sfx } from './audio.js';
import { buildSprites } from './sprites.js';
import { CELL, FEET } from './chars.js';
import { frameFor } from './charanim.js';
import { buildMap, AREA_THEME, TEX_NAMES } from './maps.js';
import { pickTarget, pickDrop } from './auto.js';
import { G, AREA, AREA_ID, CHECKPOINTS, SPAWNS, dist, RUNE, FLOOR_MODES, recKey } from './state.js';
import { lootMethods } from './scene-loot.js';
import { combatMethods } from './scene-combat.js';
import { fxMethods } from './scene-fx.js';
import { modesMethods } from './scene-modes.js';

// GameScene = lõi cảnh (khởi tạo, người chơi, camera, HUD, vòng lặp). Phần còn lại tách thành module trong scene-*.js:
//   scene-loot.js (vật phẩm rơi) · scene-combat.js (quái, boss, sát thương) · scene-fx.js (hiệu ứng hình ảnh) · scene-modes.js (chế độ chơi, nhiệm vụ)
class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  // ---------- Texture tạm bằng code (thay bằng sprite thật ở giai đoạn Polish) ----------
  preload() { // chỉ nạp atlas của chủ đề màu khu vực hiện tại
    const t = AREA_THEME[AREA_ID];
    this.load.atlas('th_' + t, `assets/${t}.png`, `assets/${t}.json`);
    TEX_NAMES.forEach(n => this.load.image(`tr_${t}_${n}`, `assets/terrain/${t}_${n}.jpg`)); // texture địa hình liền mạch
    this.load.spritesheet('icons', 'assets/ui/equip.png', { frameWidth: EQUIP_CELL, frameHeight: EQUIP_CELL }); // icon trang bị cho vật phẩm rơi
    const c = CFG.classId; this.load.atlas('ch_' + c, `assets/chars/${c}.png`, `assets/chars/${c}.json`); // sprite nhân vật
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
    tex('arrow', 26, 7, g => { g.fillStyle(0xe6d29a).fillRect(0, 3, 19, 2); g.fillStyle(0xffffff).fillTriangle(26, 3.5, 18, 0, 18, 7); g.fillStyle(0xa6e08a).fillRect(0, 1, 4, 5); });
    tex('px', 2, 2, g => { g.fillStyle(0xffffff).fillRect(0, 0, 2, 2); }); // khối va chạm vô hình
    g.destroy();
    // Texture hiệu ứng vẽ bằng canvas: vầng sáng, cột sáng, vòng sóng, hạt sáng, xoáy cổng, bệ đá triệu hồi
    const ctex = (key, w, h, fn) => { if (this.textures.exists(key)) this.textures.remove(key); const t = this.textures.createCanvas(key, w, h); fn(t.getContext('2d')); t.refresh(); };
    ctex('glow', 64, 64, c => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
    ctex('beam', 32, 128, c => { const g = c.createLinearGradient(0, 128, 0, 0); g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 32, 128); const h = c.createLinearGradient(0, 0, 32, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); c.globalCompositeOperation = 'destination-out'; c.fillStyle = h; c.fillRect(0, 0, 32, 128); });
    ctex('ring', 64, 64, c => { c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 3; c.beginPath(); c.arc(32, 32, 28, 0, 7); c.stroke(); });
    ctex('spark', 8, 8, c => { const g = c.createRadialGradient(4, 4, 0, 4, 4, 4); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 8, 8); });
    ctex('swirl', 256, 256, c => { c.translate(128, 128); c.lineCap = 'round'; for (let arm = 0; arm < 4; arm++) { let px = 0, py = 0; for (let i = 0; i <= 90; i++) { const t = i / 90, a = arm * Math.PI / 2 + t * 5.2, r = 10 + t * 112, x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) { c.strokeStyle = `rgba(255,255,255,${(1 - t * 0.75).toFixed(2)})`; c.lineWidth = 2 + (1 - t) * 11; c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke(); } px = x; py = y; } } });
    const runeCss = '#' + (RUNE[AREA_THEME[AREA_ID]] || 0x7fd0ff).toString(16).padStart(6, '0');
    ctex('pedestal', 180, 120, c => {
      const cx = 90, cy = 58; c.fillStyle = '#3b3a42'; c.beginPath(); c.ellipse(cx, cy + 14, 80, 38, 0, 0, 7); c.fill();
      const gr = c.createLinearGradient(0, cy - 38, 0, cy + 38); gr.addColorStop(0, '#8d8a96'); gr.addColorStop(1, '#5a5864'); c.fillStyle = gr; c.beginPath(); c.ellipse(cx, cy, 80, 38, 0, 0, 7); c.fill(); c.strokeStyle = '#26252c'; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#4a4853'; c.beginPath(); c.ellipse(cx, cy, 60, 28, 0, 0, 7); c.fill();
      c.strokeStyle = runeCss; c.fillStyle = runeCss; c.lineWidth = 2.5; c.globalAlpha = 0.9; c.beginPath(); c.ellipse(cx, cy, 50, 23, 0, 0, 7); c.stroke();
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; c.fillRect(cx + Math.cos(a) * 50 - 2, cy + Math.sin(a) * 23 - 2, 4, 4); }
      c.beginPath(); c.moveTo(cx, cy - 16); c.lineTo(cx + 14, cy + 8); c.lineTo(cx - 14, cy + 8); c.closePath(); c.stroke(); c.globalAlpha = 1;
    });
    buildSprites(this, CFG.classId); // thay hình khối tạm bằng pixel art (cùng tên texture)
  }

  create() {
    this.makeTextures();
    // Icon trang bị là ảnh minh họa độ phân giải cao (không phải pixel art): lọc mịn để thu nhỏ không bị răng cưa
    this.textures.get('icons').setFilter(Phaser.Textures.FilterMode.LINEAR);
    const { w: W, h: H } = CFG.world;
    this.physics.world.setBounds(0, 0, W, H);

    // Bệ đá triệu hồi tại các điểm xuất hiện + cổng xoáy (màu và độ lớn theo mức nguy hiểm của bản đồ đích)
    this.pedestals = CHECKPOINTS.map(c => this.makePedestal(c.x, c.y));
    this.portals = [AREA.portal, AREA.portal2, ...(AREA.extra || [])].filter(Boolean); this.portalT = 0;
    this.portals.forEach(p => this.makePortalFx(p));

    // Bản đồ: nền gạch 48px, đường mòn, ao hồ, cây/đá/cảnh vật theo chủ đề màu của khu vực
    const built = buildMap(this, AREA_ID, AREA, W, H);
    this.trees = built.group; this.sways = built.sways; // cỏ, hoa, bụi lay động
    this.nav = buildNav(built.layout.blocks, W, H); this.navT = 0; this.path = null; this.pi = 0;

    // Người chơi
    const c = CLASSES[CFG.classId];
    // Thân vật lý vô hình (22×16 ở chân) + hình ảnh tách riêng để nhún/lắc/lao tới mà không ảnh hưởng va chạm
    this.p = this.physics.add.sprite(CHECKPOINTS[0].x, CHECKPOINTS[0].y, 'px').setVisible(false).setCollideWorldBounds(true);
    this.p.body.setSize(22, 16);
    this.shadow = this.add.ellipse(this.p.x, this.p.y, 40, 13, 0x000000, 0.3);
    this.pv = this.add.image(this.p.x, this.p.y, 'ch_' + CFG.classId, 'down').setOrigin(FEET[0] / CELL[0], FEET[1] / CELL[1]);
    this.anim = { t: 0, atk: null, aim: 1 }; this.vel = new Phaser.Math.Vector2(0, 0);
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
      onOpen: () => this.scene.pause(), onClose: () => this.scene.resume(), sfx,
    });
    initAudio(() => G.set, G.area);
    this.syncPet();
    window.addEventListener('beforeunload', () => this.persist());
    window.addEventListener('pagehide', () => this.persist()); // điện thoại thường không gọi beforeunload
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.persist(); });
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
    this.physics.add.overlap(this.projs, this.enemies, (pr, e) => this.onProjHit(pr, e));

    // Camera: theo nhân vật, giới hạn trong bản đồ
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H).startFollow(this.p, true, 0.1, 0.1);

    // Điều khiển
    this.keys = this.input.keyboard.addKeys('W,A,S,D,J,Q,E,P,R,Z,M,TAB,ONE,SPACE');
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
    this.hudApi = initHud(document.getElementById('stage'), { bag: () => this.board.toggle(), zoom: () => this.cycleZoom(), auto: () => this.toggleAuto(), set: () => this.board.open('equip', 'set'), autoCfg: () => this.board.open('equip', 'auto') });
    this.hudApi.setMap({ W, H, theme: AREA_THEME[AREA_ID], blocks: built.layout.blocks, portals: this.portals, checkpoints: CHECKPOINTS });
    this.applyZoom();
    if (this.pendingMsg) this.hudApi.msg(this.pendingMsg);
    this.playSummon(this.p.x, this.p.y); // vừa vào bản đồ: được triệu hồi lên bệ đá
  }

  applyZoom() { this.cameras.main.setZoom({ near: 1.5, wide: 1.0, ultra: 0.7 }[G.set.zoom] || 1.5); } // gần / rộng / siêu rộng
  cycleZoom() {
    G.set.zoom = { near: 'wide', wide: 'ultra', ultra: 'near' }[G.set.zoom || 'near'];
    this.msg('Tầm nhìn: ' + { near: 'Gần', wide: 'Rộng', ultra: 'Siêu rộng' }[G.set.zoom]); this.applyZoom(); this.persist();
  }
  toggleAuto() { this.auto = !this.auto; if (this.auto) this.autoAnchor = { x: this.p.x, y: this.p.y }; this.msg(this.auto ? 'Auto Battle: BẬT' : 'Auto Battle: TẮT'); }
  travelTo(id) { if (this.traveling) return; this.traveling = true; G.area = id; this.msg('Đang dịch chuyển...'); save(G).then(() => location.reload()); }

  msg(t) { if (this.hudApi) this.hudApi.msg(t); else this.pendingMsg = t; }

  // ---------- Tiến trình, rơi đồ, lưu ----------
  applyStats(full) {
    const s = this.ps, r = full ? 1 : s.hp / s.maxHp;
    Object.assign(s, derive(CLASSES[CFG.classId], G, CFG));
    s.hp = Math.max(1, Math.round(s.maxHp * r));
  }

  persist() { save(G); }

  // ---------- Người chơi ----------
  steerAuto(t) { // đi thẳng nếu thông thoáng, ngược lại đi theo đường A* đã kéo căng
    const p = this.p;
    if (los(this.nav, p.x, p.y, t.x, t.y)) { this.path = null; return new Phaser.Math.Vector2(t.x - p.x, t.y - p.y).normalize(); }
    if (!this.path || this.navT <= 0 || dist(this.pathGoal || { x: -999, y: -999 }, t) > 70) {
      this.path = findPath(this.nav, p.x, p.y, t.x, t.y); this.pi = 0; this.navT = 0.6; this.pathGoal = { x: t.x, y: t.y };
    }
    if (!this.path || !this.path.length) return new Phaser.Math.Vector2(t.x - p.x, t.y - p.y).normalize();
    let w = this.path[this.pi];
    while (this.pi < this.path.length - 1 && dist(p, w) < 20) w = this.path[++this.pi];
    return new Phaser.Math.Vector2(w.x - p.x, w.y - p.y).normalize();
  }

  startAtk(kind, aimX) { this.anim.atk = { kind, t: 0, dur: kind === 'atk' ? 0.28 : 0.42 }; this.anim.aim = aimX; }

  updateChar(dt) { // chọn khung hình, nhún/lắc, bóng đổ, nhấp nháy khi né / bị đánh
    const a = this.anim, s = this.ps, f = this.face; a.t += dt;
    let sp = 1; if (this.summonT > 0) { this.summonT += dt; sp = Math.min(1, this.summonT / 1.0); if (sp >= 1) this.summonT = 0; } const ss = 0.65 + 0.35 * sp; // hiện dần khi được triệu hồi
    if (a.atk) { a.atk.t += dt; if (a.atk.t >= a.atk.dur) a.atk = null; }
    const dir = Math.abs(f.x) > Math.abs(f.y) ? (f.x < 0 ? 'left' : 'right') : (f.y < 0 ? 'up' : 'down');
    const r = frameFor(CFG.classId, { dir, moving: this.p.body.velocity.length() > 25 && !this.playerDead, t: a.t, aimRight: a.aim >= 0, lunge: this.ps.melee ? 14 : 5, atk: a.atk && { kind: a.atk.kind, p: a.atk.t / a.atk.dur } });
    this.pv.setFrame(r.name).setFlipX(r.flipX).setPosition(this.p.x + r.dx, this.p.y + r.dy).setRotation(r.rot).setScale(r.sx * ss, r.sy * ss).setDepth(10 + this.p.y);
    const al = (this.playerDead ? 0.4 : (s.iframes > 0 ? 0.6 : 1)) * sp; this.pv.setAlpha(al); this.shadow.setPosition(this.p.x, this.p.y - 1).setAlpha(al).setDepth(9 + this.p.y);
    const chill = s.freezeT > 0 || s.slowT > 0;
    if (chill !== this.chilled) { this.chilled = chill; if (chill) this.pv.setTint(0x9fd8ff); else this.pv.clearTint(); }
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
    const sy = src === this.p ? src.y - 34 : src.y; // đạn xuất phát từ ngực nhân vật
    const dir = tgt ? new Phaser.Math.Vector2(tgt.x - src.x, tgt.y - sy).normalize() : this.face.clone();
    const pr = this.projs.create(src.x, sy, tex).setDepth(4000).setRotation(Math.atan2(dir.y, dir.x));
    if (tex !== 'arrow') pr.setBlendMode(Phaser.BlendModes.ADD);
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
    if (Phaser.Input.Keyboard.JustDown(k.Q) || once.auto) { once.auto = false; this.toggleAuto(); }
    if (Phaser.Input.Keyboard.JustDown(k.R) || once.autoCfg) { once.autoCfg = false; this.board.open('equip', 'auto'); } // giữ nút Auto / phím R: bảng cài đặt Auto
    // Auto: chọn mục tiêu và vật phẩm theo cấu hình (phạm vi, quanh vị trí hay tự do, nhặt ngay hay sau khi hết quái)
    const cfg = G.set.auto; let goal = null;
    this.navT -= dt;
    if (this.auto) {
      const alive = this.enemies.getChildren().filter(e => e.active && !e.dead);
      let autoTarget = this.target || pickTarget(cfg, this.autoAnchor, this.p, alive);
      if (!autoTarget && cfg.mode === 'free') autoTarget = this.nearestEnemy(1e9); // tự do: chủ động đi tìm quái khắp bản đồ
      const drop = pickDrop(cfg, this.autoAnchor, this.p, this.drops, G.inv.length >= G.cap), inReach = autoTarget && dist(this.p, autoTarget) <= s.range * 0.8;
      if (drop && (cfg.pickWhen === 'now' || !autoTarget)) goal = drop;
      else if (autoTarget && !inReach) goal = autoTarget;
      else if (!autoTarget && cfg.mode === 'around' && this.autoAnchor && dist(this.p, this.autoAnchor) > 70) goal = this.autoAnchor;
      if (goal && v.lengthSq() < 0.01) v.copy(this.steerAuto(goal)); // vòng qua vật cản bằng A*
    }
    if (v.lengthSq() > 0.01) this.face.copy(v).normalize();

    // Né (lướt + miễn sát thương ngắn)
    if ((Phaser.Input.Keyboard.JustDown(k.SPACE) || once.dodge) && s.dodgeCd <= 0 && !(s.freezeT > 0)) {
      s.dashT = 0.18; s.iframes = 0.3; s.dodgeCd = 1.2;
    }
    once.dodge = false;
    if (s.dashT > 0) this.vel.set(this.face.x * 440, this.face.y * 440);
    else { // tăng/giảm tốc mềm thay vì đổi vận tốc tức thì; đang ra đòn thì chậm lại một chút
      const mv = (s.freezeT > 0 ? 0 : s.slowT > 0 ? 0.6 : 1) * (this.anim.atk ? 0.75 : 1);
      this.vel.lerp(new Phaser.Math.Vector2(v.x * s.speed * mv, v.y * s.speed * mv), Math.min(1, dt * 14));
    }
    this.p.setVelocity(this.vel.x, this.vel.y);

    // Tấn công
    const manual = k.J.isDown || TOUCH.atk;
    const t = this.target || (manual || this.auto ? this.nearestEnemy(s.range) : null);
    const inRange = t && dist(this.p, t) <= s.range;
    if (s.atkCd <= 0 && (inRange && (this.target || manual || this.auto) || (manual && !t))) {
      this.startAtk('atk', inRange ? t.x - this.p.x : this.face.x);
      const tg = inRange ? t : null; // đòn đánh bung ra giữa chừng hoạt ảnh cho khớp tư thế
      this.time.delayedCall(100, () => { if (this.playerDead) return; if (s.melee) this.meleeHit(s.basicMult, 60); else this.fire(CFG.classId === 'elf' ? 'arrow' : 'bolt', s.basicMult, 420, false, tg); });
      s.atkCd = 0.6;
    }
    // Kỹ năng
    const sk = SKILLS[s.skill];
    const wantSkill = Phaser.Input.Keyboard.JustDown(k.ONE) || once.skill ||
      (this.auto && s.skillCd <= 0 && inRange && !(t && t.d.boss && false));
    once.skill = false;
    if (wantSkill && s.skillCd <= 0) {
      this.startAtk('skl', inRange ? t.x - this.p.x : this.face.x);
      const tg2 = inRange ? t : null; this.time.delayedCall(140, () => { if (!this.playerDead) this.castSkill(sk, tg2); });
      s.skillCd = sk.cooldown * (1 - s.cdr / 100);
    }
  }

  updateHud() {
    const s = this.ps, sk = SKILLS[s.skill], v = this.cameras.main.worldView;
    const boss = this.enemies.getChildren().find(e => e.active && !e.dead && e.d.boss && e.state !== 'idle');
    this.hudApi.update({
      area: AREA.name, lv: G.level, hp: s.hp, maxHp: s.maxHp, xpPct: Math.min(100, G.exp / expNeed(G.level) * 100),
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
    if (!this.playerDead) this.updatePlayer(dt); else { this.p.setVelocity(0, 0); this.vel.set(0, 0); }
    this.updateChar(dt); this.updateSway(time / 1000, dt);
    this.enemies.getChildren().slice().forEach(e => this.updateEnemy(e, dt));
    this.projs.getChildren().slice().forEach(pr => { pr.life -= dt; if (pr.life <= 0) pr.destroy(); });
    this.updateTelegraphs(dt);
    this.drawBars();
    this.drawAura();
    this.updateDrops();
    this.updatePortal(dt);
    this.updatePet(dt);
    if (AREA.mode === 'survival' && !this.playerDead && (this.waveT -= dt) <= 0) { this.waveT = 9; this.nextWave(); }
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

Object.assign(GameScene.prototype, lootMethods, combatMethods, fxMethods, modesMethods);

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
