export class GoalkeeperAI {
  difficulty: string;
  reaction: number;
  predictBias: number;
  lastPlayerShots: number[] = [];

  constructor(difficulty = 'medium') {
    this.difficulty = difficulty;
    this.reaction = { easy: 0.6, medium: 0.35, hard: 0.15 }[difficulty] || 0.35;
    this.predictBias = { easy: 0, medium: 0.3, hard: 0.7 }[difficulty] || 0.3;
  }

  observeShot(shotDir: number) {
    this.lastPlayerShots.push(shotDir);
    if (this.lastPlayerShots.length > 8) this.lastPlayerShots.shift();
  }

  decideDive(playerAimVec: { x: number; y?: number; z?: number }) {
    let avg = 0;
    if (this.lastPlayerShots.length) avg = this.lastPlayerShots.reduce((a, b) => a + b, 0) / this.lastPlayerShots.length;
    const noise = (Math.random() * 2 - 1) * (1 - this.predictBias);
    const prediction = playerAimVec.x * (0.6 + this.predictBias * 0.4) + avg * 0.4 + noise * 0.6;
    const clamped = Math.max(-1, Math.min(1, prediction));
    const diveDelay = this.reaction + Math.random() * 0.2 - 0.1;
    return { targetX: clamped, diveDelay };
  }
}
