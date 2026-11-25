import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Agent, AgoraClient, Area, AresSTT} from 'agora-agents';
import {loader} from './shopping-loader.mjs';
const {showroomTurnDetection}=loader()('lib/server/speechConfig.ts');
test('installed SDK serializes English and Hindi into ARES and uses VAD',()=>{
 const client=new AgoraClient({area:Area.US,appId:'0'.repeat(32),appCertificate:'1'.repeat(32)});
 const agent=new Agent({client,turnDetection:showroomTurnDetection}).withStt(new AresSTT());
 const properties=agent.toProperties({channel:'language-test',agentUid:'2001',remoteUids:['1001'],token:'test-only-token',allowMissingVendorCategories:new Set(['llm','tts'])});
 assert.equal(properties.asr.vendor,'ares');
 assert.equal(properties.asr.language,'en-IN,hi-IN');
 assert.equal(properties.turn_detection.language,'en-IN,hi-IN');
 assert.equal(properties.turn_detection.config.end_of_speech.mode,'vad');
 assert.equal(properties.agent_rtc_uid,'2001');
 assert.deepEqual(properties.remote_rtc_uids,['1001']);
});
