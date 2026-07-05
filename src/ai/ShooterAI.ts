export class ShooterAI {
  // Simple shooter AI for when AI is taking penalties
  // Chooses aim (x -1..1) and power (0..1) with some randomness and pattern
  lastPlayerPatterns: number[] = [];

  constructor() {}

  observePlayerShot(x: number) {
    this.lastPlayerPatterns.push(x);
    if (this.lastPlayerPatterns.length > 8) this.lastPlayerPatterns.shift();
  }

  chooseShot(goalkeeperPredict: (aimX: number) => number | null) {
    // Try to pick side opposite of GK prediction
    let aimX = (Math.random() * 1.6 - 0.8);
    const power = 0.6 + Math.random() * 0.35;

    // Bias away from average of last player shots to be less predictable
    if (this.lastPlayerPatterns.length) {
      const avg = this.lastPlayerPatterns.reduce((a, b) => a + b, 0) / this.lastPlayerPatterns.length;
      aimX += (Math.random() < 0.6 ? -Math.sign(avg || 0.1) * 0.25 : 0);
    }

    // If we can query GK prediction, try to avoid
    try {
      const pred = goalkeeperPredict ? goalkeeperPredict(aimX) : null;
      if (pred !== null && Math.abs(pred - aimX) < 0.35) {
        aimX += (pred > 0 ? -0.5 : 0.5);
      }
    } catch (e) {
      // ignore
    }

    aimX = Math.max(-0.9, Math.min(0.9, aimX));
    return { aimX, power };
  }
}
