// Lưu IndexedDB có phiên bản schema + bản sao lưu tự động (GDD mục 41–42).
export const VER = 2;
const DB = 'eternal-pixel', ST = 'save';
const open = () => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(ST);
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const req = (db, mode, fn) => new Promise((res, rej) => {
  const tx = db.transaction(ST, mode), r = fn(tx.objectStore(ST));
  tx.oncomplete = () => res(r && r.result);
  tx.onerror = () => rej(tx.error);
});
export const valid = d => d && typeof d.level === 'number' && Array.isArray(d.inv) && d.eq && Array.isArray(d.cards) && Array.isArray(d.deck);

// Nâng cấp dữ liệu lưu từ phiên bản cũ. Mỗi bước MIGRATIONS[n] đổi dữ liệu v(n) → v(n+1); thêm bước mới khi đổi cấu trúc và tăng VER.
//  v1 → v2: Đột phá thành số bậc (true → 1), trang bị đã thức tỉnh có cấp thức tỉnh 1, ghi lớp nhân vật vào trang bị cũ.
const MIGRATIONS = {
  1: d => {
    const fix = it => { if (!it) return; if (it.trans === true) it.trans = 1; if (it.awaken && it.awk == null) it.awk = 1; if (!it.cls && d.classId) it.cls = d.classId; };
    Object.values(d.eq || {}).forEach(fix); (d.inv || []).forEach(fix); return d;
  },
};
export function migrate(rec) {
  if (!rec || typeof rec.v !== 'number' || !rec.data || rec.v > VER) return null; // không đọc bản lưu của phiên bản mới hơn
  let { v, data } = rec; data = JSON.parse(JSON.stringify(data));
  while (v < VER) { const f = MIGRATIONS[v]; if (!f) return null; data = f(data); v++; }
  return valid(data) ? data : null;
}

// ---------- Nhiều nhân vật: tối đa SLOTS ô lưu, mỗi ô là một bản dữ liệu hoàn toàn độc lập ----------
// IndexedDB: 'slot:N' (dữ liệu) và 'backup:N' (bản ghi trước đó, để phục hồi nếu ghi lỗi). Ô đang chơi nằm trong sessionStorage
// ('ep_slot') nên tải lại trang (đổi bản đồ) vẫn đúng nhân vật, còn mở game mới thì luôn về menu chọn nhân vật.
export const SLOTS = 4;
const SLOT_KEY = n => `slot:${n}`, BAK_KEY = n => `backup:${n}`;
const ses = { get: k => { try { return sessionStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { sessionStorage.setItem(k, v); } catch { /* bỏ qua */ } }, del: k => { try { sessionStorage.removeItem(k); } catch { /* bỏ qua */ } } };
export const activeSlot = () => { const n = +ses.get('ep_slot'); return n >= 1 && n <= SLOTS ? n : 0; };
export const setActiveSlot = n => { if (!(n >= 1 && n <= SLOTS)) throw new Error('Ô nhân vật không hợp lệ'); ses.set('ep_slot', String(n)); };
export const clearActiveSlot = () => ses.del('ep_slot');

// Dữ liệu khởi đầu của một nhân vật mới (không chứa cài đặt âm thanh/hiển thị: các cài đặt đó dùng chung, xem settings.js)
export const newProgress = (classId, name) => ({ level: 1, exp: 0, gold: 0, inv: [], eq: {}, cards: [], deck: [], pity: 0, cap: 300, q: {}, area: 'forest', sk: {}, mat: { stone: 0 }, st: { kills: 0, boss: 0 }, ach: {}, pet: null, look: null, petLv: {}, set: {}, classId, name: String(name || '').trim().slice(0, 16) || 'Nhà Thám Hiểm', created: Date.now(), saved: Date.now() });

export async function saveSlot(n, data) {
  try {
    const db = await open(), prev = await req(db, 'readonly', s => s.get(SLOT_KEY(n)));
    if (prev) await req(db, 'readwrite', s => s.put(prev, BAK_KEY(n))); // giữ bản cũ nếu ghi lỗi
    await req(db, 'readwrite', s => s.put({ v: VER, data: { ...JSON.parse(JSON.stringify(data)), saved: Date.now() } }, SLOT_KEY(n)));
    return true;
  } catch (e) { console.warn('save failed', e); return false; }
}
export async function loadSlot(n) {
  try {
    const db = await open();
    for (const k of [SLOT_KEY(n), BAK_KEY(n)]) { // hỏng bản chính thì phục hồi từ backup
      const d = migrate(await req(db, 'readonly', s => s.get(k))); if (d) return d;
    }
  } catch (e) { console.warn('load failed', e); }
  return null;
}
export async function deleteSlot(n) {
  try { const db = await open(); await req(db, 'readwrite', s => s.delete(SLOT_KEY(n))); await req(db, 'readwrite', s => s.delete(BAK_KEY(n))); return true; } catch (e) { console.warn('delete failed', e); return false; }
}
export async function listSlots() { const out = []; for (let n = 1; n <= SLOTS; n++) out.push({ n, data: await loadSlot(n) }); return out; }
// Bản lưu một nhân vật của phiên bản trước (khóa 'main') được chuyển vào ô 1, chỉ một lần duy nhất
export async function adoptLegacy() {
  try { if (localStorage.getItem('ep_legacy_done')) return false; } catch { /* bỏ qua */ }
  let moved = false;
  try {
    const db = await open(); let any = false;
    for (let n = 1; n <= SLOTS; n++) if (await req(db, 'readonly', s => s.get(SLOT_KEY(n)))) any = true;
    if (!any) for (const k of ['main', 'backup']) { const d = migrate(await req(db, 'readonly', s => s.get(k))); if (d && d.classId) { moved = await saveSlot(1, d); break; } }
  } catch (e) { console.warn('legacy', e); return false; }
  try { localStorage.setItem('ep_legacy_done', '1'); } catch { /* bỏ qua */ }
  return moved;
}
// Lưu / nạp nhân vật đang chơi (ô đang hoạt động)
export async function save(data) { const n = activeSlot(); return n ? saveSlot(n, data) : false; }
export async function load() { const n = activeSlot(); return n ? loadSlot(n) : null; }

export function exportJSON(data) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ v: VER, data }, null, 1)], { type: 'application/json' }));
  a.download = `eternal-pixel-${(data && data.name) || 'backup'}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function importJSON(file) {
  const j = JSON.parse(await file.text());
  const d = migrate(j); if (!d) throw new Error('File backup không hợp lệ');
  return d;
}
