const ORIGIN = 'https://tara-griekenland-kreta-quiz.thijs-schriel.chatgpt.site';
const FORWARD_HEADERS = ['accept','accept-language','content-type','x-game-token','rsc','next-router-state-tree','next-router-prefetch','next-url'];

// Fetch the public quiz using its own Host, without Vercel's forwarded routing
// headers. Game sessions continue to use x-game-token on the shared backend.
export default async function handler(req, res) {
 if(!['GET','HEAD','POST'].includes(req.method)){
  res.setHeader('Allow','GET, HEAD, POST');res.statusCode=405;res.end();return;
 }
 const incoming=new URL(req.url,'https://quiz.invalid');
 const target=new URL(ORIGIN);
 target.pathname=incoming.searchParams.get('quiz_path')||(['/api/quiz-proxy','/quiz-proxy'].includes(incoming.pathname)?'/':incoming.pathname);
 for(const [key,value] of incoming.searchParams)if(key!=='quiz_path')target.searchParams.append(key,value);
 const headers=new Headers();
 for(const key of FORWARD_HEADERS){const value=req.headers[key];if(value)headers.set(key,Array.isArray(value)?value.join(','):value);}
 let body;
 if(req.method==='POST'){
  if(req.body!==undefined)body=typeof req.body==='string'||Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body);
  else{const chunks=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));body=Buffer.concat(chunks);}
 }
 try{
  const upstream=await fetch(target,{method:req.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(20000)});
  res.statusCode=upstream.status;
  for(const [key,value] of upstream.headers){
   if(['content-encoding','content-length','transfer-encoding','connection','set-cookie'].includes(key))continue;
   res.setHeader(key,key==='location'&&value.startsWith(ORIGIN)?value.slice(ORIGIN.length)||'/':value);
  }
  if(target.pathname.startsWith('/api/')||upstream.headers.get('content-type')?.includes('text/html')){
   res.setHeader('Cache-Control','private, no-store');
   res.setHeader('Vercel-CDN-Cache-Control','no-store');
  }
  res.setHeader('X-Quiz-Proxy','bonte-avond');
  res.end(req.method==='HEAD'?undefined:Buffer.from(await upstream.arrayBuffer()));
 }catch{
  res.statusCode=502;res.setHeader('Content-Type','text/plain; charset=utf-8');
  res.setHeader('Cache-Control','no-store');res.end('De quiz is even niet bereikbaar. Vernieuw de pagina om opnieuw te proberen.');
 }
}
