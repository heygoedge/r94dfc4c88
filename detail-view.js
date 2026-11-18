(function () {
  'use strict';
  const root = document.querySelector('.hg-mean-section');
  if (!root) return;
  const metric = 'edge';
  let markers={swap:true,peak:true,compare:false};
  const catalog=window.HG_TRAJECTORY_CATALOG;
  const records = catalog?catalog.records():[...(window.HG_V2_RUNS||[]),...(window.HG_MEAN_RECORDS||[])].map(window.HG_BEST_SEGMENT.select).filter(Boolean);
  const reset = id => ({selected:null,camera:{k:1,x:0,y:0},mapFollowing:true,initialWindow:null});
  const columns = [{record:records[0]?.id,...reset(records[0]?.id)}];
  const track=window.HG_UNIFIED_TRACK;
  const motion=window.HG_MOTION;
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n = v => v === null ? '—' : v.toFixed(1);
  const segmentName = r => { const m=/^R(\d+)S(\d+)$/.exec(r.segmentId), j=/^J(\d+)$/.exec(r.segmentId); return j ? '第'+j[1]+'跳' : (m ? '第'+m[1]+'趟 · 片段'+m[2] : r.segmentId)+' · '+r.turns.length+'弯'; };
  function buildView() {
    root.dataset.metric=metric;
    const host=root.querySelector('.hm-columns');
    if(!records.some(r=>r.id===columns[0].record)){return '<div class="hm-empty">这一段暂时没有弯形数据</div>';}
    return columns.map((col,index)=>{
      const record=records.find(r=>r.id===col.record),stats=window.HG_TRACK_STYLE(record,metric);
      const rawSelected=col.selected===null?null:record.turns[col.selected];
      const peak=field=>{const values=record.turns.filter(t=>t.valid&&Number.isFinite(t[field])).map(t=>t[field]);return values.length?Math.max(...values):null;};
      const val=field=>rawSelected?(rawSelected.valid&&Number.isFinite(rawSelected[field])?rawSelected[field]:null):peak(field);
      const overview=`<div class="hm-overview"><div class="hm-stat-grid"><div><span>最高速度</span><strong>${n(val('maxSpeedKmh'))}<small> km/h</small></strong></div><div><span>最大刃角</span><strong>${n(val('maxEdgeDeg'))}<small> °</small></strong></div><div><span>转弯半径</span><strong>${n(rawSelected?val('radius'):null)}<small> m</small></strong></div></div></div>`;
      const navigation=`<div class="hm-track-heading">${track.detail(record,col,metric,stats)}</div>`;
      const content=track.slope(record,col,metric,stats,markers);
      const siblings=records.filter(r=>r.sourceRunId===record.sourceRunId);
      const pickers=catalog?`<div class="hm-sample-picker"><label><span>样本</span><select data-detail-run aria-label="轨迹样本">${catalog.runs.filter(r=>catalog.list(r).length).map(r=>`<option value="${esc(r.id)}" ${r.id===record.sourceRunId?'selected':''}>${esc(r.personLabel)}</option>`).join('')}</select></label><label><span>片段</span><select data-detail-segment aria-label="轨迹片段">${siblings.map(r=>`<option value="${esc(r.id)}" ${r.id===record.id?'selected':''}>${esc(segmentName(r))}</option>`).join('')}</select></label></div><p class="hm-sample-source">${record.replay?'动作回放 · '+(record.kind==='jump'?'跳台与腾空重建':'平花与弯型同步')+' · 姿态与位移均为算法估计':window.HG_BOARD_HEADING?.has(record)?'IMU 轨迹与独立板向 · 模型重建':record.sourceVersion===2?'算法 v2 · 按片段 HeyGo IQ 选择':'历史样本 · 独立片段回放 · 暂无新版 IQ'}</p>`:'';
      const headingNote=!window.HG_BOARD_HEADING?.has(record)&&!record.replay?.frames.yo?`<p class="hm-heading-audit-note">${record.kind==='jump'?'地面板向未核验 · 空中偏航沿用原算法':'板向未核验 · 当前方向沿轨迹示意'}</p>`:'';
      const compare=`<label class="hm-point-toggle hm-extra-compare"><input type="checkbox" data-track-marker="compare" ${markers.compare?'checked':''}>外形对比</label>`;
      return `<article class="hm-column" data-mean-column="${index}" data-record-id="${esc(record.id)}"><section class="hm-trajectory-section" aria-label="滑行轨迹"><div class="hm-trajectory-card">${pickers}${window.HG_TURN_METRICS?.overviewMarkup(record)||''}${headingNote}${compare}${overview}${navigation}${window.HG_SEGMENT_OVERVIEW?.markup(record)||''}<div class="trajectory-dual" role="group" aria-label="同步三维回放与二维全程轨迹"><div class="trajectory-main"><h3 class="trajectory-view-title">3D 轨迹<small>运动回放</small></h3>${window.HG_SCENE_3D?.markup(record)||''}</div><section class="hm-track-stage trajectory-map" aria-label="二维轨迹与同步位置"><h3 class="trajectory-view-title">2D 轨迹</h3>${content}<button type="button" class="map-position-key" data-map-follow aria-label="回到二维轨迹当前位置并恢复跟随"><i></i><b data-map-follow-label>当前位置</b><span data-map-time></span></button></section></div>${motion?.controls(record)||''}${window.HG_SCENE_3D?.legendMarkup(record)||''}</div></section></article>`;

    }).join('');
  }
  let lastGood=null;
  const host=root.querySelector('.hm-columns');
  const snapshot=()=>({column:{...columns[0],camera:{...columns[0].camera}},markers:{...markers},html:host.innerHTML});
  const restore=()=>{if(lastGood){Object.assign(columns[0],lastGood.column,{camera:{...lastGood.column.camera}});markers={...lastGood.markers};}};
  function showState(state,{updating}={}){
    const messages={drawing:'轨迹绘制中…',updating:'正在更新轨迹…',slow:'轨迹绘制较慢，请稍候',failed:'轨迹绘制失败，请重试',timeout:'轨迹绘制超时，请重试',incomplete:'轨迹绘制未完成，请重试',empty:'这一段暂时没有弯形数据'};
    const failed=['failed','timeout','incomplete'].includes(state);
    document.querySelector('#share-trajectory')?.setAttribute('disabled','');
    if(updating&&state==='updating')return;
    if(failed)restore();
    const previous=lastGood?`<div class="hm-stale" inert aria-hidden="true">${lastGood.html}</div>`:'';
    host.innerHTML=`<div class="hm-render-status" role="status">${failed||state==='empty'?'':'<span class="spinner"></span>'}<span>${messages[state]}</span>${failed?'<button data-render-retry>重新绘制</button>':''}${failed&&lastGood?'<small>暂时保留上次成功的视图，重新绘制后恢复操作。</small>':''}</div>${previous||'<div class="hm-render-placeholder"></div>'}`;
  }
  const drawing=window.HG_RENDER_TASK.create({onState:showState,commit:html=>{host.innerHTML=html;const title=document.querySelector('#detail-page h1');if(title)title.textContent='滑行片段表现';motion?.bind(host,columns[0]);document.querySelector('#share-trajectory')?.removeAttribute('disabled');lastGood=snapshot();}});
  function render(){return drawing.run(buildView,{updating:!!lastGood});}
  root.addEventListener('click',e=>{if(e.target.closest('[data-render-retry]')&&!['drawing','updating','slow'].includes(drawing.getState()))renderAsync();});
  function renderAsync(){return drawing.run(()=>new Promise((resolve,reject)=>requestAnimationFrame(()=>requestAnimationFrame(()=>{try{resolve(buildView());}catch(e){reject(e);}}))),{updating:!!lastGood});}
  function selectTurn(col,index){const record=records.find(r=>r.id===col.record);col.selected=index;if(motion?.getState().active)motion.seek(record.turns[index].points[0].t);const ps=record.turns[index].points;const target=ps[Math.floor(ps.length/2)];if(col.geometry){const p=col.geometry.xy(target),x=p[0]*col.camera.k+col.camera.x,y=p[1]*col.camera.k+col.camera.y;if(x<55||x>289)col.camera.x+=172-x;if(y<50||y>370)col.camera.y+=210-y;}}

  function activate(e){
    if(drawing.getState()!=='ready')return;
    const replayEvent=e.target.closest('[data-replay-time]');if(replayEvent){motion.seek(Number(replayEvent.dataset.replayTime));return;}
    const mapZoom=e.target.closest('[data-map-zoom]');if(mapZoom){const col=columns[0];col.camera=window.HG_MAP_ZOOM.zoom(col.geometry,col.camera,mapZoom.dataset.mapZoom);motion.refresh();return;}
    if(e.target.closest('[data-map-follow]')){columns[0].mapFollowing=true;motion.refresh();return;}
    const sceneAction=e.target.closest('[data-scene-action]');if(sceneAction){window.HG_SCENE_3D.action(sceneAction.dataset.sceneAction);return;}
    const motionAction=e.target.closest('[data-motion]');if(motionAction){motion.action(motionAction.dataset.motion);return;}
    const action=e.target.closest('[data-track-action]');if(action){const col=columns[Number(action.closest('[data-mean-column]').dataset.meanColumn)],name=action.dataset.trackAction;
      if(name==='fit'){col.camera={k:1,x:0,y:0};col.initialWindow=null;}
      if(name==='in'||name==='out'){col.camera=window.HG_TRACK_CAMERA.step(col.camera,name);col.initialWindow=null;}
      render();return;
    }
    const target=e.target.closest('[data-mean-turn]');if(!target||target.closest('.trajectory-map'))return;
    const index=Number(target.closest('[data-mean-column]').dataset.meanColumn);selectTurn(columns[index],Number(target.dataset.meanTurn));
    render();
  }
  root.addEventListener('click',activate);
  root.addEventListener('input',e=>{if(e.target.matches('[data-motion-seek]')){const time=Number(e.target.value);motion?.seek(time);}});
  root.addEventListener('change',e=>{if(e.target.matches('[data-detail-run]')){window.HG_CHAT_DEMO?.selectRun(e.target.value);return;}if(e.target.matches('[data-detail-segment]')){const target=records.find(r=>r.id===e.target.value);if(target){setRecord(target.sourceRunId,target.id);open();}return;}if(e.target.matches('[data-motion-rate]')){motion?.rate(Number(e.target.value));return;}if(drawing.getState()!=='ready')return;const option=e.target.closest('[data-track-marker]');if(option){markers[option.dataset.trackMarker]=option.checked;render();}});
  root.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.matches('[data-mean-turn],[data-track-action]')){e.preventDefault();activate(e);}});
  const pointers=new Set();let gesture=null;
  function clearGesture(){
    const active=[...pointers];pointers.clear();gesture?.svg.classList.remove('is-map-dragging');gesture=null;
    for(const id of active)if(root.hasPointerCapture(id))root.releasePointerCapture(id);
  }
  root.addEventListener('pointerdown',e=>{
    const svg=e.target.closest('.trajectory-map .hm-slope'),col=columns[0];
    if(drawing.getState()!=='ready'||!svg||col.camera.k<=window.HG_MAP_ZOOM.min||e.button>0)return;
    pointers.add(e.pointerId);root.setPointerCapture(e.pointerId);e.preventDefault();
    if(pointers.size>1){if(gesture)gesture.blocked=true;return;}
    const matrix=svg.getScreenCTM();if(!matrix){clearGesture();return;}
    gesture={svg,id:e.pointerId,inverse:matrix.inverse(),clientY:e.clientY,origin:new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse()).y,camera:{...col.camera},moved:false,blocked:false};
  });
  root.addEventListener('pointermove',e=>{
    if(!gesture||gesture.blocked||e.pointerId!==gesture.id)return;
    if(!gesture.moved&&Math.abs(e.clientY-gesture.clientY)<4)return;
    gesture.moved=true;gesture.svg.classList.add('is-map-dragging');
    const y=new DOMPoint(e.clientX,e.clientY).matrixTransform(gesture.inverse).y,col=columns[0];
    col.mapFollowing=false;col.camera=window.HG_MAP_ZOOM.pan(col.geometry,gesture.camera,y-gesture.origin);
    motion.refresh();e.preventDefault();
  });
  function end(e){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(root.hasPointerCapture(e.pointerId))root.releasePointerCapture(e.pointerId);
    if(!pointers.size)clearGesture();
  }
  root.addEventListener('pointerup',end);root.addEventListener('pointercancel',end);root.addEventListener('lostpointercapture',end);
  function close(){clearGesture();motion?.close();drawing.cancel();}
  function open(){close();motion?.configure(records.find(r=>r.id===columns[0].record));lastGood=null;markers={swap:true,peak:true,compare:false};Object.assign(columns[0],reset(columns[0].record));if(motion?.getState().active){columns[0].camera={k:1,x:0,y:0};columns[0].initialWindow=null;columns[0].selected=null;}return renderAsync();}
  function setRecord(id,segmentId){close();lastGood=null;columns[0].record=records.find(r=>r.sourceRunId===id&&(!segmentId||r.id===segmentId))?.id||null;markers={swap:true,peak:true,compare:false};Object.assign(columns[0],reset(columns[0].record));}
  window.HG_DETAIL={render,open,close,setRecord,getRecord:()=>records.find(r=>r.id===columns[0].record),getState:()=>({renderState:drawing.getState(),record:columns[0].record,metric,markers:{...markers},mapFollowing:columns[0].mapFollowing,selected:columns[0].selected,initialWindow:columns[0].initialWindow,camera:{...columns[0].camera}})};
  render();
})();
