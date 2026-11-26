#!/usr/bin/env python3
"""Dựng sheet icon trang bị assets/ui/equip.png + src/equipicons.js từ 3 ảnh gốc (tools/source/equip_*.png).
Mỗi ảnh gốc là lưới 6 cột (bậc màu) × N hàng (loại trang bị), nền trong suốt.
Kết quả: 7 cột (6 bậc gốc + cột 'Cổ đại' tự tạo) × 17 hàng, mỗi ô CELL×CELL, vật phẩm căn giữa, cùng tỷ lệ trong một hàng.
Chạy: python3 tools/build_equip.py [--src tools/source] [--out .]   (cần numpy, scipy, Pillow)"""
import argparse, colorsys, json, os
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

CELL, PAD, COLS = 160, 8, 7
# (file, [tên hàng theo thứ tự trên xuống dưới]) — theo đúng nội dung từng ảnh gốc
SHEETS = [('equip_1.png', ['ring', 'cloak', 'necklace', 'gloves', 'hat', 'book']),
          ('equip_2.png', ['sword', 'bow', 'staff', 'blades', 'helmet', 'boots']),
          ('equip_3.png', ['armor', 'shield', 'quiver', 'orb', 'mask'])]
ROWS = ['sword', 'bow', 'book', 'blades', 'helmet', 'hat', 'boots', 'armor', 'gloves', 'cloak', 'necklace', 'ring', 'shield', 'quiver', 'orb', 'mask', 'staff']

def extract(path, names):
    """Tách 6×len(names) món bằng thành phần liên thông (bền hơn cắt lưới cứng vì ảnh gốc lệch ô)."""
    a = np.array(Image.open(path).convert('RGBA'))
    lab, n = ndi.label(ndi.binary_dilation(a[..., 3] > 20, iterations=14))
    comps = []
    for i, s in enumerate(ndi.find_objects(lab), 1):
        cy, cx = (s[0].start + s[0].stop) / 2, (s[1].start + s[1].stop) / 2
        comps.append((cy, cx, i, s))
    assert len(comps) == 6 * len(names), f'{path}: tìm thấy {len(comps)} món, cần {6 * len(names)}'
    comps.sort(key=lambda c: c[0]); out = {}
    for r, name in enumerate(names):
        row = sorted(comps[r * 6:(r + 1) * 6], key=lambda c: c[1])
        out[name] = []
        for _, _, i, s in row:
            crop = a[s].copy(); crop[lab[s] != i, 3] = 0       # bỏ điểm ảnh của món lân cận
            ys, xs = np.where(crop[..., 3] > 8)
            out[name].append(Image.fromarray(crop[ys.min():ys.max() + 1, xs.min():xs.max() + 1]))
    return out

def hue_shift(im, dh, ds=1.0, dv=1.0, only_red=False):
    a = np.array(im).astype(np.float32) / 255; rgb = a[..., :3]
    mx, mn = rgb.max(-1), rgb.min(-1); d = mx - mn + 1e-6
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) / 6
    s = np.where(mx > 0, d / (mx + 1e-6), 0); v = mx
    sel = np.ones_like(h, bool)
    if only_red: sel = ((h < 0.05) | (h > 0.93)) & (s > 0.45) & (v > 0.35)
    h2 = np.where(sel, (h + dh) % 1, h); s2 = np.where(sel, np.clip(s * ds, 0, 1), s); v2 = np.where(sel, np.clip(v * dv, 0, 1), v)
    i = np.floor(h2 * 6).astype(int) % 6; f = h2 * 6 - np.floor(h2 * 6)
    p, q, t = v2 * (1 - s2), v2 * (1 - f * s2), v2 * (1 - (1 - f) * s2)
    out = np.choose(i[..., None].repeat(3, -1), [np.stack(x, -1) for x in [(v2, t, p), (q, v2, p), (p, v2, t), (p, q, v2), (t, p, v2), (v2, p, q)]])
    a[..., :3] = out; return Image.fromarray((a * 255).astype(np.uint8))

def glow(im, color, radius=5, strength=0.9):
    pad = radius * 3; big = Image.new('RGBA', (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0)); big.paste(im, (pad, pad))
    al = big.getchannel('A').filter(ImageFilter.GaussianBlur(radius)); al = al.point(lambda v: int(min(255, v * strength)))
    g = Image.new('RGBA', big.size, color + (0,)); g.putalpha(al); g.alpha_composite(big); return g

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--src', default=os.path.join(os.path.dirname(__file__), 'source')); ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..'))
    args = ap.parse_args(); items = {}
    for f, names in SHEETS: items.update(extract(os.path.join(args.src, f), names))
    # Dây chuyền bậc 6: ảnh gốc đặt nhầm một chiếc mặt nạ ở đây → dựng từ dây chuyền bậc 5, đổi ngọc đỏ thành ngọc trắng-lam
    items['necklace'][5] = hue_shift(items['necklace'][4], 0.55, 0.28, 1.35, only_red=True)
    # Cột 7 'Cổ đại': từ bậc đỏ, ngả sang cam lửa và thêm quầng sáng
    for k in ROWS: items[k].append(glow(hue_shift(items[k][4], 0.045, 1.12, 1.1), (255, 140, 60), 6, 0.85))
    sheet = Image.new('RGBA', (COLS * CELL, len(ROWS) * CELL), (0, 0, 0, 0))
    for r, k in enumerate(ROWS):
        sc = (CELL - 2 * PAD) / max(max(im.size) for im in items[k][:6])     # cùng tỷ lệ cho cả hàng
        for c, im in enumerate(items[k]):
            w, h = max(1, round(im.width * sc)), max(1, round(im.height * sc)); sm = im.resize((w, h), Image.LANCZOS)
            sheet.alpha_composite(sm, (c * CELL + (CELL - w) // 2, r * CELL + (CELL - h) // 2))
    os.makedirs(os.path.join(args.out, 'assets/ui'), exist_ok=True)
    sheet.save(os.path.join(args.out, 'assets/ui/equip.png'), optimize=True)
    with open(os.path.join(args.out, 'src/equipicons.js'), 'w') as f:
        f.write('// Sinh tự động bởi tools/build_equip.py. assets/ui/equip.png: lưới EQUIP_COLS cột (bậc màu) × hàng (loại trang bị), mỗi ô EQUIP_CELL px.\n')
        f.write(f'export const EQUIP_CELL = {CELL}, EQUIP_COLS = {COLS};\nexport const EQUIP_ROWS = {json.dumps(ROWS)};\n')
    print('OK', sheet.size)
main()
