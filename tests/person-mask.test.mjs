import { test } from "node:test";
import assert from "node:assert/strict";
import { personAlpha } from "../public/avatar-mask.mjs";

test("segmentation drops background, preserves the person, and feathers hair boundaries", () => {
  assert.equal(personAlpha(0), 0);
  assert.equal(personAlpha(0.2), 0);
  assert.equal(personAlpha(0.9), 255);
  assert.equal(personAlpha(1), 255);
  assert.ok(personAlpha(0.5) > 0 && personAlpha(0.5) < 255);
  assert.ok(personAlpha(0.6) > personAlpha(0.5));
});
