# BÀN GIAO — Web 9 Sạch, cảnh 3D (three.js r160, Google Apps Script web app) — bản V15

> Dán toàn bộ file này vào phiên mới. Phiên mới không có memory vẫn phải làm đúng theo đây.
> QUY TẮC (chép nguyên văn từ yêu cầu của ptg): "after EVERY reply, attach an updated handoff .md so a fresh session with no memory can continue exactly and in detail; if there isn't room to finish everything, send the handoff first; copy this rule verbatim into every handoff"
> Cách làm: điều tra trước khi sửa, sửa nhỏ nhất có thể, không báo "đã test" khi chưa chạy. Với sửa code nhỏ: đưa đoạn "find" đầy đủ + code thay thế; với scene.js: trả cả file.

## 1. Cấu trúc
- `index.html` — nạp `import('./js/scene.js?v=16')` (V15 đã tăng 15 → 16; mỗi lần sửa scene.js phải tăng số này).
- `js/scene.js` — module chính. Khối: V12 (bus, xe máy, người, trạm), V13 (người + cây .glb), V14 (xe máy + người lái .glb), **V15 (cảnh quan phố, mới)**.
- `assets/models/*.glb` (Draco/WebP) và **`assets/textures/*.webp`** (mới).
- Cảnh `matrixWorldAutoUpdate=false` ⇒ vật thêm mới gọi `updateMatrixWorld(true)`. Bóng vẽ 1 lần ⇒ vật chuyển động `castShadow=false`. Test: serve http, thêm `?perf` xem HUD.

## 2. V13/V14 (giữ nguyên)
Người + cây .glb (`CROWD`), xe máy + người lái .glb (`RIDERS`). Xem bàn giao V14 nếu cần chi tiết (file tạo model: `tools/`).

## 3. V15 — CẢNH QUAN PHỐ (phiên này)
Yêu cầu: thay nhà cửa xung quanh cửa hàng, thay mặt đường, thêm cây, ghế, xe (đạp) "đẹp như 2 file gửi": `city.glb` (góc phố kiểu Hàn: 3 nhà + nhà có biển quảng cáo + đường + cây) và `sidewalk.glb` (cây thu, ghế, xe đạp, đèn, thùng rác, vỉa hè).
**Giả định cần xác nhận với ptg:** "xe đẹp" được hiểu là **xe đạp** (trong sidewalk.glb có xe đạp; city.glb không có ô tô). Nếu ptg muốn ô tô thì cần file ô tô.

File mới (đặt vào dự án):
| File | Từ | Ghi chú |
|---|---|---|
| `assets/models/street_buildings.glb` (514 KB, 17k tam giác) | city.glb | 4 nhà tên node `bldA`(be 3 tầng) `bldB`(gạch đỏ) `bldC`(trắng 4 tầng) `bldD`(có biển quảng cáo trên mái). Mặt trước hướng +z, tọa độ gốc của city.glb (cao ~4.2 đơn vị) |
| `prop_bench.glb` (39 KB, 3.4k tam giác) | sidewalk.glb | ghế dài gỗ, dài 1.75 m, người ngồi quay mặt +z |
| `prop_bike.glb` (124 KB, 9.4k) | sidewalk.glb | xe đạp xanh cổ, dài 1.75 m, đầu xe +z; đã bỏ xích/nan hoa/bàn đạp/túi cho nhẹ |
| `prop_lamp.glb` (13 KB, 1.3k) | sidewalk.glb | đèn đường đen cao 3.8 m (không phát sáng) |
| `assets/textures/road.webp` | city.glb `real_road` | ô nhựa đường 4×2 m, cắt từ vùng không có vạch, sáng ×2.8 |
| `assets/textures/paver.webp` | city.glb `tiles` | gạch tròn nâu đỏ, 1 ô = 2.4 m |
Model đều: mét, chân y=0, gốc giữa thân, `MeshStandardMaterial` không normal/MR map.

Code (`js/scene.js`):
- `stagePlaza()`: lưu `GROUND` (đường), `WALK` (vỉa hè); `building()` đẩy 12 mesh nhà cũ vào `OLDB`.
- Khối `V15` ngay trước `glbStart()`: `const STREET`, `streetLoad()`, `streetTex()`, `placeProp()`, `addStreetTree()`, `streetStart()`. `glbPrefetch()` tải song song `STREETP`; `glbStart()` gọi `streetStart()` sau `ridersStart()` (try/catch).
- Thiếu file ⇒ giữ nguyên bản cũ (nhà khối, đường vẽ code). Nhà cũ chỉ bị gỡ khi nạp được `street_buildings.glb`.
- Chỉnh nhanh trong `STREET`: `S` (tỉ lệ nhà, 3.6 ⇒ cao ~15 m), `zFront` (4.5), `bld` = `[tên nhà, x tâm, hệ số]` (10 nhà, LOW chỉ 6), `benches/bikes/lamps` = vị trí trên vỉa hè (z≈8.6–12.2), `trees` = `[x, loại 0|1]` (dùng `tree_linden`/`tree_lowpoly` của V13, đặt z=11.4, có gió lay).
- Mặt đường: `road.webp` lặp mirrored `repeat(75,150)`; vỉa hè `paver.webp` `repeat(62.5,5.5)`. Vạch kẻ, vạch qua đường, gờ vỉa, thảm đỏ/cẩm thạch trước cửa KHÔNG đổi.

## 4. ĐÃ kiểm / CHƯA kiểm chứng
- Đã chạy bằng Chromium headless (SwiftShader): cảnh vào được, console `V15: đã dựng 6 nhà, 4 ghế, 3 xe đạp, 4 đèn, cây thêm 6` (6 nhà vì máy test được tính là LOW), chụp ảnh thấy nhà mới 2 bên, đường nhựa xám có vạch, ghế/xe đạp/đèn ở hai bên vỉa hè.
- **CHƯA xem được**: 6 cây thêm (môi trường test không có `tree_linden.glb`/`tree_lowpoly.glb` của V13 ⇒ nhánh này không chạy); chế độ không-LOW (10 nhà); FPS trên máy thật (`?perf`); độ sáng nhà (có thể hơi tối/lóa); ghế/xe đạp mới chỉ thấy rất nhỏ ở mép ảnh.
- Biển hiệu trên nhà mới là **chữ Hàn** (do city.glb). Nếu ptg không muốn: cần thay texture nhà hoặc chỉ dùng nhà `bldA`.

## 5. Bài học khi tách model (tools/)
- File gốc nén meshopt + KHR_mesh_quantization: phải `dequantize()` và gỡ extension meshopt trước khi ghi Draco (`tools/common.mjs → finalize`).
- `flatten()` làm mất tên nhóm: ghi nhận mesh node thuộc nhóm nào TRƯỚC khi flatten rồi `join()` theo node cha.
- **Cây thu (sidewalk.glb) đã BỎ**: lá là thẻ alpha (4 tam giác) + 110k tam giác thân/cành; rút gọn làm tán lá thưa và render ra tối/đen đốm. Cần làm lại nếu muốn: tách thân/cành đi riêng, giữ nguyên thẻ lá, dilate màu vào vùng trong suốt của texture lá, bỏ lá rụng trên đất (nằm trong cùng nhóm `leaf`).
- Xe đạp 100k → 9k tam giác chỉ khi bỏ chi tiết nhỏ; `simplify` một mình dừng ở ~25k. Thùng rác (`TrashBin`, 23k tam giác) chưa dùng — cảnh đã có thùng rác dựng khối.
- Tách nhà theo tên nhóm trong city.glb (xem `tools/build_buildings.mjs`), dựng props xem `tools/build_props.mjs` (`node build_props.mjs prop_bike`).

## 6. Việc có thể làm tiếp
1) Xem thật trên trình duyệt, chỉnh `STREET.S`/vị trí nếu nhà quá cao/thấp hoặc đè cây. 2) Thay chữ Hàn trên mặt tiền. 3) Ô tô đậu (cần file). 4) Cây thu như file (mục 5). 5) Vạch đôi vàng/hình xe đạp trên đường như city.glb (bỏ chữ Hàn). 6) Đèn đường phát sáng ban đêm.
