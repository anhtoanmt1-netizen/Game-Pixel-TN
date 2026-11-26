// Trạng thái dùng chung của game: tiến trình người chơi (G, lưu IndexedDB), khu vực hiện tại và hằng số hiển thị.
// Có top-level await (hỏi chọn lớp ở lần chơi đầu), nên mọi module import file này đều chờ được dữ liệu sẵn sàng.
import { CFG, CLASSES, AREAS } from './data.js';
import { save, load } from './save.js';
import { pickClass } from './board.js';
import { sfx } from './audio.js';
import { normAuto } from './auto.js';

// Trạng thái tiến trình người chơi (được lưu vào IndexedDB)
export const G = Object.assign({ level: 1, exp: 0, gold: 0, inv: [], eq: {}, cards: [], deck: [], pity: 0, cap: 300, q: {}, area: 'forest', sk: {}, mat: { stone: 0 }, st: { kills: 0, boss: 0 }, ach: {}, set: { sfx: true, music: true, vol: 0.5, sfxVol: 0.8, musicVol: 0.6, lowfx: false, zoom: 'near', minimap: true, continuousCombat: true, mainMenu: true }, pet: null, look: null, petLv: {}, chars: [], activeCharId: null }, await load() || {});
if (!G.classId) { G.classId = await pickClass(CLASSES); await save(G); }
CFG.classId = G.classId;
G.set = { sfx: true, music: true, vol: 0.5, sfxVol: 0.8, musicVol: 0.6, lowfx: false, zoom: 'near', minimap: true, continuousCombat: true, mainMenu: true, ...G.set };
G.set.auto = normAuto(G.set.auto); // cấu hình Auto (phạm vi, chế độ, nhặt đồ, tự bán, tự trang bị)

// Khởi tạo danh sách nhân vật nếu chưa có
if (!Array.isArray(G.chars)) G.chars = [];
if (!G.activeCharId && G.classId) {
  G.activeCharId = 'char_' + Date.now();
  G.chars.push({ id: G.activeCharId, classId: G.classId, level: G.level, createdAt: Date.now() });
}
export const AREA = AREAS[G.area] || AREAS.forest;
export const AREA_ID = AREAS[G.area] ? G.area : 'forest';
export const CHECKPOINTS = AREA.checkpoints, SPAWNS = AREA.spawns;

export const dist = (a, b) => Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);

export const scaled = (d, k) => ({ ...d, hp: Math.round(d.hp * k), atk: Math.round(d.atk * k), exp: Math.round(d.exp * k), gold: Math.round(d.gold * k) });

export const RUNE = { forest: 0x7fffd0, cave: 0x7fd0ff, volcano: 0xffb050, ice: 0xd8f4ff, dark: 0xd08aff };            // màu rune của bệ triệu hồi theo chủ đề
export const PORTAL_COL = [0xcfe6ff, 0x7be08a, 0x4ad0ff, 0xffc04a, 0xff5a3a, 0xff2a78];                               // màu cổng theo mức nguy hiểm 0→5
export const FLOOR_MODES = ['tower', 'bossrush', 'rift', 'daily'];
export const recKey = m => (m === 'tower' ? 'best' : 'rec_' + m);
