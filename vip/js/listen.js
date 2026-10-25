/* Runs on the ROOT player page (loaded lazily via MP.loadLt). Handles: "listening to" presence (np) and "listen together" rooms. */
import {auth,db,fb} from "./firebase.js";
const CK="vc-cfg";
const npEnabled=()=>{try{return (JSON.parse(localStorage.getItem(CK))||{}).np!==false}catch{return true}};
const sn=s=>({id:String(s.id),title:s.title||"",sub:s.sub||"",thumb:s.thumb||""});
let MPr=null,me=null,off=0,npOn=false,npId=null,npT=0,R=null,done=null;
const subs=new Set(),now=()=>Date.now()+off,rr=id=>fb.ref(db,`rooms/${id}`);
const expPos=st=>(st.playing?(st.posMs||0)+(now()-(st.updatedAt||now())):(st.posMs||0));
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
const state=()=>R?{id:R.id,friend:R.friend,name:R.name,host:R.hostUid===me,other:!!R.other,song:R.st?.song||null,playing:!!R.st?.playing}:null;
function emit(){subs.forEach(f=>{try{f(state())}catch{subs.delete(f)}});pill()}
function seekTo(t){if(!R)return;R.ignSeek=Date.now()+2000;R.cool=Date.now()+8000;MPr.seek(t)}
function apply(st){
  const s=st.song;if(!s||!R)return;
  const t=expPos(st)/1000,c=MPr.song();
  if(!c||c.id!==s.id||!MPr.hasSrc()){
    R.hold=Infinity;R.ignSeek=Date.now()+4000;
    MPr.load(s,()=>R?expPos(R.st)/1000:t,!!st.playing).finally(()=>{if(R)R.hold=Date.now()+1200});
  }else{
    R.hold=Date.now()+1500;
    if(st.playing){if(MPr.paused())MPr.play()}else if(!MPr.paused())MPr.pause();
    if(Math.abs(MPr.pos()-t)>1.2)seekTo(t);
  }
}
function write(songChanged){
  if(!R||R.closed)return;
  const st=R.st||{},seq=(st.seq||0)+1,s=MPr.song();
  const v={playing:MPr.playing(),posMs:Math.round(MPr.pos()*1000),seq,by:me,updatedAt:fb.serverTimestamp()};
  if(songChanged&&s)v.song=sn(s);
  R.st={...st,...v,updatedAt:now()};R.sig=seq+":"+me;
  fb.update(rr(R.id),v).catch(()=>{});emit();
}
function reconcile(kind){
  if(!R||!R.st||!R.st.song||Date.now()<R.hold)return;
  const st=R.st,c=MPr.song();if(!c)return;
  const pl=MPr.playing();
  if(c.id!==st.song.id)return write(true);
  if(pl!==!!st.playing)return write(false);
  if(kind==="seek"&&Date.now()>R.ignSeek&&Math.abs(MPr.pos()*1000-expPos(st))>1500)write(false);
}
function local(kind){if(!R||!R.st)return;clearTimeout(R.lt);R.lt=setTimeout(()=>reconcile(kind),300)}
function drop(r,msg){
  if(R!==r)return;R=null;
  clearTimeout(r.lt);clearInterval(r.chk);r.un.forEach(f=>{try{f()}catch{}});
  if(msg)toast(msg);emit();
}
function attach(id,friend,name,st,first){
  const r=R={id,friend,name,st,sig:st?st.seq+":"+st.by:"",hostUid:st?.host||null,hold:Date.now()+8000,ignSeek:0,cool:0,un:[],lt:0,chk:0,other:false,seen:false,started:!!first};
  r.un.push(fb.onValue(rr(id),s=>{
    if(R!==r)return;const v=s.val();
    if(!v){drop(r,r.seen?`${name} ended the session`:"Session has ended");if(r.started&&!r.seen)MPr.pause();return}
    const fresh=!r.seen;r.seen=true;r.st=v;r.hostUid=v.host;r.other=!!(v.joined&&v.joined[friend]);
    const sig=v.seq+":"+v.by;
    if(fresh){
      fb.update(rr(id),{[`joined/${me}`]:true}).catch(()=>{});
      fb.onDisconnect(fb.ref(db,`rooms/${id}/joined/${me}`)).remove().catch(()=>{});
      if(v.host===me)fb.onDisconnect(rr(id)).remove().catch(()=>{});
    }
    if(v.by!==me&&(fresh||sig!==r.sig))apply(v);
    r.sig=sig;emit();
  },()=>drop(r,"Session unavailable")));
  r.chk=setInterval(()=>{
    if(!R||!R.st?.playing||Date.now()<R.hold||Date.now()<R.cool||MPr.paused()||MPr.waiting()||MPr.rate()!==1)return;
    const t=expPos(R.st)/1000;if(Math.abs(MPr.pos()-t)>1.2)seekTo(t);
  },10000);
  emit();
}
async function leave(){
  const r=R;if(!r)return;
  const host=r.hostUid===me,id=r.id;
  drop(r);
  try{
    if(host){fb.onDisconnect(rr(id)).cancel().catch(()=>{});await fb.remove(rr(id))}
    else{const jr=fb.ref(db,`rooms/${id}/joined/${me}`);fb.onDisconnect(jr).cancel().catch(()=>{});await fb.remove(jr)}
  }catch{}
}
async function start(chatId,friend,name){
  if(!me)return{err:"Sign in again to use this"};
  const s=MPr.song();if(!s)return{err:"Play a song in Musify first"};
  if(R)await leave();
  const wasPlaying=MPr.playing();
  const st={host:me,members:{[me]:true,[friend]:true},song:sn(s),playing:true,posMs:wasPlaying?Math.round(MPr.pos()*1000):0,updatedAt:fb.serverTimestamp(),seq:1,by:me};
  try{await fb.set(rr(chatId),st)}catch{return{err:"Could not start the session"}}
  if(!wasPlaying)MPr.play();
  attach(chatId,friend,name,{...st,updatedAt:now()},false);
  R.hold=Date.now()+2500;
  return{song:sn(s)};
}
/* Must be called straight from a tap: it starts the invited song immediately so mobile autoplay rules are satisfied. */
function join(chatId,friend,name,hint){
  if(!me)return{err:"Sign in again to use this"};
  if(R&&R.id===chatId)return{ok:true};
  if(R)leave();
  let started=false;
  if(hint&&hint.id){started=true;MPr.load(hint,0,true)}
  attach(chatId,friend,name,null,started);
  return{ok:true};
}
const toggle=()=>{if(!R)return;MPr.paused()||!MPr.hasSrc()?MPr.play():MPr.pause()};

/* ---------- small pill on the player page (visible only while chat is closed) ---------- */
let pe=null;
function pill(){
  if(!R){pe?.remove();pe=null;return}
  if(!pe){
    if(!document.getElementById("ltCss")){const c=document.createElement("style");c.id="ltCss";c.textContent="#ltPill{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 8px);z-index:1500;display:flex;align-items:center;gap:10px;max-width:92vw;padding:7px 8px 7px 14px;border-radius:99px;background:rgba(20,18,36,.92);border:1px solid rgba(255,255,255,.14);color:#fff;font:600 12.5px system-ui,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.45);backdrop-filter:blur(12px)}#ltPill span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#ltPill button{border:0;border-radius:99px;padding:6px 12px;background:rgba(255,255,255,.14);color:#fff;font:600 12px system-ui,sans-serif;cursor:pointer}";document.head.append(c)}
    pe=document.createElement("div");pe.id="ltPill";pe.innerHTML='<span></span><button type="button">Leave</button>';
    pe.querySelector("button").onclick=()=>leave();document.body.append(pe);
  }
  pe.querySelector("span").textContent=R.other?`🎧 Listening together with ${R.name}`:`🎧 Waiting for ${R.name} to join`;
}

export function init(MP){
  if(done)return done;
  MPr=MP;
  fb.onValue(fb.ref(db,".info/serverTimeOffset"),s=>{off=s.val()||0});
  fb.onValue(fb.ref(db,".info/connected"),s=>{if(s.val()){npOn=false;npId=null;npSync()}});
  fb.onAuthStateChanged(auth,u=>{const was=me;me=u?u.uid:null;if(was&&!me){npOn=false;npId=null;if(R)drop(R)}npSync()});
  ["play","pause","song","ended"].forEach(e=>MP.on(e,npSync));
  ["play","pause","song","seek"].forEach(e=>MP.on(e,()=>local(e)));
  const lt={state,start,join,leave,toggle,npRefresh:npSync,on:f=>{subs.add(f);return()=>subs.delete(f)}};
  MP.lt=lt;
  done=Promise.resolve(lt);
  return done;
}
