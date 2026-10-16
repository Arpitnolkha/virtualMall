import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loader} from './shopping-loader.mjs';
const load=loader();
const {decide,initialFlow}=load('lib/shopping/flow.ts');
const {parseSchedule}=load('lib/shopping/schedule.ts');
test('product and gift questions do not accidentally create human meetings',()=>{
 for(const text of ['I want headphones for calls','I need this for a team meeting','Is this suitable for someone aged 10?','Does it support calls?','Can I get this for a person who travels?']) {
  assert.notEqual(decide({...initialFlow,productId:'headphones'},text).action?.type,'CREATE_INSTANT_HANDOFF',text);
 }
});
test('invalid or imprecise time edits cannot silently reuse an older exact time',()=>{
 const d={date:'2026-11-20',time:'15:30',timezone:'Asia/Kolkata'};
 for(const text of ['at 25:30','at 10:99','at 15 PM']) assert.throws(()=>parseSchedule(text,d));
 assert.equal(parseSchedule('tomorrow afternoon',d,new Date('2026-10-16T10:00:00Z')).time,'');
 assert.equal(parseSchedule('at 3',d).time,'');
 assert.equal(parseSchedule('next month',d).date,'');
});
test('weekday and day after tomorrow resolve in the callback timezone',()=>{
 const d={date:'',time:'',timezone:'Asia/Kolkata'},now=new Date('2026-10-16T10:00:00Z');
 assert.equal(parseSchedule('Monday at 10:30 am',d,now).date,'2026-10-19');
 assert.equal(parseSchedule('day after tomorrow at 3 pm',d,now).date,'2026-10-18');
});
