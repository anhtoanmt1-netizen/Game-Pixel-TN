// Pixel art vẽ bằng bản đồ ký tự 12×12 (mỗi ký tự = 1 điểm ảnh), phóng to theo số nguyên để giữ nét.
// Thay bằng sprite sheet thật ở giai đoạn hoàn thiện đồ họa: chỉ cần giữ nguyên tên texture.
export const MAPS = {
  mage: ['....oooo....', '...obbbbo.yy', '..obbbbbbo.y', '..osssssso.o', '..osesesso.o', '..osssssso.o', '...obbbbo..o', '..obbwwbbo.o', '..obbbbbbo.o', '..obbbbbbo.o', '..oddbbddo.o', '...oo..oo...'],
  knight: ['...oooooo...', '..ohhhhhgo..', '..ogvvvvgo..', '..ogvvvvgo..', '..oggggggo..', '.oogrrrrgoo.', 'oyyogrrgoyyo', 'oyyoggggoyyo', '.ooggggggoo.', '..oggooggo..', '..ohhoohho..', '..oooooooo..'],
  elf: ['....oooo....', '...ogggggo..', '..oggggggdo.', 'b.ogsssggo..', 'b.ogsessgo..', 'bbogsssgdo..', 'b.oogggdoo..', 'b.ogggggdo..', 'b.ogggwggdo.', 'bbogggggddo.', '..odd..oddo.', '..ooo..ooo..'],
  rogue: ['...oooooo...', '..oppppppo..', '..oppppppo..', '..opsssspo.w', '..opsesspo.w', '..oppppppo.w', '..orrrrrro.w', '.oopppppoo.w', '.oopppppdoo.', '..opddppdo..', '..opp..ppo..', '..ooo..ooo..'],
  wolf: ['............', '........o.o.', '.......obobo', '..oo..obbbbo', '.obbbbbbbebo', 'obbbbbbbbbdo', 'obbbbbbbbddo', 'obbbbbbbbbo.', '.obbbbbbbbo.', '.obo.oo.obo.', '.obo.obo.obo', '.ooo.ooo.ooo'],
  spider: ['............', '..o......o..', '...o.oo.o...', '....obbo....', 'oo.obbbbo.oo', '..obbeebbo..', 'oo.obbbbo.oo', '..oobbbboo..', '.o.obbbbo.o.', 'o...obbo...o', '....oddo....', '............'],
  imp: ['..o......o..', '..oo....oo..', '..obo..obo..', '...obbbbo...', '..obbbbbbo..', '..obeeeebo..', '..obbbbbbo..', '.oobbwwbboo.', 'o.obbbbbbo.o', '..obbbbbbo..', '...obddbo...', '..ooo..ooo..'],
  shade: ['....oooo....', '...ommmmo...', '..ommmmmmo..', '..omeemeemo.', '..ommmmmmo..', '..ommmmmmo..', '..ommdmmmmo.', '..ommmmmmmo.', '..ommmmmmo..', '..omommomo..', '..o.omo.o...', '............'],
};
const WOLF = { o: '#1a1a22', b: '#8a8f99', d: '#5a5f6a', e: '#ff4040' };
const SPIDER = { o: '#14101c', b: '#4a3a5a', d: '#2a1f3a', e: '#66ff66' };
const IMP = { o: '#2a0a06', b: '#d64a1a', d: '#8a2a10', e: '#ffd34d', w: '#ffe0a0' };
const SHADE = { o: '#0a0614', m: '#4a2a6a', d: '#2a1a40', e: '#ff4aff' };
export const CLASS_PAL = {
  mage: { o: '#141420', b: '#4a7bff', d: '#2a4aa8', s: '#f0c8a0', e: '#202020', w: '#ffffff', y: '#ffd34d' },
  knight: { o: '#141420', g: '#aab4c8', h: '#dde4f0', v: '#202838', r: '#c03030', y: '#ffd34d' },
  elf: { o: '#10180f', g: '#3a9a4a', d: '#246a30', s: '#f0c8a0', e: '#202020', b: '#8a5a2a', w: '#e8e0b0' },
  rogue: { o: '#100a18', p: '#5a3a8a', d: '#2a1a4a', s: '#f0c8a0', e: '#202020', r: '#c03030', w: '#ffffff' },
};
// [texture, bản đồ, bảng màu, hệ số phóng, màu vương miện (boss)]
export const DEFS = [
  ['wolf', 'wolf', WOLF, 3], ['spider', 'spider', SPIDER, 3], ['imp', 'imp', IMP, 3], ['shade', 'shade', SHADE, 3],
  ['frost_wolf', 'wolf', { ...WOLF, b: '#cfe8ff', d: '#8ab4d8', e: '#2a6fff' }, 3],
  ['boss', 'wolf', { ...WOLF, b: '#4a3a3a', d: '#2a1f1f', e: '#ffd34d' }, 7, '#ffd34d'],
  ['spider_queen', 'spider', { ...SPIDER, b: '#2a1a3a', d: '#120a1a' }, 7, '#b066ff'],
  ['dragon', 'imp', { ...IMP, b: '#8a1a12', d: '#4a0a08', w: '#ff7a1a' }, 7, '#ff7a1a'],
  ['ice_king', 'wolf', { ...WOLF, b: '#6fb6e8', d: '#3a7ab0', e: '#ffffff' }, 7, '#cfe8ff'],
  ['ma_vuong', 'shade', { ...SHADE, m: '#1a0a28', d: '#0a0414', e: '#ff3030' }, 7, '#8a3fd0'],
];

function draw(scene, key, map, pal, s, crown) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, map[0].length * s, map.length * s), ctx = tex.getContext();
  map.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { ctx.fillStyle = pal[ch]; ctx.fillRect(x * s, y * s, s, s); } }));
  if (crown) { ctx.fillStyle = crown; [3, 5, 7].forEach(x => ctx.fillRect(x * s, 0, s, s * 1.2)); ctx.fillRect(3 * s, s * 1.2, 5 * s, s * 0.8); }
  tex.refresh();
}

export function buildSprites(scene, classId) {
  draw(scene, 'player', MAPS[classId], CLASS_PAL[classId], 3);
  DEFS.forEach(([key, map, pal, s, crown]) => draw(scene, key, MAPS[map], pal, s, crown));
}
