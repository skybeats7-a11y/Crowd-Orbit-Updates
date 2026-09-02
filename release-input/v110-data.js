'use strict';
(() => {
  const prior=window.CrowdOrbitLocalAPI;
  if(!prior||typeof prior.api!=='function')throw new Error('Crowd Orbit 0.10 data engine unavailable');
  const text=v=>String(v??'').replace(/\u00a0/g,' ').trim();
  const lower=v=>text(v).toLowerCase();
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,Number(n)||0));
  const unique=a=>[...new Set(a.filter(Boolean))];
  const EMAIL_RE=/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig;
  const URL_RE=/(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:instagram\.com|tiktok\.com|(?:x|twitter)\.com|youtube\.com|youtu\.be|soundcloud\.com|open\.spotify\.com|linkedin\.com|linktr\.ee|beacons\.ai)\/[^\s<>"']*/ig;
  const RESERVED={
    Instagram:new Set(['p','reel','reels','stories','explore','accounts','direct','tv']),
    TikTok:new Set(['video','discover','tag','music','search']),
    X:new Set(['home','explore','notifications','messages','search','i','intent','share']),
    YouTube:new Set(['watch','shorts','playlist','results','feed','live']),
    SoundCloud:new Set(['discover','stream','you','search']),
    LinkedIn:new Set(['feed','jobs','messaging','search'])
  };
  const ROLE_RULES=[
    ['A&R',/\b(?:a\s*&\s*r|a\s+and\s+r|artists?\s+and\s+repertoire)\b/ig],
    ['Engineer',/\b(?:audio engineer|sound engineer|mix(?:ing)? engineer|mastering engineer|mix(?:ing)?\s*(?:&|and)\s*master(?:ing)?|recording engineer|studio engineer)\b/ig],
    ['Producer',/\b(?:music producer|record producer|executive producer|beat ?maker|producer|beats? by)\b/ig],
    ['Songwriter',/\b(?:song ?writer|composer|lyricist)\b/ig],
    ['Manager',/\b(?:artist manager|music manager|talent manager|management|manager)\b/ig],
    ['DJ',/\b(?:dj|disc jockey)\b/ig],
    ['Label',/\b(?:record label|indie label|label owner|music label)\b/ig],
    ['Media',/\b(?:journalist|editor|radio host|presenter|podcast(?:er| host)?|media|blogger|press|content creator|digital creator)\b/ig],
    ['Artist',/\b(?:recording artist|independent artist|music artist|rapper|singer|vocalist|musician|musician\/band|artist|mc)\b/ig]
  ];
  const PLACES=['London','Birmingham','Manchester','Leeds','Liverpool','Bristol','Sheffield','Nottingham','Leicester','Coventry','Newcastle','Brighton','Oxford','Cambridge','Cardiff','Glasgow','Edinburgh','Belfast','Dublin','New York','Los Angeles','Atlanta','Chicago','Miami','Nashville','Toronto','Vancouver','Paris','Berlin','Amsterdam','Lagos','Accra','Johannesburg','Cape Town','Kingston','Dubai','Sydney','Melbourne'];
  const GENRES=['Hip Hop','Hip-Hop','Rap','Grime','Drill','R&B','RnB','Soul','Afrobeats','Afrobeat','Dancehall','Reggae','Pop','Rock','Indie','Electronic','House','Techno','Garage','UK Garage','Drum and Bass','D&B','Jazz','Gospel','Country','Folk','Classical','Latin','Amapiano'];

  function cleanUrl(v){
    let s=text(v).replace(/[),.;!?\]}]+$/,'');
    if(!/^https?:\/\//i.test(s))s='https://'+s.replace(/^www\./i,'');
    try{return new URL(s).href}catch{return''}
  }
  function socialInfo(value){
    const cleaned=cleanUrl(value);if(!cleaned)return null;
    let u;try{u=new URL(cleaned)}catch{return null}
    const host=u.hostname.toLowerCase().replace(/^www\./,''),parts=u.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    let platform='',handle='',isProfile=false,kind='profile';
    if(host==='instagram.com'||host.endsWith('.instagram.com')){
      platform='Instagram';const first=parts[0]||'';isProfile=Boolean(first&&!RESERVED.Instagram.has(lower(first)));handle=isProfile?first:'';kind=isProfile?'profile':(first||'content');
    }else if(host==='tiktok.com'||host.endsWith('.tiktok.com')){
      platform='TikTok';const first=parts.find(x=>x.startsWith('@'))||'';handle=first.replace(/^@/,'');isProfile=Boolean(handle&&!parts.includes('video'));kind=parts.includes('video')?'video':'profile';
    }else if(host==='x.com'||host.endsWith('.x.com')||host==='twitter.com'||host.endsWith('.twitter.com')){
      platform='X';const first=parts[0]||'';isProfile=Boolean(first&&!RESERVED.X.has(lower(first))&&!parts.includes('status'));handle=isProfile?first:'';kind=parts.includes('status')?'post':'profile';
    }else if(host==='youtube.com'||host.endsWith('.youtube.com')||host==='youtu.be'){
      platform='YouTube';const first=parts[0]||'';if(first.startsWith('@'))handle=first.slice(1);else if(['channel','c','user'].includes(lower(first)))handle=parts[1]||'';isProfile=Boolean(handle&&!RESERVED.YouTube.has(lower(first)));kind=isProfile?'channel':'video';
    }else if(host==='soundcloud.com'||host.endsWith('.soundcloud.com')){
      platform='SoundCloud';const first=parts[0]||'';isProfile=Boolean(first&&!RESERVED.SoundCloud.has(lower(first))&&parts.length===1);handle=isProfile?first:'';kind=isProfile?'profile':'track';
    }else if(host==='open.spotify.com'||host==='spotify.com'){
      platform='Spotify';isProfile=lower(parts[0])==='artist'&&Boolean(parts[1]);handle=isProfile?parts[1]:'';kind=parts[0]||'content';
    }else if(host==='linkedin.com'||host.endsWith('.linkedin.com')){
      platform='LinkedIn';isProfile=['in','company'].includes(lower(parts[0]))&&Boolean(parts[1]);handle=isProfile?parts[1]:'';kind=isProfile?'profile':'content';
    }else return null;
    return {platform,handle:handle?'@'+handle.replace(/^@/,''):'',url:u.href,isProfile,kind};
  }
  function extractUrls(s){return unique((String(s).match(URL_RE)||[]).map(cleanUrl).filter(Boolean))}
  function standaloneHandles(s){
    const withoutEmails=String(s).replace(EMAIL_RE,' '),out=[];
    for(const m of withoutEmails.matchAll(/(^|[\s,(|])@([A-Za-z0-9._-]{2,40})(?=$|[\s,)|])/gm))out.push('@'+m[2]);
    return unique(out);
  }
  function identityKeys(s){
    const out=[];for(const u of extractUrls(s)){const p=socialInfo(u);if(p?.handle)out.push(lower(p.handle));else if(p?.platform)out.push(lower(p.platform+':'+p.kind+':'+u))}
    standaloneHandles(s).forEach(h=>out.push(lower(h)));return unique(out);
  }
  function isIdentityLine(line){
    const s=text(line);return /^@[A-Za-z0-9._-]{2,40}$/.test(s)||Boolean(socialInfo(s))||(/^[^,]{1,90},\s*@[A-Za-z0-9._-]{2,40}(?:,|$)/.test(s));
  }
  function looksStructured(line){
    const s=text(line);if(!s||/^(?:name|username|handle|profile|email|role)(?:\s*[,;|\t])/i.test(s))return false;
    const fields=s.split(/[,;|\t]/).map(text).filter(Boolean);return fields.length>=2&&Boolean(s.match(EMAIL_RE)||socialInfo((s.match(URL_RE)||[])[0]||'')||standaloneHandles(s).length||ROLE_RULES.some(([,r])=>{r.lastIndex=0;return r.test(s)}));
  }
  function segmentProfiles(input){
    const raw=String(input||'').replace(/\r/g,'').trim();if(!raw)return[];
    const lines=raw.split('\n').map(text).filter(Boolean);
    const structured=lines.filter(looksStructured);
    if(structured.length>=2&&structured.length>=Math.ceil(lines.length*.6))return structured.slice(0,250);

    const followerButtons=lines.filter(x=>/^(?:follow|following|requested|connected)$/i.test(x)).length;
    if(followerButtons>=2){
      const groups=[],current=[];
      for(const line of lines){
        if(/^(?:follow|following|requested|connected)$/i.test(line)){
          if(current.length){const recent=current.splice(Math.max(0,current.length-4));if(recent.length>=1){const first=recent[0];if(/^[A-Za-z0-9._-]{2,40}$/.test(first)&&!first.includes(' '))recent[0]='@'+first;groups.push(recent.join('\n'))}current.length=0}
        }else current.push(line);
      }
      if(groups.length>=2)return groups.slice(0,250);
    }

    const paragraphs=raw.split(/\n\s*\n+/).map(text).filter(Boolean);const blocks=[];let current='';let keys=[];
    for(const paragraph of paragraphs){
      const nextKeys=identityKeys(paragraph),different=keys.length&&nextKeys.length&&!nextKeys.some(k=>keys.includes(k));
      if(current&&different){blocks.push(current);current=paragraph;keys=nextKeys}else{current=current?current+'\n'+paragraph:paragraph;keys=unique([...keys,...nextKeys])}
    }
    if(current)blocks.push(current);
    if(blocks.length>1)return blocks.slice(0,250);

    const byIdentity=[];current='';keys=[];
    for(const line of lines){
      const nextKeys=identityKeys(line),different=current&&isIdentityLine(line)&&keys.length&&nextKeys.length&&!nextKeys.some(k=>keys.includes(k));
      if(different){byIdentity.push(current);current=line;keys=nextKeys}else{current=current?current+'\n'+line:line;keys=unique([...keys,...nextKeys])}
    }
    if(current)byIdentity.push(current);return byIdentity.slice(0,250);
  }
  function metricNumber(raw,suffix){
    let value=String(raw||'').replace(/\s/g,'').replace(/,/g,'');let n=Number(value)||0;const s=lower(suffix);
    if(s==='k')n*=1e3;if(s==='m')n*=1e6;if(s==='b')n*=1e9;return Math.round(n);
  }
  function audienceFrom(s){
    const patterns=[
      /([\d,.]+)\s*([kmb]?)\s*(followers?|fans?|subscribers?|monthly listeners?)/ig,
      /(followers?|fans?|subscribers?|monthly listeners?)\s*[:\-]?\s*([\d,.]+)\s*([kmb]?)/ig
    ];
    const found=[];
    for(const m of String(s).matchAll(patterns[0]))found.push({value:metricNumber(m[1],m[2]),label:m[3]});
    for(const m of String(s).matchAll(patterns[1]))found.push({value:metricNumber(m[2],m[3]),label:m[1]});
    return found.sort((a,b)=>b.value-a.value)[0]||{value:0,label:''};
  }
  function rolesFrom(s){
    const hits=[];for(const [role,re] of ROLE_RULES){re.lastIndex=0;const m=re.exec(String(s));if(m)hits.push({role,index:m.index})}
    return hits.sort((a,b)=>a.index-b.index).map(x=>x.role);
  }
  function locationFrom(s){
    const raw=String(s);const marked=raw.match(/(?:📍|based\s+in|location\s*[:\-])\s*([^\n|•]{2,80})/i);
    if(marked){const candidate=text(marked[1]).replace(/[,.]+$/,'');const place=PLACES.find(p=>new RegExp(`\\b${p.replace(/ /g,'\\s+')}\\b`,'i').test(candidate));return place||candidate.slice(0,80)}
    return PLACES.find(p=>new RegExp(`\\b${p.replace(/ /g,'\\s+')}\\b`,'i').test(raw))||'';
  }
  function genreFrom(s){const found=GENRES.find(g=>new RegExp(`\\b${g.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'\\s+')}\\b`,'i').test(String(s)));return found==='Hip-Hop'?'Hip Hop':found==='RnB'?'R&B':found==='D&B'?'Drum and Bass':found||''}
  function phoneFrom(s){
    const labelled=String(s).match(/(?:phone|tel(?:ephone)?|mobile|whats?app|call)\s*[:\-]?\s*((?:\+|00)?\d[\d\s().-]{6,}\d)/i);
    const generic=String(s).match(/(?:\+|00)\d[\d\s().-]{6,}\d/);const value=text(labelled?.[1]||generic?.[0]||'');const digits=value.replace(/\D/g,'');return digits.length>=7&&digits.length<=16?value:'';
  }
  function websiteFrom(urls){return urls.find(u=>!socialInfo(u))||''}
  function humanHandle(h){return text(h).replace(/^@/,'').replace(/[._-]+/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
  function nameFrom(block,handle){
    const lines=String(block).split('\n').map(text).filter(Boolean);const handleKey=lower(handle).replace(/^@/,'');
    for(const line of lines){
      let candidate=line.includes(',')?text(line.split(',')[0]):line;
      if(!candidate||candidate.length>100||/^https?:\/\//i.test(candidate)||/^www\./i.test(candidate)||socialInfo(candidate)||candidate.includes('@')&&candidate.match(EMAIL_RE)||/^@[A-Za-z0-9._-]+$/.test(candidate))continue;
      if(/^(?:follow|following|followers?|message|contact|email|phone|bio|posts?|videos?|likes?|subscribers?|monthly listeners?|musician\/band|digital creator|artist|producer|manager|engineer|songwriter|record label|media)$/i.test(candidate))continue;
      if(/^[\d,.]+\s*[kmb]?\s*(?:posts?|followers?|following|likes?|subscribers?|videos?|monthly listeners?)$/i.test(candidate))continue;
      if(/^(?:posts?|followers?|following|likes?|subscribers?)\s*[\d,.]+/i.test(candidate))continue;
      if(handleKey&&lower(candidate).replace(/^@/,'')===handleKey)continue;
      if(/^[\w.-]+\.[A-Za-z]{2,}(?:\/\S*)?$/.test(candidate))continue;
      return {name:candidate.slice(0,120),derived:false};
    }
    return {name:handle?humanHandle(handle):'',derived:Boolean(handle)};
  }
  function confidenceLabel(n){return n>=70?'Strong':n>=45?'Useful':'Limited'}
  function analyseProfileBlock(block,index){
    const raw=text(block),urls=extractUrls(raw),socials=urls.map(socialInfo).filter(Boolean),profileSocial=socials.find(s=>s.isProfile)||socials[0]||null;
    const handles=standaloneHandles(raw),handle=profileSocial?.handle||handles[0]||'';
    const nameResult=nameFrom(raw,handle),roles=rolesFrom(raw),audience=audienceFrom(raw),emails=unique(raw.match(EMAIL_RE)||[]).map(lower),phone=phoneFrom(raw),location=locationFrom(raw),website=websiteFrom(urls),genre=genreFrom(raw);
    const sourceUrl=profileSocial?.url||socials[0]?.url||'',platform=profileSocial?.platform||socials[0]?.platform||'';
    const evidence=[];
    if(sourceUrl)evidence.push(`${platform||'Social'} ${profileSocial?.isProfile?'profile':'content'} URL`);
    if(handle)evidence.push(`Username ${handle}`);
    if(nameResult.name&&!nameResult.derived)evidence.push(`Display name ${nameResult.name}`);
    if(roles[0])evidence.push(`Role wording: ${roles.join(' + ')}`);
    if(audience.value)evidence.push(`${audience.value.toLocaleString('en-GB')} ${audience.label}`);
    if(location)evidence.push(`Location ${location}`);
    if(emails[0])evidence.push(`Public email ${emails[0]}`);
    if(phone)evidence.push('Public phone / WhatsApp number');
    if(website)evidence.push('External website');
    const contentFacts=[nameResult.name&&!nameResult.derived,roles.length,audience.value,location,emails[0],phone,website,genre].filter(Boolean).length;
    const identity=Boolean(sourceUrl||handle||(nameResult.name&&(roles.length||emails[0]||phone)));
    let confidence=0;if(sourceUrl)confidence+=15;if(handle)confidence+=15;if(nameResult.name&&!nameResult.derived)confidence+=15;if(roles.length)confidence+=15;if(audience.value)confidence+=10;if(location)confidence+=8;if(emails[0])confidence+=12;if(phone)confidence+=12;if(website)confidence+=8;if(genre)confidence+=5;confidence=clamp(confidence,0,100);
    const warnings=[];
    if(profileSocial&&!profileSocial.isProfile)warnings.push(`This is a ${profileSocial.kind} link, not a confirmed profile page.`);
    if(!contentFacts)warnings.push('Only an account route was found. Copy the visible profile header and bio to analyse the actual account.');
    if(!roles.length)warnings.push('No professional role could be verified from the copied wording.');
    if(!audience.value)warnings.push('No follower, subscriber or monthly-listener count was present.');
    if(!identity)warnings.push('No usable person identity was found in this block.');
    const profile={
      preview_id:`profile-${index+1}`,name:nameResult.name||'Unverified profile',handle,role:roles[0]||'Unknown',secondary_roles:roles.slice(1),genre,location,followers:audience.value,relationship:'Discovery',contact_email:emails[0]||'',phone_number:phone,website,platforms:platform?[platform]:[],source_accounts:sourceUrl?[sourceUrl]:[],source_url:sourceUrl,contact_source:sourceUrl||'Copied profile text',notes:`Copied social profile evidence:\n${raw.slice(0,2600)}`,analysis_status:contentFacts?'Analysed':'Needs Evidence',analysis_confidence:confidence,classification_confidence:roles.length?confidence:0,last_analysed_at:new Date().toISOString(),evidence,warnings,confidence,confidence_label:confidenceLabel(confidence),can_save:identity,default_selected:Boolean(identity&&contentFacts),raw_excerpt:raw.slice(0,500),audience_label:audience.label||''
    };
    return profile;
  }
  function parseCopiedSocial(input){
    const blocks=segmentProfiles(input),profiles=blocks.map(analyseProfileBlock),usable=profiles.filter(p=>p.can_save),selected=usable.filter(p=>p.default_selected);
    return {profiles,summary:{blocks:blocks.length,usable:usable.length,ready:selected.length,needs_review:usable.length-selected.length,rejected:profiles.length-usable.length},notice:'Analysis uses only the text and public routes supplied here. It does not access private account or follower data.'};
  }
  function backup(){const raw=prior.exportBackup?.();if(!raw)throw new Error('Local database backup service unavailable');return JSON.parse(raw)}
  function deletePerson(id){
    const personId=Number(id),db=backup(),before=(db.people||[]).length;
    db.people=(db.people||[]).filter(p=>Number(p.id)!==personId);
    if(db.people.length===before)throw new Error('Person not found');
    db.interactions=(db.interactions||[]).filter(i=>Number(i.person_id)!==personId);
    db.campaignPeople=(db.campaignPeople||[]).filter(i=>Number(i.person_id)!==personId);
    prior.importBackup(JSON.stringify(db));
    return {ok:true,deleted:true,id:personId,remaining:db.people.length};
  }
  async function importProfiles(profiles){
    const before=await prior.api('/api/people'),known=new Set((before.people||[]).map(p=>Number(p.id)));let created=0,updated=0,skipped=0;const people=[];
    for(const source of Array.isArray(profiles)?profiles.slice(0,250):[]){
      if(!source?.can_save){skipped++;continue}
      const payload={...source};delete payload.preview_id;delete payload.evidence;delete payload.warnings;delete payload.confidence;delete payload.confidence_label;delete payload.can_save;delete payload.default_selected;delete payload.raw_excerpt;delete payload.audience_label;
      try{const out=await prior.api('/api/people',{method:'POST',body:JSON.stringify(payload)}),person=out.person;if(!person){skipped++;continue}if(known.has(Number(person.id)))updated++;else{created++;known.add(Number(person.id))}people.push(person)}catch{skipped++}
    }
    return {ok:true,total:people.length,created,updated,skipped,people};
  }
  async function activity(){
    const db=backup(),peopleById=new Map((db.people||[]).map(p=>[Number(p.id),p])),items=[];
    for(const p of db.people||[])items.push({type:'Collected',at:p.created_at||p.updated_at||'',person_id:p.id,name:p.name||p.handle,detail:p.platforms?.[0]||'Copied profile'});
    for(const i of db.interactions||[]){const p=peopleById.get(Number(i.person_id));items.push({type:i.type||'Interaction',at:i.at||'',person_id:i.person_id,name:p?.name||'Person',detail:i.note||'Relationship activity'})}
    for(const c of db.campaigns||[])items.push({type:'Campaign',at:c.updated_at||c.created_at||'',name:c.name,detail:c.status||'Draft'});
    return {activity:items.filter(x=>x.at).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,30)};
  }
  async function api(url,opts={}){
    const u=new URL(url,'https://crowd-orbit.local'),path=u.pathname,method=String(opts.method||'GET').toUpperCase();let body={};try{body=opts.body?JSON.parse(opts.body):{}}catch{}
    if(path==='/api/social-preview'&&method==='POST')return parseCopiedSocial(body.text||'');
    if(path==='/api/social-import'&&method==='POST')return importProfiles(body.profiles||[]);
    if(/^\/api\/people\/\d+$/.test(path)&&method==='DELETE')return deletePerson(path.split('/').pop());
    if(path==='/api/activity'&&method==='GET')return activity();
    return prior.api(url,opts);
  }
  window.CrowdOrbitLocalAPI={...prior,api,parseCopiedSocial,removePerson:id=>deletePerson(id)};
})();
