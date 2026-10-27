/* Instagram Reels panel. Talks to the Worker (/iglogin /igcookie /igfeed /igmedia). Session is kept only in this browser. */
const API = "https://musify-api.musify.workers.dev", KEY = "vc-ig", $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ld = () => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } }, sv = v => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY) } catch { } };
const px = u => u ? `${API}/igmedia?u=${encodeURIComponent(u)}` : "";
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n || 0);
let host, io, kind = "discover", next = "", busy = false, muted = true, st = null;
async function call(path, body, auth) {
  const r = await fetch(API + path, { method: body ? "POST" : "GET", headers: { ...(body ? { "content-type": "application/json" } : {}), ...(auth ? { "x-ig-auth": auth } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok || j.error) throw new Error(j.error || "Request failed (" + r.status + ")"); return j;
}
(() => { if (document.getElementById("rl-css")) return; const s = document.createElement("style"); s.id = "rl-css"; s.textContent = `
#chatView #reelsPanel.rl:not([hidden]){display:block;padding:0;background:#000;overflow:hidden}
.rl-feed{position:absolute;inset:0;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none;overscroll-behavior:contain}.rl-feed::-webkit-scrollbar{display:none}
.rl-it{position:relative;height:100%;scroll-snap-align:start;scroll-snap-stop:always;background:#000;overflow:hidden}
.rl-it video{width:100%;height:100%;object-fit:cover;display:block;background:#000}
.rl-sh{position:absolute;inset:0;pointer-events:none;background:linear-gradient(transparent 55%,rgba(0,0,0,.72))}
.rl-in{position:absolute;left:14px;right:70px;bottom:96px;color:#fff;display:grid;gap:8px;text-shadow:0 1px 6px rgba(0,0,0,.6)}
.rl-u{display:flex;align-items:center;gap:9px;font-weight:700;font-size:14px}.rl-u img{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#222}
.rl-c{font-size:13px;line-height:1.4;max-height:3.9em;overflow:hidden;opacity:.95}
.rl-side{position:absolute;right:10px;bottom:104px;display:grid;gap:16px;justify-items:center;color:#fff;font-size:11px;font-weight:600;text-shadow:0 1px 5px rgba(0,0,0,.6)}
.rl-side a,.rl-side button{display:grid;justify-items:center;gap:3px;background:none;border:0;color:#fff;font:inherit;cursor:pointer;text-decoration:none}
.rl-side svg{width:28px;height:28px}
.rl-top{position:absolute;z-index:3;top:calc(env(safe-area-inset-top,0px) + 10px);left:0;right:0;display:flex;justify-content:center;gap:6px;pointer-events:none}
.rl-top>*{pointer-events:auto}.rl-top button{background:rgba(0,0,0,.35);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:0;color:#ddd;font:600 13px inherit;padding:7px 14px;border-radius:99px;cursor:pointer}
.rl-top button.on{background:#fff;color:#000}
.rl-me{position:absolute;z-index:3;top:calc(env(safe-area-inset-top,0px) + 10px);right:10px;width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.4);background:#222 center/cover;color:#fff;cursor:pointer;font-size:13px}
.rl-pp{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;opacity:0;transition:opacity .2s}.rl-pp.show{opacity:1}
.rl-pp i{width:72px;height:72px;border-radius:50%;background:rgba(0,0,0,.45);display:grid;place-items:center;color:#fff;font-style:normal;font-size:30px}
.rl-bar{position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,.2)}.rl-bar b{display:block;height:100%;width:0;background:#fff}
.rl-note{position:absolute;inset:0;display:grid;place-content:center;gap:12px;text-align:center;color:#ddd;padding:30px;font-size:14px}.rl-note button{justify-self:center}
.rl-lg{position:absolute;inset:0;overflow-y:auto;display:grid;place-items:center;padding:24px 20px 110px}
.rl-card{width:100%;max-width:360px;display:grid;gap:12px;color:#f4f4fa}
.rl-card h2{margin:0;font:500 34px "Playfair Display",serif;text-align:center}.rl-card p{margin:0;color:#8b8ba3;font-size:13px;line-height:1.5;text-align:center}
.rl-card input,.rl-card textarea{width:100%;box-sizing:border-box;padding:13px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.07);color:#fff;font:15px inherit;outline:0}
.rl-card input:focus,.rl-card textarea:focus{border-color:#c13584}
.rl-go{padding:13px;border:0;border-radius:14px;font:700 15px inherit;color:#fff;cursor:pointer;background:linear-gradient(45deg,#f09433,#dc2743 50%,#bc1888)}.rl-go:disabled{opacity:.6}
.rl-tabs{display:flex;gap:6px;background:rgba(255,255,255,.07);padding:4px;border-radius:14px}.rl-tabs button{flex:1;padding:9px;border:0;border-radius:11px;background:none;color:#aaa;font:600 13px inherit;cursor:pointer}.rl-tabs button.on{background:rgba(255,255,255,.15);color:#fff}
.rl-err{color:#ff7a8a;font-size:13px;text-align:center;min-height:1em}.rl-small{font-size:11.5px!important}.rl-ghost{background:none;border:1px solid rgba(255,255,255,.2);color:#ddd;padding:10px 16px;border-radius:12px;cursor:pointer;font:600 13px inherit}
`; document.head.appendChild(s) })();
export function stopReels() { host?.querySelectorAll("video").forEach(v => v.pause()); }
export function mountReels(el) {
  host = el; host.classList.add("rl"); st = ld();
  if (host.dataset.rl === "1") { if (st) host.querySelector(".rl-feed video") && resume(); return; }
  host.dataset.rl = "1"; st ? feedUI() : guestUI();
}
function resume() { const f = $(".rl-feed", host); if (f) f.dispatchEvent(new Event("scroll")); }
function loginUI(tab = "ck", twofa = null, msg = "") {
  host.innerHTML = `<div class="rl-lg"><div class="rl-card"><h2>Instagram Reels</h2><p>Sign in to see your personalised Reels. Instagram blocks password logins from servers, so use the <b>Session cookie</b> tab (most reliable). Nothing is stored on the server; only a session token stays in this browser.</p>
${twofa ? `<input id="rlCode" inputmode="numeric" autocomplete="one-time-code" placeholder="6-digit security code"><button class="rl-go" id="rlGo">Confirm</button>` : `<div class="rl-tabs"><button data-t="pw" class="${tab === "pw" ? "on" : ""}">Username</button><button data-t="ck" class="${tab === "ck" ? "on" : ""}">Session cookie</button></div>
${tab === "pw" ? `<input id="rlU" placeholder="Username" autocapitalize="off" autocomplete="username"><input id="rlP" type="password" placeholder="Password" autocomplete="current-password">` : `<textarea id="rlS" rows="3" placeholder="Paste your sessionid (or the whole Cookie header)"></textarea><p class="rl-small">Log in to instagram.com on a computer, open DevTools → Application → Cookies → instagram.com, copy the <b>sessionid</b> value. Most reliable if password login gets a security check.</p>`}
<button class="rl-go" id="rlGo">Sign in</button>`}
<div class="rl-err" id="rlE">${esc(msg)}</div><button class="rl-ghost" id="rlGuest">Continue without login</button><p class="rl-small">Uses Instagram's unofficial API. Instagram may limit or flag accounts used this way, so a secondary account is safer.</p></div></div>`;
  host.querySelectorAll(".rl-tabs button").forEach(b => b.onclick = () => loginUI(b.dataset.t));
  $("#rlGuest", host).onclick = guestUI;
  const go = $("#rlGo", host), er = $("#rlE", host);
  const run = async () => {
    go.disabled = true; er.textContent = ""; const old = go.textContent; go.textContent = "Please wait…";
    try {
      let r;
      if (twofa) r = await call("/iglogin", { u: twofa.u, code: $("#rlCode", host).value, id: twofa.id, csrf: twofa.csrf, ck: twofa.ck });
      else if (tab === "ck") r = await call("/igcookie", { sid: $("#rlS", host).value });
      else r = await call("/iglogin", { u: $("#rlU", host).value, p: $("#rlP", host).value });
      if (r.twofa) return loginUI(tab, r, "Instagram sent you a security code.");
      st = r; sv(st); feedUI();
    } catch (e) { er.textContent = e.message; go.disabled = false; go.textContent = old; }
  };
  go.onclick = run; host.querySelectorAll("input").forEach(i => i.onkeydown = e => { if (e.key === "Enter") run() });
}

/* ---- no-login mode: public accounts via the Worker (/igpublic) + pasted reel links via Instagram's official embed (loads from the viewer's own IP) ---- */
const SKEY = "vc-ig-src", DEF = ["instagram", "natgeo", "nasa", "9gag", "therock"];
const srcs = () => { try { const a = JSON.parse(localStorage.getItem(SKEY)); if (Array.isArray(a) && a.length) return a } catch { } return DEF.slice() }, sg = a => { try { localStorage.setItem(SKEY, JSON.stringify(a)) } catch { } };
const RL = /instagram\.com\/(?:[\w.]+\/)?(?:reels?|p|tv)\/([\w-]+)/i;
function guestUI() {
  io?.disconnect(); host.dataset.rl = "1";
  host.innerHTML = `<div class="rl-top"><button id="rlAdd">＋ Reel link / @user</button><button id="rlIn">Sign in</button></div><div class="rl-feed" id="rlFeed"></div>`;
  $("#rlIn", host).onclick = () => loginUI("ck");
  $("#rlAdd", host).onclick = () => { const v = (prompt("Paste an Instagram reel link, or a public @username") || "").trim(); if (v) { sg([v, ...srcs().filter(x => x !== v)]); guestUI() } };
  const feed = $("#rlFeed", host); io = obs(feed, () => { });
  const note = html => { feed.innerHTML = `<div class="rl-it"><div class="rl-note">${html}</div></div>` };
  note("Loading reels…");
  const list = srcs();
  Promise.allSettled(list.map(async s => { const m = RL.exec(s); if (m) return [{ embed: 1, code: m[1] }]; return (await call("/igpublic?u=" + encodeURIComponent(s.replace(/^@/, "")))).items })).then(rs => {
    const cols = rs.filter(r => r.status === "fulfilled").map(r => r.value), errs = rs.filter(r => r.status === "rejected").map(r => r.reason.message), all = [];
    for (let i = 0; cols.some(c => i < c.length) && all.length < 60; i++) cols.forEach(c => c[i] && all.push(c[i]));
    if (!all.length) { note(`<div>No reels could be loaded without login.</div><div class="rl-small">${esc(errs[0] || "")}</div><div class="rl-small">Instagram blocks anonymous server requests. Tap <b>＋</b> and paste any reel link to watch it here, or sign in with your session cookie.</div><button class="rl-ghost" id="rlA2">＋ Add reel link</button><button class="rl-ghost" id="rlI2">Sign in</button>`); $("#rlA2", host).onclick = () => $("#rlAdd", host).click(); $("#rlI2", host).onclick = () => loginUI("ck"); return }
    feed.innerHTML = ""; all.forEach(add);
  });
}
function obs(feed, onEnd) {
  return new IntersectionObserver(es => es.forEach(e => {
    const v = e.target.querySelector("video"); if (!v) return;
    if (e.isIntersecting && e.intersectionRatio > .6) { if (!v.src) v.src = px(v.dataset.src); v.muted = muted; v.play().catch(() => { v.muted = true; v.play().catch(() => { }) }); if (e.target === feed.lastElementChild || e.target.nextElementSibling === feed.lastElementChild) onEnd(); }
    else { v.pause(); if (!e.isIntersecting && Math.abs(e.target.offsetTop - feed.scrollTop) > feed.clientHeight * 2) { v.removeAttribute("src"); v.load() } }
  }), { root: feed, threshold: [0, .6] });
}
function feedUI() {
  io?.disconnect(); next = ""; busy = false;
  host.innerHTML = `<div class="rl-top">${[["discover", "For you"], ["connected", "Following"], ["friends", "Friends"]].map(([k, n]) => `<button data-k="${k}" class="${k === kind ? "on" : ""}">${n}</button>`).join("")}</div><button class="rl-me" id="rlMe" title="Account">${st.user?.pic ? "" : esc((st.user?.username || "?")[0].toUpperCase())}</button><div class="rl-feed" id="rlFeed"></div>`;
  if (st.user?.pic) $("#rlMe", host).style.backgroundImage = `url(${px(st.user.pic)})`;
  host.querySelectorAll(".rl-top button").forEach(b => b.onclick = () => { kind = b.dataset.k; feedUI() });
  $("#rlMe", host).onclick = () => { if (confirm(`Signed in as @${st.user?.username}. Sign out of Instagram on this device?`)) { sv(null); st = null; host.dataset.rl = ""; guestUI() } };
  const feed = $("#rlFeed", host);
  io = obs(feed, more);
  more(true);
}
async function more(first) {
  if (busy || (!first && !next)) return; busy = true; const feed = $("#rlFeed", host); if (!feed) return;
  const ld0 = document.createElement("div"); ld0.className = "rl-it"; ld0.innerHTML = `<div class="rl-note">Loading reels…</div>`; feed.appendChild(ld0);
  try {
    const r = await call(`/igfeed?kind=${kind}&max_id=${encodeURIComponent(first ? "" : next)}`, null, st.auth); next = r.next || ""; ld0.remove();
    if (!r.items.length && first) { feed.innerHTML = `<div class="rl-it"><div class="rl-note">No reels here yet.<button class="rl-ghost" id="rlRe">Reload</button></div></div>`; $("#rlRe", host).onclick = feedUI; }
    r.items.forEach(add);
  } catch (e) {
    ld0.innerHTML = `<div class="rl-note"><div>${esc(e.message)}</div><button class="rl-ghost" id="rlRe">Try again</button><button class="rl-ghost" id="rlOut">Sign in again</button><button class="rl-ghost" id="rlGst">Browse without login</button></div>`;
    $("#rlRe", host).onclick = () => { ld0.remove(); busy = false; more(first) }; $("#rlGst", host).onclick = guestUI; $("#rlOut", host).onclick = () => { sv(null); st = null; host.dataset.rl = ""; guestUI() };
  } busy = false;
}
function add(m) {
  const feed = $("#rlFeed", host), d = document.createElement("div"); d.className = "rl-it";
  if (m.embed) { d.innerHTML = `<iframe src="https://www.instagram.com/reel/${esc(m.code)}/embed/" style="width:100%;height:100%;border:0;background:#000" allow="autoplay; encrypted-media; fullscreen" loading="lazy"></iframe>`; feed.appendChild(d); return }
  d.innerHTML = `<video playsinline loop preload="metadata" poster="${esc(px(m.thumb))}" data-src="${esc(m.video)}"></video><div class="rl-sh"></div><div class="rl-pp"><i>❚❚</i></div>
<div class="rl-in"><div class="rl-u"><img src="${esc(px(m.pic))}" alt="">@${esc(m.user)}${m.verified ? " ✔" : ""}</div><div class="rl-c">${esc(m.cap)}</div></div>
<div class="rl-side"><button class="rl-snd"><span class="rl-ic">${muted ? "🔇" : "🔊"}</span></button><div>♥<br>${fmt(m.likes)}</div><div>💬<br>${fmt(m.comments)}</div>${m.code ? `<a href="https://www.instagram.com/reel/${esc(m.code)}/" target="_blank" rel="noopener"><span>↗</span>Open</a>` : ""}</div><div class="rl-bar"><b></b></div>`;
  const v = d.querySelector("video"), pp = d.querySelector(".rl-pp"), bar = d.querySelector(".rl-bar b");
  v.onclick = () => { if (v.paused) { v.play() } else { v.pause() } pp.firstChild.textContent = v.paused ? "▶" : "❚❚"; pp.classList.add("show"); setTimeout(() => pp.classList.remove("show"), 500) };
  v.ontimeupdate = () => { if (v.duration) bar.style.width = v.currentTime / v.duration * 100 + "%" };
  d.querySelector(".rl-snd").onclick = () => { muted = !muted; feed.querySelectorAll("video").forEach(x => x.muted = muted); feed.querySelectorAll(".rl-ic").forEach(x => x.textContent = muted ? "🔇" : "🔊") };
  feed.appendChild(d); io.observe(d);
}
