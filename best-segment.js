/* Consume the algorithm v2 contract. Never substitute turn_shape scores for HeyGo IQ. */
(function(global){
'use strict';
const finite=Number.isFinite;
function candidates(run){return (run?.segments||[]).map((segment,order)=>({...segment,order})).filter(s=>finite(s.iq));}
function adapt(run,segment){
 const tr=segment.track;if(!tr||tr.version!==2||!Array.isArray(tr.points)||tr.points.length<2||!Array.isArray(tr.turns))return null;
 if(!['r','v','t'].every(k=>Array.isArray(tr[k])&&tr[k].length===tr.points.length))return null;
 if(!tr.points.every(p=>p.length===2&&p.every(finite)))return null;
 // Remove only leading/trailing samples below 5 km/h; never delete interior low-speed samples.
 let lo=0,hi=tr.points.length-1;while(lo<=hi&&finite(tr.v[lo])&&tr.v[lo]<5)lo++;while(hi>=lo&&finite(tr.v[hi])&&tr.v[hi]<5)hi--;
 if(hi<=lo)return null;
 const turns=tr.turns.filter(t=>Number.isInteger(t.s)&&Number.isInteger(t.e)&&t.e>t.s&&t.s>=0&&t.e<tr.points.length&&t.e>=lo&&t.s<=hi).map(t=>{
  const s=Math.max(lo,t.s),e=Math.min(hi,t.e),points=tr.points.slice(s,e+1).map((p,j)=>({x:p[0],y:-p[1],speed:tr.v[s+j],edgeAngle:tr.r[s+j],t:tr.t[s+j]}));
  const located=i=>Number.isInteger(i)&&i>=s&&i<=e?i-s:null;
  return {id:t.i,sourceTurn:t.turn_id,sourceStance:global.HG_TRACK_ANNOTATIONS?.[run.id+'::'+segment.id]?.turns?.[t.turn_id]?.stance??null,sourceDirection:t.dir,edgePeakIndex:located(t.peak),segmentId:segment.id,valid:t.valid===true,edge:t.edge,iqWindow:t.iq===true,points,maxEdgeDeg:finite(t.max_edge_deg)?t.max_edge_deg:null,maxSpeedKmh:finite(t.max_speed_kmh)?t.max_speed_kmh:null,radius:finite(t.radius_m)?Math.min(30,t.radius_m):null,gForce:finite(t.g_force)?t.g_force:null,edgeChangeIndex:located(t.change),peakIndex:t.peak>t.change?located(t.peak):null,earlyEdging:t.early_edging};
 }).filter(t=>t.points.length>=2);
 if(!turns.length)return null;
 return {id:run.id+'::'+segment.id,sourceRunId:run.id,personLabel:run.personLabel,run:run.run,segmentId:segment.id,segmentIq:segment.iq,bestIds:tr.best||[],turns,sourceVersion:2,trim:{start:lo,end:hi},sources:[]};
}
function select(run){const best=candidates(run).sort((a,b)=>b.iq-a.iq||a.order-b.order)[0];return best?adapt(run,best):null;}
function bestSix(record){const indices=record.turns.map((t,i)=>t.iqWindow?i:-1).filter(i=>i>=0);if(indices.length!==6||!indices.every((v,i)=>i===0||v===indices[i-1]+1))return null;return{start:indices[0],end:indices[5],turns:indices.map(i=>record.turns[i]),score:null};}
function summary(record){const values=f=>record.turns.filter(t=>t.valid&&finite(t[f])&&t[f]>=0).map(t=>t[f]);const edge=values('maxEdgeDeg'),speed=values('maxSpeedKmh');return{maxSpeed:speed.length?Math.max(...speed):null,maxEdge:edge.length?Math.max(...edge):null,bestSix:bestSix(record),bestScore:null,turnCount:record.turns.length};}
global.HG_BEST_SEGMENT={select,candidates,summary,bestSix,adapt};
})(window);
