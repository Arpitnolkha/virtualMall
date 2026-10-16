import test from 'node:test';
import assert from 'node:assert/strict';
import { loader } from './shopping-loader.mjs';
const { decide, initialFlow, feedback } = loader()('lib/shopping/flow.ts');

test('saved callback cannot be falsely cancelled by voice', () => {
  const flow = { ...initialFlow, productId: 'headphones', handoff: 'SCHEDULED' };
  for (const text of ['cancel', "don't call", 'never mind']) {
    const result = decide(flow, text);
    assert.equal(result.flow.handoff, 'SCHEDULED');
    assert.equal(result.action.code, 'savedCallback');
  }
  for (const language of ['en', 'hi', 'hinglish']) assert.ok(Buffer.byteLength(feedback('savedCallback', language)) <= 512);
  assert.equal(decide({ ...flow, handoff: 'SCHEDULE_REQUESTED' }, 'cancel').action.code, 'cancel');
});

test('human help clears an unfinished quantity or checkout conversation', () => {
  for (const phase of ['AWAITING_QUANTITY', 'AWAITING_NEXT_ACTION', 'CHECKOUT']) {
    for (const text of ['I need a human', 'Connect me to a human now', 'Schedule a call with a human later']) {
      const result = decide({ ...initialFlow, phase, productId: 'headphones' }, text);
      assert.equal(result.flow.phase, 'PRODUCT_EXPLORATION');
      assert.equal(result.flow.productId, 'headphones');
    }
  }
});

test('standalone scheduling requests open callback review without asking for human keywords', () => {
  for (const text of ['Schedule a call tomorrow at 10:30 Indian Standard Time', 'Book a callback', 'Call me tomorrow']) {
    assert.equal(decide(initialFlow, text).action?.type, 'START_SCHEDULE_HANDOFF', text);
  }
  const pending = {...initialFlow, handoff:'SCHEDULE_REQUESTED'};
  assert.equal(decide(pending,'yes').action?.type,'CONFIRM_SCHEDULE');
  assert.equal(decide(pending,'cancel').flow.handoff,'NONE');
});

test('explicit India timezone is applied before resolving tomorrow', () => {
  const {parseSchedule,scheduleInstant}=loader()('lib/shopping/schedule.ts');
  const now=new Date('2026-10-16T20:00:00Z');
  const result=parseSchedule('tomorrow at 10:30 Indian Standard Time',{date:'',time:'',timezone:'America/Los_Angeles'},now);
  assert.equal(result.date,'2026-10-18');
  assert.equal(result.time,'10:30');
  assert.equal(result.timezone,'Asia/Kolkata');
  assert.equal(scheduleInstant(result,now.getTime()),Date.parse('2026-10-18T05:00:00Z'));
});
