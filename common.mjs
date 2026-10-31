import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRDracoMeshCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import { getBounds, flatten, join, prune, dedup, weld, simplify, textureCompress, unpartition, dequantize } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import sharp from 'sharp';
export { dequantize, getBounds, flatten, join, prune, dedup, weld, simplify, textureCompress, MeshoptSimplifier, KHRDracoMeshCompression, sharp };
await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
export const ioRead = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
export const ioWrite = async () => new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
export const trisOfMesh = m => m.listPrimitives().reduce((s,p)=>s+((p.getIndices()?.getCount()||p.getAttribute('POSITION').getCount())/3),0);
export function sceneTris(doc){ let t=0; for (const n of doc.getRoot().listNodes()) { const m=n.getMesh(); if(m) t+=trisOfMesh(m); } return Math.round(t); }
// remove fancy extensions + normal/mr maps so plain three MeshStandardMaterial renders it cheaply
export function simplifyMaterials(doc, { keepNormal=false, rough=.85, metal=0, maxTex=512, alphaMask=true } = {}) {
  for (const m of doc.getRoot().listMaterials()) {
    if (!keepNormal) m.setNormalTexture(null);
    m.setMetallicRoughnessTexture(null); m.setOcclusionTexture(null);
    m.setRoughnessFactor(rough); m.setMetallicFactor(metal);
    for (const ext of m.listExtensions()) m.setExtension(ext.extensionName, null);
    if (alphaMask && m.getAlphaMode()==='BLEND' && m.getBaseColorTexture()) { m.setAlphaMode('MASK'); m.setAlphaCutoff(.5); }
  }
}
export async function finalize(doc, outPath, { maxTex=512, quality=78 } = {}) {
  await doc.transform(dequantize());
  for (const e of doc.getRoot().listExtensionsUsed()) if (['EXT_meshopt_compression','KHR_mesh_quantization','KHR_texture_transform'].includes(e.extensionName)) e.dispose();
  await doc.transform(prune(), dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [maxTex, maxTex], quality }));
  const io = await ioWrite();
  doc.createExtension(KHRDracoMeshCompression).setRequired(true).setEncoderOptions({ method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER, encodeSpeed: 5, decodeSpeed: 5, quantizePosition: 14, quantizeNormal: 8, quantizeTexcoord: 12, quantizeColor: 8 });
  await io.write(outPath, doc);
  const fs = await import('fs'); return fs.statSync(outPath).size;
}
