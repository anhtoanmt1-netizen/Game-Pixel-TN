// Phương thức của GameScene: Hiệu ứng hình ảnh: chữ nổi, bệ triệu hồi, cổng xoáy, cỏ lay, hào quang.
// Được gắn vào GameScene.prototype trong main.js (Object.assign), nên `this` là cảnh game.
import { AREAS, DANGER } from './data.js';
import { lookStage } from './items.js';
import { sfx } from './audio.js';
import { AREA_THEME } from './maps.js';
import { stepSway } from './wind.js';
import { G, AREA_ID, RUNE, PORTAL_COL } from './state.js';

export const fxMethods = {
  popup(x, y, text, color = '#fff') {
    if (G.set.lowfx && color === '#ffffff') return; // giảm hiệu ứng: bỏ số sát thương thường
    const t = this.add.text(x, y, String(text), { fontFamily: 'Montserrat, sans-serif', fontStyle: 'bold', fontSize: '16px', color, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(5000);
    this.tweens.add({ targets: t, y: y - 34, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  },

  makePedestal(x, y) { // bệ đá triệu hồi: vòng rune phát sáng nhịp thở + hạt sáng bay lên
    const rune = RUNE[AREA_THEME[AREA_ID]] || 0x7fd0ff, A = Phaser.BlendModes.ADD;
    this.add.image(x, y, 'pedestal').setOrigin(0.5, 0.52).setDepth(1.5);
    const glow = this.add.image(x, y - 2, 'glow').setTint(rune).setBlendMode(A).setDepth(1.6).setScale(2.1, 0.9).setAlpha(0.5);
    this.tweens.add({ targets: glow, alpha: { from: 0.28, to: 0.7 }, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.particles(x, y - 4, 'spark', { tint: rune, lifespan: 1400, speedY: { min: -38, max: -18 }, x: { min: -34, max: 34 }, y: { min: -10, max: 10 }, scale: { start: 0.9, end: 0 }, alpha: { start: 0.9, end: 0 }, frequency: 220, blendMode: 'ADD' }).setDepth(1.7);
    return { x, y };
  },

  playSummon(x, y) { // triệu hồi: cột sáng giáng xuống, hai vòng sóng lan ra, tia sáng tóe; nhân vật hiện dần
    const rune = RUNE[AREA_THEME[AREA_ID]] || 0x7fd0ff, A = Phaser.BlendModes.ADD;
    const beam = this.add.image(x, y + 6, 'beam').setOrigin(0.5, 1).setTint(rune).setBlendMode(A).setDepth(4000).setScale(3.2, 3.6).setAlpha(0.95);
    this.tweens.add({ targets: beam, alpha: 0, scaleX: 0.8, duration: 1100, ease: 'Cubic.out', onComplete: () => beam.destroy() });
    for (let k = 0; k < 2; k++) {
      const ring = this.add.image(x, y, 'ring').setTint(rune).setBlendMode(A).setDepth(4000).setScale(0.3, 0.13).setAlpha(0.95);
      this.tweens.add({ targets: ring, scaleX: 2.6, scaleY: 1.1, alpha: 0, delay: k * 220, duration: 800, ease: 'Cubic.out', onComplete: () => ring.destroy() });
    }
    const em = this.add.particles(x, y - 20, 'spark', { tint: rune, lifespan: 900, speed: { min: 40, max: 150 }, angle: { min: 200, max: 340 }, scale: { start: 1.1, end: 0 }, alpha: { start: 1, end: 0 }, gravityY: 60, blendMode: 'ADD', emitting: false }).setDepth(4001);
    em.explode(28); this.time.delayedCall(1200, () => em.destroy());
    this.summonT = 0.001; this.ps.iframes = Math.max(this.ps.iframes, 1.4); sfx('level');
  },

  makePortalFx(p) { // cổng xoáy: hai lớp xoáy ngược chiều + lõi sáng + hạt hút vào tâm; màu và độ lớn tăng theo mức nguy hiểm của bản đồ đích
    const dest = AREAS[p.to], danger = DANGER[p.to] ?? 1, locked = !!(dest.need && !(G.q[dest.need] && G.q[dest.need].done));
    const col = locked ? 0x808090 : PORTAL_COL[danger], sc = 0.5 + danger * 0.07, spd = 1 + danger * 0.18, A = Phaser.BlendModes.ADD, cy = p.y - 20;
    const g = this.add.image(p.x, p.y, 'glow').setTint(col).setBlendMode(A).setDepth(1.2).setScale(4.8 * sc, 2.6 * sc).setAlpha(locked ? 0.25 : 0.55);
    this.tweens.add({ targets: g, alpha: { from: locked ? 0.15 : 0.35, to: locked ? 0.3 : 0.75 }, duration: 1100 / spd, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    const s1 = this.add.image(p.x, cy, 'swirl').setTint(col).setBlendMode(A).setDepth(3).setScale(sc * 0.8).setAlpha(locked ? 0.35 : 0.9);
    const s2 = this.add.image(p.x, cy, 'swirl').setTint(0xffffff).setBlendMode(A).setDepth(3).setScale(sc * 0.5).setFlipX(true).setAlpha(locked ? 0.15 : 0.55);
    this.tweens.add({ targets: s1, angle: 360, duration: 6500 / spd, repeat: -1 }); this.tweens.add({ targets: s2, angle: -360, duration: 3600 / spd, repeat: -1 });
    const core = this.add.image(p.x, cy, 'glow').setTint(0xffffff).setBlendMode(A).setDepth(3).setScale(sc * 0.9);
    this.tweens.add({ targets: core, scale: sc * 1.3, alpha: { from: 0.5, to: 1 }, duration: 800 / spd, yoyo: true, repeat: -1 });
    if (!locked) this.add.particles(p.x, cy, 'spark', { tint: col, lifespan: 1000, emitZone: { type: 'edge', source: new Phaser.Geom.Circle(0, 0, 77 * sc), quantity: 1 }, moveToX: p.x, moveToY: cy, scale: { start: 1, end: 0 }, alpha: { start: 0.9, end: 0 }, frequency: Math.max(40, 150 - danger * 22), blendMode: 'ADD' }).setDepth(3);
    this.add.text(p.x, p.y + 36 + danger * 3, `${dest.name}\n${'★'.repeat(Math.max(1, danger))}${locked ? '  🔒' : ''}`, { fontFamily: 'Montserrat, sans-serif', fontStyle: 'bold', fontSize: '12px', align: 'center', color: locked ? '#aab' : '#fff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5, 0).setDepth(3.1).setLineSpacing(1);
  },

  updateSway(t, dt) { // cỏ lay theo gió; rung và nghiêng ra khi nhân vật / quái đi qua
    const v = this.cameras.main.worldView, actors = [this.p];
    this.enemies.getChildren().forEach(e => { if (e.active && !e.dead) actors.push(e); });
    for (const s of this.sways) { if (s.x < v.x - 60 || s.x > v.right + 60 || s.y < v.y - 40 || s.y > v.bottom + 120) continue; s.im.setRotation(stepSway(s, t, dt, actors)); }
  },

  drawAura() { // ngoại hình tiến hóa: chỉ là hiệu ứng hình ảnh
    const st = lookStage(G); if (!st) return;
    const cols = [0, 0x6fb6ff, 0x6ee7ff, 0xffd34d, 0xff4aff], c = cols[st], p = this.p;
    const r = 18 + (st >= 4 ? 3 * Math.sin(this.time.now / 200) : 0);
    this.gfx.lineStyle(2, c, 0.8).strokeCircle(p.x, p.y, r);
    if (st >= 2) this.gfx.fillStyle(c, 0.12).fillCircle(p.x, p.y, r + 4);
  },
};
