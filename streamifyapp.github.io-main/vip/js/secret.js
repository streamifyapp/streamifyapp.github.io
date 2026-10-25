import { unwind } from "./nav.js";
// Closing = clear both views and ask the Musify page (parent) to remove this overlay.
export function backToStore(){
  unwind();
  const chat=document.getElementById("chatView");if(chat){chat.innerHTML="";chat.hidden=true;}
  const pv=document.getElementById("premiumView");if(pv){pv.innerHTML="";pv.hidden=true;}
  document.body.classList.remove("chat-on");
  try{parent.postMessage({vip:"close"},location.origin)}catch{}
}
export function installDisguiseControls(){}
