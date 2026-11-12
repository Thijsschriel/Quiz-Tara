export const REVEAL_MS = 8000;
export const ROUND_MS = 5000;
type Game = {stage:string;idx:number;started:number;duration:number};
export function nextAutomaticStage(g:Game, players:number, answered:number, now:number, total:number){
 if(g.stage==='question'&&((players>0&&answered>=players)||now>=g.started+g.duration*1000))return {stage:'reveal',idx:g.idx,started:now};
 if(g.stage==='round'&&now>=g.started+ROUND_MS)return {stage:'question',idx:g.idx,started:now};
 if(g.stage==='reveal'&&now>=g.started+REVEAL_MS){
  if(g.idx===total-1)return {stage:'finished',idx:g.idx,started:now};
  const idx=g.idx+1;return {stage:idx%5===0?'round':'question',idx,started:now};
 }
 return null;
}
