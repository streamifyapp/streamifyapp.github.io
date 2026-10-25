/* Chat-side UI for "Listening to" + "Listen together". The engine itself runs on the player page (window.parent.MP.lt). */
export const P=()=>{try{return window.parent!==window?window.parent.MP||null:null}catch{return null}};
export const LT=async()=>{const m=P();if(!m)return null;try{return m.lt||await m.loadLt()}catch{return null}};
let RI;/* live info about this chat's room: undefined = unknown, null = none, object = rejoinable */
export const roomInfo=()=>RI;
const ICONS={
  play:["<path d='M8 5.2v13.6a1 1 0 001.5.86l11-6.8a1 1 0 000-1.72l-11-6.8A1 1 0 008 5.2z'/>",1],
  pause:["<rect x='6' y='4.5' width='4' height='15' rx='1.2'/><rect x='14' y='4.5' width='4' height='15' rx='1.2'/>",1],
  headphones:["<path d='M4 15v-3a8 8 0 0116 0v3'/><path d='M4 15a2 2 0 012-2h1v6H6a2 2 0 01-2-2zM20 15a2 2 0 00-2-2h-1v6h1a2 2 0 002-2z'/>"],
  music:["<path d='M9 18V5l11-2v13'/><circle cx='6' cy='18' r='3'/><circle cx='17' cy='16' r='3'/>"],
  check:["<path d='M5 12.5l4.5 4.5L19 7.5'/>"],
  leave:["<path d='M10 5H6a1 1 0 00-1 1v12a1 1 0 001 1h4M15 8l4 4-4 4M19 12H9'/>"],
  spark:["<path d='M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z'/>"],
  sync:["<path d='M20 11a8 8 0 00-14-4L4 9M4 4v5h5M4 13a8 8 0 0014 4l2-2M20 20v-5h-5'/>"],
  hourglass:["<path d='M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9'/>"]
};
let cssOn=false;
export function css(){if(cssOn)return;cssOn=true;
const ic=Object.entries(ICONS).map(([n,[d,f]])=>`.ico[data-i=${n}]{--m:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${f?"%23000":"none"}' stroke='%23000' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E${d.replace(/</g,"%3C").replace(/>/g,"%3E")}%3C/svg%3E")}`).join("\n");
const c=document.createElement("style");c.textContent=ic+`
.eq{display:inline-flex;align-items:flex-end;gap:2px;width:13px;height:12px;flex:none}
.eq i{flex:1;border-radius:2px;background:currentColor;height:35%;animation:eqb 1s ease-in-out infinite}
.eq i:nth-child(2){animation-delay:-.35s}.eq i:nth-child(3){animation-delay:-.7s}
@keyframes eqb{0%,100%{height:25%}50%{height:100%}}
.no-motion .eq i,.eq.off i{animation:none;height:45%}
.np{display:inline-flex;align-items:center;gap:7px;max-width:100%;min-width:0;vertical-align:bottom;color:var(--c2)}
.np-t{min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:inherit}
.np-t b{font-weight:650}.np-t em{font-style:normal;opacity:.72}
.lt-bar{flex:0 0 auto;display:flex;align-items:center;gap:11px;margin:8px 12px 0;padding:9px 10px 9px 9px;border-radius:18px;background:linear-gradient(135deg,rgba(124,92,255,.26),rgba(34,211,238,.14));border:1px solid rgba(255,255,255,.14);box-shadow:0 6px 22px rgba(0,0,0,.28);color:#fff;backdrop-filter:blur(14px);animation:ltb .3s ease both}
@keyframes ltb{from{opacity:0;transform:translateY(-6px)}}
.lt-bar[hidden]{display:none}
.lt-th{width:42px;height:42px;border-radius:12px;object-fit:cover;background:rgba(255,255,255,.1);flex:0 0 auto}
.lt-m{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.lt-m b{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:650;white-space:nowrap;overflow:hidden}
.lt-m b span{overflow:hidden;text-overflow:ellipsis}
.lt-m small{font-size:11.5px;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-pr{display:block;height:4px;border-radius:4px;background:rgba(255,255,255,.18);margin-top:4px;cursor:pointer;position:relative}
.lt-pr:before{content:"";position:absolute;inset:-8px 0}
.lt-pr u{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:4px;background:#fff;text-decoration:none;transition:width .45s linear}
.lt-bar[data-mode=rj] .lt-pr,.lt-bar[data-mode=rj] .lt-pp,.lt-bar[data-mode=rj] .lt-lv,.lt-bar[data-mode=in] .lt-rj{display:none}
.lt-bar button{border:0;border-radius:99px;background:rgba(255,255,255,.15);color:#fff;font-weight:650;font-size:12px;font-family:inherit;padding:0 13px;height:34px;display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;flex:0 0 auto;transition:transform .15s,background .15s}
.lt-bar button:active{transform:scale(.93)}
.lt-bar .lt-pp{width:38px;height:38px;padding:0;background:#fff;color:#1a1530;font-size:15px}
.lt-bar .lt-rj{background:#fff;color:#1a1530}
.lt-card{display:flex;align-items:center;gap:11px;min-width:224px;padding:2px 0}
.lt-ct{width:46px;height:46px;border-radius:12px;object-fit:cover;background:rgba(255,255,255,.1);flex:0 0 auto}
.lt-ci{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.lt-ci b{display:flex;align-items:center;gap:6px;font-size:13px}
.lt-ci span{font-size:12px;opacity:.8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lt-join{border:0;border-radius:99px;padding:8px 13px;font-weight:650;font-size:12px;font-family:inherit;background:#fff;color:#1a1530;cursor:pointer;flex:0 0 auto;display:inline-flex;align-items:center;gap:5px}
.lt-join:disabled{opacity:.55;cursor:default}
.lt-cs{opacity:.75;font-size:11px;display:inline-flex;align-items:center;gap:4px;flex:0 0 auto}
.lt-card.ended .lt-ci{opacity:.65}
#ltBtn.lt-on{color:var(--c2);background:rgba(255,255,255,.12)}
`;document.head.append(c)}

/* "listening to Title – Artist" or "" */
export function npText(v,name,now){
  const n=v&&v.np;if(!n||!n.title)return"";
  if(n.t&&now-n.t>8*3600e3)return"";
  return`listening to ${n.title}${n.sub?" – "+n.sub:""}`;
}
export const npHtml=(txt,esc)=>{
  if(!txt)return"";
  const b=txt.replace(/^listening to /,""),i=b.indexOf(" – "),t=i>-1?b.slice(0,i):b,s=i>-1?b.slice(i+3):"";
  return`<span class="np"><span class="eq" aria-hidden="true"><i></i><i></i><i></i></span><span class="np-t">Listening to <b>${esc(t)}</b>${s?` <em>· ${esc(s)}</em>`:""}</span></span>`;
};

export function inviteCard(m,mine,esc){
  const l=m.lt||{};
  return`<div class="lt-card"><img class="lt-ct" src="${esc(l.thumb||"")}" alt=""><div class="lt-ci"><b><i class="ico" data-i="headphones"></i>Listen together</b><span>${esc(l.title||"")}${l.sub?" – "+esc(l.sub):""}</span></div>${mine?'<small class="lt-cs" data-lt="st">Invite sent</small>':'<button type="button" class="lt-join" data-lt="join"><i class="ico" data-i="play"></i>Join</button>'}</div>`;
}

/* Bar inside the conversation. Returns an unmount function. */
export function mountBar(chatMain,f,esc,chatId,name){
  css();RI=undefined;
  const list=chatMain.querySelector("#messageList");if(!list)return()=>{};
  const bar=document.createElement("div");bar.className="lt-bar";bar.id="ltBar";bar.hidden=true;
  bar.innerHTML='<img class="lt-th" alt=""><div class="lt-m"><b><span class="eq"><i></i><i></i><i></i></span><span class="lt-t"></span></b><small></small><i class="lt-pr"><u></u></i></div><button type="button" class="lt-pp" aria-label="Play or pause"><i class="ico" data-i="pause"></i></button><button type="button" class="lt-rj"><i class="ico" data-i="sync"></i>Rejoin</button><button type="button" class="lt-lv"><i class="ico" data-i="leave"></i>Leave</button>';
  list.before(bar);
  const mp=P(),$b=s=>bar.querySelector(s);
  let st=null,iv=0,off=()=>{},offPk=()=>{};
  const inRoom=()=>!!st&&!st.offer&&st.friend===f.uid;
  const tick=()=>{
    const d=mp?.dur()||0,pl=!!mp?.playing();
    $b(".lt-pr u").style.width=d?Math.min(100,mp.pos()/d*100)+"%":"0%";
    const ic=$b(".lt-pp i");if(ic.dataset.i!==(pl?"pause":"play"))ic.dataset.i=pl?"pause":"play";
    $b(".eq").classList.toggle("off",!pl||!inRoom());
  };
  const paint=()=>{
    const joined=inRoom(),ri=RI;
    list.querySelectorAll(".lt-card").forEach(c=>{
      const b=c.querySelector("[data-lt=join]"),s=c.querySelector("[data-lt=st]");
      const k=joined?"in":ri===undefined?"?":ri?"live":"end";
      if(c.dataset.s===k)return;c.dataset.s=k;c.classList.toggle("ended",k==="end");
      if(b){b.disabled=k==="in"||k==="end";b.innerHTML=k==="in"?'<i class="ico" data-i="check"></i>Joined':k==="end"?"Ended":'<i class="ico" data-i="play"></i>'+(ri&&ri.joined?"Rejoin":"Join")}
      if(s)s.textContent=k==="in"?"You are in this session":k==="live"?"Session active":k==="end"?"Session ended":"Invite sent";
    });
  };
  const render=()=>{
    clearInterval(iv);
    const joined=inRoom(),ri=RI,mode=joined?"in":ri?"rj":"";
    bar.hidden=!mode;bar.dataset.mode=mode;paint();if(!mode)return;
    const song=joined?st.song:ri.song;
    $b(".lt-t").textContent=joined?(st.other?`Listening together with ${st.name}`:`Waiting for ${st.name} to rejoin`):(ri.other?`${name||"Your friend"} is listening together`:"Session paused, tap to continue");
    $b("small").textContent=song?`${song.title}${song.sub?" – "+song.sub:""}`:"";
    const im=$b(".lt-th"),u=song?.thumb||"";if(/^https?:/.test(u)){if(im.src!==u)im.src=u;im.style.visibility=""}else im.style.visibility="hidden";
    tick();if(joined)iv=setInterval(tick,500);
  };
  $b(".lt-pp").onclick=()=>P()?.lt?.toggle();
  $b(".lt-lv").onclick=()=>P()?.lt?.leave();
  $b(".lt-rj").onclick=async()=>{const lt=await LT();if(!lt)return;const r=await lt.join(chatId,f.uid,name||"Friend");if(r.err)try{window.parent.toast(r.err)}catch{}};
  $b(".lt-pr").onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),d=mp?.dur()||0;if(d)mp.seek((e.clientX-r.left)/r.width*d)};
  const mo=new MutationObserver(()=>paint());mo.observe(list,{childList:true,subtree:true});
  LT().then(lt=>{
    if(!lt||!bar.isConnected)return;
    st=lt.state();off=lt.on(s=>{st=s;render()});
    offPk=lt.peek(chatId,x=>{RI=x;render()});render();
  });
  return()=>{clearInterval(iv);mo.disconnect();try{off()}catch{}try{offPk()}catch{}RI=undefined;bar.remove()};
}
