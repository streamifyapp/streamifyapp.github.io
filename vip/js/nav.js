// Back-button support: each overlay (premium / chat / DM) pushes one history entry.
// unwind() deliberately does NOT call history.go(): programmatic traversal raced with late popstate
// events (after sign-out) and closed the next overlay, bouncing the user back to the shop.
let n=0;
export function push(){try{history.pushState({v:1},"");n++}catch{}}
export function unwind(){n=0}
window.addEventListener("popstate",()=>{if(n>0)n--;window.dispatchEvent(new Event("velora:back"))});
