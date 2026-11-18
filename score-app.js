(function(){
'use strict';
const catalog=window.HG_TRAJECTORY_CATALOG,detail=window.HG_DETAIL,motion=window.HG_MOTION,key='heygo-score-demo-selection-v1';
function save(){const r=detail.getRecord();if(r)try{localStorage.setItem(key,r.id);}catch{}}
function selectRun(id){const r=catalog.runs.find(r=>r.id===id);if(!r)return;detail.setRecord(r.id);detail.open();save();}
window.HG_CHAT_DEMO={selectRun};
let initial=catalog.records()[0];try{initial=catalog.records().find(r=>r.id===localStorage.getItem(key))||initial;}catch{}
if(initial){detail.setRecord(initial.sourceRunId,initial.id);detail.open();}
const rule=document.querySelector('#score-rules');
function jump(index){const r=detail.getRecord(),t=r.turns[index];if(t)motion.seek(t.points[Math.floor(t.points.length/2)].t);}
document.addEventListener('click',e=>{
 const dimension=e.target.closest('[data-score-dimension]');if(dimension)window.HG_TURN_METRICS.openDimension(document,detail.getRecord(),Number(document.querySelector('[data-score-index]').dataset.scoreIndex),dimension.dataset.scoreDimension);
 const help=e.target.closest('[data-score-help]');if(help)window.HG_SCORE_HELP.open(help.dataset.scoreHelp);
 if(e.target.closest('[data-open-rule]'))rule.showModal();if(e.target.closest('[data-close-rule]'))rule.close();
 const step=e.target.closest('[data-score-step]');if(step)jump(Number(document.querySelector('[data-score-index]').dataset.scoreIndex)+Number(step.dataset.scoreStep));
});
document.addEventListener('change',e=>{
 if(e.target.matches('[data-detail-run],[data-detail-segment]'))save();
 if(e.target.matches('[data-target-route],[data-target-stage]')){
 const r=detail.getRecord();window.HG_PROGRESSION.set({route:document.querySelector('[data-target-route]').value,stage:Number(document.querySelector('[data-target-stage]').value)},r);
 window.HG_TURN_METRICS.paint(document,r,Number(document.querySelector('[data-score-index]').dataset.scoreIndex));
 }
});
rule.addEventListener('click',e=>{if(e.target===rule){const r=rule.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)rule.close();}});
})();
