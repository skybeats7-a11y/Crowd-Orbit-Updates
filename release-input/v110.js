'use strict';
(() => {
  const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
  const api=(u,o={})=>window.CrowdOrbitLocalAPI.api(u,o);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const fmt=n=>Number(n||0).toLocaleString('en-GB');
  const ROLES=['Unknown','Artist','Producer','Engineer','Songwriter','Manager','DJ','A&R','Label','Media'];
  const SHARE_KEY='crowd_orbit_share_inbox_v1';
  let working=false,lastPreview=null,shareHandled=false,sharedText='',sharedTitle='',lastConsumedSignature='',lastConsumedAt=0;

  function normaliseShare(raw){
    let value=raw;
    if(typeof value==='string'){
      try{const parsed=JSON.parse(value);if(parsed&&typeof parsed==='object')value=parsed;else value={text:value}}catch{value={text:value}}
    }
    value=value&&typeof value==='object'?value:{};
    const title=text(value.title||value.subject),parts=[value.text,value.share,value.share_url,value.url].map(text).filter(Boolean);
    const unique=[...new Set(parts)];if(title&&!unique.some(x=>x.includes(title)))unique.unshift(title);
    return {text:unique.join('\n').trim(),title};
  }
  function shareSignature(value){return text(value).toLowerCase().replace(/\s+/g,' ').slice(0,4000)}
  function acceptShare(raw,{persist=true}={}){
    const payload=normaliseShare(raw);if(!payload.text)return false;
    const signature=shareSignature(payload.text);
    if(signature===lastConsumedSignature&&Date.now()-lastConsumedAt<5000)return true;
    sharedText=payload.text;sharedTitle=payload.title;shareHandled=false;
    if(persist){try{localStorage.setItem(SHARE_KEY,JSON.stringify({...payload,received_at:new Date().toISOString()}))}catch{}}
    setTimeout(()=>{run();setTimeout(consumeShare,160)},80);return true;
  }
  function recoverShare(){
    if(sharedText)return true;
    try{const saved=localStorage.getItem(SHARE_KEY);return saved?acceptShare(saved,{persist:false}):false}catch{return false}
  }
  const params=new URLSearchParams(location.search),queryShare={};
  ['share','text','share_url','url','title','subject'].forEach(k=>{const value=params.get(k);if(value)queryShare[k]=value});
  if(acceptShare(queryShare)){try{history.replaceState({},'',location.pathname+(location.hash||''))}catch{}}
  else recoverShare();

  function toast(message,tone='ok'){
    let el=$('#co110-toast');if(!el){el=document.createElement('div');el.id='co110-toast';($('#co70-app')||document.body).appendChild(el)}
    el.className=`co110-toast ${tone} show`;el.textContent=message;clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3200);
  }
  function go(view){document.querySelector(`.co70-nav [data-nav="${view}"]`)?.click()}
  function roleOptions(current){return ROLES.map(r=>`<option ${r===current?'selected':''}>${esc(r)}</option>`).join('')}
  function evidenceChips(p){return (p.evidence||[]).map(x=>`<span>${esc(x)}</span>`).join('')||'<span>No verified fields yet</span>'}
  function warnings(p){return (p.warnings||[]).map(x=>`<li>${esc(x)}</li>`).join('')}
  function card(p,index){
    const checked=p.default_selected?'checked':'',disabled=p.can_save?'':'disabled';
    const platform=p.platforms?.[0]||'Copied text',secondary=(p.secondary_roles||[]).join(', ');
    return `<article class="co110-profile ${p.default_selected?'selected':''} ${p.can_save?'':'rejected'}" data-preview-index="${index}">
      <header class="co110-profile-head"><label class="co110-include"><input class="co110-select" type="checkbox" ${checked} ${disabled}><span>${p.default_selected?'Include':'Review first'}</span></label><span class="co110-platform">${esc(platform)}</span><span class="co110-confidence ${String(p.confidence_label||'').toLowerCase()}">${esc(p.confidence_label)} · ${Number(p.confidence||0)}%</span></header>
      <div class="co110-person"><span class="co70-avatar">${esc(String(p.name||p.handle||'?').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase())}</span><div><h3>${esc(p.name||p.handle||'Unverified block')}</h3><p>${esc([p.handle,p.role!=='Unknown'?p.role:'Role not verified',p.location].filter(Boolean).join(' · '))}</p></div><strong class="co110-audience">${p.followers?fmt(p.followers):'—'}<small>${p.audience_label?esc(p.audience_label):'audience'}</small></strong></div>
      <div class="co110-evidence">${evidenceChips(p)}</div>
      ${(p.warnings||[]).length?`<ul class="co110-warnings">${warnings(p)}</ul>`:''}
      <details class="co110-edit" ${!p.default_selected?'open':''}><summary>Review or correct extracted details</summary><div class="co110-fields">
        <label>Name<input data-field="name" value="${esc(p.name==='Unverified profile'?'':p.name||'')}"></label>
        <label>Username<input data-field="handle" value="${esc(p.handle||'')}" placeholder="@username"></label>
        <label>Primary role<select data-field="role">${roleOptions(p.role||'Unknown')}</select></label>
        <label>Secondary roles<input data-field="secondary_roles" value="${esc(secondary)}" placeholder="Producer, Songwriter"></label>
        <label>Location<input data-field="location" value="${esc(p.location||'')}"></label>
        <label>Followers / audience<input data-field="followers" type="number" min="0" value="${Number(p.followers||0)}"></label>
        <label>Email<input data-field="contact_email" type="email" value="${esc(p.contact_email||'')}"></label>
        <label>Phone / WhatsApp<input data-field="phone_number" value="${esc(p.phone_number||'')}"></label>
        <label class="wide">Website<input data-field="website" value="${esc(p.website||'')}"></label>
        <label class="wide">Social profile URL<input data-field="source_url" value="${esc(p.source_url||'')}"></label>
        <label>Relationship<select data-field="relationship">${['Discovery','2nd degree','Warm'].map(x=>`<option ${x===(p.relationship||'Discovery')?'selected':''}>${x}</option>`).join('')}</select></label>
      </div></details>
    </article>`;
  }
  function selectedCount(host){return $$('.co110-select:checked',host).length}
  function updateSelection(host){
    $$('.co110-profile',host).forEach(c=>c.classList.toggle('selected',Boolean($('.co110-select',c)?.checked)));
    const count=selectedCount(host),button=$('#co110-save',host);if(button){button.disabled=count===0;button.textContent=count?`Save ${count} ${count===1?'person':'people'} to Crowd Orbit`:'Choose at least one person'}
  }
  function editedProfile(p,cardEl){
    const value=name=>text(cardEl.querySelector(`[data-field="${name}"]`)?.value),handle=value('handle');
    return {...p,name:value('name')||p.name,handle:handle&&!handle.startsWith('@')?'@'+handle:handle,role:value('role')||'Unknown',secondary_roles:value('secondary_roles').split(',').map(text).filter(Boolean),location:value('location'),followers:Number(value('followers')||0),contact_email:value('contact_email'),phone_number:value('phone_number'),website:value('website'),source_url:value('source_url'),relationship:value('relationship')||'Discovery'};
  }
  function text(v){return String(v??'').trim()}
  async function savePreview(host){
    const chosen=[];$$('.co110-profile',host).forEach((el,index)=>{if($('.co110-select',el)?.checked)chosen.push(editedProfile(lastPreview.profiles[index],el))});
    if(!chosen.length)return;
    const button=$('#co110-save',host),status=$('#co70-collect-result');button.disabled=true;button.textContent='Saving and de-duplicating…';
    try{
      const out=await api('/api/social-import',{method:'POST',body:JSON.stringify({profiles:chosen})});
      status.className='co70-status ok';status.textContent=`${out.created} new · ${out.updated} merged · ${out.skipped} skipped. Nothing was saved before this review.`;
      $('#co70-paste').value='';host.innerHTML=`<div class="co110-saved"><span>✓</span><div><strong>${out.total} ${out.total===1?'person':'people'} saved</strong><p>${out.created} new and ${out.updated} merged with existing records.</p></div><button class="co70-btn ghost" id="co110-open-people">Open People</button></div>`;
      $('#co110-open-people').onclick=()=>go('people');document.querySelector('#co70-refresh')?.click();toast(`${out.total} ${out.total===1?'person':'people'} saved`);
    }catch(err){button.disabled=false;updateSelection(host);status.className='co70-status error';status.textContent=String(err.message||err)}
  }
  function renderPreview(out){
    lastPreview=out;const host=$('#co110-preview'),status=$('#co70-collect-result');if(!host)return;
    if(!out.profiles?.length){host.innerHTML='<div class="co110-empty"><strong>No profile could be identified.</strong><p>Paste the visible account name, username and bio, then try again.</p></div>';status.className='co70-status error';status.textContent='Nothing has been saved.';return}
    host.innerHTML=`<article class="co110-review"><div class="co70-card-head"><div><span class="co70-eyebrow">ANALYSIS PREVIEW</span><h2>Check what Crowd Orbit actually found</h2><p class="co70-sub">${out.summary.usable} usable · ${out.summary.needs_review} need review · ${out.summary.rejected} rejected</p></div><span class="co70-pill">NOT SAVED YET</span></div><div class="co110-profile-list">${out.profiles.map(card).join('')}</div><div class="co110-savebar"><p>Tick only genuine people. Duplicate usernames, URLs and emails will merge.</p><button id="co110-save" class="co70-btn gold">Save to Crowd Orbit</button></div><p class="co110-privacy">${esc(out.notice||'')}</p></article>`;
    $$('.co110-select',host).forEach(x=>x.onchange=()=>updateSelection(host));$('#co110-save',host).onclick=()=>savePreview(host);updateSelection(host);
    status.className='co70-status ok';status.textContent='Analysis complete. Review the evidence below; nothing has been added yet.';
  }
  async function preview(){
    const input=$('#co70-paste'),button=$('#co70-process'),status=$('#co70-collect-result'),raw=input?.value.trim();
    if(!raw){status.className='co70-status error';status.textContent='Paste copied profile information first.';return}
    button.disabled=true;button.textContent='Reading names, bios and audience data…';
    try{renderPreview(await api('/api/social-preview',{method:'POST',body:JSON.stringify({text:raw})}))}catch(err){status.className='co70-status error';status.textContent=String(err.message||err)}finally{button.disabled=false;button.textContent='Analyse copied profiles'}
  }
  function enhanceCollect(){
    const root=$('#co70-collect');if(!root||root.querySelector('.co110-guide'))return;
    const headline=root.querySelector('.co70-headline');if(headline){headline.querySelector('.co70-eyebrow').textContent='SOCIAL PROFILE ANALYSIS';headline.querySelector('h1').innerHTML='Copy a profile.<br>See the evidence.';headline.querySelector('p').textContent='Paste the visible account name, username, bio, audience count, location, links and public contact details. Crowd Orbit analyses the whole profile together and lets you review it before saving.'}
    const panel=root.querySelector('.co70-card');panel?.insertAdjacentHTML('afterbegin','<div class="co110-guide"><span><b>1</b>Open the public profile</span><span><b>2</b>Copy its visible details</span><span><b>3</b>Paste and analyse</span><span><b>4</b>Review before saving</span></div><div class="co110-share-note"><strong>Android Share works too.</strong> If the social app shares only a link, add the copied bio and follower line beneath it so Crowd Orbit has real evidence to analyse.</div>');
    const chips=root.querySelector('.co70-chips');if(chips)chips.innerHTML='<span class="co70-chip active">PREVIEW FIRST</span><span class="co70-chip">BIO + ROLE</span><span class="co70-chip">AUDIENCE</span><span class="co70-chip">PUBLIC CONTACTS</span><span class="co70-chip">DE-DUPLICATION</span>';
    const input=$('#co70-paste');if(input){input.rows=11;input.placeholder='Example copied from a real profile:\n\nJade Stone\n@jadestone\nRecording artist · singer / songwriter\n📍 London\n12.4K followers\nBookings: jade@example.com\nhttps://instagram.com/jadestone\n\nPaste a second profile after a blank line.'}
    const old=$('#co70-process');if(old){const button=old.cloneNode(true);old.replaceWith(button);button.textContent='Analyse copied profiles';button.onclick=preview}
    if(!$('#co110-preview'))panel?.insertAdjacentHTML('afterend','<div id="co110-preview"></div>');
  }
  function consumeShare(){
    if(!sharedText||shareHandled)return;const app=$('#co70-app');if(!app)return;
    if(!$('#co70-collect')?.classList.contains('active')){go('collect');setTimeout(consumeShare,180);return}
    const input=$('#co70-paste');if(!input){setTimeout(consumeShare,120);return}
    const value=sharedText,signature=shareSignature(value);shareHandled=true;lastConsumedSignature=signature;lastConsumedAt=Date.now();
    sharedText='';sharedTitle='';try{localStorage.removeItem(SHARE_KEY)}catch{}
    input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));toast('Shared profile loaded for review');setTimeout(preview,120);
  }
  async function enhanceOrbit(){
    const root=$('#co70-orbit');if(!root)return;
    if(!root.querySelector('.co110-quick')){
      const headline=root.querySelector('.co70-headline');headline?.insertAdjacentHTML('afterend','<div class="co110-quick"><button data-co110-go="collect"><b>＋</b><span><strong>Analyse social profile</strong><small>Paste or share real account details</small></span></button><button data-co110-go="radar"><b>⌖</b><span><strong>Run Radar</strong><small>Find evidence-backed matches</small></span></button><button data-co110-go="people"><b>◎</b><span><strong>Open People</strong><small>Review, edit or delete entries</small></span></button><button data-co110-go="campaigns"><b>↗</b><span><strong>Build campaign</strong><small>Create a ranked contact queue</small></span></button></div>');
      $$('[data-co110-go]',root).forEach(b=>b.onclick=()=>go(b.dataset.co110Go));
    }
    if($('#co110-activity',root))return;
    const out=await api('/api/activity'),rows=out.activity||[];const activity=document.createElement('article');activity.id='co110-activity';activity.className='co70-card co70-pad co110-activity';activity.innerHTML=`<div class="co70-card-head"><div><span class="co70-eyebrow">RECENT ACTIVITY</span><h3>What changed in your orbit</h3></div><button class="co70-chip" data-co110-go="people">OPEN PEOPLE</button></div><div class="co70-list">${rows.length?rows.slice(0,6).map(x=>`<button class="co70-row" ${x.person_id?`data-person="${Number(x.person_id)}"`:''}><span class="co110-activity-icon">${x.type==='Collected'?'＋':x.type==='Campaign'?'↗':'•'}</span><span class="co70-copy"><strong>${esc(x.name||x.type)}</strong><small>${esc(x.type)} · ${esc(x.detail||'')}</small></span><time>${esc(new Date(x.at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}))}</time></button>`).join(''):'<div class="co70-empty">Your imports, relationship notes and campaigns will appear here.</div>'}</div>`;root.appendChild(activity);$('[data-co110-go]',activity)?.addEventListener('click',()=>go('people'));
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest?.('#co80-delete');if(!button)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    const id=Number(button.dataset.deleteId),status=$('#co80-person-status');
    if(button.dataset.confirmDelete!=='1'){
      button.dataset.confirmDelete='1';button.textContent='Tap again to delete permanently';if(status){status.className='co70-status error';status.textContent='This also removes this person from interactions and campaign queues.'}
      clearTimeout(button._confirmTimer);button._confirmTimer=setTimeout(()=>{if(button.isConnected){button.dataset.confirmDelete='0';button.textContent='Delete'}},5000);return;
    }
    button.disabled=true;button.textContent='Deleting…';
    api(`/api/people/${id}`,{method:'DELETE'}).then(result=>{window.CrowdOrbit080?.closePerson?.();document.querySelector('#co70-refresh')?.click();toast(`Person deleted · ${result.remaining} remaining`)}).catch(err=>{button.disabled=false;button.dataset.confirmDelete='0';button.textContent='Delete';if(status){status.className='co70-status error';status.textContent='Delete failed: '+String(err.message||err)}});
  },true);
  async function run(){if(working)return;working=true;try{enhanceCollect();await enhanceOrbit();consumeShare()}catch(e){console.error('Crowd Orbit 0.11 enhancement',e)}finally{working=false}}
  window.CrowdOrbitShare=Object.assign(window.CrowdOrbitShare||{},{receive:raw=>acceptShare(raw)});
  window.addEventListener('crowdorbitshare',event=>acceptShare(event.detail));
  window.addEventListener('pageshow',()=>{recoverShare();setTimeout(run,80)});
  window.addEventListener('focus',()=>{recoverShare();setTimeout(run,80)});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){recoverShare();setTimeout(run,80)}});
  let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(run,90)}).observe(document.documentElement,{subtree:true,childList:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,240),{once:true});else setTimeout(run,240);
})();
