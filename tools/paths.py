"""Đường dẫn dùng chung cho các script dựng tài nguyên (không còn đường dẫn cứng của một máy cụ thể).
  ROOT : thư mục gốc repo (tự suy ra từ vị trí file này; đổi bằng EP_ROOT)
  WORK : thư mục tạm để chứa ảnh trung gian (mặc định <tmp>/eternal-pixel; đổi bằng EP_WORK)
  SRC  : thư mục chứa ảnh gốc (mặc định tools/source; đổi bằng EP_SRC)"""
import os, sys, tempfile
ROOT = (os.environ.get('EP_ROOT') or os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))).rstrip('/') + '/'
WORK = (os.environ.get('EP_WORK') or os.path.join(tempfile.gettempdir(), 'eternal-pixel')).rstrip('/') + '/'
SRC = (os.environ.get('EP_SRC') or os.path.join(ROOT, 'tools', 'source')).rstrip('/') + '/'
def work(*parts):
    p = os.path.join(WORK, *parts); os.makedirs(os.path.dirname(p) if os.path.splitext(p)[1] else p, exist_ok=True); return p + ('/' if not os.path.splitext(p)[1] else '')
def need(path):
    if not os.path.exists(path): sys.exit(f'Thiếu ảnh nguồn: {path}\n  Đặt ảnh gốc vào {SRC} hoặc đặt biến môi trường EP_SRC / EP_WORK (xem tools/paths.py).')
    return path
