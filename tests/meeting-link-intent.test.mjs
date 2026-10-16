import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loader} from './shopping-loader.mjs';
const {decide,initialFlow,feedback}=loader()('lib/shopping/flow.ts');
test('meeting link requests create a room with selected product even during quantity collection',()=>{
 for(const text of ['Where is my meeting link?','Send me the meeting link','Can you give me a call link?','मुझे मीटिंग लिंक चाहिए']) {
  const result=decide({...initialFlow,productId:'headphones',phase:'AWAITING_QUANTITY'},text);
  assert.equal(result.action?.type,'CREATE_INSTANT_HANDOFF',text);
  assert.equal(result.flow.productId,'headphones');
  assert.equal(result.flow.phase,'PRODUCT_EXPLORATION');
 }
});
test('later, negative and informational requests do not accidentally create meetings',()=>{
 assert.equal(decide(initialFlow,'Send me a meeting link tomorrow').action?.type,'START_SCHEDULE_HANDOFF');
 for(const text of ["I don't need a meeting link",'What is a meeting link?','If I need a meeting link','No need for a call link'])
  assert.notEqual(decide(initialFlow,text).action?.type,'CREATE_INSTANT_HANDOFF');
 for(const handoff of ['INSTANT_REQUESTED','CONNECTING','CONNECTED'])
  assert.equal(decide({...initialFlow,handoff},'Where is my meeting link?').action,null);
});
test('customer confirmation never delegates representative invitations',()=>{
 for(const lang of ['en','hi','hinglish']) {
  const text=feedback('meeting',lang);
  assert.ok(Buffer.byteLength(text)<=512);
  assert.doesNotMatch(text,/share|साझा|invite/i);
 }
 assert.match(feedback('meeting','en'),/No representative is connected yet/);
});

test('instant choice replaces callback scheduling and retains product and reason',()=>{
 for(const handoff of ['SCHEDULE_REQUESTED','AWAITING_TIMING_CHOICE','FAILED']) {
  for(const text of ['I want to have it instantly.','Now please','Immediately','Right away','Abhi','अभी']) {
   const result=decide({...initialFlow,handoff,productId:'headphones',reason:'pricing'},text);
   assert.equal(result.action?.type,'CREATE_INSTANT_HANDOFF',`${handoff}: ${text}`);
   assert.equal(result.flow.handoff,'INSTANT_REQUESTED');
   assert.equal(result.flow.productId,'headphones');
   assert.equal(result.flow.reason,'pricing');
   assert.equal(decide(result.flow,text).action,null);
  }
 }
});
test('future or negative timing does not create an immediate room',()=>{
 const flow={...initialFlow,handoff:'SCHEDULE_REQUESTED'};
 for(const text of ['Not now','Not instantly','Tomorrow at 10:30','I do not want it instantly'])
  assert.notEqual(decide(flow,text).action?.type,'CREATE_INSTANT_HANDOFF',text);
 assert.equal(decide(initialFlow,'Does it charge instantly?').action,null);
});

test('clear call or human requests default to an immediate meeting',()=>{
 for(const text of ['I want to have a call','I want to speak to human right now','Can I speak to a human?','I would like a video call','Call me','Connect me to support agent','Arrange a call','Request a callback','Can we have a call?','Human help']) {
  for(const handoff of ['NONE','SCHEDULE_REQUESTED','AWAITING_TIMING_CHOICE']) {
   const result=decide({...initialFlow,handoff,productId:'headphones'},text);
   assert.equal(result.action?.type,'CREATE_INSTANT_HANDOFF',`${handoff}: ${text}`);
   assert.equal(result.flow.productId,'headphones');
   assert.equal(decide(result.flow,text).action,null);
  }
 }
});
test('explicit future call requests still schedule and unrelated speech does not create a meeting',()=>{
 for(const text of ['I want a call tomorrow','Call me at 10:30','Can I speak to a human on Friday?','I want a meeting in 2 hours','Book a callback'])
  assert.equal(decide(initialFlow,text).action?.type,'START_SCHEDULE_HANDOFF',text);
 for(const text of ['Do these headphones support calls?','What is the call quality?','I do not want a call','If I want a call','I do not want to speak to a human'])
  assert.notEqual(decide(initialFlow,text).action?.type,'CREATE_INSTANT_HANDOFF',text);
});
