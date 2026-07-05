# Lucas Shootout

Migrate to Vite + TypeScript and add gameplay and UX improvements.

What's included:

- Migrate to Vite + TypeScript
- Implement full 5-shot-per-side match flow with sudden death (player shoots first in SD)
- Add Shooter-AI for AI penalty kicks
- Add slow-motion replay and MediaRecorder export + in-game replay gallery
- Add synthesized crowd/goal/miss audio and procedural hi-res crowd texture with animated UV
- Add low-poly player/goalkeeper animations
- League progression (tier/points/trophies) persisted to localStorage

Run instructions:

1) npm install
2) npm run dev

Files to review (high priority):
- src/game/Game.ts
- src/game/MatchManager.ts
- src/ui/UI.ts
- src/utils/AudioManager.ts

Notes:
- MediaRecorder may require browser support and permissions; replays export as webm.
- Audio uses WebAudio; user gesture may be required to start.
