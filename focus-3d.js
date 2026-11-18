/* Focus mode switch + fullscreen toggle for the 3D-only view. */
(function(){
 const root=document.documentElement;
 if(/[?&]focus=3d\b/.test(location.search))root.dataset.focus='3d';
 if(root.dataset.focus!=='3d')return;
 const enter='<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',exit='<svg viewBox="0 0 24 24"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
 const btn=document.createElement('button');btn.className='focus3d-fs';btn.type='button';btn.setAttribute('aria-label','全屏');btn.innerHTML=enter;
 const fs=()=>document.fullscreenElement||document.webkitFullscreenElement;
 const paint=()=>{const on=Boolean(fs())||root.classList.contains('focus3d-immersive');btn.innerHTML=on?exit:enter;btn.setAttribute('aria-label',on?'退出全屏':'全屏');};
 btn.addEventListener('click',async()=>{
  if(fs()){await (document.exitFullscreen||document.webkitExitFullscreen).call(document);root.classList.remove('focus3d-immersive');paint();return;}
  if(root.classList.contains('focus3d-immersive')){root.classList.remove('focus3d-immersive');paint();return;}
  const req=root.requestFullscreen||root.webkitRequestFullscreen;
  try{if(req)await req.call(root);else throw 0;}catch(e){}
  root.classList.add('focus3d-immersive');paint();
 });
 document.addEventListener('fullscreenchange',()=>{if(!fs())root.classList.remove('focus3d-immersive');paint();});
 const add=()=>{document.body.appendChild(btn);};
 if(document.body)add();else document.addEventListener('DOMContentLoaded',add);
})();
