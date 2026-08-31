'use strict';
(() => {
  const ROOT='#co70-app';
  function enhance(){
    const app=document.querySelector(ROOT);if(!app)return;
    app.classList.toggle('co73-tablet',window.innerWidth>=520);
    const pill=app.querySelector('.co70-orbit-card .co70-pill');
    const empty=!!pill && /(^|\s)0\s+PEOPLE/i.test(pill.textContent||'');
    app.classList.toggle('co73-empty-network',empty);
    const stage=app.querySelector('.co70-orbit-stage');
    if(stage){
      if(!stage.querySelector('.co73-zone-labels')){
        const z=document.createElement('div');z.className='co73-zone-labels';z.innerHTML='<span class="inner">INNER ORBIT</span><span class="active">ACTIVE SIGNAL</span><span class="outer">OUTER ORBIT</span>';stage.appendChild(z);
      }
      let you=stage.querySelector('.co73-you');
      if(!you){you=document.createElement('span');you.className='co73-you';you.textContent='YOU';stage.querySelector('.co70-centre')?.appendChild(you)}
      let msg=stage.querySelector('.co73-empty-copy');
      if(empty&&!msg){msg=document.createElement('div');msg.className='co73-empty-copy';msg.innerHTML='<strong>Your orbit is ready.</strong><span>Collect people and they will organise around you by relationship strength, contactability and opportunity.</span>';stage.appendChild(msg)}
      if(!empty&&msg)msg.remove();
    }
    const version=app.querySelector('#co70-version');if(version)version.textContent=version.textContent.replace('INTERFACE','UI');
  }
  let raf=0;const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(enhance)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(enhance,120),{once:true});else setTimeout(enhance,120);
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  window.addEventListener('resize',schedule,{passive:true});
})();
