/* Edge uses the supplied roll profile; pressure interpolation is illustrative only. */
(function(global){
'use strict';
const mix=t=>'#'+[153,210,247].map((a,i)=>Math.round(a+([29,84,147][i]-a)*t).toString(16).padStart(2,'0')).join('');
function style(record,metric){
 const stats=global.HG_MEAN_TURNS(record,metric),pressure=new Map();
 const usable=t=>t?.valid===true&&Number.isFinite(t.gForce)&&t.gForce>=0;
 if(metric==='gForce')record.turns.forEach((turn,i)=>{
  if(!usable(turn))return;
  const previous=record.turns[i-1],next=record.turns[i+1],left=usable(previous)&&previous.segmentId===turn.segmentId?previous.gForce:null,right=usable(next)&&next.segmentId===turn.segmentId?next.gForce:null;
  const distances=[0];for(let j=1;j<turn.points.length;j++){const a=turn.points[j-1],b=turn.points[j];distances.push(distances[j-1]+Math.hypot(b.x-a.x,b.y-a.y));}
  const total=distances.at(-1)||0,samples=new Map();
  turn.points.forEach((point,j)=>{const phase=total?distances[j]/total:.5;let value=turn.gForce;
   if(phase<.5&&left!==null)value=left+(turn.gForce-left)*(phase+.5);
   if(phase>.5&&right!==null)value=turn.gForce+(right-turn.gForce)*(phase-.5);
   samples.set(point,value);
  });pressure.set(turn,samples);
 });
 const sample=(turn,point)=>!turn.valid?null:metric==='edge'?(Number.isFinite(point.edgeAngle)&&point.edgeAngle>=0?point.edgeAngle:null):(pressure.get(turn)?.get(point)??null);
 const values=metric==='edge'?record.turns.flatMap(t=>t.points.map(p=>sample(t,p))).filter(Number.isFinite):stats.turns.map(t=>t.value).filter(Number.isFinite);
 const min=values.length?Math.min(...values):null,max=values.length?Math.max(...values):null;
 const color=metric==='edge'?v=>!Number.isFinite(v)||max===null?'#c6cdd3':mix(max>min?Math.max(0,Math.min(1,(v-min)/(max-min))):.5):stats.color;
 return {...stats,sample,color,min,max,illustrative:metric==='gForce'};
}
global.HG_TRACK_STYLE=style;
})(window);
