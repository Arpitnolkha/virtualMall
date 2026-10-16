import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sections=JSON.parse(fs.readFileSync(new URL('../lib/mall/showroomSections.json',import.meta.url),'utf8'));
import { loader } from './shopping-loader.mjs';
const catalog=loader()('lib/mall/products.ts').products;
test('seven scene routes are connected and all optimized assets exist',()=>{
 assert.equal(sections.length,7);
 const visited=new Set();
 const visit=id=>{if(visited.has(id))return;visited.add(id);const s=sections.find(s=>s.id===id);assert.ok(s);s.neighbors.forEach(n=>visit(n.targetId));};
 visit(sections[0].id);assert.equal(visited.size,7);
 sections.forEach(s=>assert.ok(fs.existsSync(new URL('../public'+s.imageSrc,import.meta.url))));
});
test('every image hotspot stays within its image and resolves an existing product',()=>{
 const ids=new Set();
 sections.forEach(s=>s.productHotspots.forEach(h=>{
  assert.ok(!ids.has(h.id));ids.add(h.id);
  assert.ok(catalog.some(p=>p.id===h.productId));
  assert.ok(h.widthPercent>0 && h.heightPercent>0);
  assert.ok(h.xPercent-h.widthPercent/2>=0 && h.xPercent+h.widthPercent/2<=100);
  assert.ok(h.yPercent-h.heightPercent/2>=0 && h.yPercent+h.heightPercent/2<=100);
 }));
});
