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

export async function save(data) {
  try {
    const db = await open();
    const prev = await req(db, 'readonly', s => s.get('main'));
    if (prev) await req(db, 'readwrite', s => s.put(prev, 'backup')); // giữ bản cũ nếu ghi lỗi
    await req(db, 'readwrite', s => s.put({ v: VER, data: JSON.parse(JSON.stringify(data)) }, 'main'));
    return true;
  } catch (e) { console.warn('save failed', e); return false; }
}

export async function load() {
  try {
    const db = await open();
    for (const k of ['main', 'backup']) { // hỏng bản chính thì phục hồi từ backup
      const rec = await req(db, 'readonly', s => s.get(k));
      const d = migrate(rec); if (d) return d;
    }
  } catch (e) { console.warn('load failed', e); }
  return null;
}

export function exportJSON(data) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify({ v: VER, data }, null, 1)], { type: 'application/json' }));
  a.download = 'eternal-pixel-backup.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function importJSON(file) {
  const j = JSON.parse(await file.text());
  const d = migrate(j); if (!d) throw new Error('File backup không hợp lệ');
  return d;
}
