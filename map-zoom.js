/* Button-only zoom, vertical manual browsing, and optional playhead following. */
(function(global){
'use strict';
const min=1,max=8,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function step(k,direction){return clamp(direction==='in'?k*1.5:k/1.5,min,max);}
function clampCamera(g,c){const k=clamp(c.k,min,max);return{k,x:clamp(c.x,g.width*(1-k),0),y:clamp(c.y,g.height*(1-k),0)};}
function cameraAt(g,point,k){k=clamp(k,min,max);const q=g.xy(point);return clampCamera(g,{k,x:g.width/2-q[0]*k,y:g.height/2-q[1]*k});}
function pan(g,c,dy){return clampCamera(g,{...c,y:c.y+dy});}
function zoom(g,c,direction){const k=step(c.k,direction),ratio=k/c.k;return clampCamera(g,{k,x:g.width/2-(g.width/2-c.x)*ratio,y:g.height/2-(g.height/2-c.y)*ratio});}
function paint(root,col,point){const svg=root.querySelector('.hm-slope'),g=col.geometry;if(!svg||!g)return;if(col.camera.k===min)col.mapFollowing=true;col.camera=col.mapFollowing===false?clampCamera(g,col.camera):cameraAt(g,point,col.camera.k);svg.dataset.mapCanPan=String(col.camera.k>min);const c=col.camera,world=svg.querySelector('[data-map-world]');world?.setAttribute('transform',`translate(${c.x} ${c.y}) scale(${c.k})`);
 const size=3*g.scale*c.k,pattern=svg.querySelector('#hm-metre-grid');if(pattern){pattern.setAttribute('width',size);pattern.setAttribute('height',size);pattern.querySelector('path').setAttribute('d',`M${size},0H0V${size}`);}
 for(const marker of svg.querySelectorAll('[data-map-marker],circle.hm-peak')){const x=Number(marker.dataset.markerX??marker.getAttribute('cx')),y=Number(marker.dataset.markerY??marker.getAttribute('cy'));marker.setAttribute('transform',`translate(${x} ${y}) scale(${1/c.k}) translate(${-x} ${-y})`);}
 const panel=svg.closest('.trajectory-map'),value=panel?.querySelector('[data-map-zoom-value]');if(value)value.textContent=c.k.toFixed(1)+'×';
 const zin=panel?.querySelector('[data-map-zoom="in"]'),zout=panel?.querySelector('[data-map-zoom="out"]');if(zin)zin.disabled=c.k>=max;if(zout)zout.disabled=c.k<=min;
 const follow=panel?.querySelector('[data-map-follow]');if(follow){follow.dataset.following=String(col.mapFollowing!==false);follow.title=col.mapFollowing===false?'回到当前位置并恢复跟随':'正在跟随当前位置';follow.querySelector('[data-map-follow-label]').textContent=col.mapFollowing===false?'回到当前':'当前位置';}
}
global.HG_MAP_ZOOM={min,max,step,cameraAt,clampCamera,pan,zoom,paint};
})(window);
