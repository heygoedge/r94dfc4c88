/* App shell behaviour: launch screen hand-off, native-feel gesture guards, scrubber fill, offline cache. */
(function(){
'use strict';
var root=document.documentElement,host=document.querySelector('.hm-columns');
function fill(input){var min=Number(input.min),max=Number(input.max),v=Number(input.value);input.style.setProperty('--p',max>min?String(Math.max(0,Math.min(1,(v-min)/(max-min)))):'0');}
if(host){
 // The playback module rewrites aria-valuetext on every painted frame; mirror it into the track fill.
 new MutationObserver(function(list){for(var i=0;i<list.length;i++){var t=list[i].target;if(t.matches&&t.matches('[data-motion-seek]'))fill(t);}}).observe(host,{subtree:true,attributes:true,attributeFilter:['aria-valuetext']});
 host.addEventListener('input',function(e){if(e.target.matches('[data-motion-seek]'))fill(e.target);});
}
// Launch screen: leave once the first scene has actually been drawn.
var started=Date.now(),timer=setInterval(function(){
 var state=window.HG_DETAIL&&window.HG_DETAIL.getState().renderState,canvas=document.querySelector('.hm-scene-host canvas'),failed=document.querySelector('.hm-scene-host .hm-empty');
 if(state==='ready'&&(canvas||failed)){clearInterval(timer);requestAnimationFrame(function(){requestAnimationFrame(function(){root.classList.add('app-ready');var seek=document.querySelector('[data-motion-seek]');if(seek)fill(seek);});});return;}
 if(!window.HG_DETAIL||['failed','timeout','incomplete','empty'].indexOf(state)>=0||Date.now()-started>20000){clearInterval(timer);if(window.HG_SPLASH_FAIL)window.HG_SPLASH_FAIL('载入失败，请重试');}
},60);
// Behave like an app, not a page: no pinch/double-tap zoom, no long-press menu, no rubber-band scroll.
['gesturestart','gesturechange','gestureend'].forEach(function(n){document.addEventListener(n,function(e){e.preventDefault();},{passive:false});});
document.addEventListener('touchmove',function(e){if(e.target.closest&&e.target.closest('input[type=range],.hm-scene-host'))return;e.preventDefault();},{passive:false});
document.addEventListener('dblclick',function(e){e.preventDefault();});
document.addEventListener('contextmenu',function(e){e.preventDefault();});
document.addEventListener('dragstart',function(e){e.preventDefault();});
if(navigator.standalone||matchMedia('(display-mode: standalone)').matches)root.classList.add('is-standalone');
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});
})();
