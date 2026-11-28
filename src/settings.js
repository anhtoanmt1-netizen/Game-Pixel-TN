// Cài đặt DÙNG CHUNG cho mọi nhân vật (âm lượng, hiển thị, chiến đấu nền), lưu trong localStorage.
// Cấu hình Auto vẫn thuộc về từng nhân vật (G.set.auto).
const KEY = 'ep_settings_v1';
export const GLOBAL_KEYS = ['sfxVol', 'musicVol', 'uiVol', 'lowfx', 'minimap', 'zoom', 'bgDim', 'bgCombat'];
export const DEFAULTS = { sfxVol: 0.5, musicVol: 0.5, uiVol: 0.5, lowfx: false, minimap: true, zoom: 'near', bgDim: 0.85, bgCombat: true };
export function loadGlobal() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
export function saveGlobal(set) { try { const o = {}; for (const k of GLOBAL_KEYS) if (set[k] !== undefined) o[k] = set[k]; localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* bỏ qua */ } }
const clamp01 = v => Math.max(0, Math.min(1, +v));
// Gộp: mặc định < giá trị cũ lưu trong nhân vật (bản trước có sfx/music/vol) < cài đặt toàn cục đã lưu
export function resolveSettings(old = {}, stored = loadGlobal()) {
  const legacy = {};
  if (old.vol != null) { const v = clamp01(old.vol); legacy.sfxVol = old.sfx === false ? 0 : v; legacy.uiVol = old.sfx === false ? 0 : v; legacy.musicVol = old.music === false ? 0 : v; }
  for (const k of ['lowfx', 'minimap', 'zoom']) if (old[k] != null) legacy[k] = old[k];
  const o = { ...DEFAULTS, ...legacy, ...stored };
  for (const k of ['sfxVol', 'musicVol', 'uiVol', 'bgDim']) o[k] = clamp01(o[k]);
  if (!['near', 'wide', 'ultra'].includes(o.zoom)) o.zoom = 'near';
  return o;
}
