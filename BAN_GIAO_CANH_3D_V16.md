# BÀN GIAO — Web 9 Sạch, cảnh 3D (three.js r160, Google Apps Script web app) — bản V16

> Dán toàn bộ file này vào phiên mới. Phiên mới không có memory vẫn phải làm đúng theo đây.
> QUY TẮC (chép nguyên văn từ yêu cầu của ptg): "after EVERY reply, attach an updated handoff .md so a fresh session with no memory can continue exactly and in detail; if there isn't room to finish everything, send the handoff first; copy this rule verbatim into every handoff"
> Cách làm: điều tra trước khi sửa, sửa nhỏ nhất có thể, không báo "đã test" khi chưa chạy. Với sửa code nhỏ: đưa đoạn "find" đầy đủ + code thay thế; với scene.js: trả cả file.


## 0. V16 (phiên mới nhất — đọc trước)
Yêu cầu của ptg: (1) "vẫn bị che, dời bảng hiệu lớn qua trái để thấy được tất cả biển hiệu"; (2) "quá lag, load vào quá chậm, chậm hiển thị hình ảnh".
Đã làm (chạy thử Chromium headless có/không LOW, thấy ảnh đúng; CHƯA đo trên máy/mạng thật của ptg; môi trường test KHÔNG có person*/tree_*/rider_*/bus/stop/assets/sp/logo.png thật):
**Bảng hiệu / che khuất** (`STREET` trong scene.js):
- Nguyên nhân che: cây cũ x=13.5 đứng ngay trước đầu cửa hàng ĐMX (che biển nhỏ + cửa); biển lớn "Điện máy XANH" nằm giữa mặt tiền (x≈25–35) nên ở khung đầu chỉ lộ mép phải.
- `STREET.treeMove=[[24,54],[13.5,47.5]]` (cả 2 cây cũ dời ra đầu phải), cây thêm [61,1]. `STREET.bigSign={dx:-11,dz:.03}`: hàm `moveBigSign()` tách 2 tam giác biển lớn khỏi mesh `Sign_Boards_Ground_Atlas002_E_0` (theo UV u>.33,v<.18) rồi dời sang trái 11 m → biển nằm x≈14–24 (hơi nhô 1 m qua góc trái cửa hàng), thấy trọn ở khung đầu tiên. Chỉnh `dx` nếu muốn khác (âm = trái). Chỗ cũ giữa mặt tiền còn khung trắng trống (nhìn từ chính diện).
- Giả định: "bảng hiệu lớn" = biển Điện máy XANH lớn. Nếu ptg muốn biển khác (vd biển nhà bldD trên mái) thì hỏi lại.
**Tốc độ vào trang** (`boot()`, đều có hạn chót):
- Bộ giải Draco đặt local `assets/draco/` (3 file lấy từ three r160, PHẢI đưa lên host; thiếu thì tự dùng gstatic — dò bằng HEAD).
- Font + logo tải song song (trước nối tiếp); module bloom/Sky/BufferGeometryUtils nạp trước; Google Fonts trong index.html đổi sang tải không chặn (`media=print onload`, cờ `window.__gf`).
- Ảnh sản phẩm/poster (`assets/sp/*`) tải ngay từ đầu; chờ tối đa 2,5s (trước 8s); ảnh về muộn tự thay vào poster vẽ tạm (`PLATE`, `posterTex`). Ảnh "cut.png" vẽ vào canvas bánh thì không thay muộn được.
- Chờ glb tối đa 4,5s (trước 8s); nếu nhà mới chưa về thì tạm hiện nhà cũ (`STREET_DONE`). `renderer.compileAsync` thay `compile` (không khoá luồng).
**Giảm lag khi chạy:**
- `ZONE` (khối "V16: CẮT CẢNH"): khi camera z>15 ẩn 26 khối nằm hoàn toàn sau z=-6.2 trong cửa hàng; hiện lại khi z<13.5 và mỗi khi bóng cần vẽ lại. Khung đầu: 887→688 lần vẽ, 208k→158k tam giác (−22%/−24%); khác biệt ảnh chỉ ~2k điểm sau kính cửa. `ZONE.on=false` để tắt; `ZONE.zIn=-1` ẩn mạnh hơn (570 lần vẽ, khác ~3,5k điểm).
- Chất lượng thích ứng: bắt đầu pixelRatio ≤1.25 (trần 1.5, trước 1.75), tụt nhanh hơn (cửa sổ 24 khung, bước .2, sàn .7, chờ 3s thay 5s).
- Tồn tại: khung đầu vẫn ~690 lần vẽ/158k tam giác + 5–6 PointLight; nếu còn lag trên điện thoại: gộp mesh tĩnh theo vật liệu, giảm PointLight, thử `?perf`.
**Việc ptg cần làm:** triển khai cả thư mục (nhớ `assets/draco/`, index.html `?v=20`), mở `?perf`, copy các dòng `[9Sach] +…ms` trong Console nếu vẫn chậm; xác nhận đã ổn bảng hiệu.

## 1. Cấu trúc
- `index.html` — nạp `import('./js/scene.js?v=20')` (V16 đã tăng 19 → 20; mỗi lần sửa scene.js phải tăng số này).
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

## 3b. V15.1 — sửa "load chậm + thấy cảnh cũ rồi mới đổi"
- Nhà cũ (`OLDB`) bị ẩn ngay từ lúc dựng (`visible = !GLB_ON`); chỉ hiện lại nếu nhà mới không nạp được.
- `streetTex()` trả Promise; `streetStart()` chờ ảnh đường/vỉa hè nạp + đẩy lên GPU (`initTexture`, `warmTex`) trước khi màn hình tải tắt.
- `glbStart()` chạy `crowdStart→streetStart` song song với `ridersStart` (trước đây nối tiếp); thời gian chờ tối đa của màn hình tải 7s → 12s (`wait(12000)` trong boot).
- CHƯA đo thời gian thật trên máy/mạng của ptg; nếu vẫn chậm, kiểm tra tổng dung lượng assets (~2 MB mới) và Draco decoder từ gstatic.

## 3c. V15.2 — CỬA HÀNG ĐIỆN MÁY XANH bên phải
- File `assets/models/street_store.glb` (470 KB, 16k tam giác) từ `super_store_with_pizza_hut__bakery.glb`; tạo bằng `tools/build_store.mjs` (cần `glbs/store.glb` + `glbs/dmx_logo.png`).
- Logo Điện máy Xanh được VẼ VÀO texture: biển lớn "SUPER SALE" (Atlas002_E, ô x350..1020,y0..178, lật dọc) và biển đỏ nhỏ "SUPER MARKET" (Atlas001_E, ô x868..958,y480..890, chuyển vị). Đã xem lại ảnh render: cả 2 đúng chiều. Biển cột quảng cáo đứng ngoài cửa vẫn là hình siêu thị gốc.
- `STREET.store = {x:35, y:2.23, z:-.5}` (sàn y=-2.2 trong file => nâng +2.23 để nổi trên mặt đường; mặt tiền z=5 => 4.5; rộng x -20..19 => phủ x≈14.6..54). 3 nhà bên phải (bldC/B/A) đã bỏ khỏi `STREET.bld`; nhà bldD dời sang x=66, bldC x=78. Ghế bên phải dời z=10.2 (tránh đè nền cửa hàng).
- Nội thất cửa hàng vẫn còn (nhìn xuyên kính). Biển Pizza Hut bên trong vẫn có.

## 3c2. V15.3 — TỐC ĐỘ VÀO TRANG + DỜI CỬA HÀNG/CÂY
Báo cáo của ptg: màn hình tải đứng ở ~10% hơn 2 phút mới vào 3D (ảnh DevTools lúc 91%: đang chờ bước cuối). KHÔNG tái hiện được độ trễ 2 phút trong môi trường test (thiếu bus/trạm/người/cây V13/V14 của ptg, mạng khác) => đã làm biện pháp phòng ngừa, CHƯA đo được trên máy ptg:
- Mọi bước tuỳ chọn có hạn chót (`tmo(p, ms)`): nạp bloom/composer 5s, Sky 5s, BufferGeometryUtils 5s, GLTFLoader+DRACOLoader 8s, logo 3s; chờ file .glb của màn hình tải 12s → 8s (`wait(8000)` trong boot).
- `index.html`: thêm `<link rel="modulepreload">` cho three, GLTFLoader, DRACOLoader, Sky, EffectComposer, UnrealBloomPass, OutputPass và `./js/scene.js?v=19` để trình duyệt tải song song ngay từ đầu. `DRACOLoader.preload()` tải sẵn bộ giải Draco.
- Console ghi thời gian từng bước: dòng `[9Sach] +NNNms xong bước ...` / `đã tải xe buýt + trạm` / `đã dựng xong người/cây/xe máy/phố`. Nếu vẫn chậm: xin ptg copy các dòng này (và tab Network, cột Time/Waterfall, cho các file >1 MB). Trong test, bước `facade` mất ~3.2s CPU (stageFacade/stageTiger) — có thể nặng hơn trên điện thoại.
- Nghi ngờ chưa kiểm: kích thước `japanese_bus_toei_bus_tokyo.glb`, `standard_bus_stop.glb`, `person*.glb`, `tree_*.glb` (chưa thấy), logo.png, Google Fonts (link CSS chặn render trong <head>), jsdelivr/gstatic chậm ở VN.
- Dời cửa hàng: `STREET.store = {x:29.5, y:1.9, z:.25, s:.85}` (thu nhỏ 0.85, mép sàn x≈12.2 sát thảm cẩm thạch 9 Sạch, KHÔNG được < 12 kẻo đè thảm), nhà bldD x=55, bldC x=67. Cây cũ ở x=24 dời sang x=50; bỏ 2 cây thêm ở x=19, 35, 46 (bên phải chỉ còn cây x=58); `STREET.trees` = [[-19,0],[-35,1],[-46,0],[58,1]].

## 3d. LỖI "Hệ thống đang bận" khi tạo đơn khách sỉ (module `don`, ERP `tp9sach-ops.github.io/erp/`)
- ptg gửi file `Untitled-1-261101.md` = TOÀN BỘ HTML FRONT-END của ERP (16.947 dòng), KHÔNG có code Apps Script phía máy chủ. Chuỗi "Hệ thống đang bận, vui lòng thử lại sau vài giây" KHÔNG có trong file => do hàm máy chủ `submitOrder(data, isDebt, editInfo)` ném ra (nghi `LockService.tryLock` hết thời gian). Front-end gọi ở ~dòng 5011-5039 (`google.script.run ... .submitOrder`), lỗi hiện qua `alert('Lỗi gửi đơn: '+...)`.
- Đã đưa cho ptg bản vá phía front-end: tự thử lại tối đa 3 lần (2.5s/5s/7.5s) khi lỗi chứa "đang bận" (2 đoạn find/replace trong handleOrderSubmit). CHƯA xác nhận ptg đã áp dụng/chạy.
- Sửa gốc cần code máy chủ: hàm `submitOrder` và chỗ lấy khóa (LockService) trong Code.gs — đã xin ptg gửi. Hướng: tăng thời gian chờ khóa (`waitLock(30000)` thay `tryLock` ngắn), chỉ khóa quanh đoạn ghi Sheet, đưa việc chậm (gửi Zalo, tạo PDF, đồng bộ) ra ngoài khóa.

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
