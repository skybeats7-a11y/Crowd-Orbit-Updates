'use strict';
(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const current=()=>String(document.documentElement.dataset.releaseUi||document.documentElement.dataset.remoteUi||'').startsWith('0.11.');
  const STATE_KEY='crowd_orbit_ui_state_v1';
  const SHARE_KEY='crowd_orbit_share_inbox_v1';
  const VIEWS=new Set(['orbit','radar','people','campaigns','collect','settings']);
  const MAX_STATE_AGE=24*60*60*1000;
  let readySent=false,raf=0,restoreDone=false,saveTimer=0;

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
      window.dispatchEvent(new CustomEvent('crowdorbitinterfaceready',{detail:{version:String(document.documentElement.dataset.releaseUi||document.documentElement.dataset.remoteUi||'0.11.2')}}));
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

  function readState(){
    try{return JSON.parse(localStorage.getItem(STATE_KEY)||'{}')||{}}catch{return{}}
  }
  function activeView(){return $('#co70-app .co70-nav button.active')?.dataset.nav||$('#co70-app .co70-view.active')?.dataset.view||'orbit'}
  function pendingShare(){
    try{
      if(localStorage.getItem(SHARE_KEY))return true;
      const p=new URLSearchParams(location.search);
      return ['share','text','share_url','url','title','subject'].some(k=>Boolean(p.get(k)));
    }catch{return false}
  }
  function captureState(){
    if(!current()||!$('#co70-app'))return;
    const old=readState(),view=activeView(),scroll=old.scroll&&typeof old.scroll==='object'?old.scroll:{};
    scroll[view]=Math.max(0,Math.round(window.scrollY||document.documentElement.scrollTop||0));
    const draft=$('#co70-paste');
    const person=$('#co80-person.open [data-delete-id]');
    const next={...old,view,scroll,at:Date.now(),personId:person?Number(person.dataset.deleteId||0):0};
    if(draft)next.collectDraft=draft.value;
    try{localStorage.setItem(STATE_KEY,JSON.stringify(next))}catch{}
  }
  function queueCapture(delay=90){clearTimeout(saveTimer);saveTimer=setTimeout(captureState,delay)}
  function restoreState(){
    if(restoreDone||!current())return;
    const app=$('#co70-app');if(!app)return;
    const saved=readState();
    if(!saved.at||Date.now()-Number(saved.at)>MAX_STATE_AGE){restoreDone=true;return}
    restoreDone=true;
    if(pendingShare())return;
    const wanted=VIEWS.has(saved.view)?saved.view:'orbit';
    setTimeout(()=>{
      const nav=$(`#co70-app .co70-nav [data-nav="${wanted}"]`);
      if(nav&&activeView()!==wanted)nav.click();
      setTimeout(()=>{
        if(pendingShare())return;
        const draft=$('#co70-paste');
        if(draft&&saved.collectDraft&&!draft.value){draft.value=String(saved.collectDraft);draft.dispatchEvent(new Event('input',{bubbles:true}))}
        const y=Number(saved.scroll?.[wanted]);if(Number.isFinite(y)&&y>0)window.scrollTo(0,y);
        const personId=Number(saved.personId||0);
        if(personId&&window.CrowdOrbit080?.openPerson)window.CrowdOrbit080.openPerson(personId);
      },420);
    },120);
  }

  const schedule=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{layout();restoreState()})};
  new MutationObserver(()=>{schedule();if(restoreDone)queueCapture(160)}).observe(document.documentElement,{subtree:true,childList:true});
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('scroll',()=>queueCapture(180),{passive:true});
  document.addEventListener('pointerdown',e=>{if(e.target.closest?.('#co70-app .co70-nav [data-nav]'))captureState()},true);
  document.addEventListener('click',e=>{if(e.target.closest?.('#co70-app .co70-nav [data-nav]'))queueCapture(180)},false);
  document.addEventListener('input',e=>{if(e.target?.id==='co70-paste')queueCapture(120)},true);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')captureState();else{restoreState();schedule()} });
  window.addEventListener('pagehide',captureState);
  window.addEventListener('blur',captureState);
  window.addEventListener('pageshow',()=>{restoreState();schedule()});
  window.addEventListener('focus',()=>{restoreState();schedule()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.CrowdOrbit111={layout,captureState,restoreState};
})();
