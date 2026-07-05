# Penalty Shootout (Vite + TypeScript)

This branch converts the starter to a Vite + TypeScript project and adds:
- 5-shot-per-side match flow with sudden death
- Slow-motion replay camera for goals
- WebAudio-synthesized goal/miss/crowd sounds (no external audio files required)
- Textured stadium crowd with animated UV scrolling (hi-res image loaded from Unsplash)
- League progression saved to localStorage (tiers, points, trophies)

Run locally:

1) Install deps
   npm install

2) Dev server
   npm run dev

3) Build
   npm run build
   npm run preview

Notes:
- The crowd texture is loaded from an external Unsplash URL (hi-res). Replace the URL in src/game/Game.ts with your preferred image if desired.
- Audio is synthesized using WebAudio for portability; you can replace with sampled files if you want later.
