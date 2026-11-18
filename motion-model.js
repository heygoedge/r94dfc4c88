/* Legacy/v2 motion fallback; replay/1 delegates to its authoritative adapter.
 * Time-aligned reconstruction from v2 IMU-derived roll and trajectory.
 * Legacy heading defaults to the path tangent; supplied IMU/model offsets are separate.
 * No pitch, airborne motion, or raw-acceleration position is invented. */
(function(global){
'use strict';
const cache=new WeakMap(),orientations=new WeakMap(),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
// Source X/Y are screen coordinates. Positive curvature turns to board-right.
// This is a display-side inference, not a measured stance or calibrated yaw.
function bankOrientation(record){
 if(orientations.has(record))return orientations.get(record);
 let score=0,weight=0,turnCount=0;
 record.turns.forEach(turn=>{
  if(turn.valid!==true||!['toe','heel'].includes(turn.edge))return;
  let angle=0;const ps=turn.points;
  for(let i=1;i<ps.length-1;i++){
   const a=ps[i-1],b=ps[i],c=ps[i+1],ux=b.x-a.x,uy=b.y-a.y,vx=c.x-b.x,vy=c.y-b.y;
   if(Math.hypot(ux,uy)<1e-5||Math.hypot(vx,vy)<1e-5)continue;
   angle+=Math.atan2(ux*vy-uy*vx,ux*vx+uy*vy);
  }
  if(Math.abs(angle)<.05)return;
  const w=Math.min(Math.abs(angle),Math.PI);score+=Math.sign(angle)*(turn.edge==='toe'?1:-1)*w;weight+=w;turnCount++;
 });
 const agreement=weight?(1+Math.abs(score)/weight)/2:0;
 const result={toeSide:weight&&agreement>=.6?(score>0?'right':'left'):null,agreement,turnCount};
 orientations.set(record,result);return result;
}
function frames(record){
 if(record.replay)return global.HG_REPLAY.frames(record);
 if(cache.has(record))return cache.get(record);
 const out=[],orientation=bankOrientation(record);
 record.turns.forEach((turn,index)=>turn.points.forEach(p=>{
  if(![p.t,p.x,p.y].every(Number.isFinite))return;
  const f={...p,turn:index,turnId:turn.id,roll:turn.valid!==false&&Number.isFinite(p.edgeAngle)&&['toe','heel'].includes(turn.edge)?p.edgeAngle*(turn.edge==='toe'?1:-1):null};
  f.bankAngle=f.roll===null||!orientation.toeSide?null:f.roll*(orientation.toeSide==='right'?1:-1);
  if(out.length&&p.t===out.at(-1).t)out[out.length-1]=f;
  else if(!out.length||p.t>out.at(-1).t)out.push(f);
 }));
 out.forEach((f,i)=>{const a=out[Math.max(0,i-1)],b=out[Math.min(out.length-1,i+1)];f.heading=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;});
 const result=global.HG_BOARD_HEADING?.frames(record,out)||out;cache.set(record,result);return result;
}
function sample(record,time){
 if(record.replay)return global.HG_REPLAY.sample(record,time);
 const fs=frames(record);if(fs.length<2)return null;
 const t=clamp(time,fs[0].t,fs.at(-1).t);let lo=0,hi=fs.length-1;
 while(lo+1<hi){const m=(lo+hi)>>1;if(fs[m].t<=t)lo=m;else hi=m;}
 const a=fs[lo],b=fs[hi],u=(t-a.t)/(b.t-a.t),lerp=k=>Number.isFinite(a[k])&&Number.isFinite(b[k])?a[k]+(b[k]-a[k])*u:null;
 const delta=((b.heading-a.heading+540)%360)-180;
 const travelHeading=Number.isFinite(a.travelHeading)&&Number.isFinite(b.travelHeading)?a.travelHeading+(((b.travelHeading-a.travelHeading+540)%360)-180)*u:null,offset=lerp('offset');
 const heading=travelHeading===null?a.heading+delta*u:travelHeading-offset;
 const current=t>=b.t?b:a,roll=lerp('roll');
 return {t,x:lerp('x'),y:lerp('y'),speed:lerp('speed'),roll,bankAngle:lerp('bankAngle'),heading,travelHeading,offset,switch:current.switch,headingSource:current.headingSource,turn:current.turn,turnId:current.turnId,edge:roll===null?'未知':Math.abs(roll)<3?'平板':roll>0?'前刃':'后刃'};
}
global.HG_MOTION_MODEL={frames,sample,bankOrientation};
})(window);
