/* Demo thresholds only: production thresholds remain pending product/device review. */
(function(global){
'use strict';
function create({commit,onState,slowMs=1500,timeoutMs=10000,now=()=>Date.now()}){
 let version=0,timers=[],state='idle',pending=null;
 const clear=()=>{timers.forEach(clearTimeout);timers=[];};
 function cancel(){version++;clear();pending?.('cancelled');pending=null;state='idle';}
 function run(build,{updating=false}={}){
  cancel();const id=version,start=now();let settled=false;
  const done=new Promise(resolve=>{pending=resolve;});
  const finish=(next,value)=>{if(settled||id!==version)return;settled=true;clear();state=next;
   if(next==='ready'){try{commit(value);}catch{state=next='failed';onState(next,{updating});}}else onState(next,{updating});pending?.(next);pending=null;};
  state=updating?'updating':'drawing';onState(state,{updating});
  timers.push(setTimeout(()=>{if(id===version&&!settled){state='slow';onState('slow',{updating});}},slowMs));
  timers.push(setTimeout(()=>finish('timeout'),timeoutMs));
  const accept=value=>{if(id!==version||settled)return;if(now()-start>=timeoutMs){finish('timeout');return;}if(typeof value!=='string'||!value.includes('hm-slope')){finish(value?.includes('hm-empty')?'empty':'incomplete');return;}try{finish('ready',value);}catch{state='failed';onState('failed',{updating});}};
  try{const value=build();if(value&&typeof value.then==='function')value.then(accept,()=>finish('failed'));else accept(value);}catch{finish('failed');}
  return done;
 }
 return {run,cancel,getState:()=>state};
}
global.HG_RENDER_TASK={create};
})(window);
