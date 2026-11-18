/* Thin UI adapter for the pinned Lab Three.js renderer.
 * Animation math comes from the bundled renderer; fixed snow-axis camera is a product hook.
 * This file converts legacy fields and binds the existing demo controls only. */
(function(global){
'use strict';
let root=null,record=null,world=null,observer=null,frame=null,playback=null,view='3d',overview=false,mode='chase',lastStats=null,track=null,cameraView='uphill';
const tracks=new WeakMap();
function toTrack(r){
 if(tracks.has(r))return tracks.get(r);
 if(r.replay){
  // Same toTrack contract as upstream TrajectoryViewer.tsx. No pose inference.
  const d=r.replay,F=d.frames,fill=xs=>{let last=0;return xs.map(x=>x===null?last:(last=x));};
  const value={frames:{X:fill(F.X),Y:fill(F.Y),t:fill(F.t),v:fill(F.v),r:fill(F.r),g:fill(F.g),rm:F.rm??null,sw:F.sw??null,yo:F.yo??null,Z:F.Z?fill(F.Z):null,G:F.G?fill(F.G):null,phase:F.phase??null,air:F.air??null},turns:d.turns,metrics:d.turn_metrics,issuesByTurn:r.turns.map((t,i)=>global.HG_TURN_ANNOTATIONS?.issues(r,i)||[]),events:d.events??[],unreliable:d.unreliable??[],corrected:Boolean(d.meta.heading_correction),stance:d.meta.stance??null,slopeDeg:d.meta.slope_deg??null,ramp:d.ramp??null,jump:d.meta.jump??null,hops:d.hops??[]};tracks.set(r,value);return value;
 }
 // Map legacy geometry and optional offline IMU/model heading; no physics inference here.
 const fs=global.HG_MOTION_MODEL.frames(r),indexAt=t=>{let lo=0,hi=fs.length-1;while(lo<hi){const m=Math.ceil((lo+hi)/2);if(fs[m].t<=t)lo=m;else hi=m-1;}return lo;};
 const turns=r.turns.map(t=>({i:t.id,s:indexAt(t.points[0].t),e:indexAt(t.points.at(-1).t),edge:t.edge,d:t.sourceDirection??(t.edge==='toe'?'right':'left')}));
 const metrics=r.turns.map(t=>({ok:t.valid,st:t.sourceStance??null,et:t.edge,p:Number.isInteger(t.edgePeakIndex??t.peakIndex)?indexAt(t.points[t.edgePeakIndex??t.peakIndex].t):null,E:t.maxEdgeDeg,r:t.radius,G:t.gForce,w:Number.isInteger(t.edgeChangeIndex)?indexAt(t.points[t.edgeChangeIndex].t):null,Gp:null}));
 const hasHeading=global.HG_BOARD_HEADING?.has(r);
 const value={headingSource:hasHeading?'imu_model':null,frames:{yo:hasHeading?fs.map(f=>f.offset):null,sw:hasHeading?fs.map(f=>Number(f.switch)):null,X:fs.map(f=>f.x),Y:fs.map(f=>-f.y),t:fs.map(f=>f.t),v:fs.map(f=>(f.speed||0)/3.6),r:fs.map(f=>Math.abs(f.roll||0)),g:fs.map(()=>0)},turns,metrics,events:[],unreliable:[],corrected:true,stance:null,slopeDeg:0,ramp:null,jump:null,hops:[]};tracks.set(r,value);return value;
}
function markup(next={}){return `<section class="hm-scene-3d" aria-label="三维雪板运动"><div class="hm-scene-canvas hm-scene-host" aria-label="三维雪板与轨迹，视角锁定，可缩放" role="img"></div><div class="hm-scene-badge"><i></i><span data-scene-mode>山下仰视</span></div><div class="hm-scene-actions"><button data-scene-action="locate" aria-label="跟随雪板"><svg viewBox="0 0 24 24"><path d="M9 4H4v5m11-5h5v5M4 15v5h5m11-5v5h-5"/><circle cx="12" cy="12" r="3"/></svg></button><button data-scene-action="reset" aria-label="重置三维视角"><svg viewBox="0 0 24 24"><path d="M5 8a8 8 0 1 1-1 8M5 3v5h5"/></svg></button></div><div class="hm-scene-zoom" role="group" aria-label="三维轨迹缩放"><button data-scene-action="zoom-in" aria-label="放大三维轨迹"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button><output data-scene-zoom aria-label="三维缩放倍率">0.4×</output><button data-scene-action="zoom-out" aria-label="缩小三维轨迹"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button></div><span class="hm-stance-status" data-stance-status></span><div class="hm-replay-cue" data-replay-cue hidden role="status"></div><aside class="hm-turn-issue-card" data-turn-issues hidden></aside><p class="hm-scene-hint">视角已锁定 · 双指或滚轮缩放</p><p class="hm-scene-caption">每格 3 米 · ◇ 换刃 · ○ 立刃峰值 · ▲ G峰值 · ◆ 问题</p></section>`;}

function legendMarkup(next={}){return `<aside class="trajectory-footnotes" aria-label="轨迹图例与重建说明"><div class="hm-foot-trail-key" aria-label="脚位轨迹图例"><span><i></i>习惯前脚</span><span><i class="rear"></i>习惯后脚</span><small>雪面投影 · 重建示意</small></div><div class="hm-trail-surface-key"><span><i class="overlap"></i>近重合加粗 ≤4厘米</span><span><i class="fill"></i>分离范围填色</span></div><p class="hm-foot-trail-note">${global.HG_BOARD_HEADING?.has(next)?'本段位移和板向由 IMU 与同一滑行方向模型重建；脚位为投影示意，不能单凭线形判定走刃或搓雪。':next.replay?.frames.yo?'按板心与板姿重建，非双脚独立定位；重合、分离仅供观察，不据此判定走刃或搓雪。':'本样本缺少实测板身偏航，脚位朝向沿轨迹推定；两线重合不能用于判断走刃。'}正反脚切换时，线色仍对应原来的脚。</p><p class="hm-foot-trail-note">问题点位标在对应弯中部，表示该弯命中算法问题；不代表问题发生的精确时刻。</p>${global.HG_BOARD_HEADING?.has(next)?'<p class="hm-heading-source">板向与轨迹夹角 <strong data-heading-angle>—</strong><span>模型估计</span></p>':''}</aside>`;}


function stanceInfo(r,tr,k,pose){
 const given=r.replay?.meta.stance,votes=tr.metrics.reduce((n,m)=>n+(m?.st==='goofy'?1:m?.st==='regular'?-1:0),0),hasVote=tr.metrics.some(m=>['regular','goofy'].includes(m?.st));
 const habit=['regular','goofy'].includes(given)?given:hasVote?(votes>0?'goofy':'regular'):null;
 const source=['regular','goofy'].includes(given)?'profile':hasVote?'turn_votes':null;
 const sw=Array.isArray(tr.frames.sw)&&[0,1].includes(tr.frames.sw[k])?Boolean(tr.frames.sw[k]):null;
 const label=!habit?'':sw===null?(habit==='goofy'?'习惯右脚在前':'习惯左脚在前'):pose?.result.ev?'转体中 · 正反脚切换':(sw?'反脚':'正脚')+(tr.headingSource==='imu_model'?'（估计）':'')+' · '+((habit==='goofy')!==sw?'右脚在前':'左脚在前');
 return {habit,source,switch:sw,label};
}

function applyView(){if(root)root.classList.add('is-scene-3d','is-dual-view');}
function hud(){
 if(!world||!root)return;
 const debug=world.getDebugState(),ratio=debug.referenceDistance/debug.cameraDistance;
 const out=root.querySelector('[data-scene-zoom]');if(out)out.textContent=ratio.toFixed(1)+'×';
 const zin=root.querySelector('[data-scene-action="zoom-in"]'),zout=root.querySelector('[data-scene-action="zoom-out"]');if(zin)zin.disabled=debug.cameraDistance<=debug.zoomMin+.01;if(zout)zout.disabled=debug.cameraDistance>=debug.zoomMax-.01;
 const viewName=debug.cameraViews?.[debug.cameraView]?.label||'';const label=root.querySelector('[data-scene-mode]');if(label)label.textContent=overview?'完整轨迹 · '+viewName:viewName;root.querySelectorAll('.hm-camera-views button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sceneAction==='view-'+debug.cameraView)));
 root.querySelectorAll('.hm-camera-modes button').forEach(b=>b.setAttribute('aria-pressed',String(!overview&&b.dataset.sceneAction===mode)));
}
function mount(nextRoot,next){
 const changed=record?.id!==next.id;unmount();root=nextRoot;record=next;if(changed){overview=false;mode='chase';}applyView();
 const el=root.querySelector('.hm-scene-host');if(!el)return;
 try{
  track=toTrack(record);world=global.HG_LAB_WORLD.mountWorld(el,track,{theme:'light',isActive:()=>playback?.active!==false,onCameraChange:hud,hideTurnLabels:true,cameraView});
  world.setMode(mode);world.setTime(track.frames.t[0]);
  if(overview)world.showOverview(true);
  if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(()=>{world?.resize();hud();});observer.observe(el);}hud();
 }catch(error){world?.dispose();world=null;el.innerHTML='<p class="hm-empty">三维画面暂时无法显示，请重新打开</p>';console.error('Lab 3D renderer:',error);}
}
function render(f,state){
 frame=f;playback={...state};if(!world)return null;
 const s=world.setTime(f.t),p=world.samplePose(f.t),result=p.result,debug=world.getDebugState();hud();
 const edgeState=global.HG_EDGE_CHANGES?.at(record,f.t,state.active);
 global.HG_TURN_ANNOTATIONS?.paint(root,record,s.turn);
 const stance=stanceInfo(record,track,s.k,p),node=root.querySelector('[data-stance-status]');if(node){node.textContent=stance.label;node.title=track.headingSource==='imu_model'?'板向和正反脚来自 IMU 偏航与模型滑行方向的相对角度，非独立速度测量':stance.source==='turn_votes'?'习惯站姿来自逐弯算法投票；正反脚来自逐帧 sw，板身连续转体来自 yo':stance.source==='profile'?'习惯站姿来自输入档案，正反脚来自逐帧 sw':'当前样本未提供站姿，模型方向为示意';}
 const converted={...f,x:result.s.x,y:result.s.z,turn:s.turn,turnId:s.turnNo,speed:s.v,roll:f.tiltUnavailable?null:s.r*(result.s.rm!=null?Math.sign(result.s.rm):s.toe?1:-1),bankAngle:p.rotation[0]*180/Math.PI,heading:-p.rotation[1]*180/Math.PI,pitch:p.rotation[2]*180/Math.PI,event:s.trick,unreliable:!!s.unreliable,lift:result.air?(result.air[0]+result.air[1])/2:0,footHeights:result.air?result.air.slice(0,2):[0,0],hopKind:result.air?.[2]??f.hopKind,edge:record.kind==='jump'?f.edge:f.tiltUnavailable?'立刃回放缺失':Math.abs(s.r)<3?'平板':(result.s.rm!=null?result.s.rm>0:s.toe)?'前刃':'后刃'};
 lastStats={...debug,stance,t:f.t,mode,overview,view,gridMetres:3,pose:p,edgePoints:(edgeState?.visible||[]).map(e=>({...e,world:[e.x,.12,e.y]})),latestEdgeId:edgeState?.latest?.id||null,actionPoints:(global.HG_REPLAY?.landmarks(record)||[]).filter(e=>!state.active||e.t<=f.t).map(e=>({id:e.id,t:e.t,world:[e.x,e.z||.05,e.y]}))};
 return {frame:converted,state:s};
}
function setView(nextRoot){root=nextRoot;view='3d';applyView();world?.resize();global.HG_MOTION?.refresh();}
function action(name){
 if(!world)return;
 if(name==='zoom-in')world.zoom(1.25);if(name==='zoom-out')world.zoom(1/1.25);

 if(['chase','side','over','locate','reset'].includes(name)){mode='chase';overview=false;world.showOverview(false);world.setMode(mode);if(frame)world.setTime(frame.t);}
 if(frame&&playback)render(frame,playback);hud();
}
function setOverview(value){overview=value;world?.showOverview(value);if(frame&&playback)render(frame,playback);}
function unmount(){observer?.disconnect();observer=null;world?.dispose();world=null;root=null;lastStats=null;}
global.HG_SCENE_3D={markup,legendMarkup,toTrack,stanceInfo,mount,unmount,render,setView,action,setOverview,getView:()=>view,getFootTrailData:()=>world?.getFootTrailData(),getState:()=>lastStats&&world?{...lastStats,...world.getDebugState(),view}:lastStats};
})(window);
