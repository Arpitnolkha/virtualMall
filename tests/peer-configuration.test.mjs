import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {patchPeerConfiguration} from '../scripts/patch-agora-ice.mjs';
const fixture='const capabilities={};capabilities.supportPCSetConfiguration=function(){const e=window.RTCPeerConnection;return!excluded()&&!!e&&e.prototype.setConfiguration instanceof Function}();return capabilities.supportPCSetConfiguration;';
const detect=(Peer,excluded=()=>false)=>new Function('window','excluded',patchPeerConfiguration(fixture))({RTCPeerConnection:Peer},excluded);
test('working no-op configuration update is supported and probe is closed',()=>{
 let closed=0,updated=0;
 const config={iceServers:[]};
 class Peer {getConfiguration(){return config;}setConfiguration(value){assert.equal(value,config);updated++;}close(){closed++;}}
 assert.equal(detect(Peer),true);assert.equal(updated,1);assert.equal(closed,1);
});
test('exposed but broken configuration method selects unsupported path and closes probe',()=>{
 let closed=0;
 class Peer {getConfiguration(){return {};}setConfiguration(){throw new DOMException('Unsupported update','InvalidModificationError');}close(){closed++;}}
 assert.equal(detect(Peer),false);assert.equal(closed,1);
 // The native method itself remains unchanged and still reports real failures.
 assert.throws(()=>new Peer().setConfiguration({}),{name:'InvalidModificationError'});
});
test('missing API, constructor failure and existing platform exclusions remain unsupported',()=>{
 assert.equal(detect(undefined),false);assert.equal(detect(class {}),false);
 class Broken {constructor(){throw Error('unavailable');}setConfiguration(){}}
 assert.equal(detect(Broken),false);
 let created=0;
 class Excluded {constructor(){created++;}setConfiguration(){}}
 assert.equal(detect(Excluded,()=>true),false);assert.equal(created,0);
});
test('capability patch is idempotent and rejects an unknown SDK shape',()=>{
 const patched=patchPeerConfiguration(fixture);
 assert.equal(patchPeerConfiguration(patched),patched);
 assert.throws(()=>patchPeerConfiguration('other sdk'),/review compatibility patch/);
 assert.throws(()=>patchPeerConfiguration(fixture+fixture),/review compatibility patch/);
});
test('all shipped Agora bundles have one capability probe and no abandoned update patch',()=>{
 for(const file of ['AgoraRTC_N-production.js','AgoraRTC_N-production.full.js','AgoraRTC_N-production.esm.mjs']){
  const source=readFileSync(new URL('../node_modules/agora-rtc-sdk-ng/'+file,import.meta.url),'utf8');
  assert.equal(source.split('/* maya-pc-config-capability */').length-1,1,file);
  assert.equal(patchPeerConfiguration(source),source,file);
  assert.equal(source.includes('maya-preserve-pc-config'),false,file);
 }
});
