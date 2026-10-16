import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loader} from './shopping-loader.mjs';
const tick=()=>new Promise(r=>setImmediate(r));
function roomFixture() {
 const buttons=[],effects=[],requests=[],routes=[];
 let finishJoin,joins=0;
 const pending=new Promise(r=>finishJoin=r);
 const react={useRef:v=>({current:v}),useState:v=>[v,()=>{}],useEffect:f=>effects.push(f)};
 const jsx=(type,props)=>{if(type==='button')buttons.push(props);return props;};
 class MeetingSession {join(){joins++;return Promise.resolve();}dispose(){return Promise.resolve();}}
 const load=loader({react,'react/jsx-runtime':{jsx,jsxs:jsx},'next/navigation':{useRouter:()=>({push:p=>routes.push(p)})},'@/lib/handoff/meetingSession':{MeetingSession}}, {}, {
  window:{addEventListener(){},removeEventListener(){}},
  fetch:async(_url,options)=>{if(!options)return Response.json({});const action=JSON.parse(options.body).action;requests.push(action);if(action==='join')return pending;return Response.json({});}
 });
 load('components/meeting/MeetingRoom.tsx').default({id:'test-meeting'});
 return {join:buttons.find(b=>b.children==='Join meeting').onClick,end:buttons.find(b=>b.children==='Return to showroom').onClick,requests,routes,finishJoin:()=>finishJoin(Response.json({})),joins:()=>joins};
}
test('End before credential request prevents meeting startup',async()=>{
 const f=roomFixture();f.join();f.end();await tick();
 assert.equal(f.requests.includes('join'),false);assert.equal(f.joins(),0);assert.deepEqual(f.routes,['/mall']);
});
test('End while credentials are pending releases late reservation and never activates devices',async()=>{
 const f=roomFixture();f.join();await tick();assert.ok(f.requests.includes('join'));
 f.end();await tick();f.finishJoin();await tick();
 assert.equal(f.joins(),0);assert.equal(f.requests.at(-1),'leave');assert.deepEqual(f.routes,['/mall']);
});
test('media controls reject unavailable or disposed devices instead of reporting success',async()=>{
 const {MeetingSession}=loader()('lib/handoff/meetingSession.ts');
 const s=new MeetingSession({}, {},async()=>'',async()=>{throw Error('must not load');});
 await assert.rejects(s.setMic(false),/Microphone unavailable/);
 await s.dispose();await assert.rejects(s.setMic(true),/Microphone unavailable/);await assert.rejects(s.setCamera(true),/Camera unavailable/);
});
test('ordinary words do not accidentally trigger price negotiation',()=>{
 const {decide,initialFlow}=loader()('lib/shopping/flow.ts');
 for(const text of ['Is it ideal for school?','I am dealing with a noisy room']) assert.equal(decide({...initialFlow,productId:'headphones'},text).action,null);
 assert.equal(decide(initialFlow,'Can I get a discount?').action.type,'OFFER_HUMAN_HANDOFF');
});
test('product questions with numbers never add to cart while quantity is pending',()=>{
 const {decide,initialFlow}=loader()('lib/shopping/flow.ts');
 const flow={...initialFlow,productId:'headphones',phase:'AWAITING_QUANTITY'};
 for(const text of ['Is it suitable for a 2 year old?','Does it last 20 hours','What is the price?']) {
  const result=decide(flow,text);assert.equal(result.action,null);assert.equal(result.flow.phase,'AWAITING_QUANTITY');
 }
 assert.equal(decide(flow,'two please').action.quantity,2);
});
