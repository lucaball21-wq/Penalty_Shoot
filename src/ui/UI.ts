import * as THREE from 'three';
import { Game } from '../game/Game';

export class UI {
  game: Game;
  root: HTMLElement;
  aim = new THREE.Vector3(0, 0, -1);
  power = 0;
  powerGrowing = true;
  mouseDown = false;
  startX = 0;

  constructor(game: Game) {
    this.game = game;
    this.root = document.getElementById('ui-root') as HTMLElement;
    this.createMenu();
    this.bindControls();
    this.updateScore();
    this.loadProgress();
    window.addEventListener('game:goal', () => this.onGoal());
    window.addEventListener('game:miss', () => this.onMiss());
    window.addEventListener('match:end', (e: any) => this.onMatchEnd(e));
  }

  createMenu() {
    const menu = document.createElement('div'); menu.id = 'menu'; menu.className = 'panel';
    menu.innerHTML = `
      <div style="font-weight:700;font-size:18px">3D EPL Penalty Shootout</div>
      <div class="small-muted">Select Club</div>
      <select id="club" class="club-select">
        <option>Manchester City</option><option>Arsenal</option><option>Liverpool</option><option>Chelsea</option><option>Manchester United</option>
      </select>
      <div style="margin-top:8px">
        <span class="button" id="quick">Quick Match</span>
        <span class="button" id="league">League Mode</span>
      </div>
      <div style="margin-top:8px">
        <label class="small-muted">Goalkeeper difficulty</label>
        <select id="difficulty" class="club-select small">
          <option value="easy">Easy</option><option value="medium" selected>Medium</option><option value="hard">Hard</option>
        </select>
      </div>
      <div class="small-muted" style="margin-top:8px">Controls: Mouse drag to aim, Space stop power, Enter shoot, R restart</div>
    `;
    this.root.appendChild(menu);

    const score = document.createElement('div'); score.id = 'score'; score.className = 'panel';
    score.innerHTML = `<div style="font-weight:700">Score</div><div id="score-values" style="font-size:20px;margin-top:6px">You 0 - 0 AI</div>`;
    this.root.appendChild(score);

    const league = document.createElement('div'); league.className = 'panel league-panel'; league.id = 'league';
    league.innerHTML = `<div style="font-weight:700">League</div><div id="league-body" style="margin-top:8px">Tier: 0<br/>Points: 0<br/>Trophies: None</div>`;
    this.root.appendChild(league);

    const controls = document.createElement('div'); controls.id = 'controls'; controls.className = 'panel';
    controls.innerHTML = `<div style="font-weight:600">Power</div><div id="power-bar"><div id="power-fill"></div></div>`;
    this.root.appendChild(controls);

    const msg = document.createElement('div'); msg.id = 'message'; this.root.appendChild(msg);

    document.getElementById('quick')!.onclick = () => { this.startQuick(); };
    document.getElementById('league')!.onclick = () => { this.startLeague(); };
    (document.getElementById('difficulty') as HTMLSelectElement).onchange = (e) => { this.game.goalKeeper.ai = new (require('../ai/GoalkeeperAI').GoalkeeperAI)((e.target as HTMLSelectElement).value); };
    (document.getElementById('club') as HTMLSelectElement).onchange = (e) => { localStorage.setItem('ps_club', (e.target as HTMLSelectElement).value); };
    const club = localStorage.getItem('ps_club') || 'Manchester City';
    (document.getElementById('club') as HTMLSelectElement).value = club;
  }

  startQuick() {
    this.game.match.startMatch();
    this.game.score = { player: 0, ai: 0 } as any;
    this.updateScore();
    this.saveProgress();
  }

  startLeague() {
    const stored = JSON.parse(localStorage.getItem('ps_league') || '{"tier":0,"points":0,"wins":0,"losses":0,"trophies":[]}');
    alert('League Mode starts. Tier: ' + stored.tier);
  }

  bindControls() {
    window.addEventListener('pointerdown', (e) => { this.mouseDown = true; this.startX = (e as PointerEvent).clientX; });
    window.addEventListener('pointermove', (e) => { if (!this.mouseDown) return; const dx = ((e as PointerEvent).clientX - this.startX) / window.innerWidth; this.aim.x = THREE.MathUtils.clamp(dx * 2, -0.8, 0.8); this.aim.y = 0.08; this.aim.z = -1; this.aim.normalize(); this.game.penalty.aimPreview(this.aim, this.power); });
    window.addEventListener('pointerup', () => { this.mouseDown = false; });
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ') { this.powerGrowing = false; }
      else if (e.key === 'Enter') { this.doShoot(); }
      else if (e.key.toLowerCase() === 'r') { this.game.penalty.reset(); }
      else if (e.key === 'Escape') { /* pause */ }
      else if (e.key === 'ArrowLeft') { this.aim.x = Math.max(-0.8, this.aim.x - 0.06); this.game.penalty.aimPreview(this.aim, this.power); }
      else if (e.key === 'ArrowRight') { this.aim.x = Math.min(0.8, this.aim.x + 0.06); this.game.penalty.aimPreview(this.aim, this.power); }
    });

    const tickPower = () => { if (this.powerGrowing) { this.power += 0.01; if (this.power > 1) { this.power = 1; this.powerGrowing = false; } } else { this.power -= 0.005; if (this.power < 0) { this.power = 0; this.powerGrowing = true; } } const fill = document.getElementById('power-fill') as HTMLElement; if (fill) fill.style.width = Math.round(this.power * 100) + "%"; requestAnimationFrame(tickPower); };
    tickPower();
  }

  doShoot() {
    if (this.game.penalty.shotInProgress) return;
    const shotState = this.game.penalty.shoot(this.aim, this.power);
    if (!shotState) return;
    this.game.onShotFired(shotState, this.aim.clone());

    // listen for result events
    const onGoal = () => { window.removeEventListener('game:goal', onGoal); this.game.match.onShotResult('player', 'goal'); this.updateScore(); };
    const onMiss = () => { window.removeEventListener('game:miss', onMiss); this.game.match.onShotResult('player', 'miss'); this.updateScore(); };
    window.addEventListener('game:goal', onGoal);
    window.addEventListener('game:miss', onMiss);
  }

  updateScore() {
    const el = document.getElementById('score-values') as HTMLElement;
    el.innerText = `You ${this.game.match.playerGoals || 0} - ${this.game.match.aiGoals || 0} AI`;
    const lb = document.getElementById('league-body') as HTMLElement;
    const stored = JSON.parse(localStorage.getItem('ps_league') || '{"tier":0,"points":0,"trophies":[]}');
    lb.innerHTML = `Tier: ${stored.tier} <br> Points: ${stored.points} <br> Trophies: ${(stored.trophies || []).join(', ') || 'None'}`;
  }

  onGoal() { this.showMessage('GOAL!', '#ffd700'); this.createConfetti(); this.game.audio.boostCrowd(1.8, 1600); }
  onMiss() { this.showMessage('MISS', '#ff6b6b'); this.game.audio.lowerCrowd(0.2, 900); }

  showMessage(text: string, color = '#fff') { const msg = document.getElementById('message') as HTMLElement; msg.innerText = text; msg.style.color = color; setTimeout(() => msg.innerText = '', 1200); }

  createConfetti() { const cont = document.createElement('div'); cont.className = 'confetti'; for (let i = 0; i < 40; i++) { const d = document.createElement('div'); d.style.position = 'absolute'; d.style.left = Math.random() * 100 + '%'; d.style.top = (Math.random() * 40 - 10) + '%'; d.style.width = '8px'; d.style.height = '14px'; d.style.background = ['#ffd700', '#ff6b6b', '#6bffb2', '#66d0ff'][Math.floor(Math.random() * 4)]; d.style.opacity = '0.95'; d.style.transform = `rotate(${Math.random() * 360}deg)`; cont.appendChild(d); d.animate([{ transform: d.style.transform, top: d.style.top }, { transform: `rotate(${Math.random() * 360}deg)`, top: '120%' }], { duration: 1000 + Math.random() * 1400, easing: 'cubic-bezier(.2,.7,.2,1)' }); } document.body.appendChild(cont); setTimeout(() => cont.remove(), 2200); }

  onMatchEnd(e: any) {
    const detail = e.detail;
    alert(`Match ended. Winner: ${detail.winner}. Score: ${detail.playerGoals} - ${detail.aiGoals}`);
    // update league
    const league = JSON.parse(localStorage.getItem('ps_league') || '{"tier":0,"points":0,"wins":0,"losses":0,"trophies":[]}');
    if (detail.winner === 'player') { league.points = (league.points || 0) + 3; league.wins = (league.wins || 0) + 1; } else { league.losses = (league.losses || 0) + 1; }
    // promotion example
    if (league.points >= 30) { league.tier = (league.tier || 0) + 1; league.points = 0; (league.trophies = league.trophies || []).push('League Winner'); }
    localStorage.setItem('ps_league', JSON.stringify(league));
    this.updateScore();
  }

  saveProgress() { const cur = { club: (document.getElementById('club') as HTMLSelectElement).value }; localStorage.setItem('ps_progress', JSON.stringify(cur)); }
  loadProgress() { const cur = JSON.parse(localStorage.getItem('ps_progress') || 'null'); if (cur) (document.getElementById('club') as HTMLSelectElement).value = cur.club || (document.getElementById('club') as HTMLSelectElement).value; }
}
