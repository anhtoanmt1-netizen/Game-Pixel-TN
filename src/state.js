// Trạng thái dùng chung của game: tiến trình người chơi (G, lưu IndexedDB), khu vực hiện tại và hằng số hiển thị.
// Có top-level await (nạp nhân vật từ IndexedDB), nên mọi module import file này đều chờ được dữ liệu sẵn sàng.
import { CFG, AREAS } from './data.js';
import { load, newProgress } from './save.js';
import { resolveSettings } from './settings.js';
import { normAuto } from './auto.js';

// Trạng thái tiến trình của NHÂN VẬT ĐANG CHƠI (ô được chọn ở menu, lưu IndexedDB; mỗi ô là một bản dữ liệu riêng).
export const G = Object.assign(newProgress(null, ''), await load() || {});
if (!G.classId) throw new Error('Chưa chọn nhân vật: hãy vào game qua menu chính (src/menu.js)');
CFG.classId = G.classId;
// Cài đặt âm thanh/hiển thị/chiến đấu nền dùng chung cho mọi nhân vật (settings.js); riêng cấu hình Auto thuộc từng nhân vật
G.set = { ...resolveSettings(G.set), auto: normAuto(G.set && G.set.auto) };
export const AREA = AREAS[G.area] || AREAS.forest;
export const AREA_ID = AREAS[G.area] ? G.area : 'forest';
export const CHECKPOINTS = AREA.checkpoints, SPAWNS = AREA.spawns;

export const dist = (a, b) => Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);

export const scaled = (d, k) => ({ ...d, hp: Math.round(d.hp * k), atk: Math.round(d.atk * k), exp: Math.round(d.exp * k), gold: Math.round(d.gold * k) });

export const RUNE = { forest: 0x7fffd0, cave: 0x7fd0ff, volcano: 0xffb050, ice: 0xd8f4ff, dark: 0xd08aff };            // màu rune của bệ triệu hồi theo chủ đề
export const PORTAL_COL = [0xcfe6ff, 0x7be08a, 0x4ad0ff, 0xffc04a, 0xff5a3a, 0xff2a78];                               // màu cổng theo mức nguy hiểm 0→5
export const FLOOR_MODES = ['tower', 'bossrush', 'rift', 'daily'];
export const recKey = m => (m === 'tower' ? 'best' : 'rec_' + m);
