/* Heart + kiss FX: one canvas, GPU-friendly, triggers for any message containing a heart or kiss emoji (alone or inside text). */
const HR = /[❤💖💗💓💕💞💘💝🧡💛💚💙💜🤎🖤🤍♥🩷🩵🩶💟❣]/u, KR = /[💋😘😚😙😗]/u;
const PAL = { "❤": ["#ff2d55", "#ff8aa5"], "🧡": ["#ff8a1f", "#ffd08a"], "💛": ["#ffc400", "#fff0a0"], "💚": ["#12d67a", "#a6ffd2"], "💙": ["#2f7bff", "#9cc8ff"], "🩵": ["#35d4ff", "#b8f0ff"], "💜": ["#9a4dff", "#d9b8ff"], "🖤": ["#2b2b3a", "#8b5cff"], "🤍": ["#ffffff", "#ffd6ea"], "🤎": ["#9a5a34", "#e0b08a"] }, DEF = ["#ff2d75", "#ffb0d0"];
export const hasFx = t => HR.test(t) || KR.test(t);
const R = (a, b) => a + Math.random() * (b - a), T = Math.PI * 2, E = u => 1 - Math.pow(1 - u, 3), B = u => 1 + 2.9 * Math.pow(u - 1, 3) + 1.9 * Math.pow(u - 1, 2), bump = (u, c, w) => Math.exp(-(((u - c) / w) ** 2));
let cv, cx, raf = 0, A = [], W, H, tid = 0, lastT = 0;
const hp = (c, s) => { c.beginPath(); c.moveTo(0, s * .5); c.bezierCurveTo(-s * .15, s * .38, -s * .55, s * .1, -s * .55, -s * .22); c.bezierCurveTo(-s * .55, -s * .5, -s * .15, -s * .6, 0, -s * .3); c.bezierCurveTo(s * .15, -s * .6, s * .55, -s * .5, s * .55, -s * .22); c.bezierCurveTo(s * .55, s * .1, s * .15, s * .38, 0, s * .5); c.closePath() };
const big = (c, s, c0, c1) => { c.save(); hp(c, s); const g = c.createLinearGradient(-s * .5, -s * .6, s * .5, s * .5); g.addColorStop(0, c1); g.addColorStop(.45, c0); g.addColorStop(1, c0); c.shadowColor = c0; c.shadowBlur = s * .45; c.fillStyle = g; c.fill(); c.shadowBlur = 0; c.clip(); c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.ellipse(-s * .26, -s * .27, s * .17, s * .09, -.7, 0, T); c.fill(); c.fillStyle = "rgba(0,0,0,.14)"; c.beginPath(); c.arc(s * .1, s * .62, s * .55, 0, T); c.fill(); c.restore() };
const add = (d, f, delay = 0) => A.push({ s: performance.now() + delay, d, f });
const mini = (c, s, col) => { hp(c, s); c.fillStyle = col; c.shadowColor = col; c.shadowBlur = s * .6; c.fill() };
const rise = (x, y, s, col, d, delay) => { const vx = R(-60, 60), wob = R(10, 34), ph = R(0, T), rot = R(.3, .8), h = R(260, H * .75); add(d, (c, u) => { c.save(); c.globalAlpha = Math.min(1, u * 7) * (1 - u * u * u); c.translate(x + vx * u + Math.sin(u * T * 1.4 + ph) * wob, y - h * E(u)); c.rotate(Math.sin(u * 7 + ph) * rot * .5); mini(c, s * (.7 + .5 * u), col); c.restore() }, delay) };
const burst = (x, y, n, cols, sz) => { for (let i = 0; i < n; i++) { const a = R(0, T), v = R(110, 380), s = R(sz[0], sz[1]), col = cols[i % cols.length]; add(R(1100, 1900), (c, u) => { const e = E(u); c.save(); c.globalAlpha = 1 - u * u; c.translate(x + Math.cos(a) * v * e, y + Math.sin(a) * v * e - u * u * 170); c.rotate(a + u * 3); mini(c, s * (1 - u * .4), col); c.restore() }) } };
const ring = (x, y, col, mx, d, delay = 0) => add(d, (c, u) => { c.save(); c.globalAlpha = (1 - u) * .85; c.strokeStyle = col; c.lineWidth = 7 * (1 - u) + 1; c.beginPath(); c.arc(x, y, mx * E(u), 0, T); c.stroke(); c.restore() }, delay);
const spark = (x, y, s, col, d, delay) => add(d, (c, u) => { const k = Math.sin(u * Math.PI); c.save(); c.translate(x, y); c.rotate(u * 2); c.globalAlpha = k; c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 14; c.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * .16 * k : s * k, a = i * Math.PI / 4; c.lineTo(Math.cos(a) * r, Math.sin(a) * r) } c.fill(); c.restore() }, delay);
const wash = (col, d, beats) => add(d, (c, u) => { const g = c.createRadialGradient(W / 2, H * .42, 0, W / 2, H * .42, Math.max(W, H) * .8); g.addColorStop(.25, "rgba(0,0,0,0)"); g.addColorStop(1, col); c.save(); c.globalAlpha = Math.sin(u * Math.PI) * (.3 + .12 * Math.sin(u * T * beats)); c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore() });
const sparks = (n, cols, d) => { for (let i = 0; i < n; i++) spark(R(0, W), R(0, H), R(10, 26), cols[i % cols.length], R(700, 1400), R(0, d)) };
function heartScene(p, m) {
  const S = Math.min(W * .5, 220), x = W / 2, y = H * .42, D = 2900, beat = [.3, .42, .64, .76];
  wash(p[0], D, 2); sparks(Math.round(16 * m), [p[1], "#fff", p[0]], 1800);
  add(D, (c, u) => { const s = u < .2 ? B(u / .2) : 1 + .2 * (bump(u, .3, .045) + bump(u, .64, .045)) + .12 * (bump(u, .42, .045) + bump(u, .76, .045)); const ex = u > .82 ? (u - .82) / .18 : 0; c.save(); c.globalAlpha = 1 - ex; c.translate(x, y + Math.sin(u * 14) * 3); c.rotate(Math.sin(u * 9) * .06); c.scale(s * (1 + ex * .7), s * (1 + ex * .7)); big(c, S, p[0], p[1]); c.restore() });
  beat.forEach((b, i) => setTimeout(() => { if (!cv) return; ring(x, y, p[1], S * (1.5 + i * .25), 1100); burst(x, y, Math.round((i % 2 ? 7 : 12) * m), [p[0], p[1], "#fff"], [10, 26]) }, D * b));
  for (let i = 0; i < Math.round(22 * m); i++) rise(R(0, W), H + 30, R(14, 38), PK(p), R(1800, 2800), R(0, 1500));
}
const PK = a => a[Math.random() * a.length | 0];
function kissScene(g, p, m) {
  const x = W / 2, y = H * .42, S = Math.min(W * .4, 170), D = 2900;
  wash("#ff2d75", D, 1); sparks(Math.round(14 * m), ["#ffd1e6", "#fff", "#ff7ab0"], 1800);
  add(D, (c, u) => { const s = u < .2 ? B(u / .2) : 1 + .05 * Math.sin(u * 22) * (1 - u), ex = u > .8 ? (u - .8) / .2 : 0; c.save(); c.globalAlpha = 1 - ex; c.translate(x, y); c.rotate(-.2 + Math.min(u * 4, 1) * .2); c.scale(s * (1 + ex * .6), s * (1 + ex * .6)); c.font = `${S}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.shadowColor = "#ff2d75"; c.shadowBlur = 50; c.fillText(g, 0, 0); c.restore() });
  ring(x, y, "#ff7ab0", S * 1.8, 1200); ring(x, y, "#fff", S * 1.2, 900, 160);
  for (let i = 0; i < Math.round(5 * m); i++) {
    const sx = x + S * .35, sy = y - S * .1, ex = R(.05, .95) * W, ey = -60, cx1 = R(0, W), cy1 = H * R(.05, .5), d = R(1500, 2200), s0 = R(22, 40), col = PK([p[0], "#ff7ab0", "#ffd1e6"]);
    const q = u => { const a = 1 - u; return [a * a * sx + 2 * a * u * cx1 + u * u * ex, a * a * sy + 2 * a * u * cy1 + u * u * ey] };
    add(d, (c, u) => { for (let k = 6; k >= 0; k--) { const uu = Math.max(0, u - k * .028), [px, py] = q(uu); c.save(); c.globalAlpha = (1 - k / 7) * (1 - u * u); c.translate(px, py); c.rotate(Math.sin(uu * 12) * .4); mini(c, s0 * (1 - k * .09) * (.6 + uu), col); c.restore() } }, i * 130);
  }
  for (let i = 0; i < Math.round(6 * m); i++) { const px = R(.08, .92) * W, py = (R(0, 1) < .5 ? R(.06, .25) : R(.62, .9)) * H, s = R(38, 68), r = R(-.7, .7), dl = 250 + i * 170; add(1500, (c, u) => { const e = u < .18 ? B(u / .18) : 1; c.save(); c.globalAlpha = u > .6 ? 1 - (u - .6) / .4 : 1; c.translate(px, py); c.rotate(r); c.scale(e, e); c.font = `${s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("💋", 0, 0); c.restore() }, dl) }
  for (let i = 0; i < Math.round(14 * m); i++) rise(R(0, W), H + 30, R(12, 30), PK([p[0], "#ff7ab0", "#ffd1e6"]), R(1800, 2700), R(300, 1600));
}
function loop(t) { cx.clearRect(0, 0, W, H); A = A.filter(a => { const u = (t - a.s) / a.d; if (u < 0) return true; if (u >= 1) return false; try { a.f(cx, u) } catch { } return true }); raf = A.length ? requestAnimationFrame(loop) : 0; if (!A.length) end() }
function end() { cancelAnimationFrame(raf); raf = 0; cv?.remove(); cv = null; A = [] }
export function play(txt, opt = {}) {
  txt = String(txt || ""); const kiss = txt.match(KR), hrt = txt.match(HR); if (!kiss && !hrt) return null;
  end(); clearTimeout(tid); const rep = Date.now() - lastT < 9000; lastT = Date.now();
  const dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv = document.createElement("canvas"); cv.width = W * dpr; cv.height = H * dpr; cv.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:3000;pointer-events:none"; document.body.append(cv); cx = cv.getContext("2d"); cx.scale(dpr, dpr);
  const n = (txt.match(new RegExp(HR.source, "gu")) || []).length + (txt.match(new RegExp(KR.source, "gu")) || []).length, m = Math.min(1.8, .8 + n * .2) * (rep ? .5 : 1), pal = PAL[(hrt || ["❤"])[0]] || DEF, k = kiss ? "kiss" : "heart";
  if (kiss) kissScene(kiss[0], PAL[hrt?.[0]] || ["#ff2d75", "#ffb0d0"], m); else heartScene(pal, m);
  if (opt.haptic !== false) try { navigator.vibrate?.(kiss ? [10, 50, 10, 50, 30] : [14, 90, 14, 260, 14, 90, 14]) } catch { }
  raf = requestAnimationFrame(loop); tid = setTimeout(end, 4200); return k
}
