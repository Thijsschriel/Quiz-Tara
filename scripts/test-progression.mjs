import assert from 'node:assert/strict';
import {nextAutomaticStage, REVEAL_MS, ROUND_MS} from '../lib/progression.ts';
let now=1000;
let g={stage:'lobby',idx:0,started:now,duration:15};
assert.equal(nextAutomaticStage(g,13,0,now+100000,30),null);
g={...g,stage:'round'};
for(let idx=0;idx<30;idx++){
 if(g.stage==='round'){
  assert.equal(nextAutomaticStage(g,13,0,now+ROUND_MS-1,30),null);
  now+=ROUND_MS;g={...g,...nextAutomaticStage(g,13,0,now,30)};
 }
 assert.equal(g.stage,'question');assert.equal(g.idx,idx);
 assert.equal(nextAutomaticStage(g,13,12,now+100,30),null);
 // Alternate all-answered and expired-time paths across all six rounds.
 now+=idx%2?15000:100;
 g={...g,...nextAutomaticStage(g,13,idx%2?12:13,now,30)};
 assert.equal(g.stage,'reveal');
 assert.equal(nextAutomaticStage(g,13,13,now+REVEAL_MS-1,30),null);
 now+=REVEAL_MS;g={...g,...nextAutomaticStage(g,13,13,now,30)};
}
assert.equal(g.stage,'finished');assert.equal(g.idx,29);
assert.equal(nextAutomaticStage(g,13,13,now+100000,30),null);
console.log('PASS: alle 30 vragen, zes rondes, wachttijden, antwoordtijd en automatische eindstand.');
