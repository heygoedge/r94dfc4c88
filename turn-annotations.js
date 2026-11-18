/* Read native peak indices and exact-matched native detector hits; never infer issues from scores. */
(function(global){
'use strict';
function issues(r,index){return global.HG_TURN_ISSUES?.records?.[r.id]?.turns?.[index]||[];}
function read(r){if(r.kind==='jump')return [];const F=r.replay?.frames,ts=r.replay?.turns;if(!F||!ts)return [];return ts.map((t,i)=>{const m=r.replay.turn_metrics[i]||{},point=(key,value)=>m.ok===true&&Number.isInteger(m[key])&&m[key]>=t.s&&m[key]<=t.e&&Number.isFinite(value)?{index:m[key],time:F.t[m[key]],value}:null;return {turn:i,id:t.i,edge:point('p',m.E),g:point('Gp',m.G),issues:issues(r,i)};});}
function paint(root,r,index){const el=root.querySelector('[data-turn-issues]');if(!el)return;const found=issues(r,index),token=r.id+':'+index;if(el.dataset.turnToken===token)return;el.dataset.turnToken=token;el.hidden=!found.length;if(!found.length){el.textContent='';return;}el.replaceChildren();const title=document.createElement('small');title.textContent='当前弯';el.append(title);for(const issue of found){const text=document.createElement('span');text.textContent=issue.label;el.append(text);}}
global.HG_TURN_ANNOTATIONS={read,issues,paint};
})(window);
