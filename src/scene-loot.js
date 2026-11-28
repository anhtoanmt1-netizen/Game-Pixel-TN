// Phương thức của GameScene: Kinh nghiệm, vật phẩm rơi, nhặt đồ (kể cả Auto nhặt/bán/trang bị).
// Được gắn vào GameScene.prototype trong main.js (Object.assign), nên `this` là cảnh game.
import { CFG, CLASSES } from './data.js';
import { PETS, RARITY, CARDS, expNeed, genItem, rollRarity, addCard, dropChance, pickCardByLuck } from './items.js';
import { itemName, sellValue, iconPos, EQUIP_COLS } from './inv.js';
import { sfx } from './audio.js';
import { passesPick, shouldSell, bestSlot } from './auto.js';
import { G, AREA, dist } from './state.js';

export const lootMethods = {
  gainExp(n) {
    G.exp += Math.round(n * (1 + this.ps.exp_bonus / 100));
    let up = false;
    while (G.exp >= expNeed(G.level) && G.level < 100) { G.exp -= expNeed(G.level); G.level++; up = true; }
    if (up) { sfx('level'); this.applyStats(); this.ps.hp = this.ps.maxHp; this.msg(`LÊN CẤP ${G.level}! (+1 điểm kỹ năng – mở Túi đồ I)`); this.persist(); }
  },

  dropLoot(e) {
    const boss = e.d.boss, out = [], rift = AREA.mode === 'rift'; // Elite Rift: luôn rơi đồ, tối thiểu Epic
    const luck = this.ps.luck || 0; // May mắn: tăng xác suất rơi và bậc của đồ/thẻ (xem items.js: luckMult, dropChance)
    const n = boss ? 2 + (Math.random() < Math.min(0.5, luck / 200) ? 1 : 0) : (rift || Math.random() < dropChance(0.35, luck) ? 1 : 0);
    for (let i = 0; i < n; i++) out.push({ item: genItem(G.level + (boss ? 3 : 0), rollRarity(G, boss ? 2 : (rift ? 3 : 0), luck), undefined, e.id === 'fire_dragon' && Math.random() < 0.5 ? 'dragon' : undefined, CFG.classId) });
    if (Math.random() < (boss ? 1 : dropChance(0.07, luck))) out.push({ card: e.id });
    // Thẻ bổ sung: thẻ kỹ năng/di vật và thẻ quái của khu vực này; may mắn cao thì dễ ra thẻ bậc cao
    const pool = [...new Set([...Object.keys(CARDS).filter(k => CARDS[k].kind), ...AREA.spawns.map(s => s.id).filter(id => CARDS[id])])];
    if (Math.random() < dropChance(boss ? 0.6 : 0.03, luck)) { const c = pickCardByLuck(pool, luck); if (c) out.push({ card: c }); }
    out.forEach(o => this.makeDrop(o, e.x + Phaser.Math.Between(-26, 26), e.y + Phaser.Math.Between(-20, 20)));
  },

  makeDrop(o, x, y) { // vật phẩm rơi: vầng sáng + (cột sáng, vòng sóng, hạt sáng) tăng dần theo phẩm chất, màu theo phẩm chất
    const ri = o.card ? RARITY.findIndex(r => r.id === CARDS[o.card].rarity) : o.item.ri, col = parseInt(RARITY[ri].color.slice(1), 16), A = Phaser.BlendModes.ADD, parts = [], D = 3000;
    const glow = this.add.image(x, y + 4, 'glow').setTint(col).setBlendMode(A).setDepth(D).setScale(0.6 + ri * 0.11).setAlpha(0.55); parts.push(glow);
    this.tweens.add({ targets: glow, alpha: { from: 0.32, to: 0.8 }, scale: glow.scale * 1.18, duration: 1000 - ri * 90, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    if (ri >= 3) { // Sử thi trở lên: cột sáng
      const beam = this.add.image(x, y + 3, 'beam').setOrigin(0.5, 1).setTint(col).setBlendMode(A).setDepth(D).setScale(0.45 + (ri - 3) * 0.1, 0.65 + (ri - 3) * 0.22).setAlpha(0.5); parts.push(beam);
      this.tweens.add({ targets: beam, alpha: { from: 0.28, to: 0.62 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }
    if (ri >= 4) { // Huyền thoại trở lên: vòng sóng lan trên mặt đất
      const ring = this.add.image(x, y + 6, 'ring').setTint(col).setBlendMode(A).setDepth(D).setScale(0.3, 0.14); parts.push(ring);
      this.tweens.add({ targets: ring, scaleX: 1.0 + (ri - 4) * 0.25, scaleY: 0.45 + (ri - 4) * 0.1, alpha: { from: 0.9, to: 0 }, duration: 1500, repeat: -1 });
    }
    if (ri >= 5) parts.push(this.add.particles(x, y, 'spark', { tint: col, lifespan: 1000, speedY: { min: -55, max: -25 }, speedX: { min: -14, max: 14 }, scale: { start: 0.8, end: 0 }, alpha: { start: 0.9, end: 0 }, frequency: ri === 6 ? 90 : 170, blendMode: 'ADD' }).setDepth(D + 2)); // Thần thoại / Cổ đại: hạt sáng bay lên
    let icon;
    if (o.item) { const p = iconPos(o.item, CFG.classId); icon = this.add.image(x, y - 14, 'icons', p.row * EQUIP_COLS + p.col).setScale(0.3).setDepth(D + 1); }
    else icon = this.add.rectangle(x, y - 14, 16, 22, 0x101820).setStrokeStyle(2, col).setDepth(D + 1);
    this.tweens.add({ targets: icon, y: icon.y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' }); parts.push(icon);
    this.drops.push({ x, y, ...o, ri, low: !o.card && ri <= 1, parts });
  },

  collect(d, autoMode) { // nhặt một vật phẩm; chế độ Auto có thể tự trang bị hoặc tự bán. Trả về false nếu túi đầy
    const cfg = G.set.auto;
    if (d.card) { addCard(G, d.card); this.msg(`Nhận thẻ: ${CARDS[d.card].name}`); return true; }
    const it = d.item;
    if (autoMode && cfg.equip && G.inv.length < G.cap) {
      const slot = bestSlot(G, it, CLASSES[CFG.classId], CFG);
      if (slot) { const old = G.eq[slot]; G.eq[slot] = it; if (old) G.inv.push(old); this.applyStats(); this.msg(`Tự trang bị: ${itemName(it, CFG.classId)}`); return true; }
    }
    if (autoMode && shouldSell(cfg, it)) { const v = sellValue(it); G.gold += v; this.msg(`Tự bán ${itemName(it, CFG.classId)}: +${v} vàng`); return true; }
    if (G.inv.length >= G.cap) { this.msg('Túi đồ đã đầy!'); return false; }
    G.inv.push(it); this.msg(`Nhặt: ${itemName(it, CFG.classId)}`); return true;
  },

  updateDrops() {
    const k = this.keys, E = Phaser.Input.Keyboard.JustDown(k.E), cfg = G.set.auto;
    if (Phaser.Input.Keyboard.JustDown(k.P)) { this.autoAll = !this.autoAll; this.msg(this.autoAll ? 'Nhặt: tự động mọi đồ' : 'Nhặt: tự động đồ thường, nhấn E cho đồ hiếm'); }
    this.drops = this.drops.filter(d => {
      if (this.playerDead || (dist(this.p, d) > 44 && !(this.pet && PETS[G.pet].magnet && dist(this.pet, d) < 60))) return true; // thú đồng hành cũng nhặt đồ
      const ok = E || (this.auto ? passesPick(cfg, d) : (this.autoAll || d.low)); // Auto: theo bộ lọc nhặt; thủ công: theo quy tắc cũ
      if (!ok || !this.collect(d, this.auto)) return true;
      d.parts.forEach(pt => pt.destroy()); sfx('pick'); this.board.refresh(); this.persist();
      return false;
    });
  },
};
