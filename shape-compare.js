/* Compare outlines by endpoint alignment and uniform scale, never by a quality score. */
(function(global){
'use strict';
function frame(turn){
 if(!turn?.valid||turn.points?.length<2||!turn.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))return null;
 const points=turn.points,a=points[0],b=points.at(-1),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
 if(length<1e-6)return null;
 const ux=dx/length,uy=dy/length;
 const local=points.map(p=>({u:((p.x-a.x)*ux+(p.y-a.y)*uy)/length,v:((p.x-a.x)*-uy+(p.y-a.y)*ux)/length}));
 // The largest excursion defines bend direction, independent of stance or edge labels.
 const extreme=local.reduce((a,b)=>Math.abs(b.v)>Math.abs(a.v)?b:a,local[0]);
 return {a,ux,uy,length,local,side:Math.sign(extreme.v)};
}
function project(source,target){
 const s=frame(source),t=frame(target);if(!s||!t)return null;
 const flip=s.side&&t.side&&s.side!==t.side?-1:1;
 return s.local.map(p=>({x:t.a.x+t.length*(p.u*t.ux-p.v*flip*t.uy),y:t.a.y+t.length*(p.u*t.uy+p.v*flip*t.ux)}));
}
global.HG_SHAPE_COMPARE={frame,project};
})(window);
