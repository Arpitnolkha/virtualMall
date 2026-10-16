import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
// Agora 4.24.8 treats ICE option names as ICE credential characters and rejects
// Chromium's goog-sped-v1 option. Accept '-' in option names only. The SDP,
// ICE credentials, candidates, DTLS, and browser APIs remain unchanged.
export function patchIceParser(source) {
  const method = /parseIceOptions\((\w+)\)\{[\s\S]*?(?=parseFingerprint\()/g;
  let count = 0;
  const output = source.replace(method, body => {
    if (body.includes('/* maya-ice-option-hyphen */')) { count++; return body; }
    const next = body.replace(/this\.extractOneOrMore\((\w+),(\w+)\)/, (_, input, predicate) =>
      `this.extractOneOrMore(${input},c=>${predicate}(c)||c==="-"/* maya-ice-option-hyphen */)`);
    if (next !== body) count++;
    return next;
  });
  if (count !== 1) throw new Error('Agora ICE parser changed: review compatibility patch before building.');
  return output;
}
// Some embedded browsers expose setConfiguration but reject even no-op updates.
// Exercise the capability once so Agora can select its existing unsupported-browser
// path. Never replace the native API or swallow errors on real session updates.
export function patchPeerConfiguration(source) {
  const marker = '/* maya-pc-config-capability */';
  const method = /supportPCSetConfiguration=function\(\)\{const (\w+)=window\.RTCPeerConnection;[\s\S]*?\}\(\)/g;
  let count = 0;
  const output = source.replace(method, (body, Peer) => {
    if (body.includes(marker)) { count++; return body; }
    const original = `${Peer}.prototype.setConfiguration instanceof Function`;
    if (!body.includes(original)) return body;
    count++;
    return body.replace(original, `${original}&&(()=>{let probe;try{probe=new ${Peer};probe.setConfiguration(probe.getConfiguration());return true}catch{return false}finally{probe?.close()}})()${marker}`);
  });
  if (count !== 1) throw new Error('Agora peer configuration changed: review compatibility patch before building.');
  return output;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const base = new URL('../node_modules/agora-rtc-sdk-ng/', import.meta.url);
  const { version } = JSON.parse(readFileSync(new URL('package.json', base), 'utf8'));
  if (version !== '4.24.8') throw new Error('Recheck the ICE compatibility patch for Agora ' + version);
  const files = ['AgoraRTC_N-production.js','AgoraRTC_N-production.full.js','AgoraRTC_N-production.esm.mjs'];
  const updates = files.map(file => { const path = new URL(file, base); return [path, patchPeerConfiguration(patchIceParser(readFileSync(path,'utf8')))]; });
  for (const [path, source] of updates) writeFileSync(path, source);
  console.log('Applied Agora 4.24.8 ICE option and peer configuration compatibility patches.');
}
