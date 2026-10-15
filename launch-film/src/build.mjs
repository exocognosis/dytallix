// Builds the two compositions from one source:
//   index.html     1920x1080 (16:9)
//   portrait.html  1080x1920 (9:16)
// Run: node src/build.mjs
import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(ROOT, "src/film.css"), "utf8");
const runtime = readFileSync(join(ROOT, "src/film.runtime.js"), "utf8");

// ------------------------------------------------------------------ data
// Placeholder hex from a seeded PRNG: no real keys, signatures or addresses.
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(0x0d17a111);
const byte = () => Math.floor(rnd() * 256).toString(16).padStart(2, "0");
const hexRow = (n) => Array.from({ length: n }, byte).join(" ");
const word = () => byte() + byte();

const DATA = {
  pub: [hexRow(16), hexRow(16)],
  priv: [hexRow(16), hexRow(16)],
  privMask: [Array(16).fill("••").join(" "), Array(16).fill("••").join(" ")],
  packets: Array.from({ length: 8 }, () => word() + " " + word()),
  packetStart: Array.from({ length: 8 }, (_, k) => +(4.25 + 0.34 * k).toFixed(2)),
  packetTravel: 1.1,
  arch: Array.from({ length: 4 }, () => hexRow(20)),
  plain: ["contract terms", "wallet backup", "session keys", "private message"],
  signer: word() + " " + word() + " " + word() + " … " + word(),
  actA: "release → A",
  actX: "release → X",
  sigA: [hexRow(12), hexRow(12), hexRow(12)],
  sigB: [hexRow(12), hexRow(12), hexRow(12)],
};
// Archive rows appear as packets 1..4 cross the tap at the wire's midpoint.
DATA.rowAt = [1, 2, 3, 4].map((k) => +(DATA.packetStart[k] + DATA.packetTravel / 2).toFixed(2));

// ------------------------------------------------------------------ geometry
const LOGO = { src: "assets/dytallix-logo.png", size: 500, crop: { x: 105, y: 80, w: 300, h: 345 } };

const FORMATS = {
  landscape: {
    dir: "projects/16x9",
    W: 1920,
    H: 1080,
    type: { label: 16, eyebrow: 20, hex: 20, packet: 15 },
    hook: {
      text: { l: 128, t: 0, w: 760, h: 1080, fs: 84 },
      art: { l: 968, t: 180, w: 824, h: 720 },
      curve: { x: 0, y: 0, w: 440, h: 460 },
      card: { l: 190, t: 440 },
      fracture: [[380, 0], [350, 110], [398, 230], [330, 380], [372, 520], [300, 720]],
    },
    cards: { l: 128, t: 140, w: 1664, h: 800, gap: 48, dir: "row" },
    card: {
      pad: 44, eyebrowT: 44, hT: 96, hFs: 60, hBreak: true, subT: 240, subFs: 28,
      diaT: 330, diaH: 330, stripT: 704, stripH: 40,
      rowH: 50, rowGap: 10, rowFs: 18, archT: 88, tapLineH: 69,
      rec: { rowT: [44, 112, 180], sigLh: 34, badgeH: 36, labelW: 190, valFs: 20 },
    },
    reveal: { logoTop: 212, hFs: 80, subFs: 34, specFs: 26, ruleW: 520 },
    launched: {
      text: { l: 128, w: 760, fs: 72, subFs: 32, top: 0, h: 1080 },
      visual: { l: 1072, w: 720, recH: 330, t: 333 },
      stack: { l: 1072, w: 720, t: 396, layerH: 96, gap: 16, fs: 22 },
    },
    end: { scale: 0.8, logoTop: 262, titleFs: 72, urlFs: 30, lineFs: 24 },
  },
  portrait: {
    dir: "projects/9x16",
    W: 1080,
    H: 1920,
    type: { label: 19, eyebrow: 23, hex: 22, packet: 17 },
    hook: {
      text: { l: 72, t: 1180, w: 936, h: 240, fs: 88 },
      art: { l: 72, t: 330, w: 936, h: 800 },
      curve: { x: 218, y: 0, w: 500, h: 520 },
      card: { l: 124, t: 500 },
      fracture: [[560, 0], [528, 130], [582, 265], [478, 430], [526, 610], [448, 800]],
    },
    cards: { l: 72, t: 256, w: 936, h: 1328, gap: 32, dir: "column" },
    card: {
      pad: 40, eyebrowT: 40, hT: 90, hFs: 64, hBreak: true, subT: 240, subFs: 32,
      diaT: 318, diaH: 244, stripT: 590, stripH: 36,
      rowH: 40, rowGap: 6, rowFs: 20, archT: 64, tapLineH: 45,
      rec: { rowT: [26, 74, 122], sigLh: 30, badgeH: 34, labelW: 200, valFs: 21 },
    },
    reveal: { logoTop: 560, hFs: 88, subFs: 38, specFs: 30, ruleW: 560, hBreak: true },
    launched: {
      text: { l: 72, w: 936, fs: 84, subFs: 36, top: 900, h: 420 },
      visual: { l: 72, w: 936, recH: 260, t: 440 },
      stack: { l: 72, w: 936, t: 440, layerH: 110, gap: 16, fs: 26 },
    },
    end: { scale: 0.8, logoTop: 640, titleFs: 84, urlFs: 36, lineFs: 30 },
  },
};

// ------------------------------------------------------------------ helpers
const px = (o) =>
  Object.entries(o)
    .map(([k, v]) => `${k}:${typeof v === "number" ? v + "px" : v}`)
    .join(";");
const box = (l, t, w, h) => px({ left: l, top: t, ...(w != null && { width: w }), ...(h != null && { height: h }) });

// Real branch of y^2 = x^3 - x + 1 over x in [-1.5, 1.4], drawn at a uniform
// scale and centred in a w x h box. At x = 1.4 the branch ends (|y| = 1.53) sit
// above the bulge at x = -0.577 (|y| = 1.17), so nothing is clipped.
function curvePath(w, h) {
  const r = -1.324718;
  const x0 = -1.5;
  const xmax = 1.4;
  const f = (x) => Math.sqrt(Math.max(0, x * x * x - x + 1));
  const k = Math.min(w / (xmax - x0), h / (2 * f(xmax)));
  const ox = (w - (xmax - x0) * k) / 2;
  const X = (x) => ox + (x - x0) * k;
  const Y = (y) => h / 2 - y * k;
  const N = 160;
  const xs = Array.from({ length: N + 1 }, (_, i) => r + (xmax - r) * (i / N) ** 2);
  const upper = xs.slice().reverse().map((x) => [X(x), Y(f(x))]);
  const lower = xs.slice(1).map((x) => [X(x), Y(-f(x))]);
  const pts = upper.concat(lower);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const d = "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");
  return { d, len: Math.ceil(len) + 2, w, h, axisY: Y(0), axisX: X(0), point: [X(0.4), Y(f(0.4))] };
}
const polyLen = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);

const check = (s) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 8.5 L6.5 12 L13.5 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>`;

function timelineStrip(g, left, right, style) {
  return `<div class="tstrip" style="${style}">
        <span class="label">${left}</span>
        <div class="t-track"><div class="t-fill"></div><div class="t-carriage"><div class="t-marker"></div></div></div>
        <span class="label t-end">${right}</span>
      </div>`;
}

function record(id, g, w, h, opts) {
  const r = g.rec;
  const pad = 30;
  const valStyle = `font-size:${r.valFs}px;line-height:${r.sigLh}px`;
  const rows = [
    `<div class="rec-row" style="${box(pad, r.rowT[0], w - pad * 2)}"><span class="label" style="width:${r.labelW}px">Signer</span><span class="rv" style="${valStyle}">${DATA.signer}</span></div>`,
    `<div class="rec-row" style="${box(pad, r.rowT[1], w - pad * 2)}"><span class="label" style="width:${r.labelW}px">Action</span><span class="act-wrap"><span class="rv act" style="${valStyle}"><span class="ct">${DATA.actA}</span></span>${
      opts.underline ? `<span class="act-ul" style="bottom:-2px"></span>` : ""
    }</span>${
      opts.reject ? `<span class="chip chip-rej" style="left:${r.labelW + 11 * r.valFs * 0.6 + 24}px;top:0;height:${r.sigLh}px;padding:0 12px;font-size:var(--label-fs)">Rejected</span>` : ""
    }</div>`,
    `<div class="rec-row" style="${box(pad, r.rowT[2], w - pad * 2)};align-items:flex-start"><span class="label" style="width:${r.labelW}px;line-height:${r.sigLh}px">Signature${
      opts.mldsa ? `<br><span class="chip chip-mldsa" style="margin-top:6px;height:28px;padding:0 10px;font-size:calc(var(--label-fs) - 2px)">ML-DSA</span>` : ""
    }</span><span class="rv sig" style="${valStyle}">${DATA.sigA
      .map((row, i) => `<span class="sig-l" data-row="${i}" style="display:block"><span class="cm">${row}</span></span>`)
      .join("")}</span></div>`,
  ];
  return `<div class="record in" id="${id}" style="${box(opts.l || 0, opts.t || 0, w, h)}">
        <div class="badge" style="right:${pad}px;top:${pad - 6}px;height:${r.badgeH}px;font-size:var(--label-fs)">${check(14)}<span>Valid</span></div>
        ${rows.join("\n        ")}
      </div>`;
}

// ------------------------------------------------------------------ scenes
function hookScene(F) {
  const a = F.hook.art;
  const c = curvePath(F.hook.curve.w, F.hook.curve.h);
  const fr = F.hook.fracture;
  const frLen = Math.ceil(polyLen(fr)) + 2;
  const pctPts = fr.map(([x, y]) => `${((x / a.w) * 100).toFixed(3)}% ${((y / a.h) * 100).toFixed(3)}%`);
  const clipA = `polygon(0% 0%, ${pctPts.join(", ")}, 0% 100%)`;
  const clipB = `polygon(${pctPts[0]}, 100% 0%, 100% 100%, ${pctPts.slice().reverse().join(", ")})`;
  const art = (overlap) => `
        <div class="art">
          <svg class="curve" style="${box(F.hook.curve.x, F.hook.curve.y)}" width="${c.w}" height="${c.h}" viewBox="0 0 ${c.w} ${c.h}">
            <path class="curve-axis" d="M0 ${c.axisY.toFixed(1)} H${c.w} M${c.axisX.toFixed(1)} 0 V${c.h}"/>
            <path class="curve-path" d="${c.d}" style="stroke-dasharray:${c.len};stroke-dashoffset:${c.len}"/>
            <circle class="curve-point" cx="${c.point[0].toFixed(1)}" cy="${c.point[1].toFixed(1)}" r="6"/>
          </svg>
          <div class="keycard" style="${box(F.hook.card.l, F.hook.card.t)}">
            <div class="label"${overlap}>Public key</div>
            ${DATA.pub.map((row) => `<div class="khex"${overlap}><span class="cm">${row}</span></div>`).join("")}
            <div class="label second"${overlap}>Private key</div>
            ${DATA.privMask.map((row, i) => `<div class="khex priv" data-row="${i}"${overlap}><span class="cs">${row}</span></div>`).join("")}
          </div>
        </div>`;
  const ov = " data-layout-allow-overlap";
  return `
    <section id="s-hook" class="scene clip" data-start="0" data-duration="4" data-track-index="1">
      <div class="abs" style="${box(F.hook.text.l, F.hook.text.t, F.hook.text.w, F.hook.text.h)};display:flex;align-items:center">
        <h1 id="hook-h" class="headline in" style="font-size:${F.hook.text.fs}px">Classical signatures will not hold.</h1>
      </div>
      <div class="hook-art" style="${box(a.l, a.t, a.w, a.h)}">
        <div class="half half-a" style="clip-path:${clipA}">${art(ov)}</div>
        <div class="half half-b" style="clip-path:${clipB}">${art(ov)}</div>
        <svg class="fracture" width="${a.w}" height="${a.h}" viewBox="0 0 ${a.w} ${a.h}">
          <polyline class="fracture-path" points="${fr.map((p) => p.join(",")).join(" ")}" style="stroke-dasharray:${frLen};stroke-dashoffset:${frLen}"/>
        </svg>
      </div>
    </section>`;
}

function threatCard(F, which) {
  const g = F.card;
  const cw = F.cards.dir === "row" ? (F.cards.w - F.cards.gap) / 2 : F.cards.w;
  const ch = F.cards.dir === "row" ? F.cards.h : (F.cards.h - F.cards.gap) / 2;
  const iw = cw - g.pad * 2;
  const isH = which === "hndl";
  const head = isH ? "Harvest now,<br>decrypt later." : "Trust now,<br>forge later.";
  const sub = isH ? "Stolen ciphertext waits for Q-Day." : "Broken signatures become forged approvals.";
  const headHTML = g.hBreak ? head : head.replace("<br>", " ");
  const eyebrow = isH
    ? `<span class="idx">01</span>  <span class="acr">HNDL</span>  ·  <span class="tag">Confidentiality</span>`
    : `<span class="idx" style="color:var(--subtle)">02</span><span class="eyebrow-rest fade">  <span class="acr">TNFL</span>  ·  <span class="tag">Authenticity</span></span>`;

  let diagram;
  if (isH) {
    const tapX = Math.round(iw / 2);
    const pw = Math.round(F.type.packet * 0.6 * 9 + 28);
    diagram = `
          <div class="transport" style="height:30px">
            <div class="node fade" style="left:0;top:8px"></div>
            <div class="wire" style="${box(14, 15, iw - 28)}"></div>
            <div class="node fade" style="right:0;top:8px"></div>
            <div class="tap" style="left:0;top:0;width:100%;height:100%">
              <div class="tap-dot" style="${box(tapX - 4, 11, 8, 8)}"></div>
              <div class="tap-line" style="${box(tapX - 0.5, 19, null, g.tapLineH)}"></div>
            </div>
            ${DATA.packets
              .map((p) => `<div class="packet" style="width:${pw}px;justify-content:center;left:calc(var(--p, 0) * (100% - ${pw}px))">${p}</div>`)
              .join("\n            ")}
          </div>
          <div class="archive" style="top:${g.archT}px">
            ${DATA.arch
              .map(
                (row, r) =>
                  `<div class="arow" data-row="${r}" style="height:${g.rowH}px;margin-bottom:${r < 3 ? g.rowGap : 0}px;font-size:${g.rowFs}px"><span class="atext"><span class="cm">${row}</span></span></div>`,
              )
              .join("\n            ")}
          </div>`;
  } else {
    diagram = record("rec-tnfl", g, iw, g.diaH, { underline: true });
  }

  return `
      <article class="card" id="card-${which}" style="${px({ width: cw, height: ch, flex: "0 0 auto" })}">
        <div class="eyebrow" style="${box(g.pad, g.eyebrowT)}">${eyebrow}</div>
        <h2 class="card-h headline in" style="${box(g.pad, g.hT, iw)};font-size:${g.hFs}px">${headHTML}</h2>
        <p class="card-sub sub in" style="${box(g.pad, g.subT, iw)};font-size:${g.subFs}px">${sub}</p>
        <div class="diagram" style="${box(g.pad, g.diaT, iw, g.diaH)}">${diagram}
        </div>
        ${timelineStrip(g, "Now", "Q-Day", box(g.pad, g.stripT, iw, g.stripH))}
      </article>`;
}

function threatsScene(F) {
  const c = F.cards;
  return `
    <section id="s-threats" class="scene clip" data-start="4" data-duration="8" data-track-index="1">
      <div class="cards" style="${box(c.l, c.t, c.w, c.h)};flex-direction:${c.dir};gap:${c.gap}px">
        ${threatCard(F, "hndl")}
        ${threatCard(F, "tnfl")}
      </div>
    </section>`;
}

function logo(id, F, scale, top) {
  const s = scale;
  const cw = LOGO.crop.w * s;
  const ch = LOGO.crop.h * s;
  const l = (F.W - cw) / 2;
  return {
    html: `<div class="logo-crop" id="${id}" style="${box(l, top, cw, ch)};transform:translateY(12px)">
        <img data-layout-allow-overflow src="${LOGO.src}" alt="Dytallix" width="${LOGO.size * s}" height="${LOGO.size * s}" style="left:${-LOGO.crop.x * s}px;top:${-LOGO.crop.y * s}px;width:${LOGO.size * s}px;height:${LOGO.size * s}px">
      </div>`,
    bottom: top + ch,
  };
}

function revealScene(F) {
  const g = F.reveal;
  const lg = logo("logo-reveal", F, 1, g.logoTop);
  const hT = lg.bottom + 48;
  const hLines = F.W < 1200 ? 2 : 1;
  const subT = hT + Math.round(g.hFs * 1.04 * hLines) + 22;
  const ruleT = subT + Math.round(g.subFs * 1.3) + 34;
  const specT = ruleT + 30;
  const hw = F.W < 1200 ? 820 : 1400;
  return `
    <section id="s-reveal" class="scene clip" data-start="12" data-duration="6" data-track-index="1">
      ${lg.html}
      <h1 id="reveal-h" class="headline in lockup-text" style="top:${hT}px;font-size:${g.hFs}px;margin:0 auto;width:${hw}px;left:${(F.W - hw) / 2}px;right:auto">${g.hBreak ? "Dytallix mainnet<br>is live." : "Dytallix mainnet is live."}</h1>
      <p id="reveal-sub" class="sub in lockup-text" style="top:${subT}px;font-size:${g.subFs}px">A PQC-native Layer 1.</p>
      <div id="reveal-rule" class="rule" style="${box((F.W - g.ruleW) / 2, ruleT, g.ruleW)}"></div>
      <p id="reveal-spec" class="spec in lockup-text" style="top:${specT}px;font-size:${g.specFs}px">NIST <span class="acc">ML-DSA</span> signing. <span class="acc">ML-KEM</span> transport.</p>
    </section>`;
}

function launchedScene(F) {
  const g = F.launched;
  const t = g.text;
  const textBox = (id, idx, head, sub) => `
        <div class="beat-text" style="${box(t.l, t.top, t.w, t.h)};display:flex;flex-direction:column;justify-content:${F.W < 1200 ? "flex-start" : "center"};gap:26px">
          <div id="${id}-idx" class="label idx in">${idx}</div>
          <h2 id="${id}-h" class="headline in" style="font-size:${t.fs}px">${head}</h2>
          <p id="${id}-sub" class="sub in" style="font-size:${t.subFs}px">${sub}</p>
        </div>`;
  const v = g.visual;
  const s = g.stack;
  const baseT = s.layerH * 2 + s.gap + 32;
  return `
    <section id="s-launched" class="scene clip" data-start="18" data-duration="6" data-track-index="1">
      <div id="beat-1" class="abs" style="inset:0">
        ${textBox("b1", "01", "Post-quantum authorization", "TNFL addressed at genesis.")}
        <div id="b1-visual" class="beat-visual" style="${box(v.l, v.t, v.w, v.recH + 84)}">
          ${record("rec-launch", F.card, v.w, v.recH, { mldsa: true, reject: true })}
          ${timelineStrip(F.card, "Genesis", "Q-Day", box(0, v.recH + 44, v.w, 40))}
        </div>
      </div>
      <div id="beat-2" class="abs" style="inset:0">
        ${textBox("b2", "02", "Native PQC stack", "Not an ECC retrofit.")}
        <div id="stack" class="stack" style="${box(s.l, s.t, s.w, baseT + 40)}">
          <div class="layer l2" style="${box(0, 0, null, s.layerH)};font-size:${s.fs}px;padding-left:84px"><span class="acc">ML-KEM</span><span class="dim">  ·  Transport</span></div>
          <div class="layer l1" style="${box(0, s.layerH + s.gap, null, s.layerH)};font-size:${s.fs}px;padding-left:84px"><span class="acc">ML-DSA</span><span class="dim">  ·  Signing</span></div>
          <div class="base-line" style="top:${baseT}px"></div>
          <div class="label base-label" style="left:0;top:${baseT + 16}px">Genesis</div>
          <div class="spine" style="${box(41, 0, null, baseT)}"></div>
        </div>
      </div>
    </section>`;
}

function endScene(F) {
  const g = F.end;
  const lg = logo("logo-end", F, g.scale, g.logoTop);
  const titleT = lg.bottom + 44;
  const urlT = titleT + Math.round(g.titleFs * 1.1) + 26;
  const lineT = urlT + Math.round(g.urlFs * 1.3) + 30;
  return `
    <section id="s-end" class="scene clip" data-start="24" data-duration="6" data-track-index="1">
      ${lg.html}
      <h1 id="end-title" class="end-title in lockup-text" style="top:${titleT}px;font-size:${g.titleFs}px;line-height:1.1">Dytallix Mainnet</h1>
      <p id="end-url" class="end-url in lockup-text" style="top:${urlT}px;font-size:${g.urlFs}px">www.dytallix.com</p>
      <p id="end-line" class="end-line sub in lockup-text" style="top:${lineT}px;font-size:${g.lineFs}px">Built for the Quantum Era.</p>
    </section>`;
}

// ------------------------------------------------------------------ page
function page(name, F) {
  return `<!doctype html>
<html lang="en" class="fmt-${name}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${F.W}, height=${F.H}" />
    <title>Dytallix Mainnet Launch (${F.W}x${F.H})</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
${css}
html, body { width: ${F.W}px; height: ${F.H}px; }
    </style>
  </head>
  <body>
    <!-- Generated by src/build.mjs. Edit the sources there, not this file. -->
    <div id="root" style="--label-fs:${F.type.label}px;--eyebrow-fs:${F.type.eyebrow}px;--hex-fs:${F.type.hex}px;--packet-fs:${F.type.packet}px" data-composition-id="main" data-start="0" data-duration="30" data-width="${F.W}" data-height="${F.H}">
      <div id="grid"></div>
${hookScene(F)}
${threatsScene(F)}
${revealScene(F)}
${launchedScene(F)}
${endScene(F)}
    </div>
    <script>
      window.FILM_DATA = ${JSON.stringify(DATA)};
    </script>
    <script>
${runtime}
    </script>
  </body>
</html>
`;
}

// Each format is its own HyperFrames project (one root index.html each),
// with its own copy of the assets.
for (const [name, F] of Object.entries(FORMATS)) {
  const out = join(ROOT, F.dir);
  mkdirSync(out, { recursive: true });
  cpSync(join(ROOT, "assets"), join(out, "assets"), { recursive: true });
  writeFileSync(join(out, "index.html"), page(name, F));
  writeFileSync(join(out, "meta.json"), JSON.stringify({ id: `dytallix-mainnet-${name}`, name: `Dytallix Mainnet Launch (${F.W}x${F.H})` }, null, 2) + "\n");
  cpSync(join(ROOT, "src/hyperframes.json"), join(out, "hyperframes.json"));
  console.log("wrote", join(F.dir, "index.html"), `${F.W}x${F.H}`);
}
