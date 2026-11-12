import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
const {default:handler}=await import(process.env.QUIZ_TEST_BUILT==='1'?'../.vercel/output/functions/quiz-proxy.func/index.mjs':'../api/quiz-proxy.mjs');

async function call(path,method='GET',body,token){
 const req=Readable.from(body?[JSON.stringify(body)]:[]);
 req.url='/api/quiz-proxy?quiz_path='+encodeURIComponent(path.split('?')[0])+(path.includes('?')?'&'+path.split('?')[1]:'');
 req.method=method;req.headers={'content-type':'application/json','x-forwarded-host':'incorrect.example','x-vercel-deployment-url':'incorrect.example',...(token?{'x-game-token':token}:{})};
 const headers={};let bytes;
 const res={statusCode:200,setHeader:(k,v)=>{headers[k.toLowerCase()]=v;},end:b=>{bytes=b;}};
 await handler(req,res);return {status:res.statusCode,headers,bytes,json:()=>JSON.parse(String(bytes))};
}
const page=await call('/');assert.equal(page.status,200);assert.match(String(page.bytes),/Bonte avond/);assert.equal(page.headers['x-quiz-proxy'],'bonte-avond');
const media=await call('/api/media');assert.equal(media.status,200);assert.equal(media.json().images.length,30);
const photo=await call(media.json().images[0]);assert.equal(photo.status,200);assert.match(photo.headers['content-type'],/image/);assert(photo.bytes.length>1000);
const created=await call('/api/game','POST',{action:'create',name:'Proxytest',duration:30});assert.equal(created.status,200);const host=created.json();
const state=await call('/api/game?code='+host.code,'GET',undefined,host.token);assert.equal(state.status,200);assert.equal(state.json().host,true);assert.equal(state.json().me,null);
const join=await call('/api/game','POST',{action:'join',code:host.code,name:'Proxyspeler'});assert.equal(join.status,200);const player=join.json();
let stage='lobby';for(const next of ['round','question','reveal']){
 if(stage==='question'){
  const answer=await call('/api/game','POST',{action:'answer',code:host.code,idx:0,value:'1'},player.token);assert.equal(answer.status,200);
 }
 const advanced=await call('/api/game','POST',{action:'advance',code:host.code,idx:0,stage},host.token);assert.equal(advanced.status,200);assert.equal(advanced.json().stage,next);stage=next;
}
const result=await call('/api/game?code='+host.code,'GET',undefined,player.token);assert.equal(result.status,200);assert(result.json().me.score>=500);
assert.equal(result.headers['cache-control'],'private, no-store');
console.log('PASS: homepage, 30 fotoverwijzingen, foto, queryparameters, hosttoken, lobby, antwoord, score en hostbediening via Vercel-proxy.');
