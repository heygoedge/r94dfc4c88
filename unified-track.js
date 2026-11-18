(function(global){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const path=ps=>ps.map((p,i)=>`${i?'L':'M'}${p}`).join(' ');
const frames=new Map();
function points(record){if(!frames.has(record.id))frames.set(record.id,record.turns.flatMap((t,index)=>t.points.map(p=>({...p,turn:index}))));return frames.get(record.id);}
function grid(g,cam){
 // Fix the grid to the viewport; retain the trajectory's metres-to-pixels scale.
 const size=3*g.scale*cam.k;
 return `<defs><pattern id="hm-metre-grid" patternUnits="userSpaceOnUse" x="0" y="0" width="${size}" height="${size}"><path d="M${size},0H0V${size}" fill="none" stroke="#dfe8ef" stroke-width="0.65"/></pattern></defs><rect class="hm-metre-grid" data-grid-metres="3" width="${g.width}" height="${g.height}" fill="url(#hm-metre-grid)" stroke="none" pointer-events="none"/>`;
}
function swapMarker(p,i,size=3){return `<path class="hm-edge-change" data-map-marker data-marker-x="${p[0]}" data-marker-y="${p[1]}" data-edge-change-turn="${i}" d="M${p[0]},${p[1]-size}L${p[0]+size},${p[1]}L${p[0]},${p[1]+size}L${p[0]-size},${p[1]}Z" fill="#fff" stroke="#236b99" stroke-width="${size<=2?1:1.4}"/>`;}
function slope(record,col,metric,stats,markers={swap:false,peak:false}){const averaged=metric.startsWith('mean'),swap=metric==='edgeChange';const g=global.HG_SLOPE_GEOMETRY(points(record),120,420,{x:24,y:50}),cam=col.camera,xy=p=>{const q=g.xy(p);return q;};col.geometry=g;let html='';
const candidates=[],labels=[];
const reference=markers.compare?record.turns[col.selected]:null;
const comparable=reference&&global.HG_SHAPE_COMPARE.frame(reference);
let overlays=0;
record.turns.forEach((t,i)=>{
 if(col.initialWindow&&(i<col.initialWindow.start||i>col.initialWindow.end))return;
 const ps=t.points.map(xy);
 const value=stats.turns[i].value,label='T'+String(t.id).padStart(2,'0'),display=!t.valid?'-':swap?(Number.isInteger(t.edgeChangeIndex)?'换刃点':'-'):value===null?'暂无数据':value.toFixed(metric==='gForce'?2:1)+' '+stats.unit;
 if(Math.max(...ps.map(p=>p[1]))<0||Math.min(...ps.map(p=>p[1]))>420)return;
 html+=`<g class="hm-curve" data-mean-turn="${i}" data-turn-value="${value===null?'':value}" aria-label="${label} ${display}"><title>${label} · ${display}</title>`;
 if(col.selected===i)html+=`<path class="hm-selected-halo" d="${path(ps)}" fill="none" stroke="${markers.compare?'#9774c9':'#7890a3'}" opacity=".25" stroke-width="12"/>`;
 if(stats.sample){
  for(let j=1;j<ps.length;j++){
   const a=ps[j-1],b=ps[j],v0=stats.sample(t,t.points[j-1]),v1=stats.sample(t,t.points[j]),id=`edge-${i}-${j}`;
   html+=`<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"><stop stop-color="${stats.color(v0)}"/><stop offset="1" stop-color="${stats.color(v1)}"/></linearGradient></defs><path class="hm-turn-line" data-motion-line pathLength="1" data-motion-start="${t.points[j-1].t}" data-motion-end="${t.points[j].t}" d="M${a}L${b}" fill="none" stroke="url(#${id})" stroke-width="3.5" stroke-linecap="round"/>`;
  }
 }else html+=`<path class="hm-turn-line" d="${path(ps)}" fill="none" stroke="${stats.color(value)}" stroke-width="3.5" stroke-linecap="round" ${t.valid&&value===null?'stroke-dasharray="3 4"':''}/>`;
 html+=`<path class="hm-motion-hit" d="${path(ps)}" fill="none" stroke="transparent" stroke-width="15"/>`;
 if(comparable&&i!==col.selected){
  const outline=global.HG_SHAPE_COMPARE.project(reference,t);
  if(outline){overlays++;html+=`<path class="hm-comparison-line" data-comparison-target="${i}" data-comparison-source="${col.selected}" d="${path(outline.map(xy))}" fill="none" stroke="#956fc2" stroke-width="1.8" stroke-dasharray="4 3" stroke-linecap="round" stroke-linejoin="round" pointer-events="none"/>`;}
 }
 const located=markers.swap&&t.valid&&Number.isInteger(t.edgeChangeIndex)&&t.edgeChangeIndex>=0&&t.edgeChangeIndex<ps.length,mid=located?ps[t.edgeChangeIndex]:ps[Math.floor(ps.length/2)];
 if(record.kind!=='jump')candidates.push({i,label,mid,display:!t.valid?'-':swap?(located?'':'-'):value===null?'-':value.toFixed(metric==='gForce'?2:1)+' '+stats.unit,edge:t.edge==='toe'?'前刃':t.edge==='heel'?'后刃':'',selected:col.selected===i});
 if(located)html+=`<g data-sample-time="${t.points[t.edgeChangeIndex].t}">${swapMarker(ps[t.edgeChangeIndex],i,col.selected===i?4:cam.k<2.5?1.8:3)}</g>`;
 const peakIndex=t.edgePeakIndex??t.peakIndex;if(markers.peak&&t.valid&&Number.isInteger(peakIndex)&&t.points[peakIndex]){const p=xy(t.points[peakIndex]);html+=`<circle data-sample-time="${t.points[peakIndex].t}" class="hm-peak" cx="${p[0]}" cy="${p[1]}" r="${col.selected===i?3.5:cam.k<2.5?1.6:2.5}" fill="#fff" stroke="#986633"/>`;}
 html+='</g>';
});
// Screen-space spacing and a zoom-dependent stride keep the whole-run view quiet.
const stride=Math.max(1,Math.ceil(record.turns.length/(8*cam.k))),placed=[];
candidates.sort((a,b)=>Number(b.selected)-Number(a.selected)||a.i-b.i).forEach(c=>{
 if(c.selected||cam.k<2.5)return;
 if(!c.selected&&c.i%stride!==0&&c.i!==record.turns.length-1)return;
 const [px,py]=c.mid;if(px<0||px>344||py<34||py>376)return;
 const side=px<100?1:px>244?-1:c.i%2?-1:1;
 const half=c.selected&&c.edge?42:20,x=clamp(px+side*(half+10),half+6,338-half),y=py;
 if(!c.selected&&placed.some(p=>Math.abs(p.y-y)<34))return;
 placed.push({x,y});
 labels.push(`<g data-sample-time="${record.turns[c.i].points.at(-1).t}" data-mean-turn="${c.i}" class="hm-turn-annotation ${c.selected?'is-selected':''}">${c.selected?`<rect x="${x-half}" y="${y-12}" width="${half*2}" height="24" rx="7"/>`:''}<text x="${x}" y="${y+3}" text-anchor="middle">${c.label}${c.selected&&c.edge?' · '+c.edge:''}</text></g>`);
});
// Keep ordinal labels out of the visible trajectory. Hit targets retain accessible names.

const values=stats.turns.map(t=>t.value).filter(Number.isFinite),min=stats.min!==undefined?stats.min:values.length?Math.min(...values):null,max=stats.max!==undefined?stats.max:values.length?Math.max(...values):null;
// Legend and trajectory share the same unclipped, symmetric color mapping.
const stops=values.length?[...new Set([min,max,...(stats.baseline>=min&&stats.baseline<=max?[stats.baseline]:[])])].sort((a,b)=>a-b):[];
const ramp=min===null?'#c6cdd3':min===max?stats.color(min):`linear-gradient(90deg,${stops.map(v=>`${stats.color(v)} ${100*(v-min)/(max-min)}%`).join(',')})`;
const lowLabel=swap||averaged?'低':min===null?'—':min.toFixed(metric==='gForce'?2:1)+stats.unit,highLabel=swap||averaged?'高':max===null?'—':max.toFixed(metric==='gForce'?2:1)+stats.unit;
const legend=`<div class="hm-scale"><span>${lowLabel}</span><i style="background:${ramp}"></i><span>${highLabel}</span></div><p class="hm-scale-note">${metric==='edge'?'颜色越深，立刃角越大'+(markers.swap?' · ◇ 换刃点':'')+(markers.peak?' · ○ 立刃峰值点':''):'颜色越深，G-force 越高 · 单弯值插值示意'}</p>`;
const compareLegend=!markers.compare?'':`<div class="hm-comparison-note" role="status">${comparable?`<span><i></i>参考弯 T${String(reference.id).padStart(2,'0')} · 点选其他弯可更换</span><small>起终点对齐、等比缩放；反向弯镜像${overlays?'':' · 当前视窗无可对比弯'}</small>`:'请点选有效弯作为参考'}</div>`;
return `${compareLegend}<div class="hm-slope-wrap" data-metric="${metric}"><svg class="hm-slope" viewBox="0 0 120 420" aria-label="二维完整轨迹，圆点同步表示三维回放当前位置，使用按钮缩放，放大后可上下拖动">${grid(g,cam)}<g data-map-world transform="translate(${cam.x} ${cam.y}) scale(${cam.k})">${html}</g><g class="hm-sync-position" data-sync-position pointer-events="none" role="img" aria-label="当前回放位置"><circle r="7" fill="#1aa997" opacity=".18"/><circle r="3.8" fill="#168e83" stroke="#fff" stroke-width="1.8"/></g></svg><span class="hm-grid-note">每格 3 × 3 米</span><div class="map-zoom-controls" role="group" aria-label="二维轨迹缩放"><button data-map-zoom="in" aria-label="放大二维轨迹"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button><output data-map-zoom-value aria-label="二维缩放倍率">${cam.k.toFixed(1)}×</output><button data-map-zoom="out" aria-label="缩小二维轨迹" ${cam.k<=1?'disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg></button></div></div>${legend}`;}

function detail(record,col,metric,stats){
 if(record.kind==='jump')return '<div class="hm-turn-detail">跳台 '+record.segmentId+' · 平面投影</div>';

 if(col.selected===null)return '';
 const t=record.turns[col.selected],value=stats.turns[col.selected].value;
 const label='当前弯',edge=t.edge==='toe'?'前刃':t.edge==='heel'?'后刃':'-';
 // In swap mode this is the relocated legend, not a claim that this turn has a recorded point.
 const valueText=!t.valid||value===null?'-':value.toFixed(metric==='gForce'?2:1)+(metric==='edge'?'°':' '+stats.unit);
 const display=metric==='edgeChange'?'◇ 换刃点':metric==='edge'?'最大刃角 '+valueText:'G-force '+valueText;
 return `<div class="hm-turn-detail" role="status"><div class="hm-turn-detail-text"><span>${label} ${edge}</span>${display?`<strong ${metric==='edgeChange'?'aria-label="换刃点图例"':''}>${display}</strong>`:''}</div></div>`;
}
global.HG_UNIFIED_TRACK={slope,detail};
})(window);
