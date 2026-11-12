import { env } from 'cloudflare:workers';
import { questions, rounds } from '../../../lib/questions';
import { scoreAnswer } from '../../../lib/scoring';
export const dynamic='force-dynamic';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
const token=()=>crypto.randomUUID();
const fail=(message:string,status=400)=>json({error:message},status);
function db(){if(!env.DB)throw new Error('De spelopslag is nog niet beschikbaar.');return env.DB;}
async function game(code:string){return db().prepare('SELECT * FROM games WHERE code=? AND created>?').bind(code,Date.now()-86400000).first<any>();}
async function state(code:string,auth:string){
 const g=await game(code);if(!g)return fail('Deze spelcode bestaat niet of is verlopen.',404);
 const host=g.host===auth;
 const me=await db().prepare('SELECT * FROM players WHERE id=? AND code=?').bind(auth,code).first<any>();
 if(!host&&!me)return fail('Vul je naam in om mee te doen.',401);
 const ps=(await db().prepare('SELECT id,name,created FROM players WHERE code=? ORDER BY created').bind(code).all<any>()).results;
 const aa=(await db().prepare('SELECT player,idx,value,elapsed FROM answers WHERE code=?').bind(code).all<any>()).results;
 const scores=new Map<string,number>(ps.map((p:any)=>[p.id,0]));
 for(const a of aa){
  if(a.idx>g.idx||(a.idx===g.idx&&g.stage==='question'))continue;
  const q=questions[a.idx]; if(!q)continue;
  const vals=aa.filter((x:any)=>x.idx===a.idx).map((x:any)=>Number(x.value));
  scores.set(a.player,(scores.get(a.player)||0)+scoreAnswer(q,a.value,a.elapsed,g.duration,vals));
 }
 const current=questions[g.idx];
 const revealed=g.stage==='reveal'||g.stage==='finished';
 const own=aa.find((a:any)=>a.idx===g.idx&&a.player===auth);
 const currentAnswers=aa.filter((a:any)=>a.idx===g.idx);
 const rank=ps.map((p:any)=>({id:p.id,name:p.name,score:scores.get(p.id)||0})).sort((a:any,b:any)=>b.score-a.score||a.name.localeCompare(b.name));
 let q=null;
 if(current&&(g.stage==='question'||revealed)){
  const {correct,explanation,credit,...publicQ}=current;
  q={...publicQ,...(revealed?{correct,explanation,credit}:{} )};
 }
 return json({code:g.code,stage:g.stage,idx:g.idx,total:questions.length,duration:g.duration,started:g.started,serverNow:Date.now(),host,me:me?{id:me.id,name:me.name,score:scores.get(me.id)||0}:null,players:rank,answered:currentAnswers.length,own:own?{value:own.value,...(revealed?{points:scoreAnswer(current,own.value,own.elapsed,g.duration,currentAnswers.map((a:any)=>Number(a.value)))}:{})}:null,question:q,round:rounds[Math.floor(Math.max(0,g.idx)/5)],roundNumber:Math.floor(Math.max(0,g.idx)/5)+1,distribution:revealed&&current?.options?current.options.map((_,i)=>currentAnswers.filter((a:any)=>Number(a.value)===i).length):null});
}
export async function GET(req:Request){try{const u=new URL(req.url);return await state(u.searchParams.get('code')||'',req.headers.get('x-game-token')||'');}catch{return fail('Verbinding met het spel mislukt. Probeer opnieuw.',503);}}
export async function POST(req:Request){
 try{
 const b=await req.json() as any;const auth=req.headers.get('x-game-token')||'';
 if(b.action==='create'){
  const name=String(b.name||'').trim().replace(/\s+/g,' ').slice(0,24);if(!name)return fail('Vul je naam als quizmaster in.');
  const host=token(); const duration=[15,20,30,45,60].includes(b.duration)?b.duration:30;
  for(let i=0;i<5;i++){
   const code=String(100000+crypto.getRandomValues(new Uint32Array(1))[0]%900000);
   const r=await db().prepare("INSERT OR IGNORE INTO games (code,host,stage,idx,started,duration,created) VALUES (?,?,'lobby',0,0,?,?)").bind(code,host,duration,Date.now()).run();
   if(r.meta.changes){
    try{await db().prepare('INSERT INTO players (id,code,name,created) VALUES (?,?,?,?)').bind(host,code,name,Date.now()).run();}
    catch(error){await db().prepare('DELETE FROM games WHERE code=? AND host=?').bind(code,host).run();throw error;}
    return json({code,token:host,host:true});
   }
  }return fail('Maak nogmaals een spel aan.',503);
 }
 const code=String(b.code||'');const g=await game(code);if(!g)return fail('Deze spelcode bestaat niet of is verlopen.',404);
 if(b.action==='join'){
  const name=String(b.name||'').trim().replace(/\s+/g,' ').slice(0,24);if(!name)return fail('Vul je naam in.');
  if(g.stage!=='lobby')return fail('Dit spel is al begonnen. Wacht op een nieuw spel.');
  const dup=await db().prepare('SELECT id FROM players WHERE code=? AND lower(name)=lower(?)').bind(code,name).first();
  if(dup)return fail('Deze naam is al in gebruik. Kies een andere naam.');
  const id=token();
  const r=await db().prepare("INSERT INTO players (id,code,name,created) SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM games WHERE code=? AND stage='lobby') AND (SELECT COUNT(*) FROM players WHERE code=?)<100").bind(id,code,name,Date.now(),code,code).run();
  if(!r.meta.changes)return fail('De lobby is gesloten of vol.');
  return json({code,token:id,host:false});
 }
 if(b.action==='answer'){
  const p=await db().prepare('SELECT id FROM players WHERE code=? AND id=?').bind(code,auth).first();if(!p)return fail('Je bent niet aangemeld.',401);
  const q=questions[g.idx]; const now=Date.now();
  if(g.stage!=='question'||Number(b.idx)!==g.idx||now>g.started+g.duration*1000)return fail('De tijd voor deze vraag is voorbij.');
  const val=String(b.value);const n=Number(val);
  if(!val.trim()||!Number.isFinite(n)||!Number.isInteger(n)||n<0||(q.numeric?n>1000000:n>=(q.options?.length||0)))return fail('Kies een geldig antwoord.');
  const r=await db().prepare("INSERT OR IGNORE INTO answers (player,code,idx,value,elapsed) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM games WHERE code=? AND idx=? AND stage='question' AND started+duration*1000>=?)").bind(auth,code,g.idx,val,Math.max(0,now-g.started),code,g.idx,now).run();
  if(!r.meta.changes){const prior=await db().prepare('SELECT player FROM answers WHERE player=? AND code=? AND idx=?').bind(auth,code,g.idx).first();if(!prior)return fail('De vraag is net gesloten.');}
  return state(code,auth);
 }
 if(g.host!==auth)return fail('Alleen de quizmaster kan dit doen.',403);
 if(b.action==='advance'){
  if(b.idx!==g.idx||b.stage!==g.stage)return fail('Het spel is al verder.');
  if(g.stage==='question'&&Date.now()<g.started+g.duration*1000){
   const counts=await db().prepare('SELECT (SELECT COUNT(*) FROM players WHERE code=?) AS players, (SELECT COUNT(*) FROM answers WHERE code=? AND idx=?) AS answered').bind(code,code,g.idx).first<any>();
   if(counts.answered<counts.players)return fail('Wacht tot iedereen heeft geantwoord of de tijd voorbij is.');
  }
  let stage=g.stage,idx=g.idx;
  if(stage==='lobby'){stage='round';idx=0;}
  else if(stage==='round')stage='question';
  else if(stage==='question')stage='reveal';
  else if(stage==='reveal'){if(idx===questions.length-1)stage='finished';else{idx++;stage=idx%5===0?'round':'question';}}
  else return fail('Dit spel is afgelopen. Maak een nieuw spel.');
  await db().prepare('UPDATE games SET stage=?,idx=?,started=? WHERE code=? AND stage=? AND idx=? AND host=?').bind(stage,idx,stage==='question'?Date.now():g.started,code,g.stage,g.idx,auth).run();
  return state(code,auth);
 }
 return fail('Onbekende actie.');
 }catch{return fail('Dit lukte niet. Controleer je verbinding en probeer opnieuw.',503);}
}
