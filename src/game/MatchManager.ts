import * as THREE from 'three';
import { Game } from './Game';

export class MatchManager {
  game: Game;
  shotsPerSide = 5;
  playerShots = 0;
  aiShots = 0;
  playerGoals = 0;
  aiGoals = 0;
  currentTurn: 'player' | 'ai' = 'player';
  inSuddenDeath = false;

  constructor(game: Game) { this.game = game; }

  startMatch() {
    this.playerShots = this.aiShots = this.playerGoals = this.aiGoals = 0;
    this.currentTurn = 'player';
    this.inSuddenDeath = false;
    window.dispatchEvent(new CustomEvent('match:update'));
  }

  onShotResult(side: 'player' | 'ai', result: 'goal' | 'saved' | 'miss') {
    if (side === 'player' && result === 'goal') this.playerGoals++;
    if (side === 'ai' && result === 'goal') this.aiGoals++;
    if (side === 'player') this.playerShots++; else this.aiShots++;

    // check end conditions
    if (this._isMatchOver()) {
      this._endMatch();
      return;
    }

    // switch turn
    if (this.currentTurn === 'player') this.currentTurn = 'ai'; else this.currentTurn = 'player';
    window.dispatchEvent(new CustomEvent('match:update'));

    if (this.currentTurn === 'ai') {
      setTimeout(() => this._aiTakeShot(), 700);
    }
  }

  _aiTakeShot() {
    // naive ai: choose aim and power
    const aimX = (Math.random() * 1.6 - 0.8);
    const power = 0.6 + Math.random() * 0.35;
    const aim = new THREE.Vector3(aimX, 0.08, -1).normalize();
    const state = this.game.penalty.shoot(aim, power);
    if (state) {
      this.game.onShotFired(state, aim);
      // polling for result: we'll subscribe to game events
      const onResult = (ev: any) => {
        window.removeEventListener('match:result', onResult);
      };
    }
  }

  _isMatchOver(): boolean {
    if (!this.inSuddenDeath) {
      if (this.playerShots >= this.shotsPerSide && this.aiShots >= this.shotsPerSide) {
        if (this.playerGoals !== this.aiGoals) return true;
        this.inSuddenDeath = true; return false;
      }
      const playerRemain = this.shotsPerSide - this.playerShots;
      const aiRemain = this.shotsPerSide - this.aiShots;
      if (this.playerGoals > this.aiGoals + aiRemain) return true;
      if (this.aiGoals > this.playerGoals + playerRemain) return true;
    } else {
      if (this.playerShots === this.aiShots && this.playerGoals !== this.aiGoals) return true;
    }
    return false;
  }

  _endMatch() {
    const winner = this.playerGoals > this.aiGoals ? 'player' : 'ai';
    window.dispatchEvent(new CustomEvent('match:end', { detail: { winner, playerGoals: this.playerGoals, aiGoals: this.aiGoals } }));
  }
}
