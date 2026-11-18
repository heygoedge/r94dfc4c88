/* Product playback adapter of the creative-design animations.jsx Stage clock:
 * one RAF playhead, real elapsed time, cancellation, seeking and persistence.
 * SVG updates keep the existing non-React trajectory renderer intact. */
(function(global){
'use strict';
const model=global.HG_MOTION_MODEL,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const playIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 10 7-10 7Z" fill="currentColor" stroke="none"/></svg>';
const pauseIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke-width="4"/></svg>';
let record=null,state={t:0,playing:false,active:false,rate:1},raf=0,last=null,bindings=null,key='',lastSaved=-1;
const end=()=>model.frames(record).at(-1)?.t||0,start=()=>model.frames(record)[0]?.t||0;
function persist(){try{localStorage.setItem(key,JSON.stringify({t:state.t,active:state.active,rate:state.rate}));}catch{}}
function pause(){state.playing=false;cancelAnimationFrame(raf);raf=0;last=null;if(record)persist();paint();}
function configure(next){
 pause();record=next;bindings=null;state={t:0,playing:false,active:false,rate:1};if(!record)return;
 key='heygo-motion-v1:'+record.id;state.t=start();lastSaved=-1;
 try{const v=JSON.parse(localStorage.getItem(key));if(v&&Number.isFinite(v.t)){state.t=clamp(v.t,start(),end());state.active=v.active===true;state.rate=[.5,1,2].includes(v.rate)?v.rate:1;}}catch{}
}
function controls(r){
 const fs=model.frames(r);if(fs.length<2)return '';
 return `<section class="hm-motion" aria-label="雪板运动回放"><div class="hm-motion-heading"><div><strong>雪板运动</strong><span>姿态与轨迹同步回放</span></div><button data-motion="overview" aria-label="退出回放，查看完整轨迹">完整轨迹</button></div><div class="hm-motion-body"><svg class="hm-board-preview" viewBox="0 0 100 76" role="img" aria-label="雪板立刃姿态示意"><path d="M8 59H92M50 10V67" stroke="#dbe7ef" stroke-dasharray="2 4"/><g data-board-pose></g><text x="50" y="73" text-anchor="middle">立刃示意</text></svg><div class="hm-motion-stats"><div><span data-motion-edge>—</span><strong data-motion-roll>—<small> °</small></strong></div><div><span data-motion-turn>—</span><strong data-motion-speed>—<small> km/h</small></strong></div></div></div><div class="hm-playback-row"><button class="hm-play-button" data-motion="play" aria-label="播放雪板运动">${playIcon}</button><div class="hm-playback-position"><input type="range" data-motion-seek min="${fs[0].t}" max="${fs.at(-1).t}" step="0.01" value="${fs[0].t}" aria-label="雪板运动进度"><div><span data-motion-time>0.0 s</span><span>${(fs.at(-1).t-fs[0].t).toFixed(1)} s</span></div></div><button class="hm-replay-button" data-motion="restart" aria-label="从头回放"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8a8 8 0 1 1-1 8M5 3v5h5"/></svg></button><select data-motion-rate aria-label="回放倍速"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></div>${global.HG_REPLAY?.navigation(r)||''}<p class="hm-motion-source" data-motion-source>立刃来自 IMU 算法 · 朝向沿重建轨迹 · 板型示意</p></section>`;
}
function board(){return '<g class="hm-motion-board" hidden pointer-events="none"><circle r="13" fill="#fff" opacity=".9" stroke="#9bbbd0" stroke-width="1"/><g data-board-heading><g data-board-roll><path d="M-3.8-12Q0-17 3.8-12L4 11Q0 16-4 11Z" fill="#265d7b" stroke="#fff" stroke-width="1.2"/></g></g></g>';}
function bind(root,col){
 if(!record||!root.querySelector('.hm-motion')){bindings=null;return;}
 const q=s=>root.querySelector(s),all=s=>[...root.querySelectorAll(s)];
 bindings={root,col,svg:q('.hm-slope'),board:q('.hm-motion-board'),heading:q('[data-board-heading]'),roll:q('[data-board-roll]'),pose:q('[data-board-pose]'),seek:q('[data-motion-seek]'),play:q('[data-motion="play"]'),position:q('[data-sync-position]'),mapTime:q('[data-map-time]'),time:q('[data-motion-time]'),edge:q('[data-motion-edge]'),turn:q('[data-motion-turn]'),angle:q('[data-motion-roll]'),speed:q('[data-motion-speed]'),rate:q('[data-motion-rate]'),lines:all('[data-motion-line]').map(el=>({el,a:Number(el.dataset.motionStart),b:Number(el.dataset.motionEnd)})),marks:all('[data-sample-time]').map(el=>({el,t:Number(el.dataset.sampleTime)})),accents:all('.hm-selected-halo,.hm-comparison-line,.hm-motion-hit')};
 bindings.rate.value=String(state.rate);global.HG_SCENE_3D?.mount(root,record);paint();
}
function paint(){
 const b=bindings;if(!b||!record)return;
 let f=model.sample(record,state.t);if(!f)return;
 const animated=state.active;
 b.root.classList.toggle('is-motion-active',animated);
 const rendered=global.HG_SCENE_3D?.render(f,state);if(rendered?.frame)f=rendered.frame;
 // Turn type and instantaneous tilt describe different things: a heel-side
 // turn can include a nearly flat board. Keep both visible at low angles.
 const turnEdge=record.turns[f.turn]?.edge;
 const edgeLabel=f.edge==='平板'&&['toe','heel'].includes(turnEdge)?(turnEdge==='toe'?'前刃弯':'后刃弯')+' · 接近平板':f.edge;
 global.HG_TURN_METRICS?.paint(b.root,record,f.turn);
 global.HG_BOARD_HEADING?.paint(b.root,record,f.t);
 global.HG_EDGE_CHANGES?.paint(b.root,record,f.t,state.active);
 global.HG_REPLAY?.paint(b.root,record,f);
 if(b.board)b.board.toggleAttribute('hidden',true);
 // The entire path stays in the SVG; only the map viewport and position dot move.
 for(const line of b.lines){line.el.style.visibility='';line.el.setAttribute('stroke-dasharray','none');}
 for(const mark of b.marks)mark.el.style.visibility='';
 global.HG_MAP_ZOOM?.paint(b.root,b.col,f);
 if(b.position&&b.col.geometry){const q=b.col.geometry.xy(f),cam=b.col.camera;const x=q[0]*cam.k+cam.x,y=q[1]*cam.k+cam.y;b.position.setAttribute('transform',`translate(${x} ${y})`);b.position.dataset.screenX=String(x);b.position.dataset.screenY=String(y);b.position.dataset.time=String(state.t);b.position.dataset.x=String(f.x);b.position.dataset.y=String(f.y);}
 if(b.mapTime)b.mapTime.textContent=(state.t-start()).toFixed(1)+' s';
 const roll=(f.bankAngle||0)*Math.PI/180;
 // Fixed oblique camera; only roll changes. The board is illustrative in size.
 const project=(xx,yy)=>[50+xx*Math.cos(roll),36+yy*.56-xx*Math.sin(roll)*.83];
 const vertices=[[-7,-25],[0,-30],[7,-25],[7,25],[0,30],[-7,25]].map(v=>project(...v));
 const d='M'+vertices.map(p=>p.join(',')).join('L')+'Z';
 b.pose.innerHTML=`<ellipse cx="50" cy="57" rx="13" ry="3" fill="#d7e4ed"/><path d="${d}" fill="#326d8d" stroke="#1b4d6a" stroke-width="1.3"/>`;
 b.seek.value=String(state.t);b.seek.setAttribute('aria-valuetext',`${(state.t-start()).toFixed(1)} 秒，T${f.turnId}，${edgeLabel}`);
 const source=b.root.querySelector('[data-motion-source]');if(source)source.textContent=f.tiltUnavailable?'当前弯的立刃回放缺失，未将零值视为实测平板':global.HG_BOARD_HEADING?.has(record)?'板向与位移分别重建 · 模型估计':f.roll===null?'当前无有效立刃数据 · 朝向沿重建轨迹 · 板型示意':f.bankAngle===null?'立刃角有效 · 侧倾方向待确认 · 板型示意':'立刃来自 IMU 算法 · 朝向沿重建轨迹 · 板型示意';
 b.time.textContent=(state.t-start()).toFixed(1)+' s';b.edge.textContent=edgeLabel+(record.kind==='jump'?' · 俯仰':'');b.turn.textContent=record.kind==='jump'?record.segmentId:'当前弯';
 b.angle.innerHTML=(record.kind==='jump'?f.pitch.toFixed(1):f.roll===null?'—':Math.abs(f.roll).toFixed(1))+'<small> °</small>';b.speed.innerHTML=(f.speed===null?'—':f.speed.toFixed(1))+'<small> km/h</small>';
 if(b.play.dataset.playing!==String(state.playing)){b.play.innerHTML=state.playing?pauseIcon:playIcon;b.play.dataset.playing=String(state.playing);}b.play.setAttribute('aria-pressed',String(state.playing));b.play.setAttribute('aria-label',state.playing?'暂停雪板运动':state.t>=end()?'重新播放雪板运动':'播放雪板运动');
}
function tick(ts){
 if(!state.playing)return;
 if(last!==null)state.t=Math.min(end(),state.t+(ts-last)/1000*state.rate);last=ts;
 if(state.t>=end()){pause();return;}
 paint();if(Math.floor(state.t)!==lastSaved){lastSaved=Math.floor(state.t);persist();}raf=requestAnimationFrame(tick);
}
function play(){global.HG_SCENE_3D?.setOverview(false);if(state.t>=end())state.t=start();state.active=true;state.playing=true;last=null;cancelAnimationFrame(raf);paint();persist();raf=requestAnimationFrame(tick);}
function seek(t){if(!record)return;state.t=clamp(t,start(),end());state.active=true;last=null;if(state.t>=end())pause();paint();persist();}
function action(name){if(!record)return;if(name==='play'){if(state.playing)pause();else play();}if(name==='restart'){pause();state.t=start();play();}if(name==='overview'){pause();state.active=false;global.HG_SCENE_3D?.setOverview(true);paint();persist();}}
function rate(value){state.rate=[.5,1,2].includes(value)?value:1;last=null;persist();}
function close(){pause();global.HG_SCENE_3D?.unmount();bindings=null;}
if(typeof document!=='undefined'){
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
 document.addEventListener('keydown',e=>{if(!bindings||e.target.matches('input,select,textarea,button')||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'){e.preventDefault();bindings.root.querySelector('[data-motion="play"]').click();}if(state.active&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();seek(state.t+(e.key==='ArrowLeft'?-1:1));}});
}
global.HG_MOTION={controls,board,bind,configure,action,seek,rate,pause,refresh:paint,close,getState:()=>({...state})};
})(window);
