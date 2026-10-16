import test from 'node:test';
import assert from 'node:assert/strict';
import {loader} from './shopping-loader.mjs';

test('provider diagnostics retain agent ID and status without credentials or transcripts',async()=>{
 const logs=[];
 const session={agent:{id:'agent-diagnostic',getInfo:()=>{throw Error('must not delay error response with a network probe');}}};
 const error=Object.assign(new Error('private credential and transcript'),{statusCode:502,body:{api_key:'private credential'}});
 const {POST}=loader({'@/lib/server/sessionRegistry':{getSession:()=>session,updateProduct:async()=>{throw error;}}},{},{console:{warn:(...args)=>logs.push(args),info:()=>{}}})('app/api/mall/sessions/[id]/route.ts');
 const response=await POST(new Request('http://localhost/api/mall/sessions/test',{method:'POST',headers:{origin:'http://localhost','content-type':'application/json',authorization:'Bearer private-key'},body:JSON.stringify({action:'context',productId:'headphones',version:1})}),{params:Promise.resolve({id:'test'})});
 assert.equal(response.status,502);
 assert.equal((await response.json()).code,'PROVIDER_ERROR');
 assert.equal(logs[0][1].agentId,'agent-diagnostic');
 assert.equal(logs[0][1].httpStatus,502);
 assert.equal(JSON.stringify(logs).includes('private'),false);
});
