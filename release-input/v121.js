'use strict';
(() => {
  const $=(s,r=document)=>r.querySelector(s);
  let timer=0;
  const shell=()=>{try{return String(window.CrowdOrbitNative?.getShellVersion?.()||'')}catch{return''}};
  const enabled=()=>{try{return Boolean(window.CrowdOrbitNative?.isVisibleProfileScanEnabled?.())}catch{return false}};
  function card(){
    const root=$('#co70-settings');
    if(!root)return null;
    let el=$('#co121-visible-scan',root);
    if(el)return el;
    el=document.createElement('article');
    el.id='co121-visible-scan';
    el.className='co70-card co70-panel';
    el.style.marginTop='14px';
    el.innerHTML=`<div class="co70-card-head"><div><span class="co70-eyebrow">VISIBLE PROFILE SCAN</span><h3>Read the profile details you can actually see</h3></div><span class="co70-pill" id="co121-state">CHECKING</span></div>
      <p class="co70-sub" style="margin-top:10px">When enabled, Crowd Orbit can temporarily read visible text from supported social profile screens on this device, then merge it with the shared profile URL and public metadata. The snapshot stays local and is cleared after the share is processed.</p>
      <div class="co70-actions" style="margin-top:14px"><button class="co70-btn gold" id="co121-enable">Enable Visible Profile Scan</button><button class="co70-btn ghost" id="co121-refresh">Refresh status</button></div>
      <div class="co70-status" id="co121-help"></div>`;
    root.appendChild(el);
    $('#co121-enable',el).onclick=()=>{try{window.CrowdOrbitNative?.openVisibleProfileScanSettings?.()}catch{}};
    $('#co121-refresh',el).onclick=refresh;
    return el;
  }
  function refresh(){
    if(!shell().startsWith('0.5.6'))return;
    const el=card();if(!el)return;
    const on=enabled(),state=$('#co121-state',el),button=$('#co121-enable',el),help=$('#co121-help',el);
    if(state){state.textContent=on?'ON':'OFF';state.classList.toggle('active',on)}
    if(button)button.textContent=on?'Visible Profile Scan enabled':'Enable Visible Profile Scan';
    if(help){help.className='co70-status'+(on?'':' error');help.textContent=on?'Ready. Open a supported social profile, leave the visible name/bio/follower area on screen, then Share → Crowd Orbit.':'One-time setup required: tap Enable, find Crowd Orbit in Android Accessibility settings and switch it on. Return here afterwards.'}
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(refresh,120)}
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-nav="settings"]'))setTimeout(refresh,180)},true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(refresh,180)});
  window.addEventListener('focus',()=>setTimeout(refresh,180));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.CrowdOrbit121={refresh};
})();
