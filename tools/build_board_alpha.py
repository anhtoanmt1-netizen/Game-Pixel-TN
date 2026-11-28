#!/usr/bin/env python3
"""Tạo assets/ui/board.webp (nền bảng có kênh trong suốt) từ tools/source/board.jpg.
Vùng đen tuyệt đối nối liền với mép ảnh được đục thành trong suốt, để thấy trận đánh phía sau bảng khi mở túi đồ;
nội thất các ô (luôn sáng hơn hẳn) giữ nguyên. Độ mờ của lớp nền phía sau do người chơi chỉnh trong Cài đặt."""
import os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(__file__))
from paths import ROOT, SRC, need
im = Image.open(need(SRC + 'board.jpg')).convert('RGB'); a = np.array(im).astype(int)
dark = a.max(-1) <= 10
lab, _ = ndi.label(dark)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
outside = np.isin(lab, list(edge))
alpha = Image.fromarray((~outside * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))   # viền mềm, không răng cưa
rgba = im.copy(); rgba.putalpha(alpha)
rgba.save(ROOT + 'assets/ui/board.webp', 'WEBP', quality=92, method=6)
print('OK', rgba.size, f'trong suốt {outside.mean():.1%}', os.path.getsize(ROOT + 'assets/ui/board.webp') // 1024, 'KB')
