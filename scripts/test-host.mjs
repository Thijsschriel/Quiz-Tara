import assert from 'node:assert/strict';
const origin=process.env.QUIZ_TEST_ORIGIN||'http://127.0.0.1:5174';
async function post(body,session,expected=200){
 const r=await fetch(origin+'/api/game',{method:'POST',headers:{'Content-Type':'application/json','x-game-token':session?.token||''},body:JSON.stringify({...body,...(session?{code:session.code}:{})})});
 const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;
}
async function state(s){const r=await fetch(origin+'/api/game?code='+s.code,{headers:{'x-game-token':s.token}});assert.equal(r.status,200);return r.json();}
const host=await post({action:'create',name:'Testhost',duration:15});
let g=await state(host);assert.equal(g.me,null);assert.equal(g.players.length,0);
await post({action:'advance',idx:0,stage:'lobby'},host,400);
const players=await Promise.all(Array.from({length:12},(_,i)=>post({action:'join',code:host.code,name:'Testspeler '+(i+1)})));
const extra=await post({action:'join',code:host.code,name:'Te verwijderen'});
await post({action:'remove',player:extra.token},players[0],403);
g=await post({action:'remove',player:extra.token},host);assert.equal(g.players.length,12);
const removed=await fetch(origin+'/api/game?code='+host.code,{headers:{'x-game-token':extra.token}});assert.equal(removed.status,401);
g=await post({action:'duration',duration:20},host);assert.equal(g.duration,20);
g=await post({action:'duration',duration:15},host);
await post({action:'advance',idx:g.idx,stage:g.stage},players[0],403);
const advance=async()=>{g=await post({action:'advance',idx:g.idx,stage:g.stage},host);};
await advance();assert.equal(g.stage,'round');
await new Promise(resolve=>setTimeout(resolve,5200));g=await state(host);assert.equal(g.stage,'round');assert.equal(g.autoAdvanceAt,null);
await advance();assert.equal(g.stage,'question');
for(let idx=0;idx<30;idx++){
 assert.equal(g.idx,idx);assert.equal(g.stage,'question');assert.equal(g.me,null);
 const playerView=await state(players[0]);assert.equal(playerView.question.correct,undefined);assert.equal(playerView.question.explanation,undefined);
 await post({action:'answer',idx,value:'0'},host,403);
 const correct=String(g.question.correct);
 await Promise.all(players.map(p=>post({action:'answer',idx,value:correct},p)));
 g=await state(host);assert.equal(g.stage,'question');assert.equal(g.answered,12);assert.equal(g.answeredPlayers.length,12);
 assert(g.players.every(p=>p.id!==host.token));
 await advance();assert.equal(g.stage,'reveal');assert(g.players.every(p=>p.score>=500*(idx+1)));
 const view=await state(players[0]);assert.deepEqual(view.players,g.players);assert.equal(view.answeredPlayers,undefined);
 if(idx===0){await new Promise(resolve=>setTimeout(resolve,8200));g=await state(host);assert.equal(g.stage,'reveal');}
 await advance();if(g.stage==='round')await advance();
}
assert.equal(g.stage,'finished');assert.equal(g.players.length,12);
const second=await post({action:'create',name:'Testhost',duration:15});
const secondPlayer=await post({action:'join',code:second.code,name:'Speler'});
await post({action:'finish'},secondPlayer,403);
const ended=await post({action:'finish'},second);assert.equal(ended.stage,'finished');
console.log('PASS: aparte quizmaster, 12 spelers, host kan niet antwoorden, verborgen antwoorden, spelersbeheer, antwoordtijd, handmatige bediening van 30 vragen, topstand blijft staan en quiz beëindigen.');
