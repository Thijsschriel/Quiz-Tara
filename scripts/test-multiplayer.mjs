import assert from 'node:assert/strict';
const origin=process.env.QUIZ_TEST_ORIGIN||'http://127.0.0.1:5174';
async function post(body,session,expected=200){
 const r=await fetch(origin+'/api/game',{method:'POST',headers:{'Content-Type':'application/json','x-game-token':session?.token||''},body:JSON.stringify({...body,...(session?{code:session.code}:{})})});
 const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;
}
async function state(s){const r=await fetch(origin+'/api/game?code='+s.code,{headers:{'x-game-token':s.token}});assert.equal(r.status,200);return r.json();}
const host=await post({action:'create',name:'Testhost',duration:60});
const players=await Promise.all(Array.from({length:12},(_,i)=>post({action:'join',code:host.code,name:'Testspeler '+(i+1)})));
let g=await state(host);assert.equal(g.players.length,13);assert.equal(g.me.name,'Testhost');assert.equal(g.host,true);
await post({action:'advance',idx:g.idx,stage:g.stage},players[0],403);
const advance=async()=>{g=await post({action:'advance',idx:g.idx,stage:g.stage},host);};
await advance();await advance();assert.equal(g.stage,'question');assert.equal(g.question.correct,undefined);
await post({action:'advance',idx:g.idx,stage:g.stage},host,400);
await post({action:'answer',idx:0,value:'1'},host);
await post({action:'answer',idx:0,value:'0'},host);
assert.equal((await state(host)).own.value,'1');
await Promise.all(players.map(p=>post({action:'answer',idx:0,value:'1'},p)));
g=await state(host);assert.equal(g.answered,13);assert(g.players.every(p=>p.score===0));
await advance();assert.equal(g.stage,'reveal');assert.equal(g.question.correct,1);assert(g.players.every(p=>p.score>=500));
assert.equal(g.own.points,g.me.score);
for(const p of players){const view=await state(p);assert.deepEqual(view.players,g.players);assert.equal(view.host,false);}
await advance();assert.equal(g.idx,1);assert.equal(g.stage,'question');assert.equal(g.own,null);
console.log('PASS: 13 deelnemers, host speelt mee, hostrechten, afgeschermde antwoorden, dubbele inzending, gedeelde scores en volgende vraag.');
