import { ioRead, getBounds, flatten, join, prune, simplifyMaterials, finalize, sceneTris, trisOfMesh } from './common.mjs';
const doc = await ioRead.read('../glbs/city.glb'); const root = doc.getRoot(); const sc = root.listScenes()[0];
let lvl = sc.listChildren(); while (lvl.length === 1) lvl = lvl[0].listChildren();
const B = {
  bldA: ['Plane_9_20', 'Cube_10_23'],
  bldB: ['Plane.002_11_26', 'Plane.003_12_29'],
  bldC: ['Cube.001_13_32', 'Cube.002_14_35'],
  bldD: ['Plane.018_34_81', 'Cube.013_72_171', 'Cube.014_73_173', 'Cube.015_74_175', 'Cube.016_76_179', 'Cube.017_77_181', 'Plane.049_75_177'],
};
const byName = new Map(lvl.map(n => [n.getName(), n]));
const owner = new Map();                        // mesh node -> building
for (const [b, arr] of Object.entries(B)) for (const nm of arr) { const g = byName.get(nm); if (!g) { console.log('MISSING', nm); continue; } g.traverse(x => { if (x.getMesh()) owner.set(x, b); }); }
const wanted = new Set(Object.values(B).flat());
for (const n of lvl) if (!wanted.has(n.getName())) n.dispose();
await doc.transform(prune(), flatten());
const scene = root.listScenes()[0];
const parents = {}; for (const b of Object.keys(B)) { parents[b] = doc.createNode(b); scene.addChild(parents[b]); }
for (const [n, b] of owner) { if (n.isDisposed && n.isDisposed()) continue; scene.removeChild(n); parents[b].addChild(n); }
await doc.transform(join({ keepMeshes: false, keepNamed: false }));
simplifyMaterials(doc, { keepNormal: false, rough: .9, metal: 0 });
for (const [b, p] of Object.entries(parents)) { const bb = getBounds(p); let t = 0; p.traverse(x => { const m = x.getMesh(); if (m) t += trisOfMesh(m); }); console.log(b, 'tris', t, 'min', bb.min.map(v => +v.toFixed(2)).join(','), 'max', bb.max.map(v => +v.toFixed(2)).join(','), 'meshes', p.listChildren().length); }
// transparent glass planes -> drop (Material.022/.023 alpha<1) to avoid sorting problems
for (const m of root.listMaterials()) if (m.getAlphaMode() === 'BLEND') console.log('BLEND material left:', m.getName(), m.getBaseColorFactor());
const sz = await finalize(doc, '../out_buildings.glb', { maxTex: 512, quality: 76 });
console.log('written bytes', sz, 'tris', sceneTris(doc));
