'use strict';
(() => {
  const base=window.CrowdOrbitLocalAPI;
  if(!base||typeof base.api!=='function')throw new Error('Crowd Orbit base data engine unavailable');
  const KEY='crowd_orbit_offline_v1';
  const text=v=>String(v??'').trim();
  const lower=v=>text(v).toLowerCase();
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
  const knownRole=v=>/^(artist|producer|engineer|manager|dj|a&r|label|media|songwriter)$/i.test(text(v));
  const validEmail=v=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(text(v));
  const validPhone=v=>{const d=text(v).replace(/\D/g,'');return d.length>=7&&d.length<=16};
  const socialUrl=v=>{try{const h=new URL(text(v)).hostname.toLowerCase();return ['instagram.com','tiktok.com','x.com','twitter.com','youtube.com','soundcloud.com','spotify.com','linkedin.com'].some(x=>h===x||h.endsWith('.'+x))}catch{return false}};
  const profileHandle=v=>/^@[A-Za-z0-9._-]{2,}$/.test(text(v));
  const meaningfulName=v=>{const s=text(v);return s.length>=2&&s.length<=120&&!/^https?:\/\//i.test(s)&&!s.startsWith('@')&&!/^(captured profile|unknown|test|asdf|random)$/i.test(s)};

  function rawDb(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
  function saveDb(db){localStorage.setItem(KEY,JSON.stringify(db))}
  function interactionsFor(id){const db=rawDb();return Array.isArray(db.interactions)?db.interactions.filter(i=>Number(i.person_id)===Number(id)):[]}

  function evidence(p){
    const ints=interactionsFor(p.id);
    const identity=Boolean(socialUrl(p.source_url)||profileHandle(p.handle)||(meaningfulName(p.name)&&(validEmail(p.contact_email)||validPhone(p.phone_number))));
    const direct=validEmail(p.contact_email)||validPhone(p.phone_number);
    const route=socialUrl(p.source_url)||Boolean(text(p.website));
    const role=knownRole(p.role);
    const relationship=['Warm','2nd degree'].includes(text(p.relationship));
    const audience=Number(p.followers||0)>0;
    const overlap=Number(p.source_overlap||0)>0;
    const interaction=ints.length>0||Number(p.interaction_count||0)>0;
    const facts=[role,direct,route,relationship,audience,overlap,interaction].filter(Boolean).length;
    const confidence=clamp((identity?22:0)+(role?18:0)+(direct?18:0)+(route?8:0)+(relationship?14:0)+(audience?8:0)+(overlap?7:0)+(interaction?12:0),0,100);
    return {identity,direct,route,role,relationship,audience,overlap,interaction,facts,confidence,interactions:ints};
  }

  function scored(p){
    const e=evidence(p);
    if(!e.identity||e.facts<2){
      return {value:null,status:'Needs evidence',confidence:e.confidence,reasons:reasonBits(p,e),zone:'Unverified'};
    }
    let s=0;
    if(e.role)s+=18;
    if(validEmail(p.contact_email))s+=8;
    if(validPhone(p.phone_number))s+=8;
    if(e.route)s+=5;
    if(p.relationship==='Warm')s+=24;else if(p.relationship==='2nd degree')s+=12;
    const followers=Number(p.followers||0);
    if(followers>=100000)s+=12;else if(followers>=10000)s+=9;else if(followers>=1000)s+=5;else if(followers>0)s+=2;
    s+=Math.min(12,Number(p.source_overlap||0)*3);
    const ints=e.interactions.length||Number(p.interaction_count||0);
    s+=Math.min(8,ints*2);
    if(p.last_interaction){const age=Math.max(0,(Date.now()-new Date(p.last_interaction).getTime())/86400000);if(age<=7)s+=8;else if(age<=30)s+=4}
    s+=Math.min(15,Math.round(e.confidence*.15));
    s=Math.round(clamp(s,0,100));
    const zone=p.relationship==='Warm'?'Inner Orbit':s>=62?'Active Signal':'Discovery / Outer';
    return {value:s,status:'Scored',confidence:e.confidence,reasons:reasonBits(p,e),zone};
  }

  function reasonBits(p,e=evidence(p)){
    const r=[];
    if(e.role)r.push(`Role identified: ${p.role}`);
    if(validEmail(p.contact_email)||validPhone(p.phone_number))r.push('Direct contact data');
    else if(e.route)r.push('Profile/contact route');
    if(p.relationship==='Warm')r.push('Warm relationship');else if(p.relationship==='2nd degree')r.push('Extended relationship');
    if(Number(p.followers||0)>0)r.push(`Audience: ${Number(p.followers).toLocaleString('en-GB')}`);
    if(Number(p.source_overlap||0)>0)r.push(`${p.source_overlap} source overlap${Number(p.source_overlap)===1?'':'s'}`);
    if(e.interaction)r.push('Interaction history');
    if(!r.length)r.push('Not enough verified context yet');
    return r.slice(0,5);
  }

  function view(p){
    if(!p)return p;
    const q=scored(p);
    return {...p,opportunity_score:q.value,network_score:q.value,orbit_iq:q.value,score_status:q.status,score_confidence:q.confidence,score_reasons:q.reasons,orbit_zone:q.zone,analysis_status:q.value===null?'Needs Evidence':(p.has_contact?'Contact Ready':'Analysed')};
  }

  function lineValidity(line){
    const s=text(line);if(!s)return {ok:false,reason:'Empty line'};
    const hasSocial=(s.match(/https?:\/\/[^\s,;]+/ig)||[]).some(socialUrl);
    const hasHandle=/(^|[\s,(])@[A-Za-z0-9._-]{2,}/.test(s);
    const hasEmail=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(s);
    const phones=s.match(/(?:\+|00)?\d[\d\s().-]{6,}\d/g)||[];
    const hasPhone=phones.some(validPhone);
    const hasRole=/\b(artist|rapper|singer|producer|beatmaker|engineer|manager|dj|a\s*&\s*r|label|media|songwriter|composer)\b/i.test(s);
    const fields=s.split(/[|,;\t]/).map(x=>x.trim()).filter(Boolean);
    const structured=fields.length>=2&&hasRole&&meaningfulName(fields[0]);
    if(hasSocial)return {ok:true,type:'profile link'};
    if(hasHandle)return {ok:true,type:'social handle'};
    if((hasEmail||hasPhone)&&fields.some(meaningfulName))return {ok:true,type:'contact record'};
    if(structured)return {ok:true,type:'structured person'};
    return {ok:false,reason:'No recognisable profile, handle, contact record or structured person'};
  }

  function objectValidity(p){
    if(socialUrl(p?.source_url))return {ok:true,type:'profile link'};
    if(profileHandle(p?.handle))return {ok:true,type:'social handle'};
    if(meaningfulName(p?.name)&&(validEmail(p?.contact_email)||validPhone(p?.phone_number)))return {ok:true,type:'contact record'};
    if(meaningfulName(p?.name)&&knownRole(p?.role))return {ok:true,type:'structured person'};
    return {ok:false,reason:'Add a recognised profile/handle, direct contact, or a name with a recognised role'};
  }

  async function allPeople(){const out=await base.api('/api/people');return (out.people||[]).map(view)}
  function ranked(rows){return rows.slice().sort((a,b)=>(b.opportunity_score??-1)-(a.opportunity_score??-1))}

  async function api(url,opts={}){
    const u=new URL(url,'https://crowd-orbit.local'),path=u.pathname,method=String(opts.method||'GET').toUpperCase();
    let body={};try{body=opts.body?JSON.parse(opts.body):{}}catch{}

    if(path==='/api/analyse'&&method==='POST'&&body.text!==undefined){
      const lines=String(body.text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
      const valid=[],rejected=[];
      for(const line of lines){const v=lineValidity(line);(v.ok?valid:rejected).push(v.ok?line:{line,reason:v.reason})}
      if(!valid.length){const err=new Error('Nothing was added. Crowd Orbit could not identify a genuine person/profile in that information.');err.rejected=rejected;throw err}
      const r=await base.api('/api/analyse',{...opts,body:JSON.stringify({...body,text:valid.join('\n')})});
      return {...r,total:(r.people||[]).length,people:(r.people||[]).map(view),accepted:valid.length,rejected:rejected.length,rejected_items:rejected};
    }
    if(path==='/api/analyse'&&method==='POST'){
      const r=await base.api(url,opts);return {...r,people:(r.people||[]).map(view),priority:(r.people||[]).map(view).filter(p=>p.opportunity_score!==null&&p.opportunity_score>=78).length};
    }
    if(path==='/api/people'&&method==='POST'){
      const v=objectValidity(body);if(!v.ok)throw new Error(v.reason);const r=await base.api(url,opts);return {person:view(r.person)};
    }
    if(path==='/api/people'&&method==='GET'){
      const r=await base.api(url,opts);return {people:ranked((r.people||[]).map(view))};
    }
    if(/^\/api\/people\/\d+$/.test(path)&&method==='PATCH'){
      const r=await base.api(url,opts);return {person:view(r.person)};
    }
    if(path==='/api/dashboard'){
      const people=await allPeople();const scoredPeople=people.filter(p=>p.opportunity_score!==null),warm=people.filter(p=>p.relationship==='Warm').length,second=people.filter(p=>p.relationship==='2nd degree').length;
      const priority=ranked(scoredPeople.filter(p=>p.opportunity_score>=78));
      const contactReady=people.filter(p=>p.has_contact||validEmail(p.contact_email)||validPhone(p.phone_number)||socialUrl(p.source_url)).length;
      const roles={};people.forEach(p=>roles[p.role||'Unknown']=(roles[p.role||'Unknown']||0)+1);
      const next_moves=ranked(scoredPeople).filter(p=>p.opportunity_score>=45).slice(0,5).map(p=>({type:p.relationship==='Warm'?'Relationship':'Evidence-based opportunity',person_id:p.id,name:p.name,detail:p.score_reasons.slice(0,2).join(' · '),priority:p.opportunity_score}));
      return {total:people.length,contacts:contactReady,warm,second,roles,top:ranked(scoredPeople).slice(0,5),next_moves,goals:(await base.api('/api/dashboard')).goals||[],intelligence:{total:people.length,analysed:scoredPeople.length,unverified:people.length-scoredPeople.length,contactReady,priority,missing:people.filter(p=>p.opportunity_score===null).length,roles}};
    }
    if(path==='/api/discover'&&method==='POST'){
      const r=await base.api(url,opts);const people=(r.people||[]).map(view).map(p=>({...p,match_score:p.opportunity_score}));return {...r,people:ranked(people)};
    }
    if(/^\/api\/campaigns\/\d+\/recommend$/.test(path)&&method==='POST'){
      const r=await base.api(url,opts);const people=(r.people||[]).map(view).map(p=>({...p,campaign_score:p.opportunity_score,reason:p.opportunity_score===null?'Needs more evidence before Crowd Orbit can recommend this person.':p.score_reasons.join(', ')+'.'}));return {...r,people:ranked(people)};
    }
    const r=await base.api(url,opts);
    if(r?.person)return {...r,person:view(r.person)};
    return r;
  }

  function personById(id){return allPeople().then(rows=>rows.find(p=>Number(p.id)===Number(id))||null)}
  function removePerson(id){const db=rawDb();db.people=(db.people||[]).filter(p=>Number(p.id)!==Number(id));db.interactions=(db.interactions||[]).filter(i=>Number(i.person_id)!==Number(id));db.campaignPeople=(db.campaignPeople||[]).filter(i=>Number(i.person_id)!==Number(id));saveDb(db);return true}

  window.CrowdOrbitLocalAPI={...base,api,scoreEvidence:scored,evidence,lineValidity,objectValidity,personById,removePerson};
})();
