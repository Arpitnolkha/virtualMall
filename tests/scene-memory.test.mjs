import test from 'node:test';
import assert from 'node:assert/strict';
import { loader } from './shopping-loader.mjs';

test('legacy entry choice is discarded while showroom position survives refresh', () => {
  let stored = JSON.stringify({ entered: true, zone: 'toys', positions: { toys: { left: 120, top: 30 } }, zoomLevels: { toys: 1.5 } });
  const sessionStorage = { getItem: () => stored, setItem: (_key, value) => { stored = value; } };
  const { readScene, saveScene } = loader({}, {}, { sessionStorage })('lib/shopping/sceneMemory.ts');
  const scene = readScene();
  assert.equal('entered' in scene, false);
  assert.equal(scene.zone, 'toys');
  assert.equal(scene.positions.toys.left, 120);
  assert.equal(scene.zoomLevels.toys, 1.5);
  saveScene({ zone: 'headphones' });
  assert.equal('entered' in JSON.parse(stored), false);
  assert.equal(readScene().zone, 'headphones');
  assert.equal(readScene().zoomLevels.toys, 1.5);
});
