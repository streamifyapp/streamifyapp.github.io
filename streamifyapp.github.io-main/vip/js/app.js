import { renderPremium } from "./premium.js";
import { push as navPush, unwind } from "./nav.js";
import { auth, persistenceReady } from "./firebase.js";
import { backToStore } from "./secret.js";
const $=s=>document.querySelector(s);
const UK="musify-unlock-until",NK="musify-never-ask";
const gap=(p,ms)=>Promise.race([p,new Promise((_,j)=>setTimeout(()=>j(new Error("timeout")),ms))]);
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove("show"),2300);}
window.velora={toast};
const boot=()=>document.querySelector(".vl-boot")?.remove();
async function goPrivate(){navPush();const cv=$("#chatView");$("#premiumView").hidden=true;cv.hidden=false;document.body.classList.add("chat-on");cv.innerHTML='<div class="vl-load"><i></i><p>Opening…</p></div>';
  try{try{await gap((async()=>{await persistenceReady;await auth.authStateReady?.();})(),4000);}catch{}
    if(auth.currentUser){const m=await gap(import("./chat.js"),15000);await m.openChat(auth.currentUser);}else{const m=await gap(import("./auth.js"),15000);m.openAuth();}
  }catch(err){console.error(err);toast("Couldn't open. Please try again.");setTimeout(backToStore,900);}}
async function openPremium(){
  boot();
  try{
    if(localStorage.getItem(NK)==="1"||Number(localStorage.getItem(UK)||0)>Date.now()){await goPrivate();return;}
    localStorage.removeItem(UK);
    renderPremium({onClose:backToStore,onUnlock:m=>{if(m===-1)localStorage.setItem(NK,"1");else if(m>0)localStorage.setItem(UK,String(Date.now()+m*60000));else localStorage.removeItem(UK);goPrivate();}});
    const pv=$("#premiumView");pv.style.pointerEvents="none";pv.hidden=false;navPush();setTimeout(()=>{pv.style.pointerEvents=""},700);
  }catch(err){console.error(err);toast("Please try again.");setTimeout(backToStore,900);}
}
window.addEventListener("velora:back",()=>{if(!$("#chatView").hidden){if(!document.getElementById("chatShell"))backToStore();return;}if(!$("#premiumView").hidden)backToStore();});
openPremium();
