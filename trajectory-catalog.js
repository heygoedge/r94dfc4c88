/* Active demo catalog consumes native replay/1 runner outputs only.
 * Legacy adapters remain available for archive verification, never as active samples. */
(function(global){
'use strict';
const cache=new WeakMap(),finite=Number.isFinite;
function legacy(run){
 if(!Array.isArray(run?.turns)||run.segments)return [];
 const ids=[...new Set(run.turns.map(t=>t.segmentId))];
 return ids.map(segmentId=>{
  const source=run.turns.filter(t=>t.segmentId===segmentId);
  if(!source.length||!source.every(t=>Array.isArray(t.points)&&t.points.length>=2&&t.points.every(p=>[p.x,p.y,p.time].every(finite))))return null;
  const annotation=global.HG_TRACK_ANNOTATIONS?.[run.id+'::'+segmentId];
  const origin=source[0].points[0],turns=source.map(t=>({...t,sourceStance:annotation?.turns?.[String(t.sourceTurn)]?.stance??null,sourceDirection:annotation?.turns?.[String(t.sourceTurn)]?.direction??null,edgePeakIndex:annotation?.turns?.[String(t.sourceTurn)]?.peakIndex??null,iqWindow:false,peakIndex:null,points:t.points.map(p=>({...p,x:p.x-origin.x,y:p.y-origin.y,t:p.time-origin.time}))}));
  const ps=turns.flatMap(t=>t.points);if(ps.at(-1).t<=0)return null;
  const result={id:run.id+'::'+segmentId,sourceRunId:run.id,personLabel:run.personLabel,run:run.run,segmentId,segmentIq:null,bestIds:[],turns,sourceVersion:1,sampleKind:'legacy',sources:(run.sources||[]).filter(s=>s.segment===segmentId),duration:ps.at(-1).t};
  return global.HG_BOARD_HEADING?.apply(result)||result;
 }).filter(Boolean);
}
function list(run){
 if(!run||typeof run!=='object')return [];
 if(!cache.has(run)){
  if(run.replayDocs){cache.set(run,run.replayDocs.map(doc=>global.HG_REPLAY.adapt(run,doc)));return cache.get(run);}
  const v2=global.HG_BEST_SEGMENT.select(run);
  cache.set(run,v2?[v2]:run.segments?[]:legacy(run));
 }
 return cache.get(run);
}
const allRuns=[...(global.HG_REPLAY_RUNS||[])],excludedIds=new Set((global.HG_REPLAY_SELECTION?.excluded||[]).map(x=>'replay-'+x.sessionId));
const runs=allRuns.filter(run=>!excludedIds.has(run.id));
global.HG_TRAJECTORY_CATALOG={list,runs,allRuns,excludedRuns:allRuns.filter(run=>excludedIds.has(run.id)),records:()=>runs.flatMap(list),defaultRecord:run=>list(run)[0]||null};
})(window);
