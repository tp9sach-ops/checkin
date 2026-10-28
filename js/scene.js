/* ==========================================================================
   scene.js — Cửa hàng 9 Sạch 3D (Three.js 0.160.0, dựng bằng hình khối, không cần GLTF)
   Đặt tại: /js/scene.js . index.html nạp bằng import('./js/scene.js') và gọi World.start()
   Mọi chỗ có thể chỉnh nằm ở 3 khối đầu: SCENES, CAM, HOT
   ========================================================================== */
import * as THREE from 'three';

if (!CanvasRenderingContext2D.prototype.roundRect) {      // bù cho trình duyệt cũ chưa có roundRect
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
}
const N = window.NINE;                       // cầu nối do index.html cung cấp (MODS, go, effUrl, vis...)
const $ = id => document.getElementById(id);
const FONT = "'Be Vietnam Pro','Segoe UI',Arial,sans-serif";
const LOW = !!((navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };

/* ---------- 1) 7 CẢNH: [bắt đầu, kết thúc] theo tiến độ cuộn 0..1 ---------- */
const SCENES = [[0, .12], [.12, .25], [.25, .42], [.42, .58], [.58, .72], [.72, .84], [.84, 1]];

/* ---------- 2) CAMERA: [tiến độ, [x,y,z] vị trí camera, [x,y,z] điểm nhìn] ----------
   Trục: +z là phía đường phố, -z đi sâu vào cửa hàng, y là chiều cao (mét). */
const CAM = [
  [0.00, [0.5, 1.9, 27],   [0, 3.6, 0]],      // 01 ngoài đường nhìn mặt tiền
  [0.06, [0, 1.8, 21],     [0, 3.4, 0]],
  [0.12, [0, 1.7, 12],     [0, 2.4, -3]],
  [0.19, [0, 1.6, 4.5],    [0, 1.9, -8]],     // 02 cửa kính trượt mở, vào sảnh
  [0.25, [0.6, 1.65, -2.5], [-1.5, 1.2, -8]],
  [0.33, [-0.6, 1.95, -5.1], [-2.3, 0.8, -8.5]], // 03 tủ đông (gần hơn để thấy rõ bánh)
  [0.42, [-0.3, 1.8, -6.5], [-1.5, 0.9, -9]],
  [0.50, [0.2, 1.7, -9.5], [3.5, 1.1, -13.2]], // 04 quầy thu ngân
  [0.58, [1.0, 1.7, -11],  [4.2, 1.3, -14]],
  [0.65, [-3.5, 1.6, -14.5], [-8.5, 1.6, -17.2]], // 05 tường chấm công
  [0.72, [-6.2, 1.6, -17.2], [-9.9, 1.65, -18.4]],
  [0.75, [-4.5, 1.7, -21], [-8.5, 1.0, -24.5]], // 06 khu sau: bàn thờ
  [0.78, [-3.5, 1.7, -23.5], [-5.5, 1.2, -27.4]], //          kệ kỹ thuật
  [0.81, [3.5, 1.7, -21.5], [9.9, 1.7, -23]],  //          bảng trắng
  [0.84, [2.5, 1.7, -23.5], [2.5, 1.4, -27.4]], // 07 cửa kho
  [0.88, [2.5, 1.7, -25.2], [2.5, 1.3, -29]],
  [0.92, [2.5, 1.65, -27.9], [2.5, 1.0, -32]],
  [0.96, [2.5, 1.7, -29.4], [2.5, 0.95, -32.5]],
  [1.00, [2.5, 1.75, -29.8], [2.5, 0.9, -32.5]]
];

/* ---------- 3) CHẤM SÁNG: at = vị trí 3D, win = khoảng tiến độ được hiện, foc = tiến độ camera bay tới ---------- */
const HOT = {
  tt:    { at: [0, 6.9, 1.7],        win: [-.06, .20],  foc: .03 },
  hotro: { at: [5.0, 1.3, -3.2],     win: [.12, .33],   foc: .25 },
  don:   { at: [-2.5, 1.25, -8.5],   win: [.22, .45],   foc: .33 },
  kpi:   { at: [2.3, 1.55, -13.2],   win: [.40, .62],   foc: .50 },
  kc:    { at: [4.6, 1.3, -13.1],    win: [.40, .62],   foc: .52 },
  rt:    { at: [3.6, 2.35, -15.4],   win: [.40, .62],   foc: .54 },
  cong:  { at: [-9.8, 1.6, -17],     win: [.56, .76],   foc: .68 },
  qt:    { at: [-9.8, 1.8, -19.3],   win: [.56, .76],   foc: .71 },
  tl:    { at: [-8.5, 1.35, -24.2],  win: [.70, .78],   foc: .75 },
  kt:    { at: [-5.5, 1.35, -27.1],  win: [.73, .81],   foc: .78 },
  dt:    { at: [9.8, 1.9, -23],      win: [.78, .86],   foc: .81 },
  loi:   { at: [2.5, 1.15, -32],     win: [.84, 1.07],   foc: .97 }
};

/* ============================ TIỆN ÍCH ============================ */
const gBox = new THREE.BoxGeometry(1, 1, 1), gPl = new THREE.PlaneGeometry(1, 1);
const gCyl = new THREE.CylinderGeometry(.5, .5, 1, 24), gSph = new THREE.SphereGeometry(.5, 20, 14), gIco = new THREE.IcosahedronGeometry(.5, 1);
function mesh(p, geo, mat, s, pos, rot) {
  const m = new THREE.Mesh(geo, mat); m.scale.set(s[0], s[1], s[2]); m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]); p.add(m); return m;
}
const B = (p, m, s, pos, rot) => mesh(p, gBox, m, s, pos, rot);          // hộp  [rộng, cao, sâu]
const C = (p, m, s, pos, rot) => mesh(p, gCyl, m, s, pos, rot);          // trụ  [đường kính, cao, đường kính]
const S = (p, m, s, pos, rot) => mesh(p, gSph, m, s, pos, rot);          // cầu  [dx, dy, dz]
const P = (p, m, s, pos, rot) => mesh(p, gPl, m, [s[0], s[1], 1], pos, rot); // mặt phẳng [rộng, cao]

const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .6, metalness: 0 }, o));
const emi = (c, i = 2.4) => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: c, emissiveIntensity: i, roughness: .5 });
const M = {
  honey: std(0xF2B705, { roughness: .38, metalness: .3 }), honey2: std(0xE8A800, { roughness: .45, metalness: .25 }),
  led: emi(0xffd36b, 2.8), ledG: emi(0x35e08a, 2.2), green: std(0x1f7a3a, { roughness: .5 }), leaf: std(0x2f8f3a), leaf2: std(0x3fa64a),
  stone: std(0xcdbf9f, { roughness: .8 }), cream: std(0xf6e7bd, { roughness: .85 }), ceil: std(0xf8efd6, { roughness: .9 }),
  wood: std(0x8a5a32, { roughness: .55 }), woodD: std(0x4a2c17, { roughness: .5 }), white: std(0xeeeeee, { roughness: .4 }),
  silver: std(0xb8bec4, { roughness: .3, metalness: .8 }), dark: std(0x1c1f22, { roughness: .5, metalness: .3 }), black: std(0x0d0e0f, { roughness: .4 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xbfe3f0, transparent: true, opacity: .14, roughness: .05, metalness: .2, depthWrite: false, side: THREE.DoubleSide }),
  glassD: new THREE.MeshStandardMaterial({ color: 0x22313f, roughness: .12, metalness: .7 }),
  winLit: emi(0xffd9a0, 1.1), pot: std(0x7a5a3a), polo: std(0xf2c230), skin: std(0xd9d2c3), red: std(0xa51c1c, { roughness: .5 }),
  gold: std(0xd4a017, { roughness: .3, metalness: .8 }), orange: std(0xff8c1a), apple: std(0xc62828), flame: emi(0xff9a3a, 3),
  cake: std(0xffffff, { roughness: .7 }), cakeB: std(0xf6e27a, { roughness: .6 }), cardboard: std(0xb98a55), spike: std(0x8fb339, { flatShading: true }),
  steel: std(0x8c9a94, { roughness: .6, metalness: .4 }), gray: std(0x9aa0a6)
};
function rrShape(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
function ringGeo(w, h, r, t) { const s = rrShape(w, h, r); s.holes.push(rrShape(w - 2 * t, h - 2 * t, Math.max(r - t, .05))); return new THREE.ShapeGeometry(s, 12); }
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, g, t, w, h };
}
function textMat(text, ratio, color, weight = 700) {
  const W = 1024, H = Math.round(W / ratio);
  const o = canvasTex(W, H, g => {
    let fs = H * .8; g.font = `${weight} ${fs}px ${FONT}`; const mw = g.measureText(text).width;
    if (mw > W * .94) { fs *= W * .94 / mw; g.font = `${weight} ${fs}px ${FONT}`; }
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, H / 2 + fs * .04);
  });
  return new THREE.MeshBasicMaterial({ map: o.t, transparent: true });
}
const screenMat = tex => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });

/* ============================ TRẠNG THÁI ============================ */
const scene = new THREE.Scene();
let renderer, camera, composer, bloom, canvas, world, scroller, stk, spc;
let posC, lookC, maxScroll = 1, target = 0, sp = 0, keepP = 0, raf = 0, last = 0, W = 1, H = 1;
const HOTS = [], LIVE = {}, dots = [];
let slideL, slideR, khoL, khoR, altarLight, hover = null, active = null, fly = null, needRay = false, ptrXY = null, lastTouch = false;
const API = { ready: false };
window.World = API;

/* ============================ ĐỒ HỌA ============================ */
function hot(mid, g, box) {
  g.userData.mid = mid; scene.add(g); g.updateMatrixWorld(true);
  const b = new THREE.Box3();
  if (box) b.setFromCenterAndSize(new THREE.Vector3(box[0], box[1], box[2]), new THREE.Vector3(box[3], box[4], box[5])); else b.setFromObject(g);
  const sz = b.getSize(new THREE.Vector3()).addScalar(.1), ct = b.getCenter(new THREE.Vector3());
  const o = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(sz.x, sz.y, sz.z)),
    new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .95, depthTest: false, fog: false }));
  o.position.copy(ct); o.visible = false; o.renderOrder = 999; scene.add(o); HOTS.push({ mid, group: g, outline: o });
}

function stageSky() {
  const sky = canvasTex(8, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#41506e'); gr.addColorStop(.42, '#b98a78'); gr.addColorStop(.62, '#f6b873'); gr.addColorStop(1, '#f6c27c');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  scene.background = sky.t;
  scene.fog = new THREE.FogExp2(0xf0b878, .0085);                       // sương mù nhẹ
  scene.add(new THREE.HemisphereLight(0xffd9a8, 0x5a4634, .7));
  const sun = new THREE.DirectionalLight(0xffc27a, 2.0); sun.position.set(-22, 20, 42); sun.target.position.set(0, 0, -6);
  scene.add(sun, sun.target);
  if (!LOW) {                                                           // bóng đổ mềm chỉ ở máy mạnh
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    const c = sun.shadow.camera; c.left = -34; c.right = 34; c.top = 34; c.bottom = -34; c.near = 5; c.far = 130;
    sun.shadow.bias = -.0004; sun.shadow.normalBias = .03; sun.shadow.radius = 3;
  }
  [[0, 3.0, -3.5], [-1, 3.0, -9.5], [1.5, 3.0, -16], [0, 3.0, -22.5]].forEach(p => {   // đèn ấm trong cửa hàng
    const l = new THREE.PointLight(0xffcf8a, 18, 18, 2); l.position.set(p[0], p[1], p[2]); scene.add(l);
  });
  const gl = new THREE.PointLight(0x62ffa8, 14, 9, 2); gl.position.set(2.5, 2.6, -31); scene.add(gl);   // ánh xanh trong kho
  if (!LOW) {
    altarLight = new THREE.PointLight(0xff8a3a, 4, 5, 2); altarLight.position.set(-8.2, 1.5, -24.2); scene.add(altarLight);
    const lamp = new THREE.PointLight(0xffc870, 10, 10, 2); lamp.position.set(-12.5, 3.9, 6); scene.add(lamp);
  }
}

function stagePlaza() {
  const gt = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#8e9094'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7a7c80'; g.lineWidth = 3;
    g.strokeRect(0, 0, w / 2, h / 2); g.strokeRect(w / 2, 0, w / 2, h / 2); g.strokeRect(0, h / 2, w / 2, h / 2); g.strokeRect(w / 2, h / 2, w / 2, h / 2);
  });
  gt.t.wrapS = gt.t.wrapT = THREE.RepeatWrapping; gt.t.repeat.set(60, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ map: gt.t, roughness: .85 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 40); ground.receiveShadow = !LOW; scene.add(ground);
  // nhà hàng xóm
  B(scene, std(0xbfc0c4, { roughness: .9 }), [14, 18, 22], [-20, 9, -6]); B(scene, std(0xc9c6c0, { roughness: .9 }), [14, 20, 22], [20, 10, -6]);
  // cây ven đường và cột đèn cổ
  [[-15, 9], [15, 9]].forEach(p => {
    C(scene, M.woodD, [.3, 3, .3], [p[0], 1.5, p[1]]); S(scene, M.leaf, [3, 2.6, 3], [p[0], 4, p[1]]); S(scene, M.leaf2, [2.2, 2, 2.2], [p[0] + .5, 5.2, p[1]]);
  });
  C(scene, M.dark, [.12, 4.2, .12], [-12.5, 2.1, 6]); B(scene, emi(0xffd9a0, 2.4), [.4, .5, .4], [-12.5, 4.45, 6]); B(scene, M.dark, [.5, .08, .5], [-12.5, 4.75, 6]);
  // hình nhân low-poly áo polo vàng cổ xanh
  const man = (x, z, ry) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
    C(g, M.black, [.2, .85, .2], [-.11, .42, 0]); C(g, M.black, [.2, .85, .2], [.11, .42, 0]);
    C(g, M.polo, [.46, .62, .28], [0, 1.15, 0]); C(g, M.green, [.26, .06, .26], [0, 1.47, 0]); S(g, M.skin, [.24, .28, .24], [0, 1.64, 0]);
    C(g, M.polo, [.12, .5, .12], [-.3, 1.2, 0], [0, 0, .12]); C(g, M.polo, [.12, .5, .12], [.3, 1.2, 0], [0, 0, -.12]); scene.add(g);
  };
  man(-4.6, 6.5, .5); man(5.2, 8.5, -.6);
}

function stageFacade(logoImg) {
  const F = new THREE.Group(); scene.add(F);
  // tháp phía trên và cửa sổ
  B(F, std(0xdcdde0, { roughness: .9 }), [22, 16, 10], [0, 15, -5.2]);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) P(F, (r + c) % 3 === 0 ? M.winLit : M.glassD, [1.8, 1.5], [-8.5 + c * 3.4, 9.2 + r * 2.6, -.17]);
  // mảng ốp vàng mật ong bo cong
  const fas = new THREE.Mesh(new THREE.ExtrudeGeometry(rrShape(24, 3.7, .9), { depth: 2.2, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 3, curveSegments: 10 }), M.honey);
  fas.position.set(0, 5.35, -1.2); fas.castShadow = !LOW; F.add(fas);                       // mặt trước ở z = 1.12
  mesh(F, ringGeo(23.4, 3.1, .8, .14), M.led, [1, 1, 1], [0, 5.35, 1.14]);                  // viền LED vàng ấm quanh mép
  mesh(F, ringGeo(23.8, 3.5, .85, .1), M.green, [1, 1, 1], [0, 5.35, 1.135]);
  B(F, M.green, [24, .1, .12], [0, 3.56, 1.12]);
  [-1, 1].forEach(sx => {                                                                  // 2 ô kính bo cong hai bên
    mesh(F, new THREE.ShapeGeometry(rrShape(4.6, 2.3, 1.0), 12), M.glassD, [1, 1, 1], [sx * 8.3, 5.35, 1.15]);
    mesh(F, ringGeo(4.8, 2.5, 1.1, .1), M.led, [1, 1, 1], [sx * 8.3, 5.35, 1.16]);
  });
  // chữ trên mặt tiền
  P(F, textMat('Bánh Sầu Riêng', 11 / 1.35, '#1fae4b'), [11, 1.35], [0, 4.6, 1.17]);        // [chữ xanh lá lớn]
  P(F, textMat('124 Mậu Thân', 3.2 / .42, '#1f7a3a', 600), [3.2, .42], [-3.9, 3.95, 1.17]);  // [địa chỉ]
  [3.0, 3.75, 4.5, 5.25].forEach((x, i) => { S(F, i % 2 ? M.cakeB : M.spike, [.5, .5, .5], [x, 3.95, 1.2]); });   // 4 quả sầu riêng nhỏ
  // bảng "Sạch Là Chính – Ngon Là Mười" phía trên cửa
  B(F, M.honey2, [9.6, .78, .3], [0, 3.12, .4]);
  P(F, textMat('Sạch Là Chính – Ngon Là Mười', 8.6 / .58, '#c8102e'), [8.6, .58], [0, 3.12, .56]);
  // khung kính tầng trệt
  B(F, M.dark, [20.4, .1, .1], [0, 3.42, .06]);
  [-1, 1].forEach(sx => {
    P(F, M.glass, [6.3, 2.7], [sx * 6.45, 2.05, .05]); B(F, M.stone, [6.3, .7, .25], [sx * 6.45, .35, .1]);
    B(F, M.dark, [6.3, .06, .08], [sx * 6.45, .72, .06]);
  });
  [-10, -2.9, 2.9, 10].forEach(x => { const p = B(F, M.stone, [.8, 3.5, .8], [x, 1.75, .3]); p.castShadow = !LOW; });
  B(F, M.dark, [3, .02, 1.2], [0, .02, 1.8]);
  // cửa kính trượt (mở theo tiến độ cuộn)
  const panel = sx => {
    const g = new THREE.Group(); g.position.set(sx * 1.2, 0, -.25);
    P(g, M.glass, [2.3, 2.5], [0, 1.3, 0]); B(g, M.silver, [2.3, .06, .06], [0, 2.55, 0]); B(g, M.silver, [2.3, .06, .06], [0, .05, 0]);
    B(g, M.silver, [.05, 2.5, .05], [-sx * 1.15, 1.3, 0]); C(g, M.silver, [.04, .8, .04], [-sx * .95, 1.2, .05]); F.add(g); return g;
  };
  slideL = panel(-1); slideR = panel(1);
  // chậu cây
  const plant = (x, z, s) => {
    C(F, M.pot, [.55 * s, .5 * s, .55 * s], [x, .25 * s, z]); S(F, M.leaf, [.8 * s, .8 * s, .8 * s], [x, .8 * s, z]); S(F, M.leaf2, [.55 * s, .55 * s, .55 * s], [x + .2 * s, 1.1 * s, z + .05]);
  };
  [[-8.6, 2], [-7.2, 2.4], [-3.9, 2.1], [3.9, 2.1], [7.4, 2.3], [8.8, 2]].forEach(p => plant(p[0], p[1], 1.1));
  // huy hiệu tròn "9 SẠCH" (bấm: mục Thông tin)
  const bt = canvasTex(512, 512, (g, w, h) => {
    const cx = w / 2, cy = h / 2; g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(cx, cy, 250, 0, 7); g.fill();
    g.fillStyle = '#2e8b3e'; for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; g.save(); g.translate(cx, cy); g.rotate(a); g.beginPath(); g.moveTo(-14, -228); g.lineTo(14, -228); g.lineTo(0, -196); g.fill(); g.restore(); }
    g.fillStyle = '#f9cc1f'; g.beginPath(); g.arc(cx, cy, 186, 0, 7); g.fill();
    g.fillStyle = '#d4a017'; g.beginPath(); g.moveTo(190, 150); g.lineTo(215, 100); g.lineTo(256, 135); g.lineTo(297, 100); g.lineTo(322, 150); g.fill();
    g.fillStyle = '#e03a1e'; g.strokeStyle = '#fff'; g.lineWidth = 12; g.font = `700 112px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeText('9 SẠCH', cx, cy + 20); g.fillText('9 SẠCH', cx, cy + 20);
    g.fillStyle = '#1f7a3a'; g.font = `600 30px ${FONT}`; g.fillText('SINCE 2017', cx, cy + 96);
    g.fillStyle = '#f6e27a'; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(190 + i * 66, 372, 34, 26, 0, 0, 7); g.fill(); }
    if (logoImg) { g.save(); g.beginPath(); g.arc(cx, cy, 250, 0, 7); g.clip(); g.drawImage(logoImg, 0, 0, w, h); g.restore(); }   // /assets/logo.png nếu có
  });
  const bg = new THREE.Group(); bg.position.set(0, 6.9, 1.2);
  mesh(bg, new THREE.CircleGeometry(1.7, 48), new THREE.MeshBasicMaterial({ map: bt.t }), [1, 1, 1], [0, 0, .31]);
  C(bg, M.honey, [3.7, .3, 3.7], [0, 0, .15], [Math.PI / 2, 0, 0]);
  mesh(bg, new THREE.TorusGeometry(1.8, .06, 8, 64), M.led, [1, 1, 1], [0, 0, .33]);
  hot('tt', bg);
}

function stageInterior() {
  const I = new THREE.Group(); scene.add(I);
  const wt = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#b98a5a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#c49560' : '#ad7f52'; g.fillRect(i * 32, 0, 30, h); }
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 8; i++) g.fillRect(i * 32 + 30, 0, 2, h);
  });
  wt.t.wrapS = wt.t.wrapT = THREE.RepeatWrapping; wt.t.repeat.set(7, 6);
  const floor = P(I, std(0xffffff, { map: wt.t, roughness: .4 }), [20, 34], [0, .012, -17], [-Math.PI / 2, 0, 0]); floor.receiveShadow = !LOW;
  const ceil = P(I, M.ceil, [20, 34], [0, 3.45, -17], [Math.PI / 2, 0, 0]); ceil.castShadow = !LOW;
  const wl = P(I, M.cream, [34, 3.45], [-10, 1.725, -17], [0, Math.PI / 2, 0]); const wr = P(I, M.cream, [34, 3.45], [10, 1.725, -17], [0, -Math.PI / 2, 0]);
  wl.castShadow = wr.castShadow = !LOW;
  B(I, M.wood, [.08, 1, 34], [-9.96, .5, -17]); B(I, M.wood, [.08, 1, 34], [9.96, .5, -17]);
  B(I, M.led, [.08, .06, 34], [-9.8, 3.38, -17]); B(I, M.led, [.08, .06, 34], [9.8, 3.38, -17]); B(I, M.led, [20, .06, .08], [0, 3.38, -.2]);
  [-6, 0, 6].forEach(x => [-2, -7.5, -13, -18.5, -24].forEach(z => C(I, M.led, [.28, .03, .28], [x, 3.43, z])));
}

function stageObjects() {
  const dummy = new THREE.Object3D(); let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  /* --- hotro: màn hình cảm ứng ở lối vào --- */
  { const g = new THREE.Group(); g.position.set(5.0, 0, -3.2);
    B(g, M.dark, [.35, .04, .35], [0, .02, 0]); B(g, M.dark, [.06, 1.1, .06], [0, .58, 0]);
    const head = new THREE.Group(); head.position.set(0, 1.2, 0); head.rotation.x = -.25; g.add(head);
    B(head, M.white, [.54, .4, .04], [0, 0, 0]);
    const t = canvasTex(256, 192, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0f7a5a'); gr.addColorStop(1, '#0a261d'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff'; c.beginPath(); c.roundRect(30, 30, 150, 70, 16); c.fill(); c.fillStyle = '#0a261d'; c.font = `600 26px ${FONT}`; c.textAlign = 'left'; c.fillText('Cần hỗ trợ?', 46, 74);
      c.fillStyle = '#ffd36b'; c.beginPath(); c.roundRect(60, 120, 140, 42, 21); c.fill(); c.fillStyle = '#0a261d'; c.font = `600 22px ${FONT}`; c.textAlign = 'center'; c.fillText('Chạm để gửi', 130, 149); });
    P(head, screenMat(t.t), [.46, .33], [0, 0, .025]); hot('hotro', g); }

  /* --- don: tủ đông trưng bày bánh (dựng ở stageFreezer) --- */
  stageFreezer();

  /* --- quầy thu ngân + tường sau quầy --- */
  { B(scene, M.woodD, [4.4, 1, 1], [3.5, .5, -13]); const top = B(scene, std(0xf4f1ea, { roughness: .3 }), [4.6, .06, 1.15], [3.5, 1.03, -13]); top.receiveShadow = !LOW;
    B(scene, M.led, [4.4, .04, .04], [3.5, .95, -12.48]);
    B(scene, M.cream, [8, 3.4, .2], [4.5, 1.7, -15.6]); B(scene, M.wood, [8, .05, .3], [4.5, 1.3, -15.4]); B(scene, M.wood, [8, .05, .3], [4.5, 2.0, -15.4]);
    for (let i = 0; i < 9; i++) { C(scene, i % 2 ? M.gold : M.honey, [.16, .22, .16], [1.0 + i * .85, 1.43, -15.4]); }
  }
  /* kpi: máy tính trên bàn thu ngân */
  { const g = new THREE.Group(); g.position.set(2.3, 1.06, -13.2);
    C(g, M.dark, [.2, .02, .2], [0, .01, 0]); B(g, M.dark, [.05, .26, .05], [0, .14, 0]); B(g, M.dark, [.8, .52, .04], [0, .5, 0]);
    const t = canvasTex(256, 160, (c, w, h) => { c.fillStyle = '#0a261d'; c.fillRect(0, 0, w, h); c.fillStyle = '#e9d8a6'; c.font = `600 18px ${FONT}`; c.fillText('KPI vận hành', 12, 26);
      [.5, .8, .6, .95, .7, .85].forEach((v, i) => { c.fillStyle = i % 2 ? '#ffd36b' : '#3fe08a'; c.fillRect(16 + i * 38, 140 - v * 90, 26, v * 90); }); });
    P(g, screenMat(t.t), [.74, .46], [0, .5, .025]); B(g, M.dark, [.5, .02, .16], [0, .01, .38]); hot('kpi', g); }
  /* kc: sổ và ngăn kéo tiền */
  { const g = new THREE.Group(); g.position.set(4.6, 1.06, -13.1);
    B(g, std(0x2a5bd7), [.42, .03, .3], [-.3, .015, .05], [0, .2, 0]); C(g, M.dark, [.015, .2, .015], [-.2, .04, .05], [0, 0, Math.PI / 2]);
    B(g, M.gray, [.5, .1, .4], [.35, .05, -.05]); B(g, M.silver, [.46, .05, .3], [.35, .045, .22]);
    [0, 1, 2].forEach(i => B(g, std(0x4f9a5b), [.16, .03, .08], [.25 + i * .1, .07, .22])); hot('kc', g); }
  /* rt: TV treo tường hiện biểu đồ số chạy */
  { const g = new THREE.Group(); g.position.set(3.6, 2.3, -15.45);
    B(g, M.black, [2.0, 1.15, .06], [0, 0, 0]); LIVE.tv = canvasTex(512, 288, (c, w, h) => drawTV(c, w, h, 0));
    P(g, screenMat(LIVE.tv.t), [1.9, 1.05], [0, 0, .035]); hot('rt', g); }

  /* --- cong: máy chấm công gắn tường + qt: khung nội quy --- */
  { const g = new THREE.Group(); g.position.set(-9.86, 1.6, -17); g.rotation.y = Math.PI / 2;
    B(g, std(0x2b2f33, { metalness: .4 }), [.5, .62, .14], [0, 0, 0]);
    LIVE.clock = canvasTex(256, 192, (c, w, h) => drawClock(c, w, h)); P(g, screenMat(LIVE.clock.t), [.38, .28], [0, .1, .075]);
    C(g, M.ledG, [.1, .02, .1], [0, -.18, .075], [Math.PI / 2, 0, 0]); hot('cong', g); }
  { const g = new THREE.Group(); g.position.set(-9.9, 1.8, -19.3); g.rotation.y = Math.PI / 2;
    B(g, M.woodD, [1.0, 1.3, .05], [0, 0, 0]);
    const t = canvasTex(256, 320, (c, w, h) => { c.fillStyle = '#fbf6e6'; c.fillRect(0, 0, w, h); c.fillStyle = '#b3201f'; c.font = `700 34px ${FONT}`; c.textAlign = 'center'; c.fillText('NỘI QUY', w / 2, 56);
      c.fillStyle = '#6a7b73'; for (let i = 0; i < 8; i++) { c.fillRect(30, 96 + i * 26, 196 - (i % 3) * 30, 8); c.fillRect(20, 96 + i * 26, 6, 8); } });
    P(g, new THREE.MeshBasicMaterial({ map: t.t }), [.88, 1.18], [0, 0, .03]); hot('qt', g); }

  /* --- khu sau: dt bảng trắng, tl bàn thờ Thần Tài, kt kệ kỹ thuật --- */
  { const g = new THREE.Group(); g.position.set(9.88, 1.75, -23); g.rotation.y = -Math.PI / 2;
    B(g, M.silver, [2.7, 1.5, .05], [0, 0, 0]);
    const t = canvasTex(512, 280, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#1e5bd8'; c.font = `700 44px ${FONT}`; c.textAlign = 'left'; c.fillText('ĐÀO TẠO', 24, 62);
      c.fillStyle = '#1f9a4b'; for (let i = 0; i < 3; i++) { c.fillRect(30, 100 + i * 38, 220 - i * 30, 8); c.beginPath(); c.arc(20, 104 + i * 38, 5, 0, 7); c.fill(); }
      c.strokeStyle = '#d33'; c.lineWidth = 4; c.strokeRect(290, 100, 90, 56); c.strokeRect(420, 100, 70, 56); c.beginPath(); c.moveTo(380, 128); c.lineTo(418, 128); c.stroke(); });
    P(g, new THREE.MeshBasicMaterial({ map: t.t }), [2.56, 1.36], [0, 0, .03]); B(g, M.silver, [.9, .04, .08], [0, -.78, .05]);
    ['#d33', '#1e5bd8', '#1f9a4b'].forEach((c, i) => C(g, std(c), [.03, .12, .03], [-.2 + i * .2, -.74, .08], [0, 0, Math.PI / 2])); hot('dt', g); }
  { const g = new THREE.Group(); g.position.set(-8.7, 0, -24.2); g.rotation.y = Math.PI / 2;
    B(g, std(0x6b1d12, { roughness: .5 }), [1.2, .8, .55], [0, .4, 0]); B(g, M.gold, [1.25, .04, .6], [0, .82, 0]); B(g, M.red, [1.4, 1.5, .06], [0, 1.55, -.3]); B(g, M.gold, [1.3, .04, .08], [0, 2.3, -.28]);
    C(g, M.gold, [.22, .12, .22], [0, .9, 0]); C(g, M.gold, [.24, .3, .2], [0, 1.1, 0]); S(g, std(0xf1c8a0), [.26, .26, .26], [0, 1.34, 0]); B(g, M.red, [.28, .1, .12], [0, 1.5, 0]);
    C(g, M.gold, [.28, .1, .28], [-.4, .9, .1]);
    for (let i = 0; i < 3; i++) { C(g, M.red, [.012, .2, .012], [-.45 + i * .05, 1.05, .1]); S(g, M.flame, [.03, .03, .03], [-.45 + i * .05, 1.16, .1]); }
    [-.52, .52].forEach(x => { C(g, M.red, [.07, .2, .07], [x, .94, .05]); S(g, M.flame, [.06, .1, .06], [x, 1.08, .05]); });
    C(g, M.gold, [.34, .02, .34], [.3, .86, .12]); [0, 1, 2].forEach(i => S(g, i === 1 ? M.apple : M.orange, [.12, .12, .12], [.22 + i * .09, .94, .12]));
    [0, 1, 2].forEach(i => C(g, M.white, [.06, .05, .06], [-.1 + i * .1, .86, .2])); hot('tl', g); }
  { const g = new THREE.Group(); g.position.set(-5.5, 0, -27.14);
    B(g, M.woodD, [2.4, 1.9, .03], [0, .95, -.24]); [-1.2, 1.2].forEach(x => B(g, M.wood, [.06, 1.9, .5], [x, .95, 0])); [.1, .95, 1.6].forEach(y => B(g, M.wood, [2.4, .04, .5], [0, y, 0]));
    B(g, M.cardboard, [.5, .4, .4], [-.7, .32, 0]); B(g, M.cardboard, [.4, .3, .4], [.1, .27, 0]); B(g, M.cardboard, [.45, .35, .4], [.8, .3, 0]);
    B(g, M.dark, [.46, .02, .3], [-.5, .98, .02]);
    const lh = new THREE.Group(); lh.position.set(-.5, .99, -.12); lh.rotation.x = -.35; g.add(lh); B(lh, M.dark, [.46, .3, .015], [0, .15, 0]);
    const t = canvasTex(256, 160, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1e5bd8'); gr.addColorStop(1, '#0a2a6a'); c.fillStyle = gr; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(30, 24, 120, 90); c.fillStyle = '#1e5bd8'; c.fillRect(30, 24, 120, 16); });
    P(lh, screenMat(t.t), [.42, .26], [0, .15, .01]);
    B(g, M.white, [.5, .2, .38], [.55, 1.07, 0]); B(g, M.gray, [.42, .03, .3], [.55, 1.2, 0]); B(g, std(0xfafafa), [.34, .01, .24], [.55, 1.25, .12], [-.4, 0, 0]); hot('kt', g); }

  /* --- kho: tường ngăn có cửa, hai cánh mở ra, xấp tiền đô --- */
  { const D = new THREE.Group(); scene.add(D);
    const wl = B(D, M.cream, [11.2, 3.45, .2], [-4.4, 1.725, -27.4]), wr = B(D, M.cream, [6.2, 3.45, .2], [6.9, 1.725, -27.4]); B(D, M.cream, [2.6, .75, .2], [2.5, 3.075, -27.4]);
    wl.castShadow = wr.castShadow = !LOW;
    B(D, M.dark, [.12, 2.7, .28], [1.14, 1.35, -27.4]); B(D, M.dark, [.12, 2.7, .28], [3.86, 1.35, -27.4]);
    P(D, textMat('KHO', 3, '#9dffc0'), [1.2, .4], [2.5, 2.95, -27.29]);
    const leaf = (px, sx) => { const p = new THREE.Group(); p.position.set(px, 0, -27.4); B(p, M.dark, [1.28, 2.6, .06], [sx * .64, 1.3, 0]); B(p, std(0x2c3136), [1.0, 2.2, .02], [sx * .64, 1.3, .04]); C(p, M.silver, [.04, .3, .04], [sx * 1.1, 1.2, .08]); D.add(p); return p; };
    khoL = leaf(1.2, 1); khoR = leaf(3.8, -1);
    const wallM = std(0x8c9a94, { roughness: .8 });
    B(D, wallM, [.1, 3.45, 6.6], [-1.5, 1.725, -30.7]); B(D, wallM, [.1, 3.45, 6.6], [6.5, 1.725, -30.7]); B(D, wallM, [8.1, 3.45, .1], [2.5, 1.725, -34]);
    B(D, std(0x5d6b65, { roughness: .9 }), [8, .02, 6.6], [2.5, .011, -30.7]); B(D, M.ceil, [8, .05, 6.6], [2.5, 3.45, -30.7]);
    B(D, M.ledG, [.06, .05, 6.4], [-1.4, 3.35, -30.7]); B(D, M.ledG, [.06, .05, 6.4], [6.4, 3.35, -30.7]);
    const bill = canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#5da46a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2f6b3a'; c.lineWidth = 4; c.strokeRect(3, 3, w - 6, h - 6);
      c.fillStyle = '#7fc08a'; c.beginPath(); c.arc(w / 2, h / 2, 20, 0, 7); c.fill(); c.fillStyle = '#2f6b3a'; c.font = `700 22px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('100', w / 2, h / 2); });
    const billM = std(0xffffff, { map: bill.t, emissive: 0x44aa66, emissiveMap: bill.t, emissiveIntensity: .35, roughness: .6 });
    B(D, M.wood, [3.2, .15, 1.4], [2.5, .075, -32]);
    const items = [];
    [[-1.1, -.4], [-.4, -.4], [.4, -.4], [1.1, -.4], [-1.1, .4], [-.4, .4], [.4, .4], [1.1, .4]].forEach(p => { const n = 5 + Math.floor(rnd() * 5); for (let k = 0; k < n; k++) items.push([2.5 + p[0], .195 + k * .092, -32 + p[1], (rnd() - .5) * .25]); });
    [[-.2, -33.2], [5.4, -33.2], [-.2, -29.6], [5.4, -29.6]].forEach(p => { for (let k = 0; k < 9; k++) items.push([p[0], .045 + k * .092, p[1], (rnd() - .5) * .3]); });
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(.46, .09, .22), billM, items.length);
    items.forEach((it, i) => { dummy.position.set(it[0], it[1], it[2]); dummy.rotation.set(0, it[3], 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    const g = new THREE.Group(); g.add(im); hot('loi', g, [2.5, .7, -32, 3.4, 1.3, 1.5]); }
}


/* ==========================================================================
   SẢN PHẨM 3D + TRANH ĐÈN (ảnh poster đặt trong /assets/sp/*.jpg)
   Thiếu ảnh nào thì tự vẽ poster thay thế, trang vẫn chạy bình thường.
   ========================================================================== */
const PIMG = {};                                       // ảnh poster đã tải: PIMG.ladua, PIMG.cut ...
const POSTERS = {                                       // khóa ảnh → [tên hiển thị, màu chủ đạo]
  truyenthong: ['Ngàn lớp truyền thống', '#f3c614'], ladua: ['Phú sĩ lá dứa', '#7bbf2e'], khoaimon: ['Phú sĩ khoai môn', '#b58ad8'],
  thantre: ['Phô mai than tre', '#3a3a3a'], choco: ['Phú sĩ choco hạnh nhân', '#6b3f26'], nganlop: ['Ngàn lớp lá dứa', '#59b52a'],
  pannacotta: ['Panna cotta vị trái cây', '#e53b4b'], suachua: ['Sữa chua phô mai Đà Lạt', '#f0b429']
};
const FLAV = [['truyenthong', 'Truyền thống', '#f4cf1e', '#4a3300'], ['ladua', 'Lá dứa', '#86c23d', '#10340d'], ['khoaimon', 'Khoai môn', '#b98bd6', '#2b1042'],
  ['thantre', 'Than tre', '#2a2a2c', '#ffffff'], ['choco', 'Choco hạnh nhân', '#5a3321', '#ffffff']];
const rng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
function imgTex(img) { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = LOW ? 1 : 4; t.needsUpdate = true; return t; }
async function loadProductImages() {
  const ld = new THREE.ImageLoader(), get = u => new Promise(r => ld.load(u, r, undefined, () => r(null)));
  const keys = Object.keys(POSTERS).concat(['cut']);
  const run = Promise.all(keys.map(k => get('assets/sp/' + k + (k === 'cut' ? '.png' : '.jpg')).then(i => { if (i) PIMG[k] = i; })));
  await Promise.race([run, wait(8000)]);
}
function posterTex(key) {                                // ảnh thật, hoặc poster tự vẽ nếu thiếu file
  if (PIMG[key]) return imgTex(PIMG[key]);
  const [name, col] = POSTERS[key];
  return canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffd34a'); gr.addColorStop(1, '#f2a900'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = col; g.beginPath(); g.arc(w / 2, h * .62, 150, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(w / 2 - 40, h * .62 - 50, 60, 0, 7); g.fill();
    g.fillStyle = '#1f7a3a'; g.strokeStyle = '#fff'; g.lineWidth = 10; g.textAlign = 'center'; g.font = `800 46px ${FONT}`; g.strokeText('BÁNH SẦU RIÊNG', w / 2, 70); g.fillText('BÁNH SẦU RIÊNG', w / 2, 70);
    g.font = `800 40px ${FONT}`; g.strokeText(name.toUpperCase(), w / 2, 130); g.fillStyle = '#c8102e'; g.fillText(name.toUpperCase(), w / 2, 130);
  }).t;
}

/* ---- bánh sầu riêng: mặt bánh vẽ bằng canvas (vết cắt, dừa sợi, hạnh nhân) ---- */
const CK = {
  truyenthong: { base: '#f5d01c', edge: '#d7aa0c', cut: '#fff2ab', w: 4 },
  ladua:       { base: '#86c23d', edge: '#5d9a28', cut: '#f3d949', w: 6, flake: 1 },
  khoaimon:    { base: '#b98bd6', edge: '#8e5fb0', cut: '#f3d949', w: 6, flake: 1 },
  thantre:     { base: '#242426', edge: '#fff3b0', cut: '#f2d23a', w: 11 },
  choco:       { base: '#4d2c1b', edge: '#2e1810', cut: '#e6cd52', w: 6, almond: 1 }
};
function cakeTex(kind) {
  const c = CK[kind], SZ = LOW ? 256 : 512, R = SZ / 2, k = SZ / 512, rnd = rng(11 + kind.length * 13);
  return canvasTex(SZ, SZ, g => {
    g.fillStyle = c.base; g.fillRect(0, 0, SZ, SZ);
    const rg = g.createRadialGradient(R * .8, R * .7, 10, R, R, R); rg.addColorStop(0, 'rgba(255,255,255,.16)'); rg.addColorStop(1, 'rgba(0,0,0,.10)'); g.fillStyle = rg; g.fillRect(0, 0, SZ, SZ);
    for (let i = 0; i < 2600; i++) { g.fillStyle = rnd() > .5 ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.09)'; g.fillRect(rnd() * SZ, rnd() * SZ, (1 + rnd() * 2) * k, (1 + rnd() * 2) * k); }
    if (kind === 'truyenthong') { g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,.14)'; for (let r = 18 * k; r < R; r += 15 * k) { g.beginPath(); g.arc(R, R, r, 0, 7); g.stroke(); } }
    g.save(); g.beginPath(); g.arc(R, R, R * .93, 0, 7); g.clip();            // 3 đường cắt chia bánh thành 6 miếng, hở ra phần nhân vàng
    const off = rnd() * .5;
    for (let i = 0; i < 3; i++) { g.save(); g.translate(R, R); g.rotate(off + i * Math.PI / 3); g.beginPath(); g.moveTo(-R, 0); g.lineTo(R, 0);
      g.strokeStyle = c.edge; g.lineWidth = (c.w + 5) * k; g.stroke(); g.strokeStyle = c.cut; g.lineWidth = c.w * k; g.stroke(); g.restore(); }
    g.restore();
    if (c.flake) { g.lineCap = 'round'; for (let i = 0; i < (LOW ? 350 : 800); i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * R * .9, x = R + Math.cos(a) * d, y = R + Math.sin(a) * d, t = rnd() * 6.283, l = (5 + rnd() * 8) * k;
      g.strokeStyle = `rgba(255,255,255,${(.45 + rnd() * .45).toFixed(2)})`; g.lineWidth = (1.4 + rnd()) * k; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(t) * l, y + Math.sin(t) * l); g.stroke(); } }
    if (c.almond) for (let i = 0; i < 85; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * R * .86, x = R + Math.cos(a) * d, y = R + Math.sin(a) * d;
      g.save(); g.translate(x, y); g.rotate(rnd() * 6.283); g.fillStyle = '#ecd2a4'; g.strokeStyle = '#bf9560'; g.lineWidth = 1.5 * k; g.beginPath(); g.ellipse(0, 0, (14 + rnd() * 10) * k, (8 + rnd() * 5) * k, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(-3 * k, -2 * k, 6 * k, 2.5 * k, 0, 0, 7); g.fill(); g.restore(); }
    g.strokeStyle = c.base; g.lineWidth = R * .12; g.beginPath(); g.arc(R, R, R * .98, 0, 7); g.stroke();   // viền ngoài đặc để mặt bên không bị kéo sọc
  }).t;
}
const CK_R = .18, CK_H = .17;
function domeGeo(phi0, phiL) {                                   // vòm bánh tròn dẹt; uv chiếu thẳng từ trên xuống để mặt bánh khớp hình vẽ
  const pts = []; for (let i = 14; i >= 0; i--) { const t = i / 14 * Math.PI / 2; pts.push(new THREE.Vector2(CK_R * Math.sin(t), CK_H * Math.pow(Math.cos(t), .72))); }
  pts.unshift(new THREE.Vector2(CK_R * .97, -.01));
  const geo = new THREE.LatheGeometry(pts, 40, phi0, phiL), p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * CK_R) + .5, .5 - p.getZ(i) / (2 * CK_R));
  return geo;
}
function faceShape(sx, sy) {
  const s = new THREE.Shape(); for (let i = 0; i <= 24; i++) { const t = -Math.PI / 2 + i / 24 * Math.PI, x = CK_R * Math.sin(t) * sx, y = Math.pow(Math.cos(t), .72) * CK_H * sy; i ? s.lineTo(x, y) : s.moveTo(x, y); } return s;
}
let CAKE = null;
function cakeKit() {                                             // dựng 1 lần: hình học + vật liệu dùng chung cho mọi bánh
  if (CAKE) return CAKE;
  const fill = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = '#f1d349'; g.fillRect(0, 0, w, h); const rnd = rng(99);
    for (let y = 4; y < h; y += 7) { g.strokeStyle = y % 14 < 7 ? 'rgba(255,244,160,.6)' : 'rgba(205,150,15,.32)'; g.lineWidth = 2.5; g.beginPath(); for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin(x * .09 + y) * 2.2; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
    for (let i = 0; i < 380; i++) { g.strokeStyle = 'rgba(176,118,8,.22)'; g.lineWidth = 1; const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 6, y + rnd() * 9); g.stroke(); }
  }).t;
  fill.repeat.set(1 / (2 * CK_R), 1 / CK_H); fill.offset.set(.5, 0);
  const mats = {}; FLAV.forEach(f => { const t = cakeTex(f[0]); mats[f[0]] = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .2, roughness: f[0] === 'choco' ? .42 : .74 }); });
  CAKE = { whole: domeGeo(0, Math.PI * 2), half: domeGeo(Math.PI / 2, Math.PI), skin: new THREE.ShapeGeometry(faceShape(1, 1), 24), core: new THREE.ShapeGeometry(faceShape(.93, .9), 24), mats,
    skinM: {}, coreM: new THREE.MeshStandardMaterial({ map: fill, emissiveMap: fill, emissive: 0xffffff, emissiveIntensity: .3, roughness: .8 }) };
  FLAV.forEach(f => CAKE.skinM[f[0]] = std(CK[f[0]].base, { roughness: .6 }));
  return CAKE;
}
function cake(kind, half) {
  const K = cakeKit(), g = new THREE.Group();
  g.add(new THREE.Mesh(half ? K.half : K.whole, K.mats[kind]));
  if (half) { const a = new THREE.Mesh(K.skin, K.skinM[kind]); a.position.z = .001; const b = new THREE.Mesh(K.core, K.coreM); b.position.z = .004; g.add(a, b); }   // mặt cắt: vỏ màu + nhân sầu riêng nhiều lớp
  return g;
}

/* ---- tủ đông trưng bày: 5 vị bánh, mỗi vị 6 hộp, hàng trước mở đôi bánh cho thấy nhân ---- */
function stageFreezer() {
  const g = new THREE.Group(); g.position.set(-2.5, 0, -8.5); const rnd = rng(5);
  B(g, std(0xf3f6f7, { roughness: .3, metalness: .15 }), [4.4, .62, 1.5], [0, .39, 0]);
  B(g, M.green, [4.42, .12, 1.52], [0, .14, 0]); B(g, M.honey, [4.42, .035, 1.52], [0, .215, 0]);
  [[-2, -.65], [2, -.65], [-2, .65], [2, .65]].forEach(p => B(g, M.dark, [.12, .08, .12], [p[0], .04, p[1]]));
  B(g, std(0xdff3ee, { roughness: .25, metalness: .1 }), [4.3, .02, 1.46], [0, .71, 0]);                      // đáy tủ sáng bóng
  B(g, M.silver, [4.5, .05, .06], [0, .72, .78]); B(g, M.silver, [4.5, .05, .06], [0, .72, -.78]); B(g, M.silver, [.06, .05, 1.6], [-2.22, .72, 0]); B(g, M.silver, [.06, .05, 1.6], [2.22, .72, 0]);
  B(g, M.led, [4.2, .03, .03], [0, .74, .8]);
  P(g, textMat('BÁNH SẦU RIÊNG 9 SẠCH', 4 / .3, '#1f7a3a'), [3.2, .22], [0, .595, .762]);
  FLAV.forEach((f, i) => {                                                                                    // nhãn vị bánh dưới mỗi cụm
    const t = canvasTex(512, 128, (c, w, h) => { c.fillStyle = f[2]; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 28); c.fill(); c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 5; c.stroke();
      c.fillStyle = f[3]; c.font = `700 56px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(f[1], w / 2, h / 2 + 3); });
    P(g, new THREE.MeshBasicMaterial({ map: t.t, transparent: true }), [.74, .185], [-1.6 + i * .8, .385, .763]);
  });
  const tray = new THREE.InstancedMesh(new THREE.CylinderGeometry(.2, .17, .05, 28), std(0xf7f7f4, { roughness: .35 }), 30), d = new THREE.Object3D(); let ti = 0;
  for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) {
    const x = -1.8 + k * .4, z = -.46 + r * .46, f = FLAV[Math.floor(k / 2)][0];
    d.position.set(x, .745, z); d.rotation.set(0, 0, 0); d.scale.set(1, 1, 1); d.updateMatrix(); tray.setMatrixAt(ti++, d.matrix);
    const c = cake(f, r === 2 && k % 2 === 0); c.position.set(x, .758, z); c.rotation.y = r === 2 && k % 2 === 0 ? (rnd() - .5) * .5 : rnd() * 6.283; g.add(c);
  }
  g.add(tray);
  B(g, M.glass, [4.5, .42, 1.6], [0, .93, 0]);                                                                 // nắp kính
  B(g, M.silver, [4.5, .025, .035], [0, 1.14, .8]); B(g, M.silver, [4.5, .025, .035], [0, 1.14, -.8]);
  const sh = canvasTex(256, 32, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); [[.28, 0], [.36, .6], [.44, 0], [.6, 0], [.66, .32], [.72, 0]].forEach(s => gr.addColorStop(s[0], `rgba(255,255,255,${s[1]})`)); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  P(g, new THREE.MeshBasicMaterial({ map: sh.t, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), [4.4, 1.5], [0, 1.145, 0], [-Math.PI / 2, 0, 0]);   // vệt phản chiếu trên kính
  hot('don', g, [-2.5, .72, -8.5, 4.6, 1.2, 1.7]);
}

/* ---- tranh đèn (hộp đèn LED) + biển đèn treo + giá ly panna cotta / sữa chua ---- */
let GLOWM = null;
function lightbox(map, w, h, center) {
  const g = new THREE.Group(), d = .12, fr = .07, z0 = center ? 0 : d / 2, zf = center ? d / 2 : d;
  B(g, M.dark, [w + fr * 2, h + fr * 2, d], [0, 0, z0]);
  const mat = new THREE.MeshBasicMaterial({ map, toneMapped: false }); if (composer) mat.color.setScalar(1.22);   // bù phần ACES làm tối ảnh
  P(g, mat, [w, h], [0, 0, zf + .003]); if (center) P(g, mat, [w, h], [0, 0, -zf - .003], [0, Math.PI, 0]);
  const bar = (sx, sy, x, y) => { B(g, M.silver, [sx, sy, .03], [x, y, zf + .012]); if (center) B(g, M.silver, [sx, sy, .03], [x, y, -zf - .012]); };
  bar(w + fr * 2, fr * .6, 0, (h + fr) / 2); bar(w + fr * 2, fr * .6, 0, -(h + fr) / 2); bar(fr * .6, h, (w + fr) / 2, 0); bar(fr * .6, h, -(w + fr) / 2, 0);
  const led = (sx, sy, x, y) => B(g, M.led, [sx, sy, .02], [x, y, zf + .006]);
  led(w, .018, 0, h / 2 + .004); led(w, .018, 0, -h / 2 - .004);
  return g;
}
function stageDecor() {
  const D = new THREE.Group(); scene.add(D);
  if (!GLOWM) { const gt = canvasTex(64, 64, (c, w, h) => { const gr = c.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(255,214,130,1)'); gr.addColorStop(1, 'rgba(255,214,130,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    GLOWM = new THREE.MeshBasicMaterial({ map: gt.t, transparent: true, opacity: .42, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }); }
  const wall = (key, z, side) => {                                  // tranh đèn dán tường: trái x=-10, phải x=+10
    const lb = lightbox(posterTex(key), 1.7, 1.7); lb.position.set(side * 9.92, 2.05, z); lb.rotation.y = -side * Math.PI / 2; D.add(lb);
    P(lb, GLOWM, [3.7, 3.3], [0, 0, .005]);
  };
  [['truyenthong', -4.5], ['ladua', -7.5], ['khoaimon', -10.5], ['thantre', -13.5]].forEach(a => wall(a[0], a[1], -1));
  [['nganlop', -4.5], ['choco', -7.5], ['pannacotta', -10.5], ['suachua', -13.5]].forEach(a => wall(a[0], a[1], 1));

  // biển đèn 2 mặt treo trên tủ đông
  const ht = canvasTex(1024, 672, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#ffd84d'); gr.addColorStop(1, '#f2a300'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.arc(w * .74, h * .52, h * .44, 0, 7); g.fill();
    g.textAlign = 'left'; g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.lineWidth = 14; g.fillStyle = '#1f7a3a'; g.font = `800 62px ${FONT}`; g.strokeText('Bánh Sầu Riêng', 48, 130); g.fillText('Bánh Sầu Riêng', 48, 130);
    g.font = `800 130px ${FONT}`; g.lineWidth = 20; g.strokeText('9 Sạch', 48, 290); g.fillStyle = '#c8102e'; g.fillText('9 Sạch', 48, 290);
    g.fillStyle = '#1f5f33'; g.font = `600 36px ${FONT}`; g.fillText('Ngàn lớp · Phú sĩ', 52, 372);
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(48, 430, 430, 84, 42); g.fill(); g.fillStyle = '#1f7a3a'; g.font = `700 29px ${FONT}`; g.textAlign = 'center'; g.fillText('Sạch Là Chính – Ngon Là Mười', 263, 482);
    if (PIMG.cut) { const s = Math.min(480 / PIMG.cut.width, 480 / PIMG.cut.height), iw = PIMG.cut.width * s, ih = PIMG.cut.height * s; g.drawImage(PIMG.cut, w * .74 - iw / 2, h * .54 - ih / 2, iw, ih); }
    else [['#86c23d', -90], ['#b98bd6', 0], ['#f5d01c', 90]].forEach(c => { g.fillStyle = c[0]; g.beginPath(); g.arc(w * .72 + c[1], h * .5 + Math.abs(c[1]) * .25, 78, 0, 7); g.fill(); });
  });
  ht.t.anisotropy = 4;
  const hero = lightbox(ht.t, 1.5, .98, true); hero.position.set(-2.5, 2.05, -8.5); D.add(hero);
  [-.6, .6].forEach(x => C(D, M.silver, [.012, 3.45 - 2.05 - .56, .012], [-2.5 + x, (3.45 + 2.05 + .56) / 2, -8.5]));

  // giá ly panna cotta + sữa chua trên quầy thu ngân, có 2 bảng ảnh sản phẩm đứng phía sau
  const st = new THREE.Group(); st.position.set(3.55, 1.06, -13); st.scale.setScalar(1.35); D.add(st);
  const acr = std(0xf4fbff, { roughness: .15, metalness: .1 });
  B(st, acr, [.95, .05, .3], [0, .025, .2]); B(st, acr, [.95, .13, .3], [0, .065, -.1]);
  const cupG = new THREE.CylinderGeometry(.06, .045, .085, 18), topG = new THREE.CylinderGeometry(.052, .052, .01, 18);
  const cm = std(0xffffff, { roughness: .35 }), ymm = std(0xf4ecd0, { roughness: .4 });
  const pm = [std(0xd6263f, { roughness: .25, emissive: 0x551018, emissiveIntensity: .5 }), std(0xf6b81a, { roughness: .25, emissive: 0x6a4300, emissiveIntensity: .5 })];
  for (let i = 0; i < 5; i++) {
    const x = -.34 + i * .17;
    const a = new THREE.Mesh(cupG, cm); a.position.set(x, .13 + .0425 + .008, -.1); st.add(a); const at = new THREE.Mesh(topG, ymm); at.position.set(x, .13 + .085 + .01, -.1); st.add(at);       // sữa chua
    const b = new THREE.Mesh(cupG, cm); b.position.set(x, .05 + .0425, .2); st.add(b); const bt = new THREE.Mesh(topG, pm[i % 2]); bt.position.set(x, .05 + .085 + .005, .2); st.add(bt);          // panna cotta
  }
  [['suachua', -.25], ['pannacotta', .25]].forEach(a => { const m = new THREE.MeshBasicMaterial({ map: posterTex(a[0]), toneMapped: false }); if (composer) m.color.setScalar(1.2);
    const bd = B(st, M.dark, [.44, .44, .02], [a[1], .4, -.32], [-.1, 0, 0]); P(bd, m, [.9, .9], [0, 0, .55]); });
  P(st, textMat('Panna cotta · Sữa chua', 5, '#1f7a3a'), [.7, .14], [0, .125, .36], [-.9, 0, 0]);
}

/* ---------- nội dung các màn hình động ---------- */
function drawTV(g, w, h, t) {
  g.fillStyle = '#08111f'; g.fillRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#0e3b2b'); gr.addColorStop(1, '#08111f'); g.fillStyle = gr; g.fillRect(0, 0, w, 54);
  g.fillStyle = '#e9d8a6'; g.font = `600 26px ${FONT}`; g.textAlign = 'left'; g.fillText('REALTIME · 9 SẠCH', 18, 36); g.fillStyle = '#3fe08a'; g.beginPath(); g.arc(w - 30, 27, 7, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = `700 54px ${FONT}`; g.fillText(Math.floor(48000000 + (t * 7300) % 900000).toLocaleString('vi-VN'), 18, 118);
  g.fillStyle = '#9fb5aa'; g.font = `400 18px ${FONT}`; g.fillText('Doanh thu hôm nay (đ)', 18, 146);
  g.strokeStyle = '#ffd36b'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i <= 40; i++) { const x = 18 + i * (w - 36) / 40, y = 230 - 26 * Math.sin(i * .35 + t * 1.5) - i * 1.2; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  for (let i = 0; i < 12; i++) { const bh = 14 + 22 * (1 + Math.sin(i + t * 2)); g.fillStyle = 'rgba(63,224,138,.65)'; g.fillRect(18 + i * 40, h - 8 - bh, 26, bh); }
}
function drawClock(g, w, h) {
  const n = new Date(), p = x => String(x).padStart(2, '0'); g.fillStyle = '#04181a'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#7fe8c4'; g.font = `700 54px ${FONT}`; g.textAlign = 'center'; g.fillText(`${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`, w / 2, 90);
  g.fillStyle = '#9fb5aa'; g.font = `500 20px ${FONT}`; g.fillText(`${p(n.getDate())}/${p(n.getMonth() + 1)}/${n.getFullYear()}`, w / 2, 124); g.fillStyle = '#ffd36b'; g.fillText('CHẤM CÔNG', w / 2, 164);
}

/* ============================ CHẤM SÁNG, HUD, TƯƠNG TÁC ============================ */
function buildDots() {
  const host = $('dots'); host.innerHTML = '';
  N.mods().forEach(m => {
    if (!HOT[m.id]) return;
    const el = document.createElement('button'); el.type = 'button'; el.className = 'dot'; el.hidden = true;
    el.innerHTML = '<i class="dp"></i><span class="dcard"><b></b><small></small><em></em></span>';
    const d = { m, el, show: null, nl: null, txt: '' }; dots.push(d); host.appendChild(el);
    el.addEventListener('mouseenter', () => { if (!lastTouch) active = m.id; });
    el.addEventListener('mouseleave', () => { if (!lastTouch && active === m.id) active = null; });
    el.addEventListener('focus', () => { active = m.id; });
    el.addEventListener('blur', () => { if (active === m.id) active = null; });
    el.addEventListener('pointerdown', e => { lastTouch = e.pointerType === 'touch'; });
    el.addEventListener('click', () => {
      if (N.edit()) return;
      if (lastTouch && active !== m.id) { active = m.id; return; }      // chạm lần 1: hiện thẻ, chạm lần 2: mở
      N.go(m.id);
    });
  });
}
const winAlpha = (p, w) => sm((p - w[0]) / .03) * sm((w[1] - p) / .03);
const tmpV = new THREE.Vector3(), ray = new THREE.Raycaster(), ptr = new THREE.Vector2();

function pickMid(cx, cy) {
  const r = canvas.getBoundingClientRect(); ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera);
  const cand = HOTS.filter(h => winAlpha(sp, HOT[h.mid].win) > .3).map(h => h.group); const hit = ray.intersectObjects(cand, true)[0]; if (!hit) return null;
  let o = hit.object; while (o && !o.userData.mid) o = o.parent; return o ? o.userData.mid : null;
}
function updateDots(now) {
  camera.updateMatrixWorld();
  dots.forEach(d => {
    const m = d.m, hz = HOT[m.id], show = N.vis(m);
    if (d.show !== show) { d.show = show; d.el.hidden = !show; } if (!show) return;
    const nl = !N.url(m); if (d.nl !== nl) { d.nl = nl; d.el.classList.toggle('nl', nl); }
    tmpV.set(hz.at[0], hz.at[1], hz.at[2]).applyMatrix4(camera.matrixWorldInverse); const front = tmpV.z < -.3;
    tmpV.set(hz.at[0], hz.at[1], hz.at[2]).project(camera);
    let a = front && Math.abs(tmpV.x) < 1.05 && Math.abs(tmpV.y) < 1.05 ? winAlpha(sp, hz.win) : 0;
    const x = (tmpV.x * .5 + .5) * W, y = (-tmpV.y * .5 + .5) * H;
    d.el.style.opacity = a.toFixed(2); d.el.style.pointerEvents = a > .3 ? 'auto' : 'none';
    d.el.style.transform = `translate3d(${(x - 22).toFixed(1)}px,${(y - 22).toFixed(1)}px,0)`;
    const on = a > .3 && (active === m.id || hover === m.id); d.el.classList.toggle('on', on);
    if (on) {
      const tx = m.t + '|' + m.d + '|' + nl; if (d.txt !== tx) { d.txt = tx; const q = d.el.querySelector('.dcard'); q.children[0].textContent = m.t; q.children[1].textContent = m.d; q.children[2].textContent = nl ? 'Chưa có link (chỉ quản trị viên thấy)' : 'Bấm để mở'; }
      d.el.classList.toggle('cl', x < 130); d.el.classList.toggle('cr', x > W - 130); d.el.classList.toggle('cb', y < 150);
    }
  });
  const mods = N.mods();
  HOTS.forEach(h => {
    const m = mods.find(x => x.id === h.mid), nl = N.admin() && m && !N.url(m), inw = winAlpha(sp, HOT[h.mid].win) > .3;
    h.outline.visible = inw && (hover === h.mid || nl); h.outline.material.color.setHex(nl && hover !== h.mid ? 0xe0a526 : 0xffe08a);
  });
}
let hudLast = '';
function updateHud() {
  const els = document.querySelectorAll('#hud .scn'), end = sm((sp - .955) / .035), edit = N.edit();
  els.forEach((el, i) => {
    const s = SCENES[i], w = s[1] - s[0]; let a = sm((sp - s[0]) / (w * .22)) * sm((s[1] - sp) / (w * .22)); if (i === 0) a = sm((s[1] - sp) / (w * .22)); if (i === 6) a *= (1 - end);
    if (edit) a = sp >= s[0] && sp < s[1] ? 1 : 0;
    el.style.opacity = a.toFixed(2); el.style.visibility = a < .01 ? 'hidden' : 'visible'; el.style.transform = `translateY(${((1 - a) * 16).toFixed(1)}px)`;
  });
  const ec = $('endc'); ec.style.opacity = end.toFixed(2); ec.style.visibility = end < .01 ? 'hidden' : 'visible';
  $('whint').style.opacity = (1 - clamp(sp / .03)).toFixed(2);
  let idx = SCENES.findIndex(s => sp >= s[0] && sp < s[1]); if (idx < 0) idx = 6;
  const key = idx + '|' + Math.round(sp * 200); if (key !== hudLast) { hudLast = key; $('wnum').textContent = '0' + (idx + 1) + ' / 07'; $('wbar').style.height = (sp * 100).toFixed(1) + '%'; }
}

/* ============================ VÒNG LẶP ============================ */
function tick(now) {
  raf = requestAnimationFrame(tick);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  target = clamp(scroller.scrollTop / maxScroll);
  sp += (target - sp) * (1 - Math.exp(-dt * 5.5)); if (Math.abs(target - sp) < 1e-4) sp = target;
  // camera chạy theo đường cong
  const u = mapU(sp); posC.getPoint(u, tmpV); camera.position.copy(tmpV); camera.position.y += Math.sin(now / 900) * .012;
  lookC.getPoint(u, tmpV); camera.lookAt(tmpV); camera.updateMatrixWorld();
  // cửa kính trượt mở (13%..19%) và cửa kho mở (85%..90%)
  const o1 = sm((sp - .13) / .06), o2 = sm((sp - .85) / .05);
  slideL.position.x = -1.2 - o1 * 1.1; slideR.position.x = 1.2 + o1 * 1.1; khoL.rotation.y = o2 * 1.75; khoR.rotation.y = -o2 * 1.75;
  // màn hình động
  if (sp > .38 && sp < .64 && now - (LIVE.tvT || 0) > 125) { LIVE.tvT = now; drawTV(LIVE.tv.g, 512, 288, now / 1000); LIVE.tv.t.needsUpdate = true; }
  if (sp > .54 && sp < .78 && now - (LIVE.clT || 0) > 1000) { LIVE.clT = now; drawClock(LIVE.clock.g, 256, 192); LIVE.clock.t.needsUpdate = true; }
  if (altarLight) altarLight.intensity = 4 + Math.sin(now / 130) * .5;
  // rê chuột lên vật thể 3D
  if (needRay && ptrXY) { needRay = false; const h = pickMid(ptrXY[0], ptrXY[1]); if (h !== hover) { hover = h; scroller.style.cursor = h ? 'pointer' : ''; } }
  if (composer) composer.render(); else renderer.render(scene, camera);
  updateHud(); updateDots(now);
  if (fly && (Math.abs(sp - fly.target) < .012 || now - fly.t0 > 3500)) { const cb = fly.cb; fly = null; if (cb) setTimeout(cb, 350); }
}
function mapU(p) {
  for (let i = 0; i < CAM.length - 1; i++) if (p <= CAM[i + 1][0]) return (i + (p - CAM[i][0]) / (CAM[i + 1][0] - CAM[i][0])) / (CAM.length - 1);
  return 1;
}
function resize() {
  if (!world || !renderer) return; const w = world.clientWidth, h = world.clientHeight; if (w < 10 || h < 10) return;
  W = w; H = h; const pr = Math.min(window.devicePixelRatio || 1, LOW ? 1 : 1.5);                  // giới hạn pixelRatio
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false); canvas.style.width = '100%'; canvas.style.height = '100%';
  camera.aspect = w / h; camera.fov = w / h < .75 ? 80 : w / h < 1.2 ? 68 : 58; camera.updateProjectionMatrix();   // FOV rộng hơn khi màn dọc
  if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); }
  stk.style.height = h + 'px'; stk.style.marginBottom = -h + 'px'; spc.style.height = (h * 7) + 'px';            // ruột cuộn khoảng 700vh
  maxScroll = Math.max(1, scroller.scrollHeight - scroller.clientHeight); scroller.scrollTop = target * maxScroll;
}
function shouldRun() { const b = document.body.classList; return API.ready && !document.hidden && !b.contains('imm') && !b.contains('lm'); }
function sync() {
  const run = shouldRun();
  if (run && !raf) { resize(); sp = target; last = performance.now(); raf = requestAnimationFrame(tick); }
  else if (!run && raf) { cancelAnimationFrame(raf); raf = 0; keepP = sp; target = sp; }            // tạm dừng khi tab ẩn / mở trang con / chế độ danh sách
}

/* ============================ KHỞI TẠO ============================ */
const wait = ms => new Promise(r => setTimeout(r, ms));
async function boot() {
  world = $('world'); scroller = $('scroller'); stk = $('stk'); spc = $('spc'); canvas = document.createElement('canvas'); $('wcv').appendChild(canvas);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !LOW, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  if (!LOW) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
  camera = new THREE.PerspectiveCamera(60, 1, .1, 220);
  posC = new THREE.CatmullRomCurve3(CAM.map(k => new THREE.Vector3(k[1][0], k[1][1], k[1][2])), false, 'centripetal');
  lookC = new THREE.CatmullRomCurve3(CAM.map(k => new THREE.Vector3(k[2][0], k[2][1], k[2][2])), false, 'centripetal');
  // màn hình tải với phần trăm thật
  const mgr = new THREE.LoadingManager(); const pct = $('wpct');
  mgr.onProgress = (u, l, t) => { pct.textContent = Math.round(l / t * 100) + '%'; $('wfill').style.width = (l / t * 100) + '%'; };
  const steps = ['font', 'logo', 'post', 'sky', 'plaza', 'facade', 'interior', 'objects', 'decor']; steps.forEach(s => mgr.itemStart(s));
  const fin = async s => { mgr.itemEnd(s); await wait(30); };
  try { await Promise.race([document.fonts.load('700 40px "Be Vietnam Pro"'), wait(1500)]); } catch (e) { } await fin('font');
  const logo = await new Promise(res => new THREE.ImageLoader(mgr).load('assets/logo.png', res, undefined, () => res(null))); await fin('logo');
  if (!LOW) {                                                                                      // bloom nhẹ, chỉ máy mạnh
    try {
      const [a, b, c, d] = await Promise.all([import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'), import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/OutputPass.js')]);
      composer = new a.EffectComposer(renderer); composer.addPass(new b.RenderPass(scene, camera));
      bloom = new c.UnrealBloomPass(new THREE.Vector2(256, 256), .45, .5, 1.15); composer.addPass(bloom); composer.addPass(new d.OutputPass());
    } catch (e) { composer = null; }
  }
  await fin('post');
  stageSky(); await fin('sky'); stagePlaza(); await fin('plaza'); stageFacade(logo); await fin('facade'); stageInterior(); await fin('interior'); stageObjects(); await fin('objects');
  await loadProductImages(); stageDecor(); await fin('decor');
  buildDots();
  // sự kiện
  new ResizeObserver(resize).observe(world); window.addEventListener('resize', resize); if (window.visualViewport) visualViewport.addEventListener('resize', resize);
  scroller.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; lastTouch = false; ptrXY = [e.clientX, e.clientY]; needRay = true; });
  scroller.addEventListener('pointerleave', () => { ptrXY = null; hover = null; scroller.style.cursor = ''; });
  scroller.addEventListener('pointerdown', e => { lastTouch = e.pointerType === 'touch'; });
  scroller.addEventListener('click', e => { if (N.edit()) return; const mid = pickMid(e.clientX, e.clientY); if (mid) N.go(mid); else active = null; });
  canvas.addEventListener('webglcontextlost', e => e.preventDefault());
  document.addEventListener('visibilitychange', sync); new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  resize(); renderer.compile(scene, camera);
  await wait(250); $('wload').classList.add('hide');
}

API.start = function () { if (!API._p) API._p = boot().then(() => { API.ready = true; sync(); }); return API._p; };
API.flyTo = function (id, cb) {                                                                    // camera bay tới vật thể rồi gọi cb
  const h = HOT[id]; if (!h || !API.ready) { if (cb) cb(); return; }
  fly = { target: h.foc, cb, t0: performance.now() }; scroller.scrollTo({ top: h.foc * maxScroll, behavior: 'smooth' });
};
API.toTop = function () { if (API.ready) scroller.scrollTo({ top: 0, behavior: 'smooth' }); };
export default API;
