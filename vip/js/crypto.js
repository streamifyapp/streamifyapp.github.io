export async function sha256Hex(value){const bytes=new TextEncoder().encode(value);const digest=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");}
export function safeText(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
export function encodeEmail(email){return email.trim().toLowerCase().replace(/\./g,",");}
export function validUsername(name){return /^[a-z][a-z0-9_.]{2,19}$/.test(name);}
