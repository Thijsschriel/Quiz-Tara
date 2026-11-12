const pending=new Map<string,Promise<void>>();
let manifest:Promise<string[]>|null=null;
export function preloadPhoto(src:string):Promise<void>{
 if(pending.has(src))return pending.get(src)!;
 const task=new Promise<void>((resolve,reject)=>{
  const img=new Image();
  img.decoding='async';
  img.onload=()=>{if(img.naturalWidth>0)resolve();else reject(new Error('Foto kon niet worden geladen.'));};
  img.onerror=()=>reject(new Error('Een foto kon niet laden. Controleer je verbinding en probeer opnieuw.'));
  img.src=src;
 });
 pending.set(src,task);
 task.catch(()=>pending.delete(src));
 return task;
}
function images(){
 if(!manifest)manifest=fetch('/api/media').then(async r=>{if(!r.ok)throw new Error('Foto’s ophalen lukt niet.');const d=await r.json() as {images:string[]};return d.images;}).catch(e=>{manifest=null;throw e;});
 return manifest;
}
export async function warmRound(idx:number){
 const list=await images();const start=Math.floor(idx/5)*5;
 await Promise.all(list.slice(start,start+5).map(preloadPhoto));
}
export async function warmAll(){await Promise.all((await images()).map(preloadPhoto));}
