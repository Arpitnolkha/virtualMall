import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { loader } from "./shopping-loader.mjs";
function load(file, timers = { setTimeout, clearTimeout }) {
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, ...timers });
  return exports;
}
const { products } = loader()("lib/mall/products.ts");
function setup() {
  let serial = 0;
  const jobs = new Map();
  const messages = [];
  const states = [];
  const { MockConversationController } = load(
    "lib/conversation/mockConversation.ts",
    {
      setTimeout: (fn, ms) => {
        const id = ++serial;
        jobs.set(id, { fn, ms });
        return id;
      },
      clearTimeout: (id) => jobs.delete(id),
    },
  );
  const controller = new MockConversationController({
    message: (m) => messages.push(m),
    state: (c, a) => states.push([c, a]),
  });
  return {
    controller,
    messages,
    states,
    jobs,
    run() {
      const pending = [...jobs.values()].sort((a, b) => a.ms - b.ms);
      jobs.clear();
      pending.forEach((j) => j.fn());
    },
  };
}
test("catalog contains thirty unique products and complete suggested answers", () => {
  assert.equal(products.length, 30);
  assert.equal(new Set(products.map((p) => p.id)).size, 30);
  for (const p of products) {
    assert.equal(p.position.length, 3);
    assert.equal(p.features.length, 3);
    p.suggestedQuestions.forEach((q) => assert.ok(p.answers[q]));
  }
});
test("greeting initializes once and settles idle", async () => {
  const t = setup();
  await t.controller.initialize();
  await t.controller.initialize();
  assert.equal(t.states.length, 1);
  assert.equal(t.states[0][1], "greeting");
  t.run();
  assert.equal(t.states.at(-1)[1], "idle");
});
test("rapid selections cancel stale replies and use only two timers", () => {
  const t = setup();
  products.forEach((p) => t.controller.selectProduct(p));
  assert.equal(t.jobs.size, 2);
  t.run();
  assert.equal(t.messages.length, 1);
  assert.equal(t.messages[0].productId, products.at(-1).id);
  assert.equal(t.states.at(-2)[1], "speaking");
  assert.equal(t.states.at(-1)[1], "idle");
});
test("suggested questions keep the product context and user role", () => {
  const t = setup();
  const p = products[0];
  t.controller.ask(p.suggestedQuestions[0], p);
  assert.equal(t.messages[0].role, "user");
  t.run();
  assert.equal(t.messages[1].text, p.answers[p.suggestedQuestions[0]]);
  assert.equal(t.messages[1].productId, p.id);
});
test("disposal cancels replies and prevents delayed initialization", async () => {
  const t = setup();
  t.controller.selectProduct(products[0]);
  t.controller.dispose();
  await t.controller.initialize();
  t.run();
  assert.equal(t.jobs.size, 0);
  assert.equal(t.messages.length, 0);
  assert.equal(t.states.length, 1);
});
