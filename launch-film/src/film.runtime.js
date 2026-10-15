// Dytallix mainnet launch film: one paused root timeline.
// Opacity/transform motion is plain GSAP. Character-level work (key recovery,
// decryption, forgery) is a pure function of time, render(t), driven by a clock
// tween and by the runtime's hf-seek event, so any frame renders identically
// on a cold seek.
(function () {
  const D = window.FILM_DATA;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const GLYPHS = "0123456789abcdef";
  function hash(a, b, c) {
    let x = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35) ^ Math.imul(c + 0x27d4eb2f, 0x165667b1);
    x ^= x >>> 15;
    x = Math.imul(x, 0x2c1b3c6d);
    x ^= x >>> 12;
    return x >>> 0;
  }
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const win = (t, a, b) => clamp01((t - a) / (b - a));

  // Left-to-right resolve from `from` to `to`. Characters in flight show a
  // hex glyph keyed on (seed, index, tick). o.all scrambles unchanged chars too.
  function scrambleHTML(from, to, p, seed, tick, o) {
    const n = Math.max(from.length, to.length);
    let out = "";
    let cur = null;
    let buf = "";
    const push = (cls, ch) => {
      if (cls !== cur) {
        if (cur !== null) out += '<span class="' + cur + '">' + esc(buf) + "</span>";
        cur = cls;
        buf = "";
      }
      buf += ch;
    };
    for (let i = 0; i < n; i++) {
      const f = i < from.length ? from[i] : " ";
      const g = i < to.length ? to[i] : " ";
      const a = (i / n) * 0.55;
      const b = a + 0.45;
      const moving = o.all ? f !== " " || g !== " " : f !== g;
      if (p >= 1 || p >= b) push(o.to, g);
      else if (p <= 0 || p <= a || !moving) push(o.from, f);
      else push(o.mid, GLYPHS[hash(seed, i, tick) % GLYPHS.length]);
    }
    if (cur !== null) out += '<span class="' + cur + '">' + esc(buf) + "</span>";
    return out;
  }
  function put(els, html) {
    for (const el of els) {
      if (el.__h !== html) {
        el.innerHTML = html;
        el.__h = html;
      }
    }
  }

  const privEls = [0, 1].map((r) => $$('.khex.priv[data-row="' + r + '"]'));
  const packets = $$(".packet");
  const archEls = $$(".arow .atext");
  const act1 = $$("#rec-tnfl .act");
  const sig1 = [0, 1, 2].map((r) => $$('#rec-tnfl .sig-l[data-row="' + r + '"]'));
  const act2 = $$("#rec-launch .act");

  let last = -1;
  function render(t) {
    t = Math.max(0, Math.min(30, t));
    if (t === last) return;
    last = t;
    const tick = Math.floor(t * 15 + 1e-6);

    // 0-4 hook: the masked private key is derived from the public key.
    for (let r = 0; r < 2; r++) {
      const p = win(t, 1.2 + r * 0.6, 1.8 + r * 0.6);
      put(privEls[r], scrambleHTML(D.privMask[r], D.priv[r], p, 11 + r, tick, { from: "cs", mid: "cm", to: "cr" }));
    }

    // 4-8 HNDL: ciphertext packets cross the wire; the archive decrypts at Q-Day.
    packets.forEach((el, k) => {
      const p = (t - D.packetStart[k]) / D.packetTravel;
      if (p <= 0 || p >= 1) {
        el.style.opacity = "0";
      } else {
        el.style.opacity = String(Math.min(1, p / 0.08, (1 - p) / 0.08));
        el.style.setProperty("--p", p.toFixed(4));
      }
    });
    archEls.forEach((el, r) => {
      const p = win(t, 7.0 + 0.08 * r, 7.45 + 0.08 * r);
      put([el], scrambleHTML(D.arch[r], D.plain[r], p, 31 + r, tick, { from: "cm", mid: "cm", to: "cr" }));
    });

    // 8-12 TNFL: the approved action and its signature are rewritten.
    put(act1, scrambleHTML(D.actA, D.actX, win(t, 10.0, 10.4), 51, tick, { from: "ct", mid: "cm", to: "cr", all: true }));
    for (let r = 0; r < 3; r++) {
      put(sig1[r], scrambleHTML(D.sigA[r], D.sigB[r], win(t, 10.1 + 0.1 * r, 10.5 + 0.1 * r), 61 + r, tick, { from: "cm", mid: "cm", to: "cm" }));
    }

    // 18-21 launched: the same rewrite is attempted and fails.
    put(act2, scrambleHTML(D.actA, D.actA, win(t, 20.0, 20.35), 71, tick, { from: "ct", mid: "cr", to: "ct", all: true }));
  }

  // ---------------------------------------------------------------- timeline
  const tl = gsap.timeline({ paused: true });
  const OUT = "power3.out";
  const IO = "power2.inOut";
  const rise = (sel, at, dur) => tl.to(sel, { opacity: 1, y: 0, duration: dur || 0.6, ease: OUT }, at);
  const fadeIn = (sel, at, dur, to) => tl.to(sel, { opacity: to == null ? 1 : to, duration: dur || 0.4, ease: OUT }, at);
  const fadeOut = (sel, at, dur) => tl.to(sel, { opacity: 0, duration: dur || 0.4, ease: "power2.in" }, at);
  const draw = (sel, at, dur, ease) => tl.to(sel, { strokeDashoffset: 0, duration: dur, ease: ease || IO }, at);
  // Scale draws are fromTo so GSAP owns the whole transform (no CSS transform to fight).
  const grow = (sel, at, dur, prop, ease) =>
    tl.fromTo(sel, { [prop || "scaleX"]: 0 }, { [prop || "scaleX"]: 1, duration: dur, ease: ease || OUT, immediateRender: true }, at);
  // Timeline strip: the marker rides a full-width carriage, moved by xPercent.
  const travel = (scope, at) => {
    tl.fromTo(scope + " .t-carriage", { xPercent: 0 }, { xPercent: 100, duration: 1.0, ease: IO, immediateRender: true }, at);
    grow(scope + " .t-fill", at, 1.0, "scaleX", IO);
  };

  // The logo only fades and rises by whole pixels, so it never resamples off-grid.
  function logoIn(sel, at) {
    const el = $(sel);
    const o = { y: 12, a: 0 };
    tl.to(o, {
      y: 0,
      a: 1,
      duration: 0.8,
      ease: "power2.out",
      onUpdate: () => {
        el.style.opacity = String(o.a);
        el.style.transform = "translateY(" + Math.round(o.y) + "px)";
      },
    }, at);
  }

  // grid
  fadeIn("#grid", 0.0, 0.8, 0.4);
  fadeOut("#grid", 11.6, 0.4);
  fadeIn("#grid", 18.0, 0.5, 0.4);
  fadeOut("#grid", 23.6, 0.4);

  // 0-4 hook
  fadeIn(".curve-axis", 0.1, 0.6);
  draw(".curve-path", 0.15, 1.2);
  rise(".keycard", 0.3, 0.6);
  rise("#hook-h", 0.6, 0.7);
  fadeIn(".curve-point", 1.0, 0.25);
  draw(".fracture-path", 2.6, 0.3, "power1.in");
  tl.to(".half-a", { x: -2, y: -1, duration: 0.3, ease: OUT }, 2.85);
  tl.to(".half-b", { x: 2, y: 1, duration: 0.3, ease: OUT }, 2.85);
  tl.to(".fracture-path", { opacity: 0.7, duration: 0.3, ease: OUT }, 2.9);
  fadeOut("#s-hook", 3.6, 0.4);

  // 4-8 HNDL
  fadeIn("#card-hndl", 4.0, 0.4);
  fadeIn("#card-tnfl", 4.0, 0.4, 0.5);
  rise("#card-hndl .eyebrow", 4.1, 0.5);
  grow("#card-hndl .wire", 4.15, 0.45);
  fadeIn("#card-hndl .node", 4.15, 0.3);
  rise("#card-hndl .card-h", 4.4, 0.6);
  fadeIn("#card-hndl .tstrip", 4.5, 0.4);
  fadeIn("#card-hndl .tap", 4.85, 0.2);
  D.rowAt.forEach((at, r) => rise('#card-hndl .arow[data-row="' + r + '"]', at, 0.3));
  rise("#card-hndl .card-sub", 5.2, 0.6);
  travel("#card-hndl", 6.0);
  tl.to("#card-hndl .t-end", { color: "#f0a0a0", duration: 0.2 }, 6.95);
  tl.to("#card-hndl", { opacity: 0.35, duration: 0.4, ease: IO }, 7.6);

  // 8-12 TNFL
  tl.to("#card-tnfl", { opacity: 1, duration: 0.3, ease: OUT }, 8.0);
  tl.to("#card-tnfl .idx", { color: "#29dfc4", duration: 0.3 }, 8.0);
  fadeIn("#card-tnfl .eyebrow-rest", 8.05, 0.3);
  rise("#rec-tnfl", 8.2, 0.4);
  rise("#card-tnfl .card-h", 8.3, 0.6);
  fadeIn("#card-tnfl .tstrip", 8.4, 0.4);
  travel("#card-tnfl", 9.0);
  rise("#card-tnfl .card-sub", 9.2, 0.6);
  tl.to("#card-tnfl .t-end", { color: "#f0a0a0", duration: 0.2 }, 9.95);
  grow("#rec-tnfl .act-ul", 10.35, 0.25);
  tl.to("#rec-tnfl .badge", { opacity: 0.35, duration: 0.15, ease: "power1.in" }, 10.65);
  tl.to("#rec-tnfl .badge", { opacity: 1, duration: 0.2, ease: OUT }, 10.8);
  tl.to("#card-hndl", { opacity: 1, duration: 0.3, ease: OUT }, 11.0);
  fadeOut("#s-threats", 11.6, 0.4);

  // 12-18 reveal
  logoIn("#logo-reveal", 12.4);
  rise("#reveal-h", 13.0, 0.6);
  rise("#reveal-sub", 14.0, 0.5);
  grow("#reveal-rule", 15.4, 0.4);
  rise("#reveal-spec", 15.6, 0.5);
  fadeOut("#s-reveal", 17.6, 0.4);

  // 18-21 launched, beat 1
  rise("#b1-idx", 18.1, 0.5);
  rise("#rec-launch", 18.1, 0.4);
  rise("#b1-h", 18.2, 0.6);
  fadeIn("#b1-visual .tstrip", 18.3, 0.4);
  fadeIn("#rec-launch .chip-mldsa", 18.5, 0.3);
  rise("#b1-sub", 19.0, 0.5);
  travel("#b1-visual", 19.0);
  tl.to("#b1-visual .t-end", { color: "#f3f7f8", duration: 0.2 }, 19.95);
  fadeIn("#rec-launch .chip-rej", 20.3, 0.12);
  fadeOut("#beat-1", 20.7, 0.3);

  // 21-24 launched, beat 2
  rise("#b2-idx", 21.1, 0.5);
  grow("#stack .base-line", 21.1, 0.4);
  fadeIn("#stack .base-label", 21.15, 0.3);
  rise("#b2-h", 21.2, 0.6);
  rise("#stack .l1", 21.3, 0.35);
  rise("#stack .l2", 21.6, 0.35);
  rise("#b2-sub", 22.0, 0.5);
  grow("#stack .spine", 22.2, 0.7, "scaleY", IO);
  fadeOut("#s-launched", 23.6, 0.4);

  // 24-30 end card, held to the last frame
  logoIn("#logo-end", 24.0);
  rise("#end-title", 25.0, 0.6);
  rise("#end-url", 25.8, 0.5);
  rise("#end-line", 26.4, 0.5);

  // character-level renderer, spanning the full 30 s
  const clock = { t: 0 };
  tl.to(clock, { t: 30, duration: 30, ease: "none", onUpdate: () => render(clock.t) }, 0);
  window.addEventListener("hf-seek", (e) => {
    const t = e && e.detail ? Number(e.detail.time) : NaN;
    if (Number.isFinite(t)) render(t);
  });
  render(0);

  window.__timelines = window.__timelines || {};
  window.__timelines["main"] = tl;
})();
