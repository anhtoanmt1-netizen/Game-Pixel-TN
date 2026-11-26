// Phương thức của GameScene: Quái vật (AI, boss 3 pha), sát thương nhận/gây, cái chết, đạn.
// Được gắn vào GameScene.prototype trong main.js (Object.assign), nên `this` là cảnh game.
import { CFG, MONSTERS } from './data.js';
import { calcDamage, rollCrit, rollDodge } from './combat.js';
import { CLASS_FX } from './items.js';
import { sfx } from './audio.js';
import { G, AREA, CHECKPOINTS, dist, scaled } from './state.js';

export const combatMethods = {
  // ---------- Quái vật ----------
  spawn(id, x, y, summoned = false, scale = 0) {
    const d = scale ? scaled(MONSTERS[id], scale) : MONSTERS[id];
    const e = this.enemies.create(x, y, d.tex).setDepth(4).setCollideWorldBounds(true);
    Object.assign(e, { d, id, hp: d.hp, home: { x, y }, state: 'idle', t: 0, cd: 0, wind: 0, dead: false, invuln: 0, summoned, phase: 0, enraged: false, aoeT: 3, wander: { x, y, t: 0 } });
    if (d.boss) e.body.setSize(54, 54);
    return e;
  },

  moveTo(e, tgt, speed) { this.physics.moveToObject(e, tgt, speed); },

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
  },

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
      e.aoeT = e.enraged ? (d.aoeCd2 || 2.5) : (d.aoeCd || 4);
    }
  },

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
  },

  // ---------- Sát thương ----------
  hurtPlayer(raw, ignoreStatDodge, fx) {
    const s = this.ps;
    if (this.playerDead || s.iframes > 0) return; // đang lướt né = miễn sát thương
    if (!ignoreStatDodge && rollDodge(s.dodge, CFG.dodgeCap)) { this.popup(this.p.x, this.p.y - 20, 'Né!', '#8ff'); return; }
    const dmg = calcDamage(raw, 1, s.def);
    s.hp = Math.max(0, s.hp - dmg);
    this.popup(this.p.x, this.p.y - 20, dmg, '#ff6b6b'); sfx('hurt');
    this.pv.setTint(0xff8888); this.time.delayedCall(80, () => { if (!this.chilled) this.pv.clearTint(); });
    if (fx === 'slow') s.slowT = 2;
    if (fx === 'freeze') { s.freezeT = 1; this.msg('Bị đóng băng!'); }
    if (s.hp <= 0) this.playerDie();
  },

  playerDie() {
    this.playerDead = true;
    this.p.body.setVelocity(0, 0); this.vel.set(0, 0);
    this.msg('Bạn đã bị hạ gục – hồi sinh tại điểm gần nhất (không mất đồ)');
    this.time.delayedCall(1500, () => {
      const cp = [...CHECKPOINTS].sort((a, b) => dist(a, this.p) - dist(b, this.p))[0];
      this.p.setPosition(cp.x, cp.y); this.playSummon(cp.x, cp.y);
      this.ps.hp = this.ps.maxHp; this.ps.iframes = 2;
      this.playerDead = false; this.target = null;
      if (AREA.mode === 'survival') { this.enemies.clear(true, true); this.wave = 0; this.waveT = 3; } // thua thì làm lại từ đợt 1
      this.enemies.getChildren().forEach(e => { if (e.active && !e.dead && e.state !== 'idle') e.state = 'return'; });
    });
  },

  hitEnemy(e, mult) {
    if (!e.active || e.dead) return;
    if (e.invuln > 0) { this.popup(e.x, e.y - 24, 'Miễn nhiễm', '#aaa'); return; }
    const s = this.ps, crit = rollCrit(s.crit, CFG.critCap);
    let dmg = calcDamage(s.matk, mult, e.d.def);
    if (crit) dmg = Math.round(dmg * s.critDmg);
    if (e.d.boss && s.boss_dmg) dmg = Math.round(dmg * (1 + s.boss_dmg / 100));
    e.hp -= dmg;
    if (s.proc && Math.random() * 100 < s.proc) { // hiệu ứng dư chấn của Đột phá: đòn phụ 60% sát thương, tên theo lớp
      const fx = CLASS_FX[CFG.classId] || CLASS_FX.knight, extra = Math.round(dmg * 0.6); e.hp -= extra; this.popup(e.x + 8, e.y - 40, `${fx.proc} ${extra}`, fx.color);
    }
    if (s.lifesteal) s.hp = Math.min(s.maxHp, s.hp + Math.min(dmg * s.lifesteal / 100, s.maxHp * 0.03)); // trần hồi 3% HP/đòn
    this.popup(e.x, e.y - 24, dmg, crit ? '#ffd34d' : '#ffffff'); sfx(crit ? 'crit' : 'hit');
    if (e.state === 'idle') e.state = 'chase';
    e.setTintFill(0xffffff); this.time.delayedCall(60, () => e.active && e.clearTint());
    if (e.hp <= 0) this.killEnemy(e);
  },

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
  },

  onProjHit(pr, e) {
    if (!e.active || e.dead || pr.hit.has(e)) return;
    pr.hit.add(e);
    this.hitEnemy(e, pr.mult);
    if (!pr.pierce) pr.destroy();
  },
};
