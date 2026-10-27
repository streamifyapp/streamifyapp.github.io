/* YouTube Shorts panel: no login. Feed from the Worker (/shorts, /shortcomments), playback via the official YouTube embed.
   Feed adapts to what you watch/like (kept only in this browser). */
const API = "https://musify-api.musify.workers.dev", PK = "vc-shp", LK = "vc-shl", $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ld = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d } catch { return d } }, sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { } };
const SEEDS = ["funny", "music", "cricket", "gaming", "cooking", "travel", "tech", "comedy", "dance", "football", "science", "cars", "fitness", "anime", "movie scenes", "life hacks", "bollywood", "street food", "art", "animals"];
const STOP = new Set("this that with from have your what when they them will just like video shorts short about into more best new how the and for are you not but can all out".split(" "));
let host, feed, items = [], seen = new Set(), cur = -1, busy = false, muted = true, ifr = null, t0 = 0, io, P = ld(PK, {}), L = ld(LK, {});
(() => { if (document.getElementById("sh-css")) return; const s = document.createElement("style"); s.id = "sh-css"; s.textContent = `
#chatView #shortsPanel.rl:not([hidden]){display:block;padding:0;background:#000;overflow:hidden}
.sh-feed{position:absolute;inset:0;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:none;overscroll-behavior:contain}.sh-feed::-webkit-scrollbar{display:none}
.sh-it{position:relative;height:100%;scroll-snap-align:start;scroll-snap-stop:always;background:#000 center/cover no-repeat;overflow:hidden}
.sh-it iframe{position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none;background:#000}
.sh-tap{position:absolute;inset:0;z-index:1}
.sh-sh{position:absolute;inset:0;pointer-events:none;background:linear-gradient(transparent 60%,rgba(0,0,0,.75));z-index:1}
.sh-in{position:absolute;z-index:2;left:14px;right:76px;bottom:96px;color:#fff;font-size:14px;line-height:1.4;font-weight:600;text-shadow:0 1px 6px rgba(0,0,0,.7);pointer-events:none;max-height:4.2em;overflow:hidden}
.sh-in small{display:block;opacity:.8;font-weight:500;margin-top:4px}
.sh-side{position:absolute;z-index:2;right:10px;bottom:104px;display:grid;gap:18px;justify-items:center}
.sh-side button{display:grid;justify-items:center;gap:3px;background:none;border:0;color:#fff;font:600 11px inherit;cursor:pointer;text-shadow:0 1px 5px rgba(0,0,0,.7)}
.sh-side svg{width:30px;height:30px;filter:drop-shadow(0 1px 4px rgba(0,0,0,.6))}.sh-side .on svg{fill:#ff2d55;stroke:#ff2d55}
.sh-top{position:absolute;z-index:3;top:calc(env(safe-area-inset-top,0px) + 12px);left:0;right:0;text-align:center;color:#fff;font:700 16px inherit;pointer-events:none;text-shadow:0 1px 6px rgba(0,0,0,.7)}
.sh-note{position:absolute;inset:0;display:grid;place-content:center;gap:12px;text-align:center;color:#ddd;padding:30px;font-size:14px;z-index:2}
.sh-bad{position:absolute;inset:0;display:grid;place-items:center;color:#ccc;font-size:13px;background:rgba(0,0,0,.6);z-index:1;pointer-events:none}
.sh-sheet{position:absolute;z-index:5;left:0;right:0;bottom:0;height:68%;background:#121218;border-radius:22px 22px 0 0;display:flex;flex-direction:column;color:#f4f4fa;box-shadow:0 -10px 40px rgba(0,0,0,.6)}
.sh-sh-h{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;font-weight:700}.sh-sh-h button{background:none;border:0;color:#fff;font-size:20px;cursor:pointer}
.sh-cl{flex:1;overflow-y:auto;padding:0 18px 12px;display:grid;gap:14px;align-content:start}
.sh-c{display:grid;grid-template-columns:34px 1fr;gap:10px;font-size:13px;line-height:1.4}.sh-c img,.sh-c i{width:34px;height:34px;border-radius:50%;background:#2a2a35;object-fit:cover}
.sh-c b{font-size:12px;color:#aaa;font-weight:600}.sh-c span{white-space:pre-wrap;word-break:break-word}
.sh-ft{padding:12px 18px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(255,255,255,.1);text-align:center;font-size:12.5px;color:#9a9ab0}.sh-ft a{color:#fff;font-weight:700}
.sh-btn{background:rgba(255,255,255,.12);border:0;color:#fff;padding:10px 16px;border-radius:12px;cursor:pointer;font:600 13px inherit}
`; document.head.appendChild(s) })();
const ic = { like: '<path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.4 3 5 6.3 5c2 0 3.4 1.1 4.2 2.4h3C14.3 6.1 15.7 5 17.7 5 21 5 22.8 8.4 21.5 11.7 19.5 16.4 12 21 12 21z"/>', cm: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.7A8 8 0 1 1 21 12z"/>', sh: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14"/>', mu: '<path d="M11 5 6 9H3v6h3l5 4zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>', x: '<path d="M4 4l16 16M11 5 6 9H3v6h3l5 4z"/>' };
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const terms = t => [...new Set(String(t).toLowerCase().replace(/#/g, " ").replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(w => w.length >= 4 && !STOP.has(w)))].slice(0, 6);
function learn(it, w) { if (!it) return; for (const k of terms(it.title)) P[k] = (P[k] || 0) + w; const e = Object.entries(P); if (e.length > 200) { e.sort((a, b) => b[1] - a[1]); P = Object.fromEntries(e.slice(0, 120)) } sv(PK, P) }
function queries() {
  const top = Object.entries(P).sort((a, b) => b[1] - a[1]).slice(0, 10), q = [], seed = () => SEEDS[Math.random() * SEEDS.length | 0];
  if (top.length >= 2) { const pick = () => { const tot = top.reduce((s, x) => s + x[1], 0); let r = Math.random() * tot; for (const x of top) if ((r -= x[1]) <= 0) return x[0]; return top[0][0] }; q.push(pick(), pick() + " " + pick(), seed()) } else q.push(seed(), seed(), seed());
  return [...new Set(q)];
}
async function more() {
  if (busy) return; busy = true;
  try {
    for (let tries = 0; tries < 3; tries++) {
      const rs = await Promise.allSettled(queries().map(q => fetch(`${API}/shorts?q=${encodeURIComponent(q)}`).then(r => r.ok ? r.json() : Promise.reject(r.status)))), lists = rs.filter(r => r.status === "fulfilled").map(r => r.value.items || []), fresh = [];
      for (let i = 0; lists.some(l => i < l.length); i++) for (const l of lists) { const x = l[i]; if (x && !seen.has(x.id)) { seen.add(x.id); fresh.push(x) } }
      if (fresh.length) { fresh.sort(() => Math.random() - .5); add(fresh); return }
    }
    if (!items.length) note("Couldn't load Shorts right now.", true)
  } finally { busy = false }
}
function note(m, retry) { const old = $(".sh-note", host); old?.remove(); const d = document.createElement("div"); d.className = "sh-note"; d.innerHTML = `<div>${esc(m)}</div>${retry ? '<button class="sh-btn" id="shRt">Try again</button>' : ""}`; host.appendChild(d); const b = $("#shRt", d); if (b) b.onclick = () => { d.remove(); more() } }
function add(list) {
  $(".sh-note", host)?.remove();
  for (const x of list) {
    const i = items.push(x) - 1, el = document.createElement("div"); el.className = "sh-it"; el.dataset.i = i; el.style.backgroundImage = `url(https://i.ytimg.com/vi/${x.id}/hqdefault.jpg)`;
    el.innerHTML = `<div class="sh-tap"></div><div class="sh-sh"></div><div class="sh-in">${esc(x.title)}${x.ch ? `<small>${esc(x.ch)}</small>` : ""}</div><div class="sh-side"><button data-a="like" class="${L[x.id] ? "on" : ""}">${svg(ic.like)}<span>Like</span></button><button data-a="cm">${svg(ic.cm)}<span>Comments</span></button><button data-a="sh">${svg(ic.sh)}<span>Share</span></button><button data-a="mu">${svg(muted ? ic.x : ic.mu)}<span>${muted ? "Muted" : "Sound"}</span></button></div>`;
    feed.appendChild(el); io.observe(el);
  }
}
function leave() { if (cur < 0) return; const d = (Date.now() - t0) / 1000, it = items[cur]; if (d >= 4) learn(it, d >= 12 ? 2 : 1); if (ifr) { ifr.remove(); ifr = null } }
function play(i) {
  leave(); cur = i; t0 = Date.now(); const it = items[i], el = feed.children[i]; if (!it || !el) return;
  const f = document.createElement("iframe"), id = it.id;
  f.allow = "autoplay; encrypted-media"; f.referrerPolicy = "strict-origin-when-cross-origin";
  f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=${muted ? 1 : 0}&controls=0&playsinline=1&loop=1&playlist=${id}&rel=0&modestbranding=1&fs=0&disablekb=1&iv_load_policy=3&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
  f.onload = () => f.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), "*");
  el.insertBefore(f, el.firstChild); ifr = f; f.dataset.id = id;
  if (i >= items.length - 3) more();
}
const cmd = (f, a) => ifr?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: f, args: a || [] }), "*");
addEventListener("message", e => {
  if (!ifr || e.source !== ifr.contentWindow) return; let d; try { d = JSON.parse(e.data) } catch { return }
  if (d.event === "onError") { const el = ifr.parentNode; const b = document.createElement("div"); b.className = "sh-bad"; b.textContent = "Video unavailable, swipe up"; el.appendChild(b); setTimeout(() => { const n = feed.children[cur + 1]; n && n.scrollIntoView({ behavior: "smooth" }) }, 700) }
});
function share(it) { const u = `https://www.youtube.com/shorts/${it.id}`; if (navigator.share) navigator.share({ title: it.title, url: u }).catch(() => { }); else navigator.clipboard?.writeText(u) }
async function comments(it) {
  host.querySelector(".sh-sheet")?.remove(); const s = document.createElement("div"); s.className = "sh-sheet";
  s.innerHTML = `<div class="sh-sh-h"><span>Comments</span><button aria-label="Close">✕</button></div><div class="sh-cl"><div style="color:#888">Loading…</div></div><div class="sh-ft">Posting needs a YouTube account: <a target="_blank" rel="noopener" href="https://www.youtube.com/shorts/${it.id}">comment on YouTube</a></div>`;
  host.appendChild(s); $("button", s).onclick = () => s.remove(); const list = $(".sh-cl", s); let ct = "", first = true;
  const load = async () => {
    try {
      const j = await fetch(`${API}/shortcomments?id=${it.id}${ct ? "&ct=" + encodeURIComponent(ct) : ""}`).then(r => r.json()); if (first) list.innerHTML = ""; first = false; $(".sh-btn", list)?.remove();
      for (const c of j.items || []) { const d = document.createElement("div"); d.className = "sh-c"; d.innerHTML = `${c.pic ? `<img src="${esc(c.pic)}" alt="" loading="lazy">` : "<i></i>"}<div><b>${esc(c.user)} · ${esc(c.when)}</b><br><span>${esc(c.text)}</span>${c.likes ? `<br><small style="color:#888">♥ ${esc(c.likes)}</small>` : ""}</div>`; list.appendChild(d) }
      if (!list.children.length) list.innerHTML = '<div style="color:#888">No comments (or comments are off).</div>';
      ct = j.next || ""; if (ct) { const b = document.createElement("button"); b.className = "sh-btn"; b.textContent = "Load more"; b.onclick = load; list.appendChild(b) }
    } catch { list.innerHTML = '<div style="color:#ff7a8a">Couldn\'t load comments.</div>' }
  }; load();
}
export function stopShorts() { leave(); cur = -1; if (feed) io?.disconnect() }
export function mountShorts(el) {
  host = el; host.classList.add("rl");
  if (host.dataset.sh === "1") { feed.querySelectorAll(".sh-it").forEach(x => io.observe(x)); return }
  host.dataset.sh = "1"; host.innerHTML = `<div class="sh-top">Shorts</div><div class="sh-feed"></div>`; feed = $(".sh-feed", host);
  io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting && e.intersectionRatio >= .7) { const i = +e.target.dataset.i; if (i !== cur || !ifr) play(i) } }, { root: feed, threshold: [.7] });
  feed.addEventListener("click", e => {
    const el = e.target.closest(".sh-it"); if (!el) return; const it = items[+el.dataset.i], b = e.target.closest("[data-a]");
    if (b) { const a = b.dataset.a; if (a === "like") { L[it.id] ? delete L[it.id] : (L[it.id] = 1, learn(it, 3)); sv(LK, L); b.classList.toggle("on", !!L[it.id]) } else if (a === "cm") comments(it); else if (a === "sh") share(it); else if (a === "mu") { muted = !muted; cmd(muted ? "mute" : "unMute"); feed.querySelectorAll('[data-a="mu"]').forEach(x => x.innerHTML = svg(muted ? ic.x : ic.mu) + `<span>${muted ? "Muted" : "Sound"}</span>`) } }
    else if (e.target.classList.contains("sh-tap") && ifr) { el.dataset.p = el.dataset.p === "1" ? "" : "1"; cmd(el.dataset.p ? "pauseVideo" : "playVideo") }
  });
  more();
}
