'use strict';
(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const text=v=>String(v??'').trim();
  let timer=0,pendingTest='',apiWrapped=false;
  const shell=()=>{try{return String(window.CrowdOrbitNative?.getShellVersion?.()||'')}catch{return''}};
  function status(){try{return JSON.parse(String(window.CrowdOrbitNative?.instagramConnectionStatus?.()||'{}'))||{}}catch{return{}}}
  function genericName(v){return /^(?:instagram|instagram share|tiktok|tiktok share|x|twitter|youtube|linkedin|soundcloud|spotify|social profile|visible \/ public profile evidence)$/i.test(text(v))}
  function hardenProfile(p){
    if(!p||typeof p!=='object')return p;
    const out={...p};
    if(genericName(out.name)){
      out.name='Unverified profile';
      out.name_derived=true;
      out.default_selected=false;
      out.can_save=false;
      out.warnings=[...(Array.isArray(out.warnings)?out.warnings:[]),'The social platform label is not a person name. Wait for official profile data or enter the real visible name before saving.'];
    }
    const evidence=Array.isArray(out.evidence)?out.evidence:[];
    const hasAudience=evidence.some(x=>/audience|followers|subscribers|monthly listeners/i.test(String(x)))||Number(out.followers||0)>0;
    if(!hasAudience)out.followers=null;
    return out;
  }
  function wrapApi(){
    if(apiWrapped||!window.CrowdOrbitLocalAPI?.api)return;
    apiWrapped=true;
    const prior=window.CrowdOrbitLocalAPI,baseApi=prior.api.bind(prior);
    window.CrowdOrbitLocalAPI={...prior,async api(url,opts={}){
      const out=await baseApi(url,opts);
      if(String(url).includes('/api/social-preview')&&Array.isArray(out?.profiles))return {...out,profiles:out.profiles.map(hardenProfile)};
      return out;
    }};
  }
  function card(){
    if(!shell().startsWith('0.5.7'))return null;
    const root=$('#co70-settings');if(!root)return null;
    let el=$('#co130-instagram',root);if(el)return el;
    el=document.createElement('article');el.id='co130-instagram';el.className='co70-card co70-panel';el.style.marginTop='14px';
    el.innerHTML=`<div class="co70-card-head"><div><span class="co70-eyebrow">INSTAGRAM CONNECTION</span><h3>Official Instagram profile lookup</h3></div><span class="co70-pill" id="co130-state">NOT CONNECTED</span></div>
      <p class="co70-sub" style="margin-top:10px">Connect a dedicated Crowd Orbit / SBM Instagram Professional setup. This is not your personal account. When connected, shared professional Instagram profiles are looked up through Meta first so Crowd Orbit can use the actual profile name, bio and available account metrics.</p>
      <div class="co110-fields" style="margin-top:14px"><label>Instagram Professional Account ID<input id="co130-account" inputmode="numeric" autocomplete="off" placeholder="Dedicated Crowd Orbit / SBM account ID"></label><label>Page access token<input id="co130-token" type="password" autocomplete="new-password" placeholder="Stored encrypted on this device"></label><label class="wide">Test username<input id="co130-test" autocomplete="off" placeholder="e.g. imladyleshurr"></label></div>
      <div class="co70-actions" style="margin-top:14px"><button class="co70-btn gold" id="co130-save">Save & test connection</button><button class="co70-btn ghost" id="co130-refresh">Refresh status</button><button class="co70-btn ghost" id="co130-clear">Disconnect</button></div><div class="co70-status" id="co130-help"></div>
      <p class="co70-sub" style="margin-top:10px;font-size:.86em">The access token is encrypted with Android Keystore. Crowd Orbit does not display it again after saving. Official lookup is for Instagram Business/Creator accounts supported by Meta Business Discovery. Unsupported accounts fall back without inventing missing follower data.</p>`;
    root.appendChild(el);$('#co130-save',el).onclick=saveAndTest;$('#co130-refresh',el).onclick=refresh;$('#co130-clear',el).onclick=clear;return el;
  }
  function refresh(){
    wrapApi();const el=card();if(!el)return;const s=status(),state=$('#co130-state',el),account=$('#co130-account',el),help=$('#co130-help',el);
    if(state)state.textContent=s.configured?'CONNECTED':'NOT CONNECTED';if(account&&s.accountId&&!account.value)account.value=String(s.accountId);
    if(help){help.className='co70-status'+(s.configured?' ok':'');help.textContent=s.configured?'Official Instagram lookup is configured on this device. Share a professional Instagram profile to test the live intake.':'Enter the dedicated Crowd Orbit / SBM Professional Account ID and its Page access token, then test with a professional Instagram username.'}
    hardenRenderedPreview();
  }
  function saveAndTest(){
    const el=card();if(!el)return;const account=text($('#co130-account',el)?.value),token=text($('#co130-token',el)?.value),username=text($('#co130-test',el)?.value).replace(/^@/,'');const help=$('#co130-help',el),button=$('#co130-save',el);
    if(!account||!token){help.className='co70-status error';help.textContent='Add the dedicated Professional Account ID and access token first.';return}
    let saved=false;try{saved=Boolean(window.CrowdOrbitNative?.saveInstagramConnection?.(account,token))}catch{}
    if(!saved){help.className='co70-status error';help.textContent='Crowd Orbit could not securely store those connection details. Check the account ID and token.';return}
    $('#co130-token',el).value='';refresh();if(!username){help.className='co70-status ok';help.textContent='Connection details saved securely. Add a professional username in Test username when you want to verify the live Meta lookup.';return}
    pendingTest='igtest-'+Date.now();button.disabled=true;button.textContent='Testing official Instagram lookup…';help.className='co70-status';help.textContent=`Looking up @${username} through Meta…`;try{window.CrowdOrbitNative.testInstagramConnection(username,pendingTest)}catch{button.disabled=false;button.textContent='Save & test connection';help.className='co70-status error';help.textContent='Could not start the Meta connection test.'}
  }
  function receiveTest(id,raw){
    if(id!==pendingTest)return false;pendingTest='';const el=card();if(!el)return false;let out={};try{out=typeof raw==='string'?JSON.parse(raw):raw||{}}catch{}
    const help=$('#co130-help',el),button=$('#co130-save',el);button.disabled=false;button.textContent='Save & test connection';
    if(out.ok){help.className='co70-status ok';const audience=Object.prototype.hasOwnProperty.call(out,'followers')?` · ${Number(out.followers).toLocaleString('en-GB')} followers`:'';help.textContent=`Connected. Meta returned @${out.username||''}${out.name?' · '+out.name:''}${audience}.`;return true}
    help.className='co70-status error';help.textContent=`Connection saved, but the test lookup failed${out.metaError?' · '+out.metaError:out.error?' · '+out.error:''}. Check the Meta app permissions, account ID and token.`;return false
  }
  function clear(){const el=card();if(!el)return;try{window.CrowdOrbitNative?.clearInstagramConnection?.()}catch{}$('#co130-account',el).value='';$('#co130-token',el).value='';refresh()}
  function hardenRenderedPreview(){
    $$('.co110-profile').forEach(profile=>{
      const heading=$('h3',profile),warnings=$$('.co110-warnings li',profile).map(x=>x.textContent).join(' '),follower=$('[data-field="followers"]',profile);
      if(heading&&genericName(heading.textContent))heading.textContent='Unverified profile';
      if(follower&&/No follower|Only an account route|not present/i.test(warnings)&&Number(follower.value||0)===0)follower.value='';
    });
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>{wrapApi();refresh();hardenRenderedPreview()},130)}
  new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});document.addEventListener('click',e=>{if(e.target.closest?.('[data-nav="settings"]'))setTimeout(refresh,180)},true);window.addEventListener('focus',()=>setTimeout(refresh,180));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();window.CrowdOrbitInstagramConnection={receiveTest,refresh};
})();
