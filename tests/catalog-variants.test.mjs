import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loader } from './shopping-loader.mjs';
const load = loader();
const { products } = load('lib/mall/products.ts');
const { productPayload } = load('lib/mall/productPayload.ts');
const { emptyCart, addItem, cartTotal } = load('lib/shopping/cart.ts');
const sections = JSON.parse(fs.readFileSync('lib/mall/showroomSections.json', 'utf8'));
const galleries = JSON.parse(fs.readFileSync('lib/mall/productGallery.json', 'utf8'));

test('every scene hotspot opens a different valid catalog product', () => {
  const hotspots = sections.flatMap(section => section.productHotspots);
  assert.equal(new Set(hotspots.map(h => h.productId)).size, hotspots.length);
  for (const hotspot of hotspots) {
    const product = products.find(p => p.id === hotspot.productId);
    assert.ok(product, hotspot.id);
    const payload = productPayload(product);
    assert.equal(payload.id, hotspot.productId);
    assert.equal(payload.name, product.name);
    assert.equal(payload.details.price.amount, product.details.price.amount);
  }
});

test('every catalog product has three distinct views with unique asset paths', () => {
  const allPaths = [];
  for (const product of products) {
    const gallery = galleries[product.id];
    assert.deepEqual(gallery.map(v => v.label), ['Front', 'Side', 'Rear'], product.id);
    allPaths.push(...gallery.map(v => v.src));
  }
  assert.equal(new Set(allPaths).size, allPaths.length);
});

test('different headphone and bottle variants remain separate cart lines', () => {
  const ids = ['headphones', 'walnut-headphones', 'gold-trim-headphones', 'compact-headphones',
    'water-bottle', 'steel-bottle', 'navy-insulated-bottle', 'black-sports-bottle'];
  let cart = emptyCart;
  for (const id of ids) cart = addItem(cart, id, 2, 'variant-' + id);
  assert.equal(cart.items.length, ids.length);
  assert.equal(new Set(cart.items.map(item => item.productId)).size, ids.length);
  assert.equal(cartTotal(cart), ids.reduce((sum, id) =>
    sum + 2 * products.find(p => p.id === id).details.price.amount, 0));
});
