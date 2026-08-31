'use strict';
(() => {
  const TABLET_MIN=620;
  const HIDE_DELAY=2400;
  let hideTimer=0;

  const app=()=>document.querySelector('#co70-app');
  const nav=()=>document.querySelector('#co70-app .co70-nav');
  const tablet=()=>window.innerWidth>=TABLET_MIN;

  function scheduleHide(delay=HIDE_DELAY){
    clearTimeout(hideTimer);
    const a=app();
    if(!a||!tablet())return;
    hideTimer=setTimeout(()=>a.classList.add('co74-nav-hidden'),delay);
  }

  function revealNav(){
    const a=app();if(!a)return;
    a.classList.remove('co74-nav-hidden');
    scheduleHide();
  }

  function installNavBehaviour(){
    const a=app(),n=nav();if(!a||!n||n.dataset.co74)return;
    n.dataset.co74='1';
    const sensor=document.createElement('button');
    sensor.type='button';
    sensor.className='co74-nav-sensor';
    sensor.setAttribute('aria-label','Show Crowd Orbit navigation');
    sensor.innerHTML='<span></span>';
    a.appendChild(sensor);

    sensor.addEventListener('click',revealNav);
    n.addEventListener('pointerdown',revealNav,{passive:true});
    n.addEventListener('click',()=>scheduleHide(1250));

    a.addEventListener('pointerdown',e=>{
      if(!tablet())return;
      if(e.clientY>window.innerHeight-105)revealNav();
    },{passive:true});
    a.addEventListener('scroll',()=>scheduleHide(900),{passive:true});
    window.addEventListener('mousemove',e=>{
      if(tablet()&&e.clientY>window.innerHeight-95)revealNav();
    },{passive:true});

    scheduleHide(3200);
  }

  function installZones(){
    const stage=document.querySelector('#co70-app .co70-orbit-stage');
    if(!stage)return;
    const old=stage.querySelector('.co73-zone-labels');if(old)old.remove();
    if(stage.querySelector('.co74-zones'))return;
    const zones=document.createElement('div');
    zones.className='co74-zones';
    zones.setAttribute('aria-hidden','true');
    zones.innerHTML=`
      <div class="co74-zone outer"><span><b>OUTER ORBIT</b><small>New / weak signal</small></span></div>
      <div class="co74-zone active"><span><b>ACTIVE SIGNAL</b><small>Useful now</small></span></div>
      <div class="co74-zone inner"><span><b>INNER ORBIT</b><small>Strongest relationships</small></span></div>`;
    stage.prepend(zones);
  }

  function refresh(){
    const a=app();if(!a)return;
    a.classList.toggle('co74-tablet',tablet());
    if(!tablet())a.classList.remove('co74-nav-hidden');
    installNavBehaviour();
    installZones();
  }

  let raf=0;const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(refresh)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,150),{once:true});else setTimeout(refresh,150);
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('resize',schedule,{passive:true});
})();
