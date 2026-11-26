# vendor/

Đặt `phaser.min.js` (Phaser 3.80.1) vào thư mục này để game chạy hoàn toàn offline, không phụ thuộc CDN:

```
curl -L -o vendor/phaser.min.js https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js
```

`index.html` thử `vendor/phaser.min.js` trước, nếu không có mới tải từ CDN. Service worker sẽ tự lưu bản đã tải vào bộ nhớ đệm.
