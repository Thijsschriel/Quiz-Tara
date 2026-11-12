import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
const load=async code=>import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(code)).toString('base64'));
const media=JSON.parse(readFileSync('lib/media.json','utf8'));
const qsrc=readFileSync('lib/questions.ts','utf8').replace("import media from './media.json';",'const media='+JSON.stringify(media)+';');
const {questions,rounds}=await load(qsrc);
const {scoreAnswer}=await load(readFileSync('lib/scoring.ts','utf8'));
assert.equal(questions.length,30);assert.equal(rounds.length,6);
for(const q of questions){assert.ok(q.image.startsWith('/quiz/'));assert.ok(existsSync('public'+q.image));assert.ok(statSync('public'+q.image).size>1000);assert.ok(!q.image.startsWith('http'));}
assert.equal(questions[12].text,'');assert.equal(questions[25].options[1],'Mamma Mia!');
assert.equal(scoreAnswer(questions[0],'1',0,30),1000);
assert.equal(scoreAnswer(questions[0],'1',30000,30),500);
assert.equal(scoreAnswer(questions[0],'0',0,30),0);
assert.ok(questions.every(q=>!q.numeric));
assert.equal(questions[26].options[questions[26].correct],'9 strepen');
assert.equal(questions[29].options[questions[29].correct],'2.456 meter');
const sql=new DatabaseSync(':memory:');
sql.exec('CREATE TABLE games(code TEXT PRIMARY KEY,host TEXT,stage TEXT,idx INTEGER,started INTEGER,duration INTEGER,created INTEGER); CREATE TABLE players(id TEXT PRIMARY KEY,code TEXT,name TEXT,created INTEGER); CREATE TABLE answers(player TEXT,code TEXT,idx INTEGER,value TEXT,elapsed INTEGER,PRIMARY KEY(player,code,idx));');
const db={prepare(query){let args=[];return{bind(...v){args=v;return this;},async first(){return sql.prepare(query).get(...args)||null;},async all(){return{results:sql.prepare(query).all(...args)};},async run(){return{meta:sql.prepare(query).run(...args)};}};}};
globalThis.__test={env:{DB:db},questions,rounds,scoreAnswer};
const code=readFileSync('app/api/game/route.ts','utf8').replace(/import .*?;\r?\n/g,'');
const api=await load('const {env,questions,rounds,scoreAnswer}=globalThis.__test;\n'+code);
async function post(body,token=''){const r=await api.POST(new Request('http://localhost/api/game',{method:'POST',headers:{'Content-Type':'application/json','x-game-token':token},body:JSON.stringify(body)}));return{status:r.status,data:await r.json()};}
async function state(code,token){const r=await api.GET(new Request('http://localhost/api/game?code='+code,{headers:{'x-game-token':token}}));return {status:r.status,data:await r.json()};}
const created=await post({action:'create',duration:30});assert.equal(created.status,200);
const {code:room,token:host}=created.data;assert.match(room,/^\d{6}$/);
const p1=(await post({action:'join',code:room,name:'Speler 1'})).data;
const p2=(await post({action:'join',code:room,name:'Speler 2'})).data;
assert.equal((await post({action:'join',code:room,name:'speler 1'})).status,400);
assert.equal((await state(room,'fake')).status,401);
assert.equal((await post({action:'advance',code:room},p1.token)).status,403);
let g=(await state(room,host)).data;
async function advance(){const r=await post({action:'advance',code:room,idx:g.idx,stage:g.stage},host);assert.equal(r.status,200);g=r.data;return g;}
await advance();assert.equal(g.stage,'round');
for(let idx=0;idx<30;idx++){
 if(g.stage==='round')await advance();
 assert.equal(g.stage,'question');assert.equal(g.idx,idx);assert.equal(g.question.correct,undefined);assert.equal(g.question.explanation,undefined);
 const q=questions[idx];const val=q.numeric?q.correct:q.correct;
 const a=await post({action:'answer',code:room,idx,value:val},p1.token);assert.equal(a.status,200);assert.equal(a.data.own.value,String(val));
 await post({action:'answer',code:room,idx,value:q.numeric?q.correct+2:(q.correct+1)%q.options.length},p2.token);
 const dup=await post({action:'answer',code:room,idx,value:q.numeric?0:(q.correct+1)%q.options.length},p1.token);assert.equal(dup.status,200);assert.equal(dup.data.own.value,String(val));
 assert.equal((await state(room,host)).data.answered,2);
 await advance();assert.equal(g.stage,'reveal');assert.equal(g.question.correct,q.correct);
 assert.ok((await state(room,p1.token)).data.own.points>=500);
 assert.equal((await post({action:'answer',code:room,idx,value:val},p1.token)).status,400);
 await advance();
}
assert.equal(g.stage,'finished');assert.equal(g.players[0].name,'Speler 1');assert.ok(g.players[0].score>g.players[1].score);
// Reject expired responses on the server, even if a client ignores its timer.
const second=(await post({action:'create',duration:15})).data;
const late=(await post({action:'join',code:second.code,name:'Te laat'})).data;
sql.prepare("UPDATE games SET stage='question',started=? WHERE code=?").run(Date.now()-16000,second.code);
assert.equal((await post({action:'answer',code:second.code,idx:0,value:1},late.token)).status,400);
console.log('PASS: 30-question multiplayer game, 6 rounds, scoring, multiple-choice finale, duplicate answers, access controls, hidden answers and server timer.');
