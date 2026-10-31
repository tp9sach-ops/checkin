import { ioRead, getBounds, flatten, join, prune, weld, simplify, MeshoptSimplifier, simplifyMaterials, finalize, sceneTris, sharp } from './common.mjs';
const SRC = '../glbs/sidewalk.glb';
// rotY: xoay để "mặt trước" (hướng người ngồi / đầu xe) hướng +z.  Nguồn: ghế quay về -z, xe đạp đầu +x.
const JOBS = {
  prop_bench:  { mats: /^Bench$/,                      ratio: .30, err: .02, size: ['x', 1.75], rotY: Math.PI,     tex: 512 },
  prop_bike:   { drop: /^(chain|gear_|spoke_|satchel|byc_satchel|handle_|badge|Circle|pedals|byc_bell|Plane\.)/, mats: /^Byc_Set_/,                     ratio: .12, err: .05, size: ['max', 1.75], rotY: -Math.PI / 2, tex: 512 },
  prop_bin:    { mats: /^TrashBin$/,                    ratio: .03, err: .15, size: ['y', .85], rotY: 0,            tex: 256 },
  prop_lamp:   { mats: /^(Lantern|Lamp)$/,              ratio: 1,   err: .02, size: ['y', 3.8],  rotY: 0,            tex: 256 },
  tree_autumn: { mats: /^(TreeBark|Branch_|leafs_set)/,  ratio: .05, err: .06, size: ['y', 6.4],  rotY: 0,            tex: 512 },
};
const only = process.argv[2];
async function fixLeaf(tex, rgb) {                         // lấp màu vào vùng trong suốt để lá không bị viền đen khi mipmap
  const { data, info } = await sharp(Buffer.from(tex.getImage())).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] < 200) { data[i] = rgb[0]; data[i + 1] = rgb[1]; data[i + 2] = rgb[2]; }
  tex.setImage(await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer()).setMimeType('image/png');
}
for (const [name, J] of Object.entries(JOBS)) {
  if (only && only !== name) continue;
  const doc = await ioRead.read(SRC); const root = doc.getRoot();
  for (const n of root.listNodes()) { const m = n.getMesh(); if (!m) continue; if (!m.listPrimitives().every(p => J.mats.test(p.getMaterial()?.getName() || '')) || (J.drop && J.drop.test(n.getName()))) n.setMesh(null); }
  await doc.transform(prune(), flatten());
  const scene = root.listScenes()[0];
  const kept = scene.listChildren().filter(n => n.getMesh());
  scene.listChildren().filter(n => !n.getMesh()).forEach(n => n.dispose());
  const holder = doc.createNode(name); scene.addChild(holder); kept.forEach(n => { scene.removeChild(n); holder.addChild(n); });
  await doc.transform(join({ keepMeshes: false, keepNamed: false }), weld({ tolerance: 0.0005 }));
  const leafPrims = []; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) if (/leafs_set/.test(p.getMaterial()?.getName() || '')) leafPrims.push(p);
  if (J.ratio < 1) { leafPrims.forEach(p => p.setMode(1)); await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: J.ratio, error: J.err, lockBorder: false })); leafPrims.forEach(p => p.setMode(4)); }
  simplifyMaterials(doc, { keepNormal: false, rough: .75, metal: name === 'prop_bike' ? .25 : (name === 'prop_lamp' ? .3 : 0) });
  for (const m of root.listMaterials()) { if (/leafs_set1/.test(m.getName())) await fixLeaf(m.getBaseColorTexture(), [242, 203, 24]); if (/leafs_set3/.test(m.getName())) await fixLeaf(m.getBaseColorTexture(), [192, 142, 79]); if (/leafs_set/.test(m.getName())) m.setDoubleSided(true); }
  const q = [0, Math.sin(J.rotY / 2), 0, Math.cos(J.rotY / 2)]; holder.setRotation(q);
  const b = getBounds(holder); const sz = b.max.map((v, i) => v - b.min[i]);
  const target = J.size[0] === 'max' ? Math.max(sz[0], sz[2]) : sz[{ x: 0, y: 1, z: 2 }[J.size[0]]];
  const k = J.size[1] / target; const cx = (b.min[0] + b.max[0]) / 2, cz = (b.min[2] + b.max[2]) / 2;
  holder.setScale([k, k, k]); holder.setTranslation([-cx * k, -b.min[1] * k, -cz * k]);
  const fb = getBounds(holder);
  const bytes = await finalize(doc, `../out/${name}.glb`, { maxTex: J.tex, quality: 78 });
  console.log(name.padEnd(12), 'tris', sceneTris(doc), 'bytes', bytes, 'final', fb.max.map((v, i) => +(v - fb.min[i]).toFixed(2)).join('x'));
}
