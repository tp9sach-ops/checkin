import { ioRead, prune, simplifyMaterials, finalize, sceneTris, sharp } from './common.mjs';
const FLIP_SIGN = process.argv[2] || 'T';          // T = transpose (mặc định cho biển đỏ nhỏ); thử 'R90','R270' nếu ngược
const doc = await ioRead.read('../glbs/store.glb'); const root = doc.getRoot();
const tex = n => root.listMaterials().find(m => m.getName() === n).getBaseColorTexture();
const logoBuf = await sharp('../glbs/dmx_logo.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const bg = [...logoBuf.data.slice(0, 3)];            // màu nền xanh của logo
const logoPng = await sharp('../glbs/dmx_logo.png').png().toBuffer();
async function logoPatch(w, h, fit) {               // ảnh w×h: nền xanh + logo canh giữa cao = fit*h
  const lh = Math.round(h * fit), lw = Math.round(lh * 772 / 232);
  const l = await sharp(logoPng).resize(Math.min(lw, Math.round(w * .94)), null).png().toBuffer(); const lm = await sharp(l).metadata();
  return sharp({ create: { width: w, height: h, channels: 3, background: { r: bg[0], g: bg[1], b: bg[2] } } }).composite([{ input: l, left: Math.round((w - lm.width) / 2), top: Math.round((h - lm.height) / 2) }]).png().toBuffer();
}
async function transpose(buf) { const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true }); const W = info.width, H = info.height, o = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = (y * W + x) * 3, d = (x * H + y) * 3; o[d] = data[s]; o[d + 1] = data[s + 1]; o[d + 2] = data[s + 2]; }
  return sharp(o, { raw: { width: H, height: W, channels: 3 } }).png().toBuffer(); }
// 1) biển lớn "SUPER SALE": hình chữ nhật x 350..1020, y 0..178, trong atlas bị lật dọc
{ const t = tex('Atlas002_E'); const p = await (await sharp(await logoPatch(670, 178, .84))).flip().png().toBuffer();
  t.setImage(await sharp(Buffer.from(t.getImage())).composite([{ input: p, left: 350, top: 0 }]).png().toBuffer()).setMimeType('image/png'); }
// 2) biển đỏ nhỏ "SUPER MARKET": x 868..958 (90), y 480..890 (410); nằm xoay trong atlas
{ const t = tex('Atlas001_E'); const real = await logoPatch(410, 90, .86);
  let p; if (FLIP_SIGN === 'T') p = await transpose(real); else if (FLIP_SIGN === 'R90') p = await sharp(real).rotate(90).png().toBuffer(); else p = await sharp(real).rotate(270).png().toBuffer();
  t.setImage(await sharp(Buffer.from(t.getImage())).composite([{ input: p, left: 868, top: 480 }]).png().toBuffer()).setMimeType('image/png'); }
// 3) các texture còn lại hạ xuống 512
const keep = new Set(['Atlas001_E', 'Atlas002_E']);
for (const m of root.listMaterials()) { const t = m.getBaseColorTexture(); if (!t || keep.has(m.getName())) continue; t.setImage(await sharp(Buffer.from(t.getImage())).resize(512, 512, { fit: 'fill' }).png().toBuffer()).setMimeType('image/png'); }
simplifyMaterials(doc, { keepNormal: false, rough: .7, metal: 0 });
const bytes = await finalize(doc, '../out/street_store.glb', { maxTex: 1024, quality: 76 });
console.log('street_store.glb', bytes, 'tris', sceneTris(doc));
