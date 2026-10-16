import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loader } from './shopping-loader.mjs';
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; };

test('restoring a damaged cart skips malformed entries without losing valid products', () => {
  const {restoreCart} = loader()('lib/shopping/cart.ts');
  const cart = restoreCart(JSON.stringify({items:[null, 'bad', {productId:'headphones',quantity:2}, null, {productId:'water-bottle',quantity:1}]}));
  assert.equal(cart.items.length, 2);
  assert.equal(cart.items[0].quantity, 2);
});

test('HTTP validation rejects malformed origins and counts UTF-8 request bytes', async () => {
  const {sameOrigin, body} = loader()('lib/server/http.ts');
  assert.throws(() => sameOrigin(new Request('http://localhost/api', {headers:{origin:'not a URL'}})), /FORBIDDEN/);
  await assert.rejects(body(new Request('http://localhost/api', {method:'POST',body:JSON.stringify({text:'अ'.repeat(1500)})})), /BAD_REQUEST/);
});

test('session authentication rejects a same-character-length Unicode key without a buffer-size exception', () => {
  const load = loader({'./config':{requireConfiguration:()=>({}),configuration:()=>({avatarReady:false})}});
  const {createSession,getSession} = load('lib/server/sessionRegistry.ts');
  const e = createSession('a'.repeat(36));
  assert.throws(() => getSession(e.id,'é'.repeat(36)), /SESSION_EXPIRED/);
});

function conversationFixture(avatarInit = Promise.resolve(), globals = {}) {
  const join = deferred(), statuses=[], requests=[];
  let rtcSink, disposed=0;
  class RtcSession {
    constructor(_c,sink) {rtcSink=sink;}
    join(){return join.promise;}
    waitForAgent(){return Promise.resolve();}
    dispose(){disposed++; return Promise.resolve();}
  }
  class Avatar {initialize(){return avatarInit;}setState(){}dispose(){}stopSpeaking(){}}
  const load = loader({'./rtcSession':{RtcSession},'@/lib/avatar/anamShopkeeper':{AnamShopkeeperController:Avatar}}, {}, {fetch:async(url,options)=>{
    const data=JSON.parse(options.body); requests.push(data);
    return Response.json(url==='/api/mall/sessions'?{id:'session',avatarEnabled:false,expiresAt:Date.now()+60000}:{ready:true});
  }, ...globals});
  const {AgoraConversationController} = load('lib/agora/conversation.ts');
  const c = new AgoraConversationController({status:p=>statuses.push(p),avatar(){},video(){},transcript(){},clear(){},timing(){}},false);
  return {c,join,statuses,requests,error:()=>rtcSink.error('media failed'),disposed:()=>disposed};
}
test('an RTC failure during startup cannot later transition the controller to ready', async () => {
  const f=conversationFixture(); const pending=f.c.connect(); await tick(); f.error(); f.join.resolve(); await pending; await f.c.dispose();
  assert.ok(f.statuses.some(s=>s.phase==='error'));
  assert.equal(f.statuses.some(s=>s.phase==='ready'),false);
  assert.equal(f.requests.some(r=>r.action==='welcome'),false);
  assert.equal(f.disposed(),1);
});
test('a disposed controller never starts a new server session', async () => {
  const f=conversationFixture(); await f.c.dispose(); await f.c.connect(); assert.equal(f.requests.length,0);
});

test('ending voice before the asynchronous controller import completes cancels startup', async () => {
  let api, starts=0;
  const effects=[];
  const react={createContext:()=>({Provider:'provider'}),useRef:value=>({current:value}),useState:v=>[typeof v==='function'?v():v,()=>{}],useReducer:(_r,v)=>[v,()=>{}],useEffect:f=>effects.push(f),useCallback:f=>f,useMemo:f=>f(),useSyncExternalStore:()=>false};
  const jsx=(_type,props)=>{if(props.value?.connectVoice)api=props.value;return props;};
  class Controller {selectProduct(){}connect(){starts++;return Promise.resolve();}dispose(){return Promise.resolve();}}
  class Mock {cancel(){}dispose(){}}
  class Placeholder {initialize(){}dispose(){}}
  const load=loader({react,'react/jsx-runtime':{jsx,jsxs:jsx},'@/lib/agora/conversation':{AgoraConversationController:Controller,initialVoiceStatus:{phase:'disconnected'}},'@/lib/agora/rtcSession':{preloadRtcSdk:async()=>{}},'@/lib/avatar/shopkeeperAvatar':{PlaceholderShopkeeper:Placeholder},'@/lib/conversation/mockConversation':{MockConversationController:Mock}}, {}, {window:{addEventListener(){},removeEventListener(){}}});
  load('lib/mall/productContext.tsx').MallProvider({children:null});
  const cleanups=effects.map(f=>f());
  const start=api.connectVoice(); await api.disconnectVoice(); await start;
  assert.equal(starts,0);
  await api.connectVoice(); assert.equal(starts,1);
  cleanups.forEach(f=>f?.());
});

test('meeting expiry releases media and reports disconnected', async () => {
  let expire; const states=[], calls=[];
  const track={stop(){},close(){},setEnabled:async()=>{}};
  const client={remoteUsers:[],on(){},join:async()=>{},publish:async()=>{},leave:async()=>calls.push('leave'),removeAllListeners(){}};
  const sdk={setLogLevel(){},disableLogUpload(){},createClient:()=>client,createMicrophoneAudioTrack:async()=>track,createCameraVideoTrack:async()=>track};
  const {MeetingSession}=loader({}, {}, {setTimeout:f=>{expire=f;return 1;},clearTimeout(){}})('lib/handoff/meetingSession.ts');
  const s=new MeetingSession({expiresAt:Date.now()+1000},{state:s=>states.push(s),users(){},local(){},error(){}},async()=>'',async()=>({default:sdk}));
  await s.join(); expire(); await tick();
  assert.equal(states.at(-1),'DISCONNECTED'); assert.ok(calls.includes('leave'));
});


test('ending during avatar initialization cannot create a late RTC session', async () => {
  const init=deferred(), f=conversationFixture(init.promise);
  const pending=f.c.connect(); await tick(); await f.c.dispose(); init.resolve(); await pending;
  assert.equal(f.requests.some(r=>r.action==='start'),false);
  assert.equal(f.statuses.some(s=>s.phase==='ready'),false);
});


test('stalled RTC startup reaches an error and releases the pending connect promise', async () => {
  let timeout;
  const f=conversationFixture(Promise.resolve(),{setTimeout:(fn,ms)=>{if(ms===45000)timeout=fn;return 1;},clearTimeout(){}});
  const pending=f.c.connect(); await tick(); timeout(); await pending;
  assert.ok(f.statuses.some(s=>s.phase==='error' && /too long/.test(s.error)));
  f.join.resolve(); await tick(); await f.c.dispose();
  assert.equal(f.statuses.some(s=>s.phase==='ready'),false);
});
