/* Runs on the ROOT player page (loaded lazily via MP.loadLt). Handles "listening to" presence (np) and "listen together" rooms.
   Room model: rooms/{chatId} = {host,members,song,playing,posMs,updatedAt,seq,by,joined:{uid:true}}
   - joined/{uid} is presence (self-healing, re-armed on every reconnect); the room itself survives disconnects so it can be resumed.
   - Whoever wrote last is the anchor; the other side follows. A periodic safety net repairs any drift or missed event. */
import {auth,db,fb} from "./firebase.js";
const CK="vc-cfg",SK="vc-lt-room",TTL=6*3600e3;
const npEnabled=()=>{try{return (JSON.parse(localStorage.getItem(CK))||{}).np!==false}catch{return true}};
const sn=s=>({id:String(s.id),title:s.title||"",sub:s.sub||"",thumb:s.thumb||""});
const sv=v=>{try{v?localStorage.setItem(SK,JSON.stringify(v)):localStorage.removeItem(SK)}catch{}};
const ld=()=>{try{return JSON.parse(localStorage.getItem(SK))}catch{return null}};
let MPr=null,me=null,off=0,npOn=false,npId=null,npT=0,R=null,done=null,offer=null,authRes;
const authP=new Promise(r=>authRes=r),subs=new Set();
const now=()=>Date.now()+off,rr=id=>fb.ref(db,`rooms/${id}`),jr=id=>fb.ref(db,`rooms/${id}/joined/${me}`);
const expPos=st=>st.playing?(st.posMs||0)+Math.max(0,now()-(st.updatedAt||now())):(st.posMs||0);
const nJoined=v=>Object.keys((v&&v.joined)||{}).length;
const fresh=v=>nJoined(v)>0||now()-(v.updatedAt||0)<TTL;
const toast=t=>{try{window.toast(t)}catch{}};

/* ---------- listening to ---------- */
const npRef=()=>fb.ref(db,`presence/${me}/np`);
function npSync(){clearTimeout(npT);npT=setTimeout(()=>{
  const s=MPr.song();
  if(!me||!npEnabled()||!s||!MPr.playing()){npClear();return}
  if(npOn&&npId===s.id)return;
  npOn=true;npId=s.id;const r=npRef();
  fb.set(r,{...s,t:fb.serverTimestamp()}).catch(()=>{npOn=false});
  fb.onDisconnect(r).remove().catch(()=>{});
},400)}
function npClear(){if(!npOn||!me)return;npOn=false;npId=null;fb.remove(npRef()).catch(()=>{})}

/* ---------- listen together ---------- */
const state=()=>R?{id:R.id,friend:R.friend,name:R.name,host:R.hostUid===me,other:R.other,song:R.st?.song||null,playing:!!R.st?.playing,offer:false}:offer?{...offer,offer:true,other:false,song:null,playing:false}:null;
function emit(){subs.forEach(f=>{try{f(state())}catch{subs.delete(f)}});pill()}
function seekTo(t){if(!R)return;R.ignSeek=Date.now()+2500;R.cool=Date.now()+5000;MPr.seek(t)}

function apply(st){
  const r=R,s=st&&st.song;if(!r||!s)return Promise.resolve();
  const c=MPr.song();
  if(!c||c.id!==s.id||!MPr.hasSrc()){
    r.hold=Infinity;r.ignSeek=Date.now()+4000;
    return Promise.resolve(MPr.load(s,()=>R===r?expPos(r.st)/1000:0,!!st.playing)).catch(()=>{}).then(()=>{if(R===r){r.hold=Date.now()+1200;local("load")}});
  }
  r.hold=Date.now()+1200;
  if(st.playing){if(MPr.paused())MPr.play()}else if(!MPr.paused())MPr.pause();
  const t=expPos(st)/1000;if(Math.abs(MPr.pos()-t)>1.2)seekTo(t);
  return Promise.resolve();
}
function write(songChanged){
  const r=R;if(!r||r.leaving)return;
  const st=r.st||{},seq=(st.seq||0)+1,s=MPr.song();
  const v={playing:MPr.playing(),posMs:Math.round(MPr.pos()*1000),seq,by:me,updatedAt:fb.serverTimestamp()};
  if(songChanged&&s)v.song=sn(s);
  r.st={...st,...v,updatedAt:now()};r.sig=seq+":"+me;
  fb.update(rr(r.id),v).catch(()=>{});emit();
}
function reconcile(kind){
  const r=R;if(!r||r.leaving||!r.st||!r.st.song||Date.now()<r.hold)return;
  const st=r.st,c=MPr.song();if(!c)return;
  if(c.id!==st.song.id){
    /* song ended naturally: let the host's queue win for a moment so both sides don't pick different next songs */
    if(Date.now()-r.endedAt<3500&&r.hostUid!==me){local("song");return}
    return write(true);
  }
  if(MPr.playing()!==!!st.playing)return write(false);
  if(kind==="seek"&&Date.now()>r.ignSeek&&Math.abs(MPr.pos()*1000-expPos(st))>1500)write(false);
}
/* Local player event -> debounce, then compare with the room. A lock window delays the check instead of discarding it. */
function local(kind){
  const r=R;if(!r||!r.st)return;
  if(kind!=="load")r.last=Date.now();
  clearTimeout(r.lt);
  const w=isFinite(r.hold)?Math.max(300,r.hold-Date.now()+80):300;
  r.lt=setTimeout(()=>reconcile(kind),w);
}
/* Safety net every 4s: repairs missed events, silent pauses, buffering drift. */
function net(){
  const r=R;if(!r||r.leaving||r.away||!r.st||!r.st.song)return;
  const t=Date.now();if(t<r.hold||t<r.cool||t-r.last<2500)return;
  const st=r.st,c=MPr.song(),mine=st.by===me;
  if(!c||c.id!==st.song.id||!MPr.hasSrc()||MPr.playing()!==!!st.playing){mine?reconcile("net"):apply(st);return}
  if(!st.playing||MPr.paused()||MPr.waiting()||MPr.rate()!==1)return;
  const e=expPos(st);
  if(Math.abs(MPr.pos()*1000-e)>1500)mine?write(false):seekTo(e/1000);
}
function assert(r){const ref=jr(r.id);fb.set(ref,true).catch(()=>{});fb.onDisconnect(ref).remove().catch(()=>{})}
function partnerGone(r){
  clearTimeout(r.gone);
  r.gone=setTimeout(()=>{
    if(R!==r||r.other||r.leaving)return;
    if(MPr.playing())MPr.pause();
    r.hold=0;write(false);toast(`${r.name} left the session`);emit();
  },3500);
}
function drop(r,msg){
  if(R!==r)return;R=null;
  clearTimeout(r.lt);clearTimeout(r.gone);clearInterval(r.chk);r.un.forEach(f=>{try{f()}catch{}});
  if(msg)toast(msg);emit();
}
function attach(id,friend,name,st,adopt){
  offer=null;
  const r=R={id,friend,name,st,sig:st?st.seq+":"+st.by:"",hostUid:st?.host||null,hold:adopt?0:Date.now()+2500,ignSeek:0,cool:0,un:[],lt:0,chk:0,gone:0,other:false,hadOther:false,seen:false,adopt,away:false,leaving:false,endedAt:0,last:0};
  sv({u:me,id,friend,name,t:Date.now()});
  r.un.push(fb.onValue(rr(id),s=>{
    if(R!==r)return;const v=s.val();
    if(!v){if(r.seen&&MPr.playing())MPr.pause();drop(r,r.seen?`${name} ended the session`:"This session has ended");sv(null);return}
    const first=!r.seen,was=r.other;
    r.seen=true;r.st=v;r.hostUid=v.host;r.other=!!(v.joined&&v.joined[friend]);
    if(!(v.joined&&v.joined[me])&&!r.away&&!r.leaving)assert(r);
    const sig=v.seq+":"+v.by;
    if(first){
      if(r.adopt){
        const resume=!r.other&&!v.playing;
        apply(resume?{...v,playing:true,updatedAt:now()}:v).then(()=>{if(R===r&&resume){r.hold=0;write(false)}});
      }
    }else if(v.by!==me&&sig!==r.sig)apply(v);
    r.sig=sig;
    if(was&&!r.other)partnerGone(r);
    else if(r.other){clearTimeout(r.gone);if(!was&&r.hadOther)toast(`${name} joined`);r.hadOther=true}
    emit();
  },()=>drop(r,"Session unavailable")));
  r.chk=setInterval(net,4000);
  emit();
}
async function leave(){
  const r=R;if(!r){if(offer){offer=null;sv(null);emit()}return}
  r.leaving=true;const id=r.id,ref=jr(id);drop(r);sv(null);
  try{
    fb.onDisconnect(ref).cancel().catch(()=>{});await fb.remove(ref);
    const v=(await fb.get(rr(id))).val();
    if(v&&!nJoined(v))await fb.remove(rr(id));
  }catch{}
}
async function start(chatId,friend,name){
  if(!me)return{err:"Sign in again to use this"};
  const s=MPr.song();if(!s)return{err:"Play a song in Musify first"};
  if(R)await leave();
  const was=MPr.playing();
  const st={host:me,members:{[me]:true,[friend]:true},song:sn(s),playing:true,posMs:was?Math.round(MPr.pos()*1000):0,updatedAt:fb.serverTimestamp(),seq:1,by:me};
  try{await fb.set(rr(chatId),st)}catch{return{err:"Could not start the session"}}
  if(!was)MPr.play();
  attach(chatId,friend,name,{...st,updatedAt:now()},false);
  return{song:sn(s)};
}
/* Call straight from a tap. Joins the room's CURRENT song and position (never the invite's first song). */
async function join(chatId,friend,name){
  if(!me)return{err:"Sign in again to use this"};
  if(R&&R.id===chatId)return{ok:true};
  if(R)leave();
  let v;try{v=(await fb.get(rr(chatId))).val()}catch{return{err:"Could not reach the session"}}
  if(!v||!v.song||!v.members||!v.members[me])return{err:"This session has ended"};
  if(!fresh(v))return{err:"This session has expired"};
  if(R)return{ok:true};
  attach(chatId,friend,name,v,true);
  return{ok:true};
}
const toggle=()=>{if(!R)return;MPr.paused()||!MPr.hasSrc()?MPr.play():MPr.pause()};
/* live info about a room for the chat UI (null when it doesn't exist / expired) */
function peek(id,cb){
  let dead=false,un=()=>{};
  authP.then(()=>{
    if(dead)return;if(!me)return cb(null);
    un=fb.onValue(rr(id),s=>{
      const v=s.val();
      if(!v||!v.song||!v.members||!v.members[me]||!fresh(v))return cb(null);
      const j=v.joined||{};
      cb({song:v.song,playing:!!v.playing,joined:!!j[me],other:Object.keys(j).some(u=>u!==me)});
    },()=>cb(null));
  });
  return()=>{dead=true;un()};
}
async function checkOffer(){
  const sd=ld();if(!sd||!me||sd.u!==me||R)return;
  try{
    const v=(await fb.get(rr(sd.id))).val();
    if(!v||!v.song||!v.members||!v.members[me]||!fresh(v)){sv(null);return}
    if(R)return;
    offer={id:sd.id,friend:sd.friend,name:sd.name};emit();
  }catch{}
}

/* ---------- pill on the player page (visible only while chat is closed) ---------- */
let pe=null;
const IC={hp:'<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15v-3a8 8 0 0116 0v3"/><path d="M4 15a2 2 0 012-2h1v6H6a2 2 0 01-2-2zM20 15a2 2 0 00-2-2h-1v6h1a2 2 0 002-2z"/></svg>',x:'<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'};
function pill(){
  if(!R&&!offer){pe?.remove();pe=null;return}
  if(!pe){
    if(!document.getElementById("ltCss")){const c=document.createElement("style");c.id="ltCss";c.textContent="#ltPill{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 8px);z-index:1500;display:flex;align-items:center;gap:9px;max-width:94vw;padding:6px 7px 6px 12px;border-radius:99px;background:rgba(20,18,36,.92);border:1px solid rgba(255,255,255,.14);color:#fff;font:600 12.5px system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.45);backdrop-filter:blur(12px);animation:ltIn .28s ease both}@keyframes ltIn{from{opacity:0;transform:translate(-50%,-8px)}}#ltPill svg{flex:none;opacity:.9}#ltPill span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#ltPill button{border:0;border-radius:99px;padding:6px 12px;background:rgba(255,255,255,.14);color:#fff;font:600 12px system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:5px;flex:none}#ltPill button.p{background:#fff;color:#1a1530}#ltPill button.i{padding:6px 8px}";document.head.append(c)}
    pe=document.createElement("div");pe.id="ltPill";document.body.append(pe);
  }
  const k=R?(R.other?"t":"w"):"o";
  if(pe.dataset.k!==k){
    pe.dataset.k=k;
    pe.innerHTML=IC.hp+"<span></span>"+(R?'<button type="button" class="l">Leave</button>':'<button type="button" class="p j">Rejoin</button><button type="button" class="i l" aria-label="Dismiss">'+IC.x+'</button>');
    const l=pe.querySelector(".l"),j=pe.querySelector(".j");
    if(l)l.onclick=()=>leave();
    if(j)j.onclick=async()=>{const o=offer;if(!o)return;const r=await join(o.id,o.friend,o.name);if(r.err){toast(r.err);offer=null;sv(null);emit()}};
  }
  pe.querySelector("span").textContent=R?(R.other?`Listening together with ${R.name}`:`Waiting for ${R.name} to join`):`Continue listening with ${offer.name}`;
}

export function init(MP){
  if(done)return done;
  MPr=MP;
  fb.onValue(fb.ref(db,".info/serverTimeOffset"),s=>{off=s.val()||0});
  fb.onValue(fb.ref(db,".info/connected"),s=>{if(s.val()){npOn=false;npId=null;npSync();if(R&&!R.away&&R.seen)assert(R)}});
  fb.onAuthStateChanged(auth,u=>{
    const was=me;me=u?u.uid:null;authRes();
    if(was&&!me){npOn=false;npId=null;offer=null;if(R)drop(R)}
    npSync();if(me)checkOffer();
  });
  [...["play","pause","song","ended"]].forEach(e=>MP.on(e,npSync));
  ["play","pause","song","seek"].forEach(e=>MP.on(e,()=>local(e)));
  MP.on("ended",()=>{if(R)R.endedAt=Date.now()});
  /* leaving the page = leaving the room, so the other person's player stops instead of pretending */
  addEventListener("pagehide",()=>{const r=R;if(r&&!r.leaving&&me){r.away=true;try{fb.remove(jr(r.id))}catch{}}});
  addEventListener("pageshow",()=>{const r=R;if(r&&r.away){r.away=false;assert(r)}});
  addEventListener("online",()=>{if(R&&!R.away)assert(R)});
  const lt={state,start,join,leave,toggle,peek,npRefresh:npSync,on:f=>{subs.add(f);return()=>subs.delete(f)}};
  MP.lt=lt;
  done=Promise.resolve(lt);
  return done;
}
