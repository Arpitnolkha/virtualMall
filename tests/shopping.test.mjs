import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loader } from './shopping-loader.mjs';
const load=loader();
const {decide,initialFlow,quantityOf,ActionLedger,feedback}=load('lib/shopping/flow.ts');
const {emptyCart,addItem,restoreCart,cartTotal,itemCount,updateQuantity}=load('lib/shopping/cart.ts');
const {parseSchedule,scheduleInstant}=load('lib/shopping/schedule.ts');
const selected={...initialFlow,productId:'headphones'};
const plain=x=>JSON.parse(JSON.stringify(x));
test('purchase asks quantity, adds exact catalog quantity, then checkout/continue',()=>{
 const first=decide(selected,"I'll take these.");assert.equal(first.action.code,'quantity');
 const next=decide(first.flow,'2.');assert.deepEqual(plain(next.action),{type:'ADD_TO_CART',productId:'headphones',quantity:2});assert.equal(next.flow.phase,'AWAITING_NEXT_ACTION');
 const cart=addItem(emptyCart,'headphones',2,'turn-1');assert.equal(cartTotal(cart),3998);assert.equal(itemCount(cart),2);
 assert.equal(decide(next.flow,'checkout').action.type,'OPEN_CHECKOUT');assert.equal(decide(next.flow,'I want to keep looking').action.type,'CONTINUE_EXPLORING');
});
test('included numbers and Hindi purchase skip duplicate quantity question; compliments do nothing',()=>{
 for(const t of ['Add 3 of these to my cart','I want three of these'])assert.equal(decide(selected,t).action.quantity,3);
 const hi=decide(selected,'मुझे ये चाहिए.');assert.equal(hi.action.code,'quantity');assert.equal(hi.flow.language,'hi');assert.equal(decide(hi.flow,'दो.').action.quantity,2);
 for(const t of ['I like this','This looks good','This is nice','What is the price?','How much is this?'])assert.equal(decide(selected,t).action,null);
 assert.equal(decide(selected,"Don't add this to my cart").action.code,'cancel');
});
test('whole quantity 1..99 only, digit scripts, compound number and invalid inputs',()=>{
 assert.equal(quantityOf('ninety nine'),99);assert.equal(quantityOf('२'),2);
 for(const t of ['zero','0','-2','1.5','one hundred','half','2 or 3','1/2','1000'])assert.equal(decide({...selected,phase:'AWAITING_QUANTITY'},t).action.code,'invalidQuantity',t);
 assert.equal(decide({...selected,phase:'AWAITING_QUANTITY'},'maybe').action.code,'invalidQuantity');
});
test('duplicate event cannot double add; repeated legitimate additions merge; corrupt storage is sanitized',()=>{
 const ledger=new ActionLedger();assert.equal(ledger.claim('session:turn'),true);assert.equal(ledger.claim('session:turn'),false);
 const a=addItem(emptyCart,'headphones',2,'a');assert.equal(addItem(a,'headphones',2,'a'),a);const b=addItem(a,'headphones',1,'b');assert.equal(b.items.length,1);assert.equal(itemCount(b),3);assert.equal(cartTotal(b),5997);
 assert.equal(restoreCart(JSON.stringify(b)).items[0].quantity,3);assert.equal(restoreCart('{').items.length,0);assert.equal(restoreCart(JSON.stringify({items:[{productId:'fake',quantity:3},{productId:'headphones',quantity:-1}]})).items.length,0);
 assert.throws(()=>addItem(b,'headphones',99,'c'));assert.throws(()=>updateQuantity(b,'headphones',0));
});
test('handoff defaults to immediate; explicit later schedules; discounts still offer help',()=>{
 for(const text of ['Connect me with a human','I want to talk to someone','मुझे किसी इंसान से बात करनी है','Human agent se connect karo']){const r=decide(selected,text);assert.equal(r.action.type,'CREATE_INSTANT_HANDOFF');assert.equal(r.flow.handoff,'INSTANT_REQUESTED');}
 assert.equal(decide(selected,'Connect me with a human now').action.type,'CREATE_INSTANT_HANDOFF');assert.equal(decide(selected,'Can I speak with someone tomorrow?').action.type,'START_SCHEDULE_HANDOFF');assert.equal(decide(selected,"Don't connect me to a human now").action.code,'cancel');
 const priced=decide(selected,'Thoda discount mil sakta hai?');assert.equal(priced.action.type,'OFFER_HUMAN_HANDOFF');assert.equal(priced.flow.reason,'pricing');assert.equal(priced.flow.language,'hinglish');assert.equal(decide(priced.flow,'अभी').action.type,'CREATE_INSTANT_HANDOFF');
});
test('schedule parser keeps ambiguous time missing; exact confirmation uses timezone and rejects invalid future time',()=>{
 const base={date:'',time:'',timezone:'Asia/Kolkata'};const now=new Date('2026-10-08T10:00:00Z');
 const ambiguous=parseSchedule('tomorrow afternoon',base,now);assert.equal(ambiguous.date,'2026-10-09');assert.equal(ambiguous.time,'');
 const exact=parseSchedule('tomorrow at 3 PM',base,now);assert.equal(exact.time,'15:00');assert.equal(scheduleInstant(exact,now.getTime()),Date.parse('2026-10-09T09:30:00Z'));
 assert.throws(()=>scheduleInstant({...exact,date:'2026-02-30'},now.getTime()));assert.throws(()=>scheduleInstant({...exact,date:'2026-10-07'},now.getTime()));assert.throws(()=>scheduleInstant({...exact,timezone:'bad-zone'},now.getTime()));
 assert.throws(()=>scheduleInstant({date:'2027-03-14',time:'02:30',timezone:'America/New_York'},now.getTime()));
});
test('all application speech fits provider speak limit in English, Hindi and Hinglish',()=>{for(const lang of ['en','hi','hinglish'])for(const code of ['quantity','invalidQuantity','added','next','continue','offer','pricing','schedule','scheduleConfirm','scheduled','meeting','failed','cartFailed','select','cancel'])assert.ok(Buffer.byteLength(feedback(code,lang,'School Backpack',99))<=512,`${lang}:${code}`);});
test('meeting and callback repository idempotency, known catalog context, UID uniqueness and no raw transcript',()=>{
 const {DemoHandoffRepository}=load('lib/handoff/repository.ts');const repo=new DemoHandoffRepository();
 const a=repo.create('unique-action','headphones',2,'pricing');assert.equal(repo.create('unique-action','headphones',2,'pricing').id,a.id);assert.equal(repo.meetings.size,1);assert.equal(a.product.listedPrice,1999);assert.equal(a.transcript,undefined);assert.throws(()=>repo.create('unique-action','headphones',3,'pricing'));
 const first=repo.participant(a.id,'customer').uid,second=repo.participant(a.id,'agent').uid;assert.notEqual(first,second);repo.release(a.id,'customer');assert.notEqual(repo.participant(a.id,'new-customer').uid,second);assert.throws(()=>repo.participant(a.id,'third'));
 const draft={date:new Date(Date.now()+86400000).toISOString().slice(0,10),time:'15:00',timezone:'UTC'};const c=repo.request('schedule-key',draft,'headphones','pricing');assert.equal(repo.request('schedule-key',draft,'headphones','pricing').id,c.id);assert.equal(c.status,'requested');assert.equal(repo.callbacks.size,1);assert.throws(()=>repo.get('not-a-meeting'));
});
test('meeting API refuses an offer/later, validates same-origin and deduplicates explicit now',async()=>{
 const {POST}=load('app/api/meetings/route.ts');const req=d=>new Request('http://localhost:3015/api/meetings',{method:'POST',headers:{origin:'http://localhost:3015','content-type':'application/json'},body:JSON.stringify(d)});
 const d={actionId:'test-meeting-key',choice:'later',productId:'headphones',quantity:2,reason:'pricing'};assert.equal((await POST(req(d))).status,400);
 d.choice='now';const a=await(await POST(req(d))).json();const b=await(await POST(req(d))).json();assert.equal(a.meetingId,b.meetingId);assert.match(a.joinUrl,/^\/meeting\//);assert.equal(a.token,undefined);
 assert.equal((await POST(new Request('http://localhost:3015/api/meetings',{method:'POST',headers:{origin:'https://evil.example'},body:JSON.stringify(d)}))).status,403);
});
test('schedule API requires explicit confirmation and only reports success after save',async()=>{
 const {POST}=load('app/api/handoff/schedule/route.ts');const d={actionId:'schedule-api-key',date:new Date(Date.now()+86400000).toISOString().slice(0,10),time:'15:00',timezone:'UTC',reason:'human-help',confirmed:false};const req=()=>new Request('http://localhost:3015/api/handoff/schedule',{method:'POST',headers:{origin:'http://localhost:3015'},body:JSON.stringify(d)});
 assert.equal((await POST(req())).status,400);d.confirmed=true;const a=await(await POST(req())).json();const b=await(await POST(req())).json();assert.equal(a.id,b.id);assert.equal(a.status,'requested');d.date='2020-01-01';assert.equal((await POST(req())).status,400);
});
test('meeting join and renewal reuse tokenFor with server-owned channel and distinct participant UIDs',async()=>{
 const issued=[];const l=loader({'@/lib/server/sessionRegistry':{tokenFor:e=>{issued.push(e);return 'signed-server-token';}},'@/lib/server/config':{requireConfiguration:()=>({appId:'public-app-id',appCertificate:'never-expose'})}});
 const repo=l('lib/handoff/repository.ts').handoffRepository;const m=repo.create('token-reuse-key','headphones',1,'human-help');const {POST}=l('app/api/meetings/[meetingId]/route.ts');
 const join=async key=>(await POST(new Request(`http://localhost:3015/api/meetings/${m.id}`,{method:'POST',headers:{origin:'http://localhost:3015'},body:JSON.stringify({action:'join',participantKey:key})}),{params:Promise.resolve({meetingId:m.id})})).json();
 const a=await join('customer-key'),b=await join('specialist-key'),renew=await join('customer-key');assert.notEqual(a.uid,b.uid);assert.equal(a.uid,renew.uid);assert.equal(a.channel,m.channel);assert.equal(issued[0].channel,m.channel);assert.equal(a.appCertificate,undefined);assert.equal(a.token,'signed-server-token');
});
test('showroom presentation memory survives return and rejects corrupted stored state',()=>{
 let value='null';const storage={getItem:()=>value,setItem:(_key,text)=>{value=text;}};const {readScene,saveScene}=loader({}, {}, {sessionStorage:storage})('lib/shopping/sceneMemory.ts');assert.deepEqual(plain(readScene()),{});saveScene({zone:'headphones',entered:true,positions:{headphones:{left:340,top:20}},zoomLevels:{headphones:1.5}});assert.equal(readScene().positions.headphones.left,340);assert.equal(readScene().zoomLevels.headphones,1.5);value='{"zoomLevels":{"headphones":90}}';assert.equal(readScene().zoomLevels.headphones,undefined);
});

test('natural purchase requests retain selected product and consume the next spoken quantity',()=>{
 for(const text of ['I would like to buy this','I would like to purchase it','Can I buy this?','I need this','I want to order this']) {
  const first=decide(selected,text);assert.equal(first.action.code,'quantity',text);
  const second=decide(first.flow,'Two please.');assert.equal(second.action.productId,'headphones');assert.equal(second.action.quantity,2);
 }
 assert.equal(decide(selected,"I don't want to buy this").action.code,'cancel');
});
test('assistant quantity prompt synchronizes flow but only final user action adds catalog item once',()=>{
 const {observeQuantityPrompt}=load('lib/shopping/flow.ts');
 const armed=observeQuantityPrompt(selected,'How many would you like to order?');
 assert.equal(armed.phase,'AWAITING_QUANTITY');
 const reply=decide(armed,'3');
 const saved=addItem(emptyCart,reply.action.productId,reply.action.quantity,'final-user-turn');
 assert.equal(itemCount(saved),3);assert.equal(cartTotal(saved),5997);
 assert.equal(addItem(saved,reply.action.productId,reply.action.quantity,'final-user-turn'),saved);
 assert.equal(observeQuantityPrompt(reply.flow,'How many would you like?'),reply.flow);
 assert.equal(observeQuantityPrompt(initialFlow,'How many would you like?'),initialFlow);
 assert.equal(observeQuantityPrompt(selected,'These have two ear cups.'),selected);
 const handoff={...selected,handoff:'AWAITING_TIMING_CHOICE'};
 assert.equal(observeQuantityPrompt(handoff,'How many would you like?'),handoff);
});
