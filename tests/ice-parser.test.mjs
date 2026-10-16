import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { patchIceParser } from '../scripts/patch-agora-ice.mjs';
for (const file of ['AgoraRTC_N-production.js','AgoraRTC_N-production.full.js','AgoraRTC_N-production.esm.mjs']) {
 test(`ICE extension parsing preserves option names in ${file}`,()=>{
  const source=readFileSync(new URL('../node_modules/agora-rtc-sdk-ng/'+file,import.meta.url),'utf8');
  assert.equal(patchIceParser(source),source,'patch must be idempotent');
  const method=source.match(/parseIceOptions\((\w+)\)\{[\s\S]*?(?=parseFingerprint\()/)[0];
  const parser=vm.runInNewContext(`({${method}})`,{E:c=>/[a-zA-Z0-9+/]/.test(c??''),r:c=>/[a-zA-Z0-9+/]/.test(c??'')});
  parser.attributes={};parser.offset=0;parser.atEnd=s=>parser.offset===s.length;
  parser.extractOneOrMore=(s,p)=>{const begin=parser.offset;while(parser.offset<s.length&&p(s[parser.offset]))parser.offset++;if(begin===parser.offset)throw Error('Invalid token');return s.slice(begin,parser.offset)};
  parser.consumeAttributeSpace=s=>{if(s[parser.offset]!==' ')throw Error('Invalid space');parser.offset++};
  parser.parseIceOptions('trickle goog-sped-v1');
  assert.deepEqual(Array.from(parser.attributes.iceOptions),['trickle','goog-sped-v1']);
 });
}
test('changed upstream parser fails closed',()=>assert.throws(()=>patchIceParser('different sdk'),/review compatibility patch/));
