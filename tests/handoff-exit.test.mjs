import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loader} from './shopping-loader.mjs';
const {decide,initialFlow}=loader()('lib/shopping/flow.ts');
const selected={...initialFlow,productId:'headphones'};
test('keep exploring exits a pending, failed or scheduled handoff without another timing prompt',()=>{
 for(const handoff of ['AWAITING_TIMING_CHOICE','FAILED','SCHEDULE_REQUESTED','SCHEDULED']) {
  const result=decide({...selected,handoff},'I want to keep exploring');
  assert.equal(result.action.type,'CONTINUE_EXPLORING');assert.equal(result.flow.handoff,'NONE');
  assert.equal(decide(result.flow,'Is it comfortable?').action,null);
 }
});
test('a pending offer does not intercept unrelated product questions or acknowledgements',()=>{
 const pending=decide(selected,'Can I get a discount?').flow;
 for(const text of ['Is it comfortable?','What is it made of?','Thanks']) assert.equal(decide(pending,text).action,null);
 assert.equal(decide(pending,'Now.').action.type,'CREATE_INSTANT_HANDOFF');
 assert.equal(decide(pending,'Not now').action.type,'START_SCHEDULE_HANDOFF');
});
test('exploring does not interrupt an already connecting meeting',()=>{
 assert.equal(decide({...selected,handoff:'CONNECTING'},'keep exploring').action,null);
});
