import fs from 'node:fs';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {stripTypeScriptTypes} from 'node:module';
const media=JSON.parse(fs.readFileSync('lib/media.json','utf8'));
const tiles=[];
for(let i=0;i<30;i++){
 const file='public'+media[i].image;
 const meta=await sharp(file).metadata();
 assert.equal(meta.format,'webp');assert.ok(meta.width>200&&meta.height>100);
 const img=await sharp(file).resize(240,145,{fit:'contain',background:'#e9eef5'}).png().toBuffer();
 tiles.push({input:img,left:(i%5)*250+5,top:Math.floor(i/5)*180+25});
 tiles.push({input:Buffer.from(`<svg width="240" height="22"><text x="6" y="17" font-size="17" fill="#132d58">Vraag ${i+1}</text></svg>`),left:(i%5)*250+5,top:Math.floor(i/5)*180+2});
}
await sharp({create:{width:1250,height:1080,channels:3,background:'#fff'}}).composite(tiles).png().toFile('outputs/photo-check.png');
// Verify that round preloading waits for image completion and retries failures.
const created=[];
globalThis.Image=class{naturalWidth=800;set src(v){this.url=v;created.push(this);}};
globalThis.fetch=async()=>({ok:true,json:async()=>({images:Array.from({length:30},(_,i)=>'/test/'+i+'.webp')})});
const src=stripTypeScriptTypes(fs.readFileSync('lib/preload.ts','utf8'));
const {preloadPhoto,warmRound}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
let done=false;
const round=warmRound(10).then(()=>done=true);
await new Promise(r=>setImmediate(r));
assert.equal(created.length,5);assert.equal(done,false);
assert.deepEqual(created.map(x=>x.url),[10,11,12,13,14].map(i=>'/test/'+i+'.webp'));
created.forEach(img=>img.onload());await round;assert.equal(done,true);
const first=preloadPhoto('/retry.webp');created.at(-1).onerror();await assert.rejects(first);
const retry=preloadPhoto('/retry.webp');created.at(-1).onload();await retry;
console.log('PASS: all 30 images decode; round preloading waits for 5 photos; failed images can retry.');
