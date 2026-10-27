/* Musify Shorts: personalised feed (topics + channels, skips, likes, not-interested, synced to your account), send-to-friends DM share, in-app playback. */
import { auth, db, fb } from "./firebase.js";
const API = "https://musify-api.musify.workers.dev", PK = "vc-shp", LK = "vc-shl", SK = "vc-shs", $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ld = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d } catch { return d } }, sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { } };
const SEEDS = ["reels", "bollywood", "comedy", "music", "gaming", "dance", "cars", "fitness", "anime", "memes", "fashion", "travel", "football", "cricket", "edits", "couple", "college", "pranks", "foodie", "tech", "funny memes", "relatable", "roast", "trends", "challenge", "satisfying", "pov", "aesthetic", "glow up", "dance trend"], GEN = SEEDS;
const CATS = [["trending reels","viral reels","instagram reels trending","trending audio reels","gen z reels","tiktok viral reels","viral reels today","main character energy reels"],["dance reels trending","viral dance trend","trending dance challenge","couple dance reels","college dance reels","bollywood dance reels"],["aesthetic reels","cafe aesthetic reels","day in my life reels","grwm reels","get ready with me reels","that girl morning routine reels","pinterest aesthetic reels","aesthetic photo dump reels"],["outfit transition reels","fashion reels india","streetwear outfit reels","ootd reels","boys fit check reels","glow up transformation reels","viral transition reels","makeup transition reels","hairstyle reels"],["couple goals reels","romantic reels","love story edit reels","cute couple reels","soft launch couple reels","talking stage reels","situationship reels","friendship reels"],["attitude reels","sigma edit reels","edit reels trending","car edit reels","bike edit reels","football skills reels","gym reels","gym motivation reels aesthetic"],["sad edit reels","night drive reels","late night vibes reels","aesthetic sad reels","bollywood edit reels"],["funny reels india","pov reels","relatable reels","college life reels","hostel life reels","campus vibes reels","girls vs boys reels","comedy skit reels"],["travel reels india","mumbai vlog reels","delhi college vibes reels","cafe hopping reels","street food reels aesthetic","cute dog reels","satisfying reels","anime edit reels"]], IN = CATS.flat();
const LANGS = ["hindi", "english", "marathi", "tamil", "telugu", "punjabi", "bengali", "gujarati", "kannada", "malayalam", "bhojpuri"], LG = "vc-shg";
const INRX = /india|desi|hindi|bollywood|ipl|mumbai|delhi|punjabi|tamil|telugu|marathi|bhojpuri|kannada|malayalam|bengali|gujarati|bharat|kohli|dhoni|rohit|shahrukh|salman|kolkata|bangalore|chennai|hyderabad/i;
const indian = x => { const s = (x.title || "") + " " + (x.ch || ""); return /[\u0900-\u0D7F]/.test(s) || INRX.test(s) };
const HL = { hindi: "hi", marathi: "mr", tamil: "ta", telugu: "te", punjabi: "pa", bengali: "bn", gujarati: "gu", kannada: "kn", malayalam: "ml" };
const rnd = a => a[Math.random() * a.length | 0];
const STOP = new Set("this that with from have your what when they them will just like video shorts short about into more best new how the and for are you not but can all out".split(" "));
let drag = false, host, feed, items = [], seen = new Set(ld(SK, [])), cur = -1, busy = false, muted = false, ifr = false, t0 = 0, io, P = ld(PK, {}), L = ld(LK, {}), friends = null, syncT, skipRun = 0;
(() => { if (document.getElementById("sh-css")) return; const s = document.createElement("style"); s.id = "sh-css"; s.textContent = `
#chatView #shortsPanel.rl:not([hidden]){display:block;padding:0;background:#000;overflow:hidden}
.sh-feed{position:absolute;inset:0;overflow:hidden;touch-action:none;overscroll-behavior:contain}.sh-feed::-webkit-scrollbar{display:none}
.sh-it{position:relative;height:100%;scroll-snap-align:start;background:#000 center/cover no-repeat;overflow:hidden}
.sh-feed{z-index:1}.sh-pl{position:absolute;inset:0;z-index:0;opacity:0;transition:opacity .3s;pointer-events:none;background:#000}.sh-pl.on{opacity:1}.sh-pl iframe{position:absolute;inset:0;width:100%;height:100%;border:0;pointer-events:none}.sh-it.pl{background:none!important}
.sh-tap{position:absolute;inset:0;z-index:1}
.sh-sh{position:absolute;inset:0;pointer-events:none;background:linear-gradient(transparent 60%,rgba(0,0,0,.75));z-index:1}
.sh-in{position:absolute;z-index:2;left:12px;right:62px;bottom:84px;color:#fff;font-size:12.5px;line-height:1.35;font-weight:600;text-shadow:0 1px 6px rgba(0,0,0,.7);pointer-events:none;max-height:2.7em;overflow:hidden}
.sh-in small{display:block;opacity:.8;font-weight:500;margin-top:4px}
.sh-side{position:absolute;z-index:2;right:8px;bottom:86px;display:grid;gap:15px;justify-items:center}
.sh-side button{display:grid;justify-items:center;background:none;border:0;padding:2px;color:#fff;cursor:pointer}
.sh-side svg{width:24px;height:24px;filter:drop-shadow(0 1px 4px rgba(0,0,0,.6))}.sh-side .on svg{fill:#ff2d55;stroke:#ff2d55}
.sh-top{position:absolute;z-index:3;top:calc(env(safe-area-inset-top,0px) + 12px);left:0;right:0;text-align:center;color:#fff;font:700 16px inherit;pointer-events:none;text-shadow:0 1px 6px rgba(0,0,0,.7)}
.sh-note{position:absolute;inset:0;display:grid;place-content:center;gap:12px;text-align:center;color:#ddd;padding:30px;font-size:14px;z-index:2}
.sh-bad{position:absolute;inset:0;display:grid;place-items:center;color:#ccc;font-size:13px;background:rgba(0,0,0,.6);z-index:1;pointer-events:none}
.sh-cl{flex:1;overflow-y:auto;padding:0 18px 12px;display:grid;gap:14px;align-content:start}
.sh-c{display:grid;grid-template-columns:34px 1fr;gap:10px;font-size:13px;line-height:1.4}.sh-c img,.sh-c i{width:34px;height:34px;border-radius:50%;background:#2a2a35;object-fit:cover}
.sh-c b{font-size:12px;color:#aaa;font-weight:600}.sh-c span{white-space:pre-wrap;word-break:break-word}
.sh-ft{padding:12px 18px calc(12px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(255,255,255,.1);text-align:center;font-size:12.5px;color:#9a9ab0}.sh-ft a{color:#fff;font-weight:700}
.sh-btn{background:rgba(255,255,255,.12);border:0;color:#fff;padding:10px 16px;border-radius:12px;cursor:pointer;font:600 13px inherit}
.sh-back{position:absolute;z-index:4;top:calc(env(safe-area-inset-top,0px) + 8px);left:10px;background:rgba(0,0,0,.45);border:0;color:#fff;font:600 13px inherit;padding:7px 12px;border-radius:99px;cursor:pointer;display:none}[data-dm="1"] .sh-back{display:block}
.sh-scrim{position:absolute;inset:0;z-index:4;background:rgba(0,0,0,.55);animation:shF .2s}
.sh-sheet{position:absolute;z-index:5;left:0;right:0;bottom:0;height:74%;background:linear-gradient(180deg,#1c1c26,#101016);border-radius:28px 28px 0 0;display:flex;flex-direction:column;color:#f4f4fa;border-top:1px solid rgba(255,255,255,.12);box-shadow:0 -14px 50px rgba(0,0,0,.65);animation:shU .3s cubic-bezier(.2,.9,.3,1)}
.sh-grab{width:40px;height:4px;border-radius:9px;background:rgba(255,255,255,.25);margin:10px auto 0}
.sh-sh-h{display:flex;justify-content:space-between;align-items:center;padding:12px 20px 8px;font:700 17px inherit}.sh-sh-h button{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.08);border:0;color:#fff;font-size:14px;cursor:pointer}
.sh-act{display:flex;gap:10px;padding:4px 18px 12px}.sh-act button{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:#fff;font:600 13px inherit;cursor:pointer}.sh-act svg{width:18px;height:18px}.sh-act button:active{transform:scale(.97)}
.sh-srw{display:flex;align-items:center;gap:9px;margin:0 18px 12px;padding:0 14px;border-radius:14px;background:rgba(255,255,255,.07);color:#9a9ab0}.sh-srw svg{width:18px;height:18px;flex:none}.sh-sr{flex:1;min-width:0;padding:12px 0;border:0;background:none;color:#fff;font:14px inherit;outline:0}
.sh-fr{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:2px 18px 14px;overflow-y:auto;flex:1;align-content:start;scrollbar-width:none}.sh-fr::-webkit-scrollbar{display:none}
.sh-em{grid-column:1/-1;color:#8a8aa0;text-align:center;padding:30px 0;font-size:13px}
.sh-f{position:relative;display:grid;justify-items:center;gap:8px;padding:14px 6px 12px;border-radius:20px;border:1.5px solid transparent;background:rgba(255,255,255,.05);color:#eee;font:600 12px inherit;cursor:pointer;min-width:0;transition:transform .15s,background .15s,border-color .15s}.sh-f:active{transform:scale(.95)}.sh-f b{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.sh-f .av{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:22px;color:#fff;overflow:hidden;background-size:cover}.sh-f .av img{width:100%;height:100%;object-fit:cover}
.sh-f.on{background:rgba(255,23,68,.14);border-color:#ff1744}.sh-f.on::after{content:"✓";position:absolute;top:8px;right:8px;width:20px;height:20px;border-radius:50%;background:#ff1744;color:#fff;font-size:12px;line-height:20px;text-align:center}
.sh-snd{display:flex;align-items:center;gap:10px;padding:12px 16px calc(14px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(255,255,255,.08);background:rgba(10,10,14,.9)}.sh-snd input{flex:1;min-width:0;padding:13px 16px;border-radius:99px;border:0;background:rgba(255,255,255,.08);color:#fff;font:14px inherit;outline:0}
.sh-snd button{position:relative;flex:none;width:48px;height:48px;border-radius:50%;border:0;display:grid;place-items:center;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;transition:transform .15s,background .2s}.sh-snd button svg{width:22px;height:22px;transform:translateX(-1px)}.sh-snd button.rd{background:linear-gradient(135deg,#ff1744,#ff5e8a);box-shadow:0 6px 18px rgba(255,23,68,.45)}.sh-snd button:disabled{opacity:.5}.sh-snd button.rd:active{transform:scale(.92)}.sh-snd button.bz{animation:shP .8s infinite}
.sh-snd em{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:#fff;color:#ff1744;font:800 11px/18px inherit;text-align:center;font-style:normal;padding:0 4px}.sh-snd em:empty{display:none}
.sh-int{position:absolute;inset:0;z-index:6;background:#0b0b10;display:grid;align-content:start;justify-items:center;gap:14px;padding:calc(env(safe-area-inset-top,0px) + 40px) 22px 40px;color:#fff;text-align:center;overflow-y:auto}.sh-int h3{margin:0;font-size:22px}.sh-int p{margin:0;color:#aaa;font-size:13px}.sh-l{font-size:12px;color:#8a8aa0;text-transform:uppercase;letter-spacing:.08em;margin-top:6px}
.sh-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:400px}.sh-chips button{border:1px solid rgba(255,255,255,.2);background:none;color:#fff;padding:8px 14px;border-radius:99px;font:600 13px inherit;cursor:pointer;text-transform:capitalize}.sh-chips button.on{background:#ff1744;border-color:#ff1744}
.sh-row{display:flex;gap:10px;margin-top:8px}.sh-btn.go{background:#ff1744;padding:12px 30px}
.sh-toast{position:absolute;z-index:9;left:50%;top:calc(env(safe-area-inset-top,0px) + 56px);transform:translateX(-50%);background:rgba(30,30,38,.95);color:#fff;padding:10px 18px;border-radius:99px;font:600 13px inherit;box-shadow:0 8px 24px rgba(0,0,0,.5);animation:shF .2s;white-space:nowrap}
.sh-heart{position:absolute;z-index:3;left:50%;top:50%;width:96px;height:96px;margin:-48px 0 0 -48px;color:#ff2d55;pointer-events:none;animation:shH .8s ease-out forwards}.sh-heart svg{width:100%;height:100%;fill:#ff2d55;stroke:#ff2d55}
@keyframes shU{from{transform:translateY(100%)}}@keyframes shF{from{opacity:0}}@keyframes shP{50%{opacity:.5}}@keyframes shH{0%{transform:scale(.3);opacity:0}25%{transform:scale(1.15);opacity:1}100%{transform:scale(1.4) translateY(-30px);opacity:0}}
#chatView .chat-shell.sh-open .gnav{transform:translate(-50%,170%);opacity:0;pointer-events:none}
`; document.head.appendChild(s) })();
const ic = { like: '<path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.4 3 5 6.3 5c2 0 3.4 1.1 4.2 2.4h3C14.3 6.1 15.7 5 17.7 5 21 5 22.8 8.4 21.5 11.7 19.5 16.4 12 21 12 21z"/>', cm: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.5-4.7A8 8 0 1 1 21 12z"/>', sh: '<path d="M22 3 11 14M22 3l-7 19-4-8-8-4z"/>', mu: '<path d="M11 5 6 9H3v6h3l5 4zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>', x: '<path d="M4 4l16 16M11 5 6 9H3v6h3l5 4z"/>', cp: '<rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>', se: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', tn: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>', ni: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>' };
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const terms = t => [...new Set(String(t).toLowerCase().replace(/#/g, " ").replace(/[^\p{L}\p{M}\s]/gu, " ").split(/\s+/).filter(w => w.length >= 4 && !STOP.has(w)))].slice(0, 6);
const chKey = it => it?.ch ? "@" + String(it.ch).toLowerCase().slice(0, 40) : "";
function save() { const e = Object.entries(P).filter(x => Math.abs(x[1]) > .3); if (e.length > 260) { e.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])); e.length = 160 } P = Object.fromEntries(e); sv(PK, P); clearTimeout(syncT); syncT = setTimeout(push, 5000) }
function learn(it, w) { if (!it) return; for (const k of terms(it.title)) P[k] = (P[k] || 0) + w; const c = chKey(it); if (c) P[c] = (P[c] || 0) + w * 1.5; save() }
async function push() { const u = auth.currentUser; if (!u) return; try { await fb.update(fb.ref(db, `users/${u.uid}`), { shortsPrefs: JSON.stringify({ p: P, l: Object.keys(L).slice(-200), g: ld(LG, null), t: Date.now() }) }) } catch { } }
async function pull() { const u = auth.currentUser; if (!u) return; try { const s = (await fb.get(fb.ref(db, `users/${u.uid}/shortsPrefs`))).val(); if (!s) return; const d = JSON.parse(s); for (const [k, v] of Object.entries(d.p || {})) if (Math.abs(v) > Math.abs(P[k] || 0)) P[k] = v; for (const k of d.l || []) L[k] = 1; if (d.g?.length && !localStorage.getItem(LG)) sv(LG, d.g); sv(PK, P); sv(LK, L) } catch { } }
function decay() { const d = Math.floor(Date.now() / 864e5), last = ld("vc-shd", 0); if (last && d > last) { const f = Math.pow(.96, Math.min(d - last, 30)); for (const k in P) P[k] *= f; save() } sv("vc-shd", d) }
const wpick = pairs => { const w = pairs.map(x => Math.sqrt(Math.max(x[1], .1))), tot = w.reduce((a, b) => a + b, 0); let r = Math.random() * tot; for (let i = 0; i < pairs.length; i++) if ((r -= w[i]) <= 0) return pairs[i][0]; return pairs[0][0] };
function queries() {
  const pos = Object.entries(P).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 14), lg = ld(LG, ["hindi", "english"]), nm = k => k.replace(/^@/, ""), hr = new Date().getHours(), q = [];
  const tod = hr >= 5 && hr < 9 ? ["gym reels", "morning vibe reels", "trending reels", "aesthetic reels"] : hr >= 22 || hr < 4 ? ["night drive reels", "late night vibes reels", "sad edit reels", "trending reels song"] : hr >= 18 ? ["dance reels trending", "outfit transition reels", "bollywood reels", "funny reels india"] : ["viral reels india", "couple goals reels", "college reels", "instagram reels trending"], lang = () => rnd(lg), inq = () => Math.random() < .8 ? rnd(rnd(CATS)) : rnd(GEN) + " reels " + lang();
  if (skipRun >= 3) { skipRun = 0; q.push(rnd(IN), rnd(GEN) + " india", rnd(GEN), rnd(tod)) }
  else if (pos.length >= 3) { q.push(inq(), rnd(rnd(CATS)), nm(wpick(pos)) + (Math.random() < .5 ? " " + lang() : ""), nm(wpick(pos)) + " " + nm(wpick(pos)), Math.random() < .5 ? rnd(tod) : rnd(GEN) + " india"); if (Math.random() < .4) q.push("trending reels " + lang()) }
  else q.push(rnd(IN), rnd(IN), rnd(GEN) + " " + lang(), "trending reels " + lang(), rnd(tod));
  return [...new Set(q.map(s => s.trim()))].slice(0, 5);
}
const BADRX = /village|gaon|gaav|\bgram\b|desi vlog|bgm|background music|bhajan|devotional|kirtan|bhakti|status video|whatsapp status|news|podcast|full movie|\blive\b|tutorial|kisan|farmer|farming|shayari|speech|sermon|prayer|quran|bible|rashifal|astrology|recipe|cooking|ringtone|haryanvi|bhojpuri|khesari|pawan singh|jugaad|motivational speaker|sandeep maheshwari|vlogs? of my village|rural|tractor|bhai ji|baba|katha/i;
const bad = x => { if (BADRX.test((x.title || "") + " " + (x.ch || ""))) return true; let s = 0; for (const k of terms(x.title)) s += Math.min(P[k] || 0, 0); const c = chKey(x); if (c) s += Math.min(P[c] || 0, 0); return s <= -4 };
const sc = x => { let s = 0; for (const k of terms(x.title)) s += P[k] || 0; s += P[chKey(x)] || 0; return Math.max(-8, Math.min(s, 10)) + (indian(x) ? .8 : 0) + (/reel|viral|trend|insta|edit|aesthetic|pov|transition|grwm|vlog|dance|challenge|funny/i.test((x.title || "") + " " + (x.ch || "")) ? 3 : 0) };
function mix(fresh) {
  const pool = fresh.map(x => ({ x, s: sc(x) * .4 + Math.random() * 5 })).sort((a, b) => b.s - a.s), out = [];
  while (pool.length) { const rc = out.slice(-3).map(chKey), rt = out.slice(-2).map(o => terms(o.title)[0]); let i = pool.findIndex(p => { const c = chKey(p.x), k = terms(p.x.title)[0]; return (!c || !rc.includes(c)) && (!k || !rt.includes(k)) }); if (i < 0) i = 0; out.push(pool.splice(i, 1)[0].x) }
  return out;
}
async function more() {
  if (busy) return; busy = true;
  try {
    for (let tries = 0; tries < 3; tries++) {
      const rs = await Promise.allSettled(queries().map(q => fetch(`${API}/shorts?q=${encodeURIComponent(q)}&gl=IN&hl=${HL[rnd(ld(LG, ["hindi", "english"]))] || "en"}`, { signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.json() : Promise.reject(r.status)))), lists = rs.filter(r => r.status === "fulfilled").map(r => r.value.items || []), fresh = [];
      for (let i = 0; lists.some(l => i < l.length); i++) for (const l of lists) { const x = l[i]; if (x && !seen.has(x.id) && !bad(x)) { seen.add(x.id); fresh.push(x) } }
      if (fresh.length) { sv(SK, [...seen].slice(-1500)); add(mix(fresh)); return }
    }
    if (!items.length) note("Couldn't load Shorts right now.", true)
  } finally { busy = false }
}
function note(m, retry) { const old = $(".sh-note", host); old?.remove(); const d = document.createElement("div"); d.className = "sh-note"; d.innerHTML = `<div>${esc(m)}</div>${retry ? '<button class="sh-btn" id="shRt">Try again</button>' : ""}`; host.appendChild(d); const b = $("#shRt", d); if (b) b.onclick = () => { d.remove(); more() } }
function add(list, front) {
  $(".sh-note", host)?.remove();
  for (const x of list) {
    const i = items.push(x) - 1, el = document.createElement("div"); el.className = "sh-it"; el.dataset.i = i; el.dataset.id = x.id; el.style.backgroundImage = `url(https://i.ytimg.com/vi/${x.id}/hqdefault.jpg)`;
    el.innerHTML = `<div class="sh-tap"></div><div class="sh-sh"></div><div class="sh-in">${esc(x.title)}${x.ch ? `<small>${esc(x.ch)}</small>` : ""}</div><div class="sh-side"><button data-a="like" class="${L[x.id] ? "on" : ""}">${svg(ic.like)}</button><button data-a="cm">${svg(ic.cm)}</button><button data-a="sh">${svg(ic.sh)}</button><button data-a="ni">${svg(ic.ni)}</button><button data-a="mu">${svg(muted ? ic.x : ic.mu)}</button></div>`;
    front ? feed.insertBefore(el, feed.firstChild) : feed.appendChild(el); io.observe(el);
  }
}
const ord = () => [...feed.children].filter(x => x.classList?.contains("sh-it")), H = () => feed.clientHeight || innerHeight;
function leave() { if (cur < 0) return; const d = (Date.now() - t0) / 1000, it = items[cur]; if (d >= 4) { skipRun = 0; learn(it, d >= 12 ? 2 : 1) } else if (d < 1.5 && d > .2) { learn(it, -.7); skipRun++ } if (ifr) { try { pl?.pauseVideo() } catch { } ifr = false } }
let rv = 0, pl = null, pr = null, plBox, pt = 0, playing = false, wd = 0, autoMuted = false, ytP = null;
const yt = () => ytP ||= new Promise((res, rej) => {
  if (window.YT?.Player) return res();
  const p = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { p?.(); res() };
  const sc = document.createElement("script"); sc.src = "https://www.youtube.com/iframe_api"; sc.onerror = () => { sc.remove(); ytP = null; rej() }; document.head.append(sc);
  setTimeout(() => { if (!window.YT?.Player) { sc.remove(); ytP = null; rej() } }, 9000)
});
const mkPl = () => pr ||= yt().then(() => new Promise((res, rej) => {
  const d = document.createElement("div"); plBox.innerHTML = ""; plBox.append(d); let done = 0;
  const p = new YT.Player(d, { host: "https://www.youtube-nocookie.com", playerVars: { autoplay: 1, controls: 0, playsinline: 1, rel: 0, modestbranding: 1, fs: 0, disablekb: 1, iv_load_policy: 3, origin: location.origin }, events: { onReady: () => { done = 1; pl = p; res(p) }, onStateChange: onSt, onError: onErr } });
  setTimeout(() => { if (!done) rej() }, 8000)
})).catch(e => { pr = null; throw e });
const cmd = (f, a) => { try { pl?.[f]?.(...(a || [])) } catch { } };
const curEl = () => feed?.querySelector(`[data-i="${cur}"]`);
function hidePl() { clearTimeout(rv); plBox?.classList.remove("on"); feed?.querySelectorAll(".sh-it.pl").forEach(x => x.classList.remove("pl")) }
function showPl() { if (!playing || cur < 0) return; feed.querySelectorAll(".sh-it.pl").forEach(x => x.classList.remove("pl")); curEl()?.classList.add("pl"); plBox.classList.add("on") }
function arm(tok, n) { clearTimeout(wd); wd = setTimeout(() => { if (tok !== pt || playing) return; n < 4 ? start(tok, n + 1) : fail(tok) }, n === 3 ? 6500 : 3500) }
function start(tok, n) {
  const it = items[cur]; if (!it || tok !== pt) return;
  if (n === 3) { try { pl?.destroy() } catch { } pl = null; pr = null }
  mkPl().then(p => { if (tok !== pt) return; try { if (muted || n === 2) p.mute(); else p.unMute(); if (n === 2 && !muted) autoMuted = true; p.loadVideoById(it.id) } catch { } }).catch(() => { }); arm(tok, n)
}
function fail(tok) { if (tok !== pt) return; const el = curEl(); if (!el) return; if (!el.querySelector(".sh-bad")) { const b = document.createElement("div"); b.className = "sh-bad"; b.textContent = "Video unavailable"; el.appendChild(b) } ifr = false; setTimeout(() => { if (tok === pt) skip() }, 400) }
function onSt(e) {
  const it = items[cur]; if (!it || !ifr) return; let vid; try { vid = e.target.getVideoData().video_id } catch { } if (vid && vid !== it.id) return;
  const s = e.data;
  if (s === 1) { playing = true; clearTimeout(wd); const tk = pt; clearTimeout(rv); rv = setTimeout(() => { if (tk === pt && !drag) showPl() }, 700); if (curEl()?.dataset.p === "1") cmd("pauseVideo") }
  else if (s === 0) { cmd("seekTo", [0, true]); cmd("playVideo") }
  else if (s === 3 && playing) { playing = false; arm(pt, 1) }
}
function onErr() { const it = items[cur]; if (it && ifr) fail(pt) }
document.addEventListener("visibilitychange", () => { if (document.hidden || !feed || !host?.isConnected || host.hidden) return; setTimeout(() => { busy = false; if (cur >= 0 && ifr) { let st = -1; try { st = pl.getPlayerState() } catch { } if (st !== 1 && curEl()?.dataset.p !== "1") { playing = false; start(++pt, 1) } else showPl() } if (feed.children.length - Math.round(feed.scrollTop / H()) <= 6) more() }, 250) });
function play(i) {
  leave(); const L = ord(), el = feed.querySelector(`[data-i="${i}"]`), it = items[i]; if (!it || !el) return; cur = i; t0 = Date.now(); ifr = true; playing = false; hidePl(); const tok = ++pt;
  if (el.querySelector(".sh-bad")) setTimeout(() => { if (tok === pt) skip() }, 300); else start(tok, 0);
  if (L.length - L.indexOf(el) <= 6) more();
}
let anim = 0;
function settle(n) { const el = ord()[n]; if (el) { const i = +el.dataset.i; if (i !== cur || !ifr) play(i); else showPl() } }
function goTo(n, dur = 170) { const L = ord(); n = Math.max(0, Math.min(n, L.length - 1)); const to = n * H(), from = feed.scrollTop, t = performance.now(); cancelAnimationFrame(anim); if (dur && from !== to) hidePl(); if (!dur || from === to) { feed.scrollTop = to; settle(n); return } const st = now => { const k = Math.min(1, (now - t) / dur); feed.scrollTop = from + (to - from) * (1 - Math.pow(1 - k, 3)); if (k < 1) anim = requestAnimationFrame(st); else settle(n) }; anim = requestAnimationFrame(st) }
const skip = () => goTo(Math.round(feed.scrollTop / H()) + 1);
async function loadFriends() {
  if (friends) return friends; const u = auth.currentUser; if (!u) return [];
  const ids = Object.keys((await fb.get(fb.ref(db, `friends/${u.uid}`))).val() || {});
  friends = (await Promise.all(ids.map(async id => { try { const p = await fb.get(fb.ref(db, `users/${id}`)); return p.exists() ? { uid: id, ...p.val() } : null } catch { return null } }))).filter(Boolean); return friends;
}
const closeSheet = () => { host.querySelectorAll(".sh-sheet,.sh-scrim").forEach(x => x.remove()); host.closest(".chat-shell")?.classList.remove("sh-open") };
const openSheet = html => { closeSheet(); const sc = document.createElement("div"); sc.className = "sh-scrim"; sc.onclick = closeSheet; const s = document.createElement("div"); s.className = "sh-sheet"; s.innerHTML = html; host.append(sc, s); host.closest(".chat-shell")?.classList.add("sh-open"); const x = $(".sh-x", s); if (x) x.onclick = closeSheet; return s };
const toast = m => { const d = document.createElement("div"); d.className = "sh-toast"; d.textContent = m; host.appendChild(d); setTimeout(() => d.remove(), 1900) };
const heart = el => { const d = document.createElement("div"); d.className = "sh-heart"; d.innerHTML = svg(ic.like); el.appendChild(d); setTimeout(() => d.remove(), 800) };
async function share(it) {
  const u = auth.currentUser, url = `https://www.youtube.com/shorts/${it.id}`, s = openSheet(`<div class="sh-grab"></div><div class="sh-sh-h"><span>Share</span><button class="sh-x" aria-label="Close">✕</button></div><div class="sh-act"><button data-x="cp">${svg(ic.cp)}<span>Copy link</span></button><button data-x="ext">${svg(ic.sh)}<span>More apps</span></button></div><label class="sh-srw">${svg(ic.se)}<input class="sh-sr" placeholder="Search friends" autocomplete="off"></label><div class="sh-fr"><div class="sh-em">Loading…</div></div><div class="sh-snd"><input maxlength="200" placeholder="Add a message…"><button disabled aria-label="Send">${svg(ic.sh)}<em></em></button></div>`);
  const grid = $(".sh-fr", s), sel = new Set(), btn = $(".sh-snd button", s), sr = $(".sh-sr", s), badge = $("em", btn); let list = [];
  $(".sh-act", s).onclick = async e => { const b = e.target.closest("[data-x]"); if (!b) return; if (b.dataset.x === "ext" && navigator.share) { try { await navigator.share({ title: it.title, url }) } catch { } return } try { await navigator.clipboard.writeText(url); toast("Link copied") } catch { toast(url) } };
  const upd = () => { btn.disabled = !sel.size; badge.textContent = sel.size || ""; btn.classList.toggle("rd", !!sel.size) };
  const draw = () => { const q = sr.value.trim().toLowerCase(), v = list.filter(p => !q || ((p.displayName || "") + " " + (p.username || "")).toLowerCase().includes(q)); grid.innerHTML = v.map(p => `<button class="sh-f ${sel.has(p.uid) ? "on" : ""}" data-u="${p.uid}"><span class="av" style="background:${esc(p.avatarColor || "linear-gradient(135deg,#7c5cff,#ff4d8d)")}">${p.photo ? `<img src="${esc(p.photo)}" alt="">` : esc((p.displayName || p.username || "M")[0].toUpperCase())}</span><b>${esc(p.displayName || p.username || "Member")}</b></button>`).join("") || `<div class="sh-em">${list.length ? "No friends match." : "Add friends to send Shorts."}</div>` };
  try { if (!u) throw 0; list = await loadFriends(); draw() } catch { grid.innerHTML = '<div class="sh-em" style="color:#ff7a8a">Sign in to send Shorts.</div>' }
  sr.oninput = draw; grid.onclick = e => { const b = e.target.closest("[data-u]"); if (!b) return; const id = b.dataset.u; sel.has(id) ? sel.delete(id) : sel.add(id); b.classList.toggle("on", sel.has(id)); upd() };
  btn.onclick = async () => {
    btn.disabled = true; btn.classList.add("bz"); const note = $(".sh-snd input", s).value.trim(), n = sel.size, short = { id: it.id, title: String(it.title || "").slice(0, 100), ch: String(it.ch || "").slice(0, 60) };
    try { await Promise.all([...sel].map(id => { const c = [u.uid, id].sort().join("_"); return fb.push(fb.ref(db, `chats/${c}/messages`), { sender: u.uid, createdAt: Date.now(), type: "short", text: note, short }) })); learn(it, 2); closeSheet(); toast(`Sent to ${n} friend${n > 1 ? "s" : ""} ✓`) } catch { btn.classList.remove("bz"); btn.disabled = false; toast("Failed, try again") }
  };
}
async function comments(it) {
  learn(it, 1); const s = openSheet(`<div class="sh-grab"></div><div class="sh-sh-h"><button class="sh-x" aria-label="Close">✕</button></div><div class="sh-cl"><div style="color:#888">Loading…</div></div><div class="sh-ft">Posting needs a YouTube account: <a target="_blank" rel="noopener" href="https://www.youtube.com/shorts/${it.id}">comment on YouTube</a></div>`); const list = $(".sh-cl", s); let ct = "", first = true;
  const load = async () => {
    try {
      const j = await fetch(`${API}/shortcomments?id=${it.id}${ct ? "&ct=" + encodeURIComponent(ct) : ""}`).then(r => r.json()); if (first) list.innerHTML = ""; first = false; $(".sh-btn", list)?.remove();
      for (const c of j.items || []) { const d = document.createElement("div"); d.className = "sh-c"; d.innerHTML = `${c.pic ? `<img src="${esc(c.pic)}" alt="" loading="lazy">` : "<i></i>"}<div><b>${esc(c.user)} · ${esc(c.when)}</b><br><span>${esc(c.text)}</span>${c.likes ? `<br><small style="color:#888">♥ ${esc(c.likes)}</small>` : ""}</div>`; list.appendChild(d) }
      if (!list.children.length) list.innerHTML = '<div style="color:#888">No comments (or comments are off).</div>';
      ct = j.next || ""; if (ct) { const b = document.createElement("button"); b.className = "sh-btn"; b.textContent = "Load more"; b.onclick = load; list.appendChild(b) }
    } catch { list.innerHTML = '<div style="color:#ff7a8a">Couldn\'t load comments.</div>' }
  }; load();
}
export function openShort(it, fromDM) {
  if (!feed || !it?.id) return; host.dataset.dm = fromDM ? "1" : ""; $(".sh-int", host)?.remove(); closeSheet();
  const ex = feed.querySelector(`[data-id="${it.id}"]`); seen.add(it.id);
  if (ex) { ex.scrollIntoView(); if (+ex.dataset.i !== cur || !ifr) play(+ex.dataset.i) } else { add([it], true); feed.scrollTop = 0 }
  learn(it, 3);
}
function refresh() {
  leave(); hidePl(); cmd("stopVideo"); pt++; cur = -1; items = []; skipRun = 0; busy = false; io?.disconnect(); feed.innerHTML = ""; feed.scrollTop = 0; closeSheet(); $(".sh-note", host)?.remove(); more(); toast("Feed refreshed");
}
export function stopShorts() { closeSheet(); leave(); hidePl(); cmd("stopVideo"); pt++; clearTimeout(wd); cur = -1; if (host) host.dataset.dm = ""; if (feed) io?.disconnect() }
export function mountShorts(el) {
  host = el; host.classList.add("rl");
  if (host.dataset.sh === "1") { feed.querySelectorAll(".sh-it").forEach(x => io.observe(x)); return }
  host.dataset.sh = "1"; document.addEventListener("click", e => { if (e.target.closest('[data-gn="shorts"]') && host.isConnected && !host.hidden) refresh() }, true); host.innerHTML = `<div class="sh-pl"></div><div class="sh-top">Shorts</div><button class="sh-back">‹ Chat</button><div class="sh-feed"></div>`; feed = $(".sh-feed", host); plBox = $(".sh-pl", host);
  $(".sh-back", host).onclick = () => document.querySelector('[data-gn="chats"]')?.click();
  io = new IntersectionObserver(es => { if (drag) return; for (const e of es) if (e.isIntersecting && e.intersectionRatio >= .7) { const i = +e.target.dataset.i; if (i !== cur || !ifr) play(i); else if (!drag) showPl() } }, { root: feed, threshold: [.7] });

  let ty = 0, ly = 0, tt = 0, v = 0, top0 = 0, wt = 0;
  feed.addEventListener("touchstart", e => { if (e.touches.length > 1) return; cancelAnimationFrame(anim); ty = ly = e.touches[0].clientY; tt = performance.now(); top0 = feed.scrollTop; drag = true; v = 0 }, { passive: true });
  feed.addEventListener("touchmove", e => { if (!drag) return; const y = e.touches[0].clientY, n = performance.now(), dt = n - tt; if (dt > 0) v = .7 * v + .3 * ((ly - y) / dt); ly = y; tt = n; feed.scrollTop = top0 + (ty - y); if (Math.abs(ty - y) > 12) hidePl() }, { passive: true });
  const end = () => { if (!drag) return; drag = false; const d = ty - ly, h = H(), base = Math.round(top0 / h); if (Math.abs(d) < 6) { feed.scrollTop = top0; showPl(); return } let n = base; if (d > h * .1 || v > .3) n = base + 1; else if (d < -h * .1 || v < -.3) n = base - 1; goTo(n, 160) };
  feed.addEventListener("touchend", end, { passive: true }); feed.addEventListener("touchcancel", end, { passive: true });
  feed.addEventListener("wheel", e => { e.preventDefault(); if (Date.now() - wt < 380 || Math.abs(e.deltaY) < 8) return; wt = Date.now(); goTo(Math.round(feed.scrollTop / H()) + (e.deltaY > 0 ? 1 : -1), 170) }, { passive: false });
  document.addEventListener("keydown", e => { if (!host.isConnected || host.hidden || !["ArrowDown", "ArrowUp"].includes(e.key) || e.target.closest?.("input,[contenteditable]")) return; goTo(Math.round(feed.scrollTop / H()) + (e.key === "ArrowDown" ? 1 : -1)) });
  feed.addEventListener("click", e => {
    const el = e.target.closest(".sh-it"); if (!el) return; const it = items[+el.dataset.i], b = e.target.closest("[data-a]"); if (autoMuted && !muted) { cmd("unMute"); autoMuted = false }
    if (b) { const a = b.dataset.a; if (a === "like") { L[it.id] ? delete L[it.id] : (L[it.id] = 1, learn(it, 3)); sv(LK, L); b.classList.toggle("on", !!L[it.id]) } else if (a === "cm") comments(it); else if (a === "sh") share(it); else if (a === "ni") { learn(it, -4); toast("Showing less like this"); skip() } else if (a === "mu") { muted = !muted; cmd(muted ? "mute" : "unMute"); feed.querySelectorAll('[data-a="mu"]').forEach(x => x.innerHTML = svg(muted ? ic.x : ic.mu)) } }
    else if (e.target.classList.contains("sh-tap") && ifr) { const n = Date.now(); if (n - (el._t || 0) < 300) { clearTimeout(el._pt); el._t = 0; if (!L[it.id]) { L[it.id] = 1; learn(it, 3); sv(LK, L); el.querySelector('[data-a="like"]')?.classList.add("on") } heart(el) } else { el._t = n; el._pt = setTimeout(() => { el.dataset.p = el.dataset.p === "1" ? "" : "1"; cmd(el.dataset.p ? "pauseVideo" : "playVideo") }, 280) } }
  });
  decay(); pull(); more();
}
