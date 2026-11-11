# ETERNAL PIXEL

Chạy cục bộ (ES module cần server): `python3 -m http.server 8080` rồi mở http://localhost:8080
Triển khai: đẩy cả thư mục lên GitHub, bật GitHub Pages (branch main, root).
Kiểm thử: `npm test` (Node 18+).

Điều khiển: WASD đi | J hoặc click quái đánh | 1 kỹ năng | Space né | Tab khóa mục tiêu | Q auto | Z đổi tầm nhìn | M bản đồ nhỏ | I mở bảng nhân vật/túi đồ | E, P nhặt đồ.
Điện thoại: joystick trái, nút Đánh/Skill/Né/Auto bên phải; trong túi đồ giữ ~0,25 giây rồi kéo để mặc đồ.

Font Montserrat tải từ Google Fonts ở lần mở đầu (cần mạng), sau đó được lưu cache để chơi offline.
`tools/` chứa script dựng lại tài nguyên từ ảnh gốc (build_assets.py cho bản đồ, build_ui.py cho giao diện).
