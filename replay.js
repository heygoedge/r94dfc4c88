/* replay/1 consumer. The algorithm owns reconstruction; this file only
 * converts axes/units and interpolates supplied samples on their own clock.
 * Coordinate: schema (X,Y,Z up) -> demo (x=X,y=-Y,z=Z). */
(function(global){
'use strict';
const finite=Number.isFinite,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),cache=new WeakMap(),markerCache=new WeakMap();
const lerp=(a,b,u)=>finite(a)&&finite(b)?a+(b-a)*u:null;
function validate(doc){
 const f=doc?.frames,n=f?.t?.length;if(doc?.meta?.schema!=='replay/1'||n<2)throw new Error('Unsupported replay document');
 for(const k of ['X','Y','t','v','r'])if(f[k]?.length!==n||!f[k].every(finite))throw new Error('Invalid replay frames: '+k);
 if(f.t.some((t,i)=>i&&t<=f.t[i-1]))throw new Error('Replay time must increase');
 for(const k of ['yo','sw','rm','Z','G','phase'])if(f[k]&&f[k].length!==n)throw new Error('Invalid replay frames: '+k);
 if(f.air)for(const a of Object.values(f.air))if(a.length!==n||!a.every(finite))throw new Error('Invalid replay air');
 for(const tr of doc.turns||[])if(!Number.isInteger(tr.s)||!Number.isInteger(tr.e)||tr.s<0||tr.e<=tr.s||tr.e>=n)throw new Error('Invalid replay turn');
 return doc;
}
function adapt(run,doc){
 validate(doc);const f=doc.frames,meta=doc.meta;
 const points=(s,e)=>f.t.slice(s,e+1).map((t,j)=>({x:f.X[s+j],y:-f.Y[s+j],z:f.Z?.[s+j]||0,t,speed:f.v[s+j]*3.6,edgeAngle:f.r[s+j]}));
 const turns=(doc.turns||[]).map((tr,k)=>{
  const m=doc.turn_metrics?.[k]||{},located=i=>Number.isInteger(i)&&i>=tr.s&&i<=tr.e?i-tr.s:null;
  return {id:tr.i,sourceTurn:tr.i,segmentId:meta.seg_title,valid:m.ok===true,edge:tr.edge||m.et,points:points(tr.s,tr.e),maxEdgeDeg:m.E??null,meanEdgeDeg:m.Ea??null,maxSpeedKmh:m.V??null,meanSpeedKmh:m.Va??null,radius:m.r??null,gForce:m.G??null,transitionSeconds:m.tt??null,edgeChangeIndex:located(m.w),peakIndex:located(m.p),adv:m.adv||{},iqWindow:false,sourceStart:tr.s,sourceEnd:tr.e};
 });
 // A jump has one drawable path span, zero turns and zero turn scores.
 if(!turns.length)turns.push({id:0,segmentId:meta.seg_title,valid:false,edge:null,isPath:true,points:points(0,f.t.length-1),maxEdgeDeg:null,maxSpeedKmh:Math.max(...f.v)*3.6,radius:null,gForce:null,edgeChangeIndex:null,peakIndex:null,sourceStart:0,sourceEnd:f.t.length-1});
 return {id:run.id+'::'+meta.seg_title,sourceRunId:run.id,personLabel:run.personLabel,run:Number(meta.seg_title.match(/^R(\d+)/)?.[1])||run.run,segmentId:meta.seg_title,segmentIq:null,bestIds:[],turns,turnCount:doc.turns.length,kind:meta.kind,replay:doc,sourceVersion:3,sampleKind:'replay',duration:meta.duration_s,sources:[]};
}
function frames(record){
 if(cache.has(record))return cache.get(record);const doc=record.replay,f=doc.frames,n=f.t.length;
 const curvature=record.turns.map(tr=>{
  let a=0;for(let i=1;i<tr.points.length-1;i++){const p=tr.points[i-1],q=tr.points[i],r=tr.points[i+1],u=[q.x-p.x,q.y-p.y],v=[r.x-q.x,r.y-q.y];a+=Math.atan2(u[0]*v[1]-u[1]*v[0],u[0]*v[0]+u[1]*v[1]);}return Math.sign(a);
 });
 let tr=0;const out=f.t.map((t,i)=>{
  while(tr+1<record.turns.length&&i>=record.turns[tr+1].sourceStart)tr++;
  const a=Math.max(0,i-2),b=Math.min(n-1,i+3),dx=f.X[b]-f.X[a],dy=-(f.Y[b]-f.Y[a]),travel=Math.atan2(dy,dx)*180/Math.PI,offset=f.yo?.[i]??(f.sw?.[i]?180:0),edge=record.turns[tr].edge;
  return {t,x:f.X[i],y:-f.Y[i],z:f.Z?.[i]||0,ground:f.G?.[i]||0,speed:f.v[i]*3.6,roll:f.rm?(f.rm[i]??0):f.r[i]*(edge==='heel'?-1:1),bankAngle:f.r[i]*curvature[tr]*Math.sign(Math.cos(offset*Math.PI/180)),heading:travel-offset,travelHeading:travel,offset,turn:tr,turnId:record.turns[tr].id,phase:f.phase?.[i],switch:!!f.sw?.[i],pathPitch:Math.atan2((f.Z?.[b]||0)-(f.Z?.[a]||0),Math.hypot(dx,dy)||1e-6)*180/Math.PI};
 });cache.set(record,out);return out;
}
function curve(profile,key,time){const a=profile?.[key];if(!a?.length||!finite(profile.dt)||profile.dt<=0)return null;const x=clamp((time-profile.t_from)/profile.dt,0,a.length-1),i=Math.floor(x);return lerp(a[i],a[Math.min(i+1,a.length-1)],x-i);}
function sample(record,time){
 const fs=frames(record),doc=record.replay,F=doc.frames,t=clamp(time,fs[0].t,fs.at(-1).t);let lo=0,hi=fs.length-1;
 while(lo+1<hi){const m=(lo+hi)>>1;if(fs[m].t<=t)lo=m;else hi=m;}
 const a=fs[lo],b=fs[hi],u=(t-a.t)/(b.t-a.t),L=k=>lerp(a[k],b[k],u),A=k=>lerp(F.air?.[k]?.[lo],F.air?.[k]?.[hi],u)??0;
 const travel=a.travelHeading+(((b.travelHeading-a.travelHeading+540)%360)-180)*u,offset=L('offset'),current=t>=b.t?b:a,stance=doc.meta.stance_used||doc.meta.stance,footSign=stance==='goofy'?-1:1,w=A('w'),nose=Math.cos(offset*Math.PI/180);
 const hop=(doc.hops||[]).find(h=>h.kind!=='flight'&&t>=h.t_from&&t<=h.t_from+(h.h_l.length-1)*h.dt),hl=hop?curve(hop,'h_l',t)||0:0,hr=hop?curve(hop,'h_r',t)||0:0;
 const event=(doc.events||[]).find(e=>t>=e.t0&&t<=e.t1),unreliable=(doc.unreliable||[]).some(e=>t>=e.t0&&t<=e.t1);
 const tiltUnavailable=record.kind!=='jump'&&!F.rm&&doc.turn_metrics[current.turn]?.ok===false&&doc.turn_metrics[current.turn]?.E==null&&Math.abs(L('roll'))<1e-8&&!event;
 const flight=(doc.hops||[]).find(h=>h.kind==='flight'),phase=current.phase==='flight'&&flight&&t>=Math.max(...flight.land)?'landing':current.phase;
 return {t,x:L('x'),y:L('y'),z:L('z'),ground:L('ground'),speed:L('speed'),tiltUnavailable,roll:tiltUnavailable?null:L('roll'),bankAngle:L('bankAngle')+nose*A('roll'),heading:travel-offset-A('yaw'),travelHeading:travel,pitch:(1-w)*nose*L('pathPitch')+w*(nose*A('pitch_travel')+footSign*A('pitch_left'))+Math.atan2((hl-hr)*footSign,.54)*180/Math.PI,lift:(hl+hr)/2,footHeights:[hl,hr],hopKind:hop?.kind||'hop',phase,switch:current.switch,turn:current.turn,turnId:current.turnId,event,unreliable,edge:record.kind==='jump'?({approach:'助滑',ramp:'上台',flight:'腾空',landing:'落地'}[phase]||'跳台'):tiltUnavailable?'立刃回放缺失':Math.abs(L('roll'))<3?'平板':L('roll')>0?'前刃':'后刃'};
}
function landmarks(record){
 const d=record.replay;if(!d)return [];if(markerCache.has(record))return markerCache.get(record);const out=(d.events||[]).map((e,i)=>({id:'trick:'+i,t:e.t0,label:'平花 '+e.deg+'°',color:'#8b69bb'}));
 if(record.kind==='jump'){
  const flights=(d.hops||[]).filter(h=>h.kind==='flight');
  if(flights.length)for(const [i,h] of flights.entries())for(const [id,t,label] of [['flight',Math.min(...h.off),'起跳'],['landing',Math.max(...h.land),'落地']])out.push({id:i?id+':'+i:id,t,label,color:'#b77d3c'});
  else{const f=d.frames;for(let i=1;i<f.t.length;i++)if(f.phase[i]!==f.phase[i-1]&&['flight','landing'].includes(f.phase[i]))out.push({id:f.phase[i],t:f.t[i],label:f.phase[i]==='flight'?'起跳':'落地',color:'#b77d3c'});}
 }
 const result=out.map(e=>({...e,...sample(record,e.t),id:e.id,label:e.label,color:e.color}));markerCache.set(record,result);return result;
}
function navigation(record){const events=landmarks(record);return events.length?'<div class="hm-replay-nav" aria-label="动作时间点">'+events.map(e=>`<button data-replay-time="${e.t}"><i style="background:${e.color}"></i>${e.label}<small>${e.t.toFixed(1)} s</small></button>`).join('')+'</div>':'';}
function paint(root,record,f){
 if(!record.replay)return;
 const cue=f.event?`平花 ${f.event.deg}° · 检出转体 ${Math.abs(f.event.rotation_deg??f.event.deg).toFixed(0)}° · ${f.event.t0.toFixed(2)} s`:f.phase?`${f.edge} · ${f.t.toFixed(2)} s${f.phase==='flight'?' · 高于地面估计 '+Math.max(0,f.z-f.ground).toFixed(2)+' m':''}`:f.lift&&f.hopKind!=='lift'?`起跳高度估计 · 左 ${(f.footHeights[0]*100).toFixed(0)} / 右 ${(f.footHeights[1]*100).toFixed(0)} cm`:f.tiltUnavailable?'立刃回放缺失 · 当前弯被源算法判为无效':f.unreliable?'走向为估计 · 连续转体区间':'';
 root.querySelectorAll('[data-replay-cue]').forEach(el=>{el.hidden=!cue;el.textContent=cue;});
 root.querySelectorAll('.hm-edge-cue').forEach(el=>el.hidden=record.kind==='jump');
}
global.HG_REPLAY={validate,adapt,frames,sample,landmarks,navigation,paint};
})(window);
