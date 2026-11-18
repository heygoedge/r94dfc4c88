/* Source edge-change indices only; event state is a function of playhead time. */
(function(global){
'use strict';
const cache=new WeakMap();
function list(record){
 if(cache.has(record))return cache.get(record);
 const events=[];
 record.turns.forEach((turn,index)=>{
  const i=turn.edgeChangeIndex;if(turn.valid!==true||!Number.isInteger(i)||i<0||i>=turn.points.length)return;
  const p=turn.points[i];if(![p.x,p.y,p.t].every(Number.isFinite))return;
  events.push({id:record.id+':edge:'+index,turn:index,turnId:turn.id,edge:turn.edge==='toe'?'前刃':turn.edge==='heel'?'后刃':'未知',x:p.x,y:p.y,t:p.t});
 });
 events.sort((a,b)=>a.t-b.t||a.turn-b.turn);cache.set(record,events);return events;
}
function at(record,time,active=true){
 const all=list(record),arrived=all.filter(event=>event.t<=time),latest=active?(arrived.at(-1)||null):null;
 return {all,arrived,visible:active?arrived:all,latest,recent:!!latest&&time-latest.t<1.5};
}
function markup(){return '<div class="hm-edge-cue" role="status" aria-live="polite" aria-atomic="true"><span class="hm-edge-cue-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 4 8 8-8 8-8-8Z"/></svg></span><div><strong data-edge-title>换刃点</strong><span data-edge-description>等待播放</span></div><small data-edge-count></small></div>';}
function paint(root,record,time,active){
 const state=at(record,time,active),event=state.latest;
 root.querySelectorAll('.hm-edge-cue').forEach(panel=>{
  const token=record.id+':'+active+':'+(event?.id||'none')+':'+state.recent;
  if(panel.dataset.edgeToken===token)return;panel.dataset.edgeToken=token;
  panel.dataset.edgeId=event?.id||'';panel.dataset.reachedCount=String(state.arrived.length);
  panel.classList.toggle('is-current',state.recent);
  const title=!state.all.length?'未记录换刃点':!active?'换刃点全览':!event?'换刃点 · 尚未到达':state.recent?'到达换刃点':'已过换刃点';
  const description=event?'T'+String(event.turnId).padStart(2,'0')+' · '+event.edge+' · '+event.t.toFixed(2)+' s':state.all.length?'轨迹上的菱形标记换刃位置':'当前片段缺少有效换刃索引';
  panel.querySelector('[data-edge-title]').textContent=title;
  panel.querySelector('[data-edge-description]').textContent=description;
  panel.querySelector('[data-edge-count]').textContent=state.all.length?(active?state.arrived.length:state.all.length)+' / '+state.all.length:'';
 });
}
global.HG_EDGE_CHANGES={list,at,markup,paint};
})(window);
