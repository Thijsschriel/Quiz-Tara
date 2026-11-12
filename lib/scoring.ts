export function scoreAnswer(q:{numeric?:boolean;correct:number}, value:string, elapsed:number, duration:number, numericValues:number[]=[]){
 if(q.numeric){
  const distances=[...new Set(numericValues.map(v=>Math.abs(v-q.correct)))].sort((a,b)=>a-b);
  const rank=distances.indexOf(Math.abs(Number(value)-q.correct));
  return rank<0?0:Math.max(100,1000-rank*200);
 }
 return Number(value)===q.correct ? Math.round(500+500*(1-Math.min(1,elapsed/(duration*1000)))):0;
}
