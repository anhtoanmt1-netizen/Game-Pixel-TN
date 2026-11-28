# ETERNAL PIXEL

ARPG pixel 2D chạy trên trình duyệt (PWA, chơi được offline), giao diện tiếng Việt. Phaser 3 + ES module thuần, không cần bước build.

## Chạy và kiểm thử
- Chạy cục bộ (ES module cần server): `python3 -m http.server 8080` rồi mở http://localhost:8080
- Triển khai: đẩy cả thư mục lên GitHub, bật GitHub Pages (branch main, root).
- Kiểm thử: `npm test` (Node 18+). Gồm logic game, hệ thống nâng cấp, icon, migrate dữ liệu lưu, và kiểm tra gói offline (service worker phải cache đủ mọi module).
- Chơi offline hoàn toàn: đặt Phaser vào `vendor/` (xem `vendor/README.md`). Không có thì game dùng CDN.

## Điều khiển
WASD đi | J hoặc click quái đánh | 1 kỹ năng | Space né | Tab khóa mục tiêu | Q auto (giữ nút Auto hoặc nhấn R: cài đặt Auto) | Z đổi tầm nhìn | M bản đồ nhỏ | I mở bảng nhân vật/túi đồ | E, P nhặt đồ | Esc đóng bảng.
Điện thoại: joystick trái, nút Đánh/Skill/Né/Auto bên phải; trong túi đồ giữ ~0,25 giây rồi kéo để mặc đồ.

## Menu và nhiều nhân vật
Mở game luôn vào **menu chính** (`src/menu.js`): giới thiệu game, danh sách tối đa **4 nhân vật**, tạo mới, tiếp tục, xóa. Mỗi ô là một bản dữ liệu hoàn toàn riêng (trang bị, cấp, kỹ năng, nhiệm vụ, thẻ, tiến trình) lưu trong IndexedDB (`slot:1..4`, kèm `backup:n` để phục hồi nếu ghi lỗi). Đủ 4 nhân vật thì phải xóa một nhân vật mới tạo được nhân vật khác. Người chơi bản cũ (một nhân vật) được chuyển tự động vào ô 1, đúng một lần.
Ô đang chơi nằm trong `sessionStorage`, nên đổi bản đồ (tải lại trang) vẫn đúng nhân vật; **Cài đặt → Về màn hình chính** lưu rồi quay về menu.

## Cài đặt
Bảng cài đặt nằm ngay trên màn hình game (nút bánh răng ở HUD, hoặc ở thanh trên của bảng túi đồ), không còn lồng trong túi đồ; dùng được cả ở menu. Gồm: ba thanh trượt âm lượng riêng (**hiệu ứng**, **nhạc nền**, **âm thanh khác** = giao diện, Lò Rèn, thông báo), tầm nhìn, bản đồ nhỏ, giảm hiệu ứng, **độ mờ nền**, **chiến đấu nền**, cài đặt Auto, sao lưu/nhập, về màn hình chính.
Cài đặt âm thanh/hiển thị **dùng chung cho mọi nhân vật** (`src/settings.js`, localStorage); cấu hình Auto thuộc từng nhân vật.

## Chiến đấu nền và nền bảng
- Mở túi đồ / cài đặt / bản đồ thì game **không tạm dừng** (mặc định): nhân vật đứng yên và tự đánh quái trong tầm, quái vẫn hoạt động. Tắt bằng nút ⚔ ở thanh trên bảng túi đồ hoặc trong Cài đặt; khi tắt, game tạm dừng như trước.
- Ảnh nền bảng (`assets/ui/board.webp`) có phần ngoài trong suốt để thấy trận đánh phía sau. Thanh trượt **độ mờ nền** (thanh trên của bảng túi đồ, hoặc Cài đặt) chỉnh lớp tối phía sau các bảng từ trong suốt đến đặc.

## Bản đồ
Bấm vào **bản đồ nhỏ** hoặc **tên bản đồ** ở góc phải màn hình để mở danh sách bản đồ (ảnh địa hình, độ nguy hiểm, kỷ lục, khóa/mở theo nhiệm vụ) và dịch chuyển ngay. Tab Bản đồ trong bảng nhân vật dùng cùng giao diện.

## May mắn
Chỉ số May mắn (trang bị, thẻ, di vật) tác động ba thứ (`luckMult`, `dropChance` trong `src/items.js`): bậc của đồ rơi (bậc càng cao hưởng càng nhiều, May mắn 60 = Hiếm ×2 … Thần thoại ×6), xác suất rơi đồ/thẻ (May mắn 150 = gấp đôi, tối đa 95%), và bậc của thẻ bổ sung rơi từ quái/boss.

## Trang bị theo lớp nhân vật
| Lớp | Vũ khí | Vật phẩm tay phụ | Mũ |
|---|---|---|---|
| Hiệp Sĩ | Kiếm | Khiên | Mũ Giáp |
| Cung Thủ | Cung | Túi Tên | Mũ Cung Thủ |
| Pháp Sư | Sách Phép | Cầu Ánh Sáng | Mũ Phù Thủy |
| Sát Thủ | Song Đao | Mặt Nạ Sát Thủ | Mũ Sát Thủ |

Mỗi vật phẩm chuyên dụng có bể dòng thuộc tính riêng (`CLASS_POOL` trong `src/items.js`): khiên thiên về thủ, túi tên về chí mạng, cầu ánh sáng về kỹ năng và hồi chiêu, mặt nạ về né tránh.

## Lò Rèn (cường hóa · đổi dòng · thức tỉnh · đột phá)
Mở từ hộp thông tin trang bị. Mỗi tính năng có bảng riêng, hoạt ảnh và hiệu ứng riêng; logic nằm trong `src/items.js` (hàm thuần, có test), giao diện trong `src/forge.js`.

| Tính năng | Tác động | Cơ chế |
|---|---|---|
| Cường hóa | Chỉ số chính **và mọi dòng phụ** | +6% chính, +2,5% mỗi dòng phụ mỗi cấp. Mốc +5/+10/... thưởng thêm 2 chỉ số theo lớp. Thất bại không phá đồ, cộng bảo hiểm +5%. Trần +20 |
| Đổi dòng | Một dòng phụ | Quay ra 3 phương án (đầu tiên giữ loại, đổi giá trị), chọn 1. 12% ra "Cực phẩm" ×1,25 |
| Thức tỉnh | Dòng đặc biệt + **nội tại riêng của lớp** | 3 cấp (×1 / ×1,6 / ×2,3), cấp 2–3 có tỷ lệ 85%/70% và bảo hiểm +10% mỗi lần thất bại. Có thể đổi riêng dòng đặc biệt |
| Đột phá | Chỉ số chính ×1,25/×1,5/×1,8, thêm dòng theo lớp, **trần cường hóa +5 mỗi bậc** | 3 bậc (100%/80%/60%). Mỗi bậc thêm 4% xác suất dư chấn: đòn phụ 60% sát thương, tên theo lớp |

## Cấu trúc mã
| File | Vai trò |
|---|---|
| `main.js` | Lõi `GameScene`: khởi tạo, người chơi, camera, HUD, vòng lặp |
| `scene-loot.js` · `scene-combat.js` · `scene-fx.js` · `scene-modes.js` | Phương thức của `GameScene` tách theo nhóm (gắn bằng `Object.assign` vào prototype) |
| `state.js` | Tiến trình của nhân vật đang chơi `G`, khu vực hiện tại, hằng số hiển thị |
| `menu.js` | Menu chính: giới thiệu, 4 nhân vật, tạo/xóa/tiếp tục |
| `settings.js` · `settings-panel.js` | Cài đặt dùng chung (lưu trữ) và bảng cài đặt |
| `map-picker.js` | Bảng chọn bản đồ và thẻ bản đồ dùng chung |
| `data.js` | Lớp nhân vật, kỹ năng, quái, khu vực, nhiệm vụ. Phần cuối là 4 bước hậu xử lý có tên và chú thích thứ tự |
| `items.js` | Trang bị, độ hiếm, thẻ bài, chỉ số, và toàn bộ hệ thống Lò Rèn |
| `forge.js` | Giao diện Lò Rèn: hoạt ảnh, hạt năng lượng, so sánh trước/sau |
| `icons.js` | Bộ icon vector (SVG) dùng cho mọi giao diện |
| `board.js`, `inv.js`, `hud.js`, `layout.js` | Bảng nhân vật/túi đồ, HUD |
| `equipicons.js` | Khai báo sheet `assets/ui/equip.png` (sinh tự động) |
| `save.js` | IndexedDB nhiều ô nhân vật, sao lưu, **migrate dữ liệu theo phiên bản** |

### Nâng cấp dữ liệu lưu
`save.js` có `VER` và `MIGRATIONS`. Khi đổi cấu trúc dữ liệu: tăng `VER`, thêm bước `MIGRATIONS[vCũ]` biến đổi dữ liệu lên phiên bản kế, thêm test trong `tests/run.mjs`. Bản lưu cũ (và file sao lưu JSON cũ) tự được nâng cấp khi nạp; bản lưu mới hơn phiên bản game thì không được đọc.

## Tài nguyên (`tools/`)
Các script dựng lại tài nguyên từ ảnh gốc. Đường dẫn lấy từ `tools/paths.py`: gốc repo tự suy ra; ảnh nguồn mặc định ở `tools/source/` (đổi bằng `EP_SRC`); thư mục tạm bằng `EP_WORK`.
- `build_equip.py`: dựng `assets/ui/equip.png` (17 loại × 7 bậc, ô 160px) và `src/equipicons.js` từ 3 ảnh trong `tools/source/equip_*.png`. Chạy: `python3 tools/build_equip.py` (cần numpy, scipy, Pillow).
- `build_board_alpha.py`: dựng `assets/ui/board.webp` (nền bảng có vùng trong suốt) từ `tools/source/board.jpg`.
- `build_assets.py` (bản đồ), `build_ui.py` (khung giao diện + `layout.js`), `build_chars.py`, `build_terrain.py`: cần ảnh gốc tương ứng, thiếu thì báo rõ file nào.

## Xem thử giao diện (dev)
Chạy server tĩnh ở gốc repo rồi mở: `tests/menu-preview.html?seed=2` (menu với 2 nhân vật mẫu), `tests/icons-preview.html` (toàn bộ icon), `tests/forge-preview.html?cls=mage` (Lò Rèn, console: `forge.open('t1','enhance')`), `tests/board-preview.html?cls=elf` (bảng túi đồ), `tests/load-check.html` (nạp thử mọi module với Phaser giả).

Font Montserrat tải từ Google Fonts ở lần mở đầu (cần mạng), sau đó được lưu cache để chơi offline.
