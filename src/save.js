// Lưu IndexedDB có phiên bản schema + bản sao lưu tự động (GDD mục 41–42).
const DB = 'eternal-pixel', ST = 'save', VER = 1;
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
      if (rec && rec.v === VER && valid(rec.data)) return rec.data;
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
  if (!j || j.v !== VER || !valid(j.data)) throw new Error('File backup không hợp lệ');
  return j.data;
}
