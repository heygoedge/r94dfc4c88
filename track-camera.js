(function(global){
'use strict';
function clamp(camera){const k=Math.max(1,Math.min(20,camera.k));if(k<=1)return{k:1,x:0,y:0};return{k,x:Math.max(344*(1-k),Math.min(0,camera.x)),y:Math.max(420*(1-k),Math.min(0,camera.y))};}
function zoom(camera,k,from={x:172,y:210},to=from){k=Math.max(1,Math.min(20,k));const ratio=k/camera.k;return clamp({k,x:to.x-(from.x-camera.x)*ratio,y:to.y-(from.y-camera.y)*ratio});}
function step(camera,direction){return zoom(camera,camera.k*(direction==='in'?1.5:1/1.5));}
global.HG_TRACK_CAMERA={clamp,zoom,step};
})(window);
