/* Chat-side UI for "Listening to" + "Listen together". The engine itself runs on the player page (window.parent.MP.lt). */
export const P=()=>{try{return window.parent!==window?window.parent.MP||null:null}catch{return null}};
export const LT=async()=>{const m=P();if(!m)return null;try{return m.lt||await m.loadLt()}catch{return null}};
let cssOn=false;
export function css(){if(cssOn)return;cssOn=true;const c=document.createElement("style");c.textContent=`
.np-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:#8b8b99;margin-right:6px;vertical-align:middle;animation:npp 1.6s ease-in-out infinite}
@keyframes npp{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}
.no-motion .np-dot{animation:none}
.lt-bar{flex:0 0 auto;display:flex;align-items:center;gap:10px;margin:6px 10px 0;padding:8px 10px;border-radius:16px;background:linear-gradient(135deg,rgba(124,92,255,.22),rgba(34,211,238,.14));border:1px solid rgba(255,255,255,.12);color:#fff}
.lt-bar[hidden]{display:none}
.lt-th{width:38px;height:38px;border-radius:10px;object-fit:cover;background:rgba(255,255,255,.08);flex:0 0 auto}
.lt-m{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.lt-m b{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-m small{font-size:11.5px;opacity:.72;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lt-pr{display:block;height:4px;border-radius:4px;background:rgba(255,255,255,.16);margin-top:3px;cursor:pointer;position:relative}
.lt-pr u{position:absolute;left:0;top:0;bottom:0;width:0;border-radius:4px;background:#fff;text-decoration:none}
.lt-bar button{border:0;border-radius:99px;background:rgba(255,255,255,.14);color:#fff;font-weight:600;font-size:12px;font-family:inherit;padding:8px 12px;cursor:pointer;flex:0 0 auto}
.lt-bar .lt-pp{width:36px;height:36px;padding:0;font-size:14px}
.lt-card{display:flex;align-items:center;gap:10px;min-width:210px;padding:2px 0}
.lt-ct{width:44px;height:44px;border-radius:10px;object-fit:cover;background:rgba(255,255,255,.08);flex:0 0 auto}
.lt-ci{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.lt-ci b{font-size:13px}.lt-ci span{font-size:12px;opacity:.78;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lt-join{border:0;border-radius:99px;padding:8px 12px;font-weight:600;font-size:12px;font-family:inherit;background:#fff;color:#1a1530;cursor:pointer;flex:0 0 auto}
.lt-cs{opacity:.7;font-size:11px}
`;document.head.append(c)}

/* "🎵 Name is listening to Title – Artist" or "" */
export function npText(v,name,now){
  const n=v&&v.np;if(!n||!n.title)return"";
  if(n.t&&now-n.t>8*3600e3)return"";
  return`${name} is listening to ${n.title}${n.sub?" – "+n.sub:""}`;
}
export const npHtml=(txt,esc)=>txt?`<i class="np-dot"></i>🎵 ${esc(txt)}`:"";

export function inviteCard(m,mine,esc){
  const l=m.lt||{};
  return`<div class="lt-card"><img class="lt-ct" src="${esc(l.thumb||"")}" alt=""><div class="lt-ci"><b>🎧 Listen together</b><span>${esc(l.title||"")}${l.sub?" – "+esc(l.sub):""}</span></div>${mine?'<small class="lt-cs">Invite sent</small>':'<button type="button" class="lt-join" data-lt="join">Join and play</button>'}</div>`;
}

/* Bar inside the conversation. Returns an unmount function. */
export function mountBar(chatMain,f,esc){
  css();
  const list=chatMain.querySelector("#messageList");if(!list)return()=>{};
  const bar=document.createElement("div");bar.className="lt-bar";bar.id="ltBar";bar.hidden=true;
  bar.innerHTML='<img class="lt-th" alt=""><div class="lt-m"><b></b><small></small><i class="lt-pr"><u></u></i></div><button type="button" class="lt-pp" aria-label="Play or pause">⏸</button><button type="button" class="lt-lv">Leave</button>';
  list.before(bar);
  const mp=P(),$b=s=>bar.querySelector(s);
  let st=null,iv=0;
  const tick=()=>{const d=mp?.dur()||0;$b(".lt-pr u").style.width=d?Math.min(100,mp.pos()/d*100)+"%":"0%";$b(".lt-pp").textContent=mp?.playing()?"⏸":"▶"};
  const render=s=>{
    st=s&&s.friend===f.uid?s:null;bar.hidden=!st;clearInterval(iv);if(!st)return;
    $b("b").textContent=st.other?`Listening together with ${st.name}`:`Waiting for ${st.name} to join`;
    $b("small").textContent=st.song?`${st.song.title}${st.song.sub?" – "+st.song.sub:""}`:"";
    const im=$b(".lt-th"),u=st.song?.thumb||"";if(/^https?:/.test(u)){if(im.src!==u)im.src=u;im.style.visibility=""}else im.style.visibility="hidden";
    tick();iv=setInterval(tick,500);
  };
  $b(".lt-pp").onclick=()=>P()?.lt?.toggle();
  $b(".lt-lv").onclick=()=>P()?.lt?.leave();
  $b(".lt-pr").onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),d=mp?.dur()||0;if(d)mp.seek((e.clientX-r.left)/r.width*d)};
  let off=()=>{};
  LT().then(lt=>{if(!lt||!bar.isConnected)return;render(lt.state());off=lt.on(render)});
  return()=>{clearInterval(iv);try{off()}catch{}bar.remove()};
}
