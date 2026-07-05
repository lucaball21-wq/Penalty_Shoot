# 3D EPL Penalty Shootout - Starter

This branch contains a playable Three.js-based penalty shootout starter for the browser. It focuses on a fun, playable experience with a lightweight AI goalkeeper, simple ball physics, and vivid feedback on goals/misses.

Files included:
- index.html
- style.css
- src/ai/GoalkeeperAI.js
- src/physics/Physics.js
- src/game/Penalty.js
- src/game/Game.js
- src/ui/UI.js
- src/main.js

Run locally (recommended via simple HTTP server):

1) Using Python 3 (recommended):

   python -m http.server 8000
   open http://localhost:8000 in Chrome

2) Or open index.html directly in Chrome (note: module loading or file:// restrictions may apply).

Notes & next steps:
- This is plain JavaScript and no build step is required. For a TypeScript + Vite setup, I can convert and add build config.
- Consider adding audio, replay, and full 5-penalty-match flow for league mode.

Enjoy! If you'd like, I can open a pull request from this branch into your default branch.
