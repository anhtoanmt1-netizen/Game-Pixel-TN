import { CFG, CLASSES, SKILLS, MONSTERS, CHECKPOINTS, SPAWNS } from './data.js';
import { calcDamage, rollCrit, rollDodge } from './combat.js';
import { TOUCH } from './touch.js';

const dist = (a, b) => Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);

class GameScene extends Phaser.Scene {
  constructor() { super('game'); }

  // ---------- Texture tạm bằng code (thay bằng sprite thật ở giai đoạn Polish) ----------
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
    g.destroy();
  }

  create() {
    this.makeTextures();
    const { w: W, h: H } = CFG.world;
    this.physics.world.setBounds(0, 0, W, H);
    this.add.tileSprite(0, 0, W, H, 'grass').setOrigin(0);

    // Điểm hồi sinh
    CHECKPOINTS.forEach(c => this.add.image(c.x, c.y, 'cp').setDepth(1));

    // Cây (vật cản) – sinh theo số giả ngẫu nhiên cố định
    this.trees = this.physics.add.staticGroup();
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const keepClear = [...CHECKPOINTS, ...SPAWNS];
    for (let i = 0; i < 70; i++) {
      const x = 40 + rnd() * (W - 80), y = 40 + rnd() * (H - 80);
      if (keepClear.some(c => Math.hypot(c.x - x, c.y - y) < 130)) continue;
      this.trees.create(x, y, 'tree').setDepth(3).refreshBody();
    }

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
    this.auto = false;
    this.playerDead = false;
    this.stats = { kills: 0, exp: 0, gold: 0 };
    this.telegraphs = [];

    // Quái, đạn
    this.enemies = this.physics.add.group();
    this.projs = this.physics.add.group();
    SPAWNS.forEach(s => this.spawn(s.id, s.x, s.y));
    this.physics.add.collider(this.p, this.trees);
    this.physics.add.collider(this.enemies, this.trees);
    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(this.projs, this.trees, pr => pr.destroy());
    this.physics.add.overlap(this.projs, this.enemies, (pr, e) => this.onProjHit(pr, e));

    // Camera: theo nhân vật, giới hạn trong bản đồ
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H).startFollow(this.p, true, 0.1, 0.1).setZoom(1.5);

    // Điều khiển
    this.keys = this.input.keyboard.addKeys('W,A,S,D,J,Q,TAB,ONE,SPACE');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.on('pointerdown', ptr => {
      if (ptr.event && ptr.event.target && ptr.event.target.closest && ptr.event.target.closest('#touch')) return;
      const wp = ptr.positionToCamera(cam);
      const hit = this.enemies.getChildren().filter(e => e.active && !e.dead && Math.hypot(e.x - wp.x, e.y - wp.y) < 36)
        .sort((a, b) => dist(a, wp) - dist(b, wp))[0];
      this.target = hit || null; // click quái = khóa mục tiêu; click đất = bỏ khóa
    });

    // UI
    this.gfx = this.add.graphics().setDepth(20);
    this.hud = this.add.graphics().setScrollFactor(0).setDepth(100);
    const ts = { fontFamily: 'monospace', fontSize: '14px', color: '#fff', stroke: '#000', strokeThickness: 3 };
    this.info = this.add.text(16, 62, '', ts).setScrollFactor(0).setDepth(100);
    this.help = this.add.text(16, 0, 'WASD: đi | J/Click quái: đánh | 1: Fireball | Space: né | Tab: khóa mục tiêu | Q: Auto',
      { ...ts, fontSize: '12px' }).setScrollFactor(0).setDepth(100);
    this.msgText = this.add.text(0, 90, '', { ...ts, fontSize: '20px' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100).setAlpha(0);
    this.scale.on('resize', () => this.layout());
    this.layout();
  }

  layout() {
    const { width, height } = this.scale;
    this.msgText.setX(width / 2);
    this.help.setY(height - 22);
  }

  msg(t) {
    this.msgText.setText(t).setAlpha(1);
    this.tweens.killTweensOf(this.msgText);
    this.tweens.add({ targets: this.msgText, alpha: 0, delay: 1800, duration: 500 });
  }

  popup(x, y, text, color = '#fff') {
    const t = this.add.text(x, y, String(text), { fontFamily: 'monospace', fontSize: '16px', color, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(30);
    this.tweens.add({ targets: t, y: y - 34, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  // ---------- Quái vật ----------
  spawn(id, x, y, summoned = false) {
    const d = MONSTERS[id];
    const e = this.enemies.create(x, y, d.tex).setDepth(4).setCollideWorldBounds(true);
    Object.assign(e, { d, id, hp: d.hp, home: { x, y }, state: 'idle', t: 0, cd: 0, wind: 0, dead: false, invuln: 0, summoned, phase: 0, enraged: false, aoeT: 3, wander: { x, y, t: 0 } });
    if (d.boss) e.body.setSize(54, 54);
    return e;
  }

  moveTo(e, tgt, speed) { this.physics.moveToObject(e, tgt, speed); }

  updateEnemy(e, dt) {
    if (!e.active || e.dead) return;
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
          if (dist(e, P) <= d.attackRange + 14) this.hurtPlayer(d.atk, false);
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
      this.msg('Sói Chúa triệu hồi bầy sói!');
      for (let i = 0; i < 2; i++) this.spawn('wolf', e.x + (i ? 70 : -70), e.y + 40, true);
    }
    if (e.phase < 2 && ratio <= 0.3) {
      e.phase = 2; e.enraged = true; e.invuln = 1.2;
      this.msg('Sói Chúa nổi cuồng!');
    }
    if (!alive || e.state === 'idle' || e.state === 'return') return;
    e.aoeT -= dt;
    if (e.aoeT <= 0) { // tấn công diện rộng CÓ CẢNH BÁO
      const n = e.enraged ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const off = i ? Phaser.Math.Between(-130, 130) : 0;
        this.telegraphs.push({ x: this.p.x + off, y: this.p.y + (i ? Phaser.Math.Between(-130, 130) : 0), r: 90, t: 0, dur: 1.0, dmg: d.atk * 1.8 });
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
      if (!this.playerDead && dist(this.p, z) <= z.r) this.hurtPlayer(z.dmg, true);
      return false;
    });
  }

  // ---------- Sát thương ----------
  hurtPlayer(raw, ignoreStatDodge) {
    const s = this.ps;
    if (this.playerDead || s.iframes > 0) return; // đang lướt né = miễn sát thương
    if (!ignoreStatDodge && rollDodge(s.dodge, CFG.dodgeCap)) { this.popup(this.p.x, this.p.y - 20, 'Né!', '#8ff'); return; }
    const dmg = calcDamage(raw, 1, s.def);
    s.hp = Math.max(0, s.hp - dmg);
    this.popup(this.p.x, this.p.y - 20, dmg, '#ff6b6b');
    this.p.setTint(0xff8888); this.time.delayedCall(80, () => this.p.clearTint());
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
      this.enemies.getChildren().forEach(e => { if (e.active && !e.dead && e.state !== 'idle') e.state = 'return'; });
    });
  }

  hitEnemy(e, mult) {
    if (!e.active || e.dead) return;
    if (e.invuln > 0) { this.popup(e.x, e.y - 24, 'Miễn nhiễm', '#aaa'); return; }
    const s = this.ps, crit = rollCrit(s.crit, CFG.critCap);
    let dmg = calcDamage(s.matk, mult, e.d.def);
    if (crit) dmg = Math.round(dmg * CFG.critDamage);
    e.hp -= dmg;
    this.popup(e.x, e.y - 24, dmg, crit ? '#ffd34d' : '#ffffff');
    if (e.state === 'idle') e.state = 'chase';
    e.setTintFill(0xffffff); this.time.delayedCall(60, () => e.active && e.clearTint());
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    e.dead = true; e.body.setVelocity(0, 0);
    this.stats.kills++; this.stats.exp += e.d.exp; this.stats.gold += e.d.gold;
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
  nearestEnemy(range) {
    let best = null, bd = range;
    this.enemies.getChildren().forEach(e => {
      if (!e.active || e.dead) return;
      const d = dist(this.p, e);
      if (d < bd) { bd = d; best = e; }
    });
    return best;
  }

  fire(tex, mult, speed, pierce, tgt) {
    const dir = tgt ? new Phaser.Math.Vector2(tgt.x - this.p.x, tgt.y - this.p.y).normalize() : this.face.clone();
    const pr = this.projs.create(this.p.x, this.p.y, tex).setDepth(6);
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
    if ((Phaser.Input.Keyboard.JustDown(k.SPACE) || once.dodge) && s.dodgeCd <= 0) {
      s.dashT = 0.18; s.iframes = 0.3; s.dodgeCd = 1.2;
    }
    once.dodge = false;
    if (s.dashT > 0) this.p.setVelocity(this.face.x * 440, this.face.y * 440);
    else this.p.setVelocity(v.x * s.speed, v.y * s.speed);

    // Tấn công
    const manual = k.J.isDown || TOUCH.atk;
    const t = this.target || (manual || this.auto ? this.nearestEnemy(s.range) : null);
    const inRange = t && dist(this.p, t) <= s.range;
    if (s.atkCd <= 0 && (inRange && (this.target || manual || this.auto) || (manual && !t))) {
      this.fire('bolt', s.basicMult, 420, false, inRange ? t : null);
      s.atkCd = 0.6;
    }
    // Kỹ năng
    const sk = SKILLS.fireball;
    const wantSkill = Phaser.Input.Keyboard.JustDown(k.ONE) || once.skill ||
      (this.auto && s.skillCd <= 0 && inRange && !(t && t.d.boss && false));
    once.skill = false;
    if (wantSkill && s.skillCd <= 0) {
      this.fire('fire', sk.mult, sk.speed, sk.pierce, inRange ? t : null);
      s.skillCd = sk.cooldown;
    }
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

    // HUD cố định
    const s = this.ps, h = this.hud;
    h.clear();
    h.fillStyle(0x000000, 0.6).fillRect(14, 14, 224, 22);
    h.fillStyle(0x3ecf6a).fillRect(16, 16, 220 * (s.hp / s.maxHp), 18);
    h.fillStyle(0x000000, 0.6).fillRect(14, 40, 224, 10);
    h.fillStyle(0xff7a1a).fillRect(16, 42, 220 * (1 - Math.max(0, s.skillCd) / SKILLS.fireball.cooldown), 6);
    const boss = this.enemies.getChildren().find(e => e.active && !e.dead && e.d.boss && e.state !== 'idle');
    if (boss) {
      const bw = Math.min(420, this.scale.width - 40), bx = (this.scale.width - bw) / 2;
      h.fillStyle(0x000000, 0.7).fillRect(bx - 2, 14, bw + 4, 16);
      h.fillStyle(0xc0392b).fillRect(bx, 16, bw * Math.max(0, boss.hp / boss.d.hp), 12);
    }
    this.info.setText(`HP ${Math.ceil(s.hp)}/${s.maxHp}  Lv.1\nKill ${this.stats.kills}  EXP ${this.stats.exp}  Vàng ${this.stats.gold}${this.auto ? '  [AUTO]' : ''}`);
  }

  update(time, delta) {
    const dt = Math.min(delta / 1000, 0.05), s = this.ps;
    s.atkCd -= dt; s.skillCd -= dt; s.dodgeCd -= dt; s.iframes -= dt; s.dashT -= dt;
    this.gfx.clear();
    if (!this.playerDead) this.updatePlayer(dt); else this.p.setVelocity(0, 0);
    this.p.setAlpha(this.playerDead ? 0.4 : (s.iframes > 0 ? 0.6 : 1));
    this.enemies.getChildren().slice().forEach(e => this.updateEnemy(e, dt));
    this.projs.getChildren().slice().forEach(pr => { pr.life -= dt; if (pr.life <= 0) pr.destroy(); });
    this.updateTelegraphs(dt);
    this.drawBars();
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0b0d14',
  pixelArt: true,
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
  scene: GameScene,
});
