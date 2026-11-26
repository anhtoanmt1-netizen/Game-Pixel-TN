// Phương thức của GameScene: Chế độ chơi: đợt sinh tồn, tầng tháp, boss thử thách, nhiệm vụ, cổng dịch chuyển.
// Được gắn vào GameScene.prototype trong main.js (Object.assign), nên `this` là cảnh game.
import { CFG, AREAS, QUESTS } from './data.js';
import { save } from './save.js';
import { G, AREA, dist, FLOOR_MODES, recKey } from './state.js';

export const modesMethods = {
  hardenBoss(b) { // Thử Thách Boss: đánh nhanh hơn, nhiều vòng cảnh báo hơn, hồi chiêu ngắn hơn
    Object.assign(b.d, { attackCd: b.d.attackCd * 0.7, aoeN: (b.d.aoeN || 1) + 1, aoeCd: 2.6, aoeCd2: 1.6, speed: b.d.speed * 1.15, atk: Math.round(b.d.atk * 1.15) });
  },

  nextWave() {
    const w = ++this.wave, tier = Math.min(4, Math.floor((w - 1) / 4)), sc = 1 + 0.15 * (w - 1);
    const mobs = ['wolf', 'spider', 'imp', 'frost_wolf', 'shade'], n = this.enemies.countActive() > 170 ? 0 : Math.min(80, 5 * (2 + w)); // x5 quái, luôn truy đuổi
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Phaser.Math.Between(300, 450);
      const x = Phaser.Math.Clamp(this.p.x + Math.cos(a) * r, 60, CFG.world.w - 60), y = Phaser.Math.Clamp(this.p.y + Math.sin(a) * r, 60, CFG.world.h - 60);
      const e = this.spawn(mobs[tier], x, y, true, sc);
      e.d.leash = 99999; e.state = 'chase'; // quái sinh tồn luôn truy đuổi
    }
    G.st.surv = Math.max(G.st.surv || 0, w); G.gold += 15 * w; G.mat.stone += Math.floor(w / 2);
    this.msg(`Đợt ${w}! +${15 * w} vàng`); this.persist();
  },

  nextFloor() {
    const f = ++this.floor, m = AREA.mode;
    const mobs = ['wolf', 'spider', 'imp', 'frost_wolf', 'shade'], bosses = ['wolf_king', 'spider_queen', 'fire_dragon', 'ice_king', 'ma_vuong'];
    let tier = Math.min(4, Math.floor((f - 1) / 5)), sc = 1 + 0.2 * (f - 1), boss = f % 5 === 0, n = boss ? 4 : Math.min(12, 3 + f), elite = false;
    if (m === 'bossrush') { /* khó hơn hẳn: hệ số 1,8 + tăng dần theo tầng và theo vòng */ tier = (f - 1) % 5; sc = 1.8 + 0.12 * (f - 1) + 0.35 * Math.floor((f - 1) / 5); boss = true; n = 0; } // lần lượt từng boss
    if (m === 'rift') { sc = 2 + 0.3 * (f - 1); elite = true; } // quái tinh anh, độ khó cao
    if (m === 'daily') { tier = Math.min(4, Math.floor(G.level / 20)); sc = 1 + 0.15 * (f - 1); boss = f === 5; n = boss ? 3 : 3 + f; }
    for (let i = 0; i < n; i++) {
      const e = this.spawn(mobs[tier], Phaser.Math.Between(CFG.world.w * 0.2, CFG.world.w * 0.82), Phaser.Math.Between(CFG.world.h * 0.15, CFG.world.h * 0.7), true, sc);
      if (elite) e.setTint(0xffb0b0);
    }
    if (boss) {
      const bb = this.spawn(bosses[tier], CFG.world.w / 2, CFG.world.h * 0.25, true, sc);
      if (m === 'bossrush') { this.hardenBoss(bb); if (f > 5) this.hardenBoss(this.spawn(bosses[(tier + 4) % 5], CFG.world.w * 0.35, CFG.world.h * 0.3, true, sc * 0.85)); } // từ vòng 2: hai boss cùng lúc
    }
    this.msg(`Tầng ${f}${boss ? ' – BOSS' : ''}${elite ? ' (Tinh anh)' : ''}`);
  },

  questDone(id) { return !!(G.q[id] && G.q[id].done); },

  questKill(id) {
    QUESTS.forEach(q => {
      if (q.target !== id || this.questDone(q.id) || (q.after && !this.questDone(q.after))) return;
      const st = G.q[q.id] || (G.q[q.id] = { p: 0, done: false });
      if (++st.p < q.n) return;
      st.done = true; this.gainExp(q.reward.exp); G.gold += q.reward.gold;
      this.msg(`Hoàn thành: ${q.name}${q.unlock ? ' – mở khóa ' + AREAS[q.unlock].name : ''}`);
      this.persist();
    });
  },

  questText() {
    if (FLOOR_MODES.includes(AREA.mode)) return `Tầng ${this.floor} · Kỷ lục ${G.st[recKey(AREA.mode)] || 0}`;
    if (AREA.mode === 'survival') return `Đợt ${this.wave} · Kỷ lục ${G.st.surv || 0}`;
    const q = QUESTS.find(x => !this.questDone(x.id) && (!x.after || this.questDone(x.after)));
    return q ? `Nhiệm vụ: ${q.name} ${(G.q[q.id] || { p: 0 }).p}/${q.n}` : 'Đã hoàn thành mọi nhiệm vụ';
  },

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
  },
};
