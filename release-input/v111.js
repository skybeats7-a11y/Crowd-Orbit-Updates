'use strict';
(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const current=()=>String(document.documentElement.dataset.releaseUi||document.documentElement.dataset.remoteUi||'').startsWith('0.11.');
  let readySent=false,raf=0;

  function ensureZones(stage){
    stage.querySelectorAll('.co70-ring,.co70-axis,.co73-zone-labels,.co74-zones,.co90-orbit-halo,.co73-you').forEach(el=>el.remove());
    if(stage.querySelector('.co80-zones'))return;
    const zones=document.createElement('div');zones.className='co80-zones';zones.setAttribute('aria-hidden','true');
    zones.innerHTML='<div class="co80-zone outer"><span><b>DISCOVERY</b><small>new / unproven</small></span></div><div class="co80-zone active"><span><b>ACTIVE SIGNAL</b><small>useful opportunity</small></span></div><div class="co80-zone inner"><span><b>INNER ORBIT</b><small>strong relationship</small></span></div>';
    stage.prepend(zones);
  }

  function place(nodes,rx,ry,phase,zone){
    nodes.sort((a,b)=>Number(a.dataset.person||0)-Number(b.dataset.person||0));
    const total=nodes.length;if(!total)return;
    nodes.forEach((node,index)=>{
      const angle=(phase+(index*360/total))*Math.PI/180;
      node.style.left=`${(50+Math.cos(angle)*rx).toFixed(2)}%`;
      node.style.top=`${(50+Math.sin(angle)*ry).toFixed(2)}%`;
      node.dataset.orbitZone=zone;
    });
  }

  function markReady(){
    const app=$('#co70-app');if(!app||readySent)return;
    readySent=true;app.classList.add('co111-ready');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      try{window.CrowdOrbitNative?.interfaceReady?.()}catch{}
      window.dispatchEvent(new CustomEvent('crowdorbitinterfaceready',{detail:{version:String(document.documentElement.dataset.releaseUi||'0.11.1')}}));
    }));
  }

  function layout(){
    if(!current())return;
    const stage=$('#co70-app .co70-orbit-stage');
    if(!stage){markReady();return}
    ensureZones(stage);
    const nodes=$$('.co70-node',stage),groups={warm:[],priority:[],ready:[],new:[]};
    nodes.forEach(node=>groups[node.classList.contains('warm')?'warm':node.classList.contains('priority')?'priority':node.classList.contains('ready')?'ready':'new'].push(node));
    place(groups.warm,16,12,-90,'inner');
    place(groups.priority,27,20,-38,'priority');
    place(groups.ready,36,28,18,'active');
    place(groups.new,44,35,-10,'discovery');
    stage.classList.add('co111-laid-out');markReady();
  }

  const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(layout)};
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('resize',schedule,{passive:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.CrowdOrbit111={layout};
})();
