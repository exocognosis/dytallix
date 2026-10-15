# Dytallix Mainnet Launch Film

30 s, 30 fps, silent. Two formats built from one source. The approved brief and shot list are in [BRIEF.md](BRIEF.md).

| Path | What |
|---|---|
| `src/build.mjs` | Markup, geometry per format, placeholder hex data. Writes both projects. |
| `src/film.css` | Tokens and styles (dytallix.com dark theme). |
| `src/film.runtime.js` | GSAP timeline plus the time-driven text renderer (key recovery, decryption, forgery). |
| `assets/` | The supplied logo, untouched, and the Inter and JetBrains Mono variable fonts (OFL). |
| `projects/16x9`, `projects/9x16` | Generated HyperFrames projects, one root `index.html` each. |
| `renders/` | MP4 output. |

Edit files under `src/`, never `projects/*/index.html`, then rebuild and re-render:

```bash
node src/build.mjs
```

```bash
cd projects/16x9 && npx --yes hyperframes@0.8.79 check && npx --yes hyperframes@0.8.79 render -f 30 -q high -o ../../renders/dytallix-mainnet-16x9.mp4
```

```bash
cd projects/9x16 && npx --yes hyperframes@0.8.79 check && npx --yes hyperframes@0.8.79 render -f 30 -q high -o ../../renders/dytallix-mainnet-9x16.mp4
```

To open the Studio preview:

```bash
cd projects/16x9 && npx --yes hyperframes@0.8.79 preview --background
```

## Logo handling

The PNG is copied byte-for-byte; check with `shasum assets/dytallix-logo.png`. On screen it is only cropped to its own black padding. It is shown at native pixels in the reveal and at an exact 0.8× in the end card, with whole-pixel offsets. Its only motion is opacity plus a rise rounded to whole pixels. It is never recolored, blended, glowed or scaled up.
