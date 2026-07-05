import * as THREE from 'three';
import { Physics } from '../physics/Physics';
import { Penalty } from './Penalty';
import { GoalkeeperAI } from '../ai/GoalkeeperAI';
import { MatchManager } from './MatchManager';
import { AudioManager } from '../utils/AudioManager';

export class Game {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  physics: Physics;
  penalty: Penalty;
  goalKeeper: any;
  match: MatchManager;
  audio: AudioManager;
  crowdMaterial?: THREE.MeshBasicMaterial;
  private replayBuffer: { pos: THREE.Vector3; vel: THREE.Vector3; t: number }[] = [];
  private recordReplay = false;
  onTick: ((dt: number) => void) | null = null;

  // recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  public lastReplays: Blob[] = [];

  // simple player/goalie low-poly models
  playerMesh?: THREE.Group;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 2.6, 14);
    this.physics = new Physics();
    this.penalty = new Penalty(this.scene);
    this.audio = new AudioManager();
    this.match = new MatchManager(this);
    this.initScene();
    window.addEventListener('resize', () => this.onResize());
    this.loop = this.loop.bind(this);
  }

  initScene() {
    const s = this.scene;
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e8b3a, roughness: 0.9 });
    const groundGeo = new THREE.PlaneGeometry(40, 60, 4, 4);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.position.y = 0;
    s.add(ground);

    // stadium walls
    const fb = new THREE.Mesh(new THREE.BoxGeometry(40, 6, 2), new THREE.MeshStandardMaterial({ color: 0x0b2b45 }));
    fb.position.set(0, 3, -20);
    s.add(fb);

    const back = new THREE.Mesh(new THREE.BoxGeometry(40, 6, 2), new THREE.MeshStandardMaterial({ color: 0x0b2b45 }));
    back.position.set(0, 3, 30);
    s.add(back);

    // goal
    const goal = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(7.32, 0.18, 0.18), postMat);
    bar1.position.set(0, 2.44, -18.3);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.18), postMat);
    left.position.set(-3.66, 1.2, -18.3);
    const right = left.clone();
    right.position.set(3.66, 1.2, -18.3);
    goal.add(bar1, left, right);
    s.add(goal);

    // procedural crowd texture (offline friendly)
    const canvas = document.createElement('canvas');
    canvas.width = 2048; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    // draw stylized crowd: rows of colored dots
    ctx.fillStyle = '#222'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 20; y < canvas.height - 20; y += 8) {
      for (let x = 10; x < canvas.width - 10; x += 12) {
        const c = `hsl(${Math.floor(Math.random() * 50 + 180)},${Math.floor(Math.random() * 40 + 50)}%,${Math.floor(Math.random() * 30 + 40)}%)`;
        ctx.fillStyle = c;
        ctx.beginPath(); ctx.arc(x + Math.random() * 6 - 3, y + Math.random() * 4 - 2, 3 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2,1);
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(40, 6), mat);
    plane.position.set(0, 6, -14);
    this.scene.add(plane);
    this.crowdMaterial = mat;

    s.background = new THREE.Color(0x081229);

    // lights
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 12, 8);
    dir.castShadow = true;
    this.scene.add(dir);
    const amb = new THREE.AmbientLight(0x6688aa, 0.4);
    this.scene.add(amb);

    // goalkeeper
    const geo = new THREE.BoxGeometry(0.8, 1.8, 0.6);
    const matGK = new THREE.MeshStandardMaterial({ color: 0x0033cc });
    const gk = new THREE.Mesh(geo, matGK);
    gk.position.set(0, 0.9, -17.3);
    gk.castShadow = true;
    s.add(gk);
    this.goalKeeper = { mesh: gk, state: 'idle', diveTargetX: 0, diveStart: 0, diveDur: 0.6, difficulty: 'medium', ai: new GoalkeeperAI('medium') };

    // player low-poly (simple group)
    const player = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.4), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    body.position.y = 0.9;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffd8b5 }));
    head.position.y = 1.8;
    player.add(body); player.add(head);
    player.position.set(0, 0, 9.8);
    this.scene.add(player);
    this.playerMesh = player;
  }

  onShotFired(state: any, playerAimVec: THREE.Vector3) {
    this.goalKeeper.ai.observeShot(playerAimVec.x);
    const decision = this.goalKeeper.ai.decideDive(playerAimVec);
    this.goalKeeper.diveTargetX = decision.targetX * 3.6;
    this.goalKeeper.diveStart = performance.now() / 1000 + decision.diveDelay;
    this.goalKeeper.diveDur = 0.25 + Math.random() * 0.45;
    this.goalKeeper.state = 'prepare';

    // animate player kick
    if (this.playerMesh) {
      this.playerMesh.rotation.x = -0.25;
      setTimeout(() => { if (this.playerMesh) this.playerMesh.rotation.x = 0; }, 400);
    }

    // start recording replay
    this.startRecordingReplay();
    this.audio.playCrowd();
    // start MediaRecorder if available
    this.startMediaCapture();
  }

  startRecordingReplay() { this.replayBuffer.length = 0; this.recordReplay = true; }
  stopRecordingReplay() { this.recordReplay = false; }
  recordState(state: { pos: THREE.Vector3; vel: THREE.Vector3; t: number }) { if (!this.recordReplay) return; this.replayBuffer.push({ pos: state.pos.clone(), vel: state.vel.clone(), t: state.t }); if (this.replayBuffer.length > 600) this.replayBuffer.shift(); }

  playSlowMoReplay(onComplete?: () => void) {
    const frames = [...this.replayBuffer];
    if (frames.length === 0) { if (onComplete) onComplete(); return; }
    const origCam = this.camera.position.clone();
    let i = 0;
    const step = () => {
      if (i >= frames.length) { this.camera.position.copy(origCam); if (onComplete) onComplete(); return; }
      const s = frames[i];
      this.penalty.updateMeshFromState({ pos: s.pos, vel: s.vel, radius: this.penalty.ballRadius });
      const camTarget = new THREE.Vector3(s.pos.x * 0.4, s.pos.y + 1.2, s.pos.z + 6);
      this.camera.position.lerp(camTarget, 0.18);
      this.camera.lookAt(s.pos);
      i++; setTimeout(step, 30);
    };
    step();
  }

  // MediaRecorder capture for replay export
  startMediaCapture() {
    try {
      const stream = (this.renderer.domElement as HTMLCanvasElement).captureStream(60);
      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' } as any);
      this.mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) this.recordedChunks.push(e.data); };
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        this.lastReplays.unshift(blob);
        if (this.lastReplays.length > 6) this.lastReplays.pop();
        window.dispatchEvent(new CustomEvent('replay:available'));
      };
      this.mediaRecorder.start();
    } catch (e) { console.warn('MediaRecorder not available', e); }
  }

  stopMediaCapture() { try { if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') this.mediaRecorder.stop(); } catch (e) {} }

  onGoal() {
    window.dispatchEvent(new CustomEvent('game:goal'));
    this.audio.playGoal();
    this.stopRecordingReplay();
    this.stopMediaCapture();
    this.playSlowMoReplay(() => { /* resume */ });
  }

  onSave() { window.dispatchEvent(new CustomEvent('game:miss')); this.audio.playMiss(); this.stopRecordingReplay(); this.stopMediaCapture(); }
  onMiss() { window.dispatchEvent(new CustomEvent('game:miss')); this.audio.playMiss(); this.stopRecordingReplay(); this.stopMediaCapture(); }

  stepGoalkeeper(now: number) {
    const gk = this.goalKeeper;
    if (gk.state === 'prepare' || gk.state === 'diving') {
      if (now >= gk.diveStart) {
        gk.state = 'diving';
        const t = Math.min(1, (now - gk.diveStart) / gk.diveDur);
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        const target = gk.diveTargetX;
        gk.mesh.position.x = THREE.MathUtils.lerp(0, target, ease);
        gk.mesh.position.y = 0.9 - Math.abs(ease - 0.5) * 1.2;
        // animate GK rotation
        gk.mesh.rotation.z = (target / 3.6) * 0.6 * ease;
      }
    } else {
      gk.mesh.position.x *= 0.9;
      gk.mesh.position.y += (0.9 - gk.mesh.position.y) * 0.2;
      gk.mesh.rotation.z *= 0.8;
    }
  }

  update(dt: number) {
    const now = performance.now() / 1000;
    this.stepGoalkeeper(now);
    if (this.penalty && this.penalty.shotInProgress && this.penalty.ballState) {
      this.physics.step(this.penalty.ballState, dt);
      this.penalty.updateMeshFromState(this.penalty.ballState);
      this.recordState({ pos: this.penalty.ballState.pos.clone(), vel: this.penalty.ballState.vel.clone(), t: now });
      const b = this.penalty.ballState;
      if (b.pos.z < -18.4 && Math.abs(b.pos.x) < 3.66 && b.pos.y < 2.5) {
        const distToGK = Math.hypot(b.pos.x - this.goalKeeper.mesh.position.x, b.pos.y - this.goalKeeper.mesh.position.y);
        if (distToGK < 0.8) { this.penalty.shotInProgress = false; this.onSave(); this.gameEndShotCleanup(); }
        else { this.penalty.shotInProgress = false; this.onGoal(); this.gameEndShotCleanup(); }
      }
      if (b.pos.z < -22 || (b.vel.length() === 0 && b.pos.z < 12)) { this.penalty.shotInProgress = false; this.onMiss(); this.gameEndShotCleanup(); }
    }

    // player idle bobbing
    if (this.playerMesh) { this.playerMesh.rotation.y = Math.sin(performance.now() / 800) * 0.02; }

    // crowd UV animation
    if (this.crowdMaterial && this.crowdMaterial.map) { this.crowdMaterial.map.offset.x += dt * 0.06; }

    if (this.onTick) this.onTick(dt);
  }

  gameEndShotCleanup() { // notify match manager if needed
    // This is handled by MatchManager via game:goal/game:miss events in UI
  }

  loop() { const dt = Math.min(0.033, 0.001 * (performance.now() - (this as any)._last || 16)); (this as any)._last = performance.now(); this.update(dt); this.renderer.render(this.scene, this.camera); requestAnimationFrame(this.loop); }
  startLoop() { requestAnimationFrame(this.loop); }
  onResize() { this.renderer.setSize(window.innerWidth, window.innerHeight); this.camera.aspect = window.innerWidth / window.innerHeight; this.camera.updateProjectionMatrix(); }
}
