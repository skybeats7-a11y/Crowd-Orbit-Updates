'use strict';
(() => {
  const app=()=>document.querySelector('#co70-app');
  const stage=()=>document.querySelector('#co70-app .co70-orbit-stage');
  const current011=()=>String(document.documentElement.dataset.releaseUi||document.documentElement.dataset.remoteUi||'').startsWith('0.11.');

  function keepAppNavVisible(){
    const a=app();if(!a)return;
    a.classList.remove('co74-nav-hidden');
    a.querySelectorAll('.co74-nav-sensor').forEach(e=>e.remove());
  }

  function spreadOrbitNodes(){
    const s=stage();if(!s)return;
    if(current011())return;
    const nodes=[...s.querySelectorAll('.co70-node')];
    nodes.forEach((node,i)=>{
      const id=Number(node.dataset.person||i+1);
      const score=Number(node.querySelector('em')?.textContent||0);
      const seed=((id*9301+i*49297)%233280)/233280;
      const angle=((id*137.508)+(i*29)+(seed*31))*Math.PI/180;
      let rx,ry;
      if(node.classList.contains('warm')){
        rx=14+seed*5; ry=11+seed*4;
      }else if(node.classList.contains('priority')||score>=78){
        rx=22+seed*5; ry=17+seed*4;
      }else if(node.classList.contains('ready')||score>=58){
        rx=31+seed*5; ry=25+seed*4;
      }else{
        rx=41+seed*5; ry=34+seed*5;
      }
      node.style.left=`${50+Math.cos(angle)*rx}%`;
      node.style.top=`${50+Math.sin(angle)*ry}%`;
    });
  }

  function refineZones(){
    const s=stage();if(!s)return;
    if(current011()){
      s.querySelectorAll('.co74-zones').forEach(el=>el.remove());
      return;
    }
    const zones=s.querySelector('.co74-zones');
    if(zones)zones.classList.add('co75-zones');
    const labels={outer:'DISCOVERY / OUTER',active:'ACTIVE SIGNAL',inner:'INNER ORBIT'};
    Object.entries(labels).forEach(([cls,text])=>{
      const b=s.querySelector(`.co74-zone.${cls} b`);if(b)b.textContent=text;
    });
  }

  function refresh(){keepAppNavVisible();refineZones();spreadOrbitNodes()}
  let raf=0;
  const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(refresh)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,160),{once:true});else setTimeout(refresh,160);
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('resize',schedule,{passive:true});
})();
