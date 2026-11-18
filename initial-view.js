/* At most 20 source-order turns. Algorithm IQ six at approximately 40% of the viewport. */
(function(global){
'use strict';
function initial(record){
 const turns=record?.turns||[],first=Math.max(0,turns.findIndex(t=>t.valid)),six=turns.length?global.HG_BEST_SEGMENT.bestSix(record):null;
 const fallback={selected:six?.start??first,camera:{k:1,x:0,y:0},initialWindow:null};if(!turns.length)return {...fallback,selected:null};
 if(turns.length<=20)return fallback;
 const count=20,focus=six?.start??first,start=Math.max(0,Math.min(turns.length-count,focus-5)),end=start+count-1;
 const g=global.HG_SLOPE_GEOMETRY(turns.flatMap(t=>t.points),344,420);
 const bounds=ts=>{const ps=ts.flatMap(t=>t.points).map(g.xy),xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]);return {xmin:Math.min(...xs),xmax:Math.max(...xs),ymin:Math.min(...ys),ymax:Math.max(...ys)};};
 const box=bounds(turns.slice(start,end+1)),f=bounds(six?six.turns:[turns[first]]),k=Math.max(1,Math.min(20,280/Math.max(1,box.xmax-box.xmin),360/Math.max(1,box.ymax-box.ymin)));
 const x=172-(f.xmin+f.xmax)*k/2;let y=168-(f.ymin+f.ymax)*k/2;
 // Preserve the 20-turn window when the preferred focus would clip its ends.
 y=Math.max(24-box.ymin*k,Math.min(y,396-box.ymax*k));
 return {selected:fallback.selected,camera:{k,x,y},initialWindow:{start,end,bestStart:six?.start??null,bestEnd:six?.end??null}};
}
global.HG_INITIAL_VIEW={initial};
})(window);
