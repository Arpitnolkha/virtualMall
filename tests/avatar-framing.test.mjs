import { test } from "node:test";
import assert from "node:assert/strict";
import { avatarFraming, foregroundBottom, avatarTorsoFade } from "../public/avatar-framing.mjs";

function displayed(box, frame) {
  return {
    height: box.height * frame.scale,
    centerX: (box.originX + box.width / 2) * frame.scale + frame.x,
    centerY: (box.originY + box.height / 2) * frame.scale + frame.y,
  };
}
test("portrait and zoomed landscape stream keep identical face size and position", () => {
  const portrait = { originX: 170, originY: 100, width: 160, height: 170 };
  const video = { originX: 110, originY: 20, width: 240, height: 255 };
  const a = displayed(portrait, avatarFraming(portrait, 512, 512));
  const b = displayed(video, avatarFraming(video, 512, 288));
  for (const key of Object.keys(a))
    assert.ok(Math.abs(a[key] - b[key]) < 1e-8, key);
});
test("missing face preserves source aspect and never divides by an invalid box", () => {
  const frame = avatarFraming({ height: 0 }, 512, 288);
  assert.equal(frame.scale, 1);
  assert.equal(frame.x, 0);
  assert.equal(frame.y, 112);
});

test("blank masks and isolated noise cannot present an empty avatar", () => {
  const mask = new Float32Array(100);
  assert.equal(foregroundBottom(mask, 10, 10), null);
  mask[99] = 1;
  assert.equal(foregroundBottom(mask, 10, 10), null);
  mask[70] = mask[71] = 1;
  assert.equal(foregroundBottom(mask, 10, 10), 0.8);
});

test("incomplete speaking masks cannot move the torso fade over the face", () => {
  const framing = { y: 0, scale: 1 };
  for (const bottom of [null, 0, 0.4, 0.525, 0.6, NaN]) {
    assert.equal(avatarTorsoFade(framing, bottom, 512), null);
  }
  for (const bottom of [0.65, 0.75, 0.95, 1]) {
    const fade = avatarTorsoFade(framing, bottom, 512);
    assert.ok(fade.start >= 512 * 0.6);
    assert.equal(fade.bottom, bottom * 512);
  }
});
