import * as THREE from 'three';

export class Penalty {
  scene: THREE.Scene;
  ball: THREE.Mesh;
  ballRadius = 0.11;
  shotInProgress = false;
  ballState: { pos: THREE.Vector3; vel: THREE.Vector3; radius: number } | null = null;
  clockElapsed = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.1 });
    const geo = new THREE.SphereGeometry(this.ballRadius, 24, 16);
    this.ball = new THREE.Mesh(geo, mat);
    this.ball.castShadow = true;
    this.scene.add(this.ball);
    this.reset();
  }

  reset() {
    this.shotInProgress = false;
    const pos = new THREE.Vector3(0, 0.3, 8.5);
    this.ball.position.copy(pos);
    this.ballState = null;
  }

  aimPreview(aimVec: THREE.Vector3, power: number) {
    if (this.shotInProgress) return;
    const pos = new THREE.Vector3(0, 0.3, 8.5).addScaledVector(aimVec, power * 1.2);
    this.ball.position.copy(pos);
    (this.ball.material as any).color.setHSL(0.05 + power * 0.2, 0.8, 0.6);
  }

  shoot(aimVec: THREE.Vector3, power: number) {
    if (this.shotInProgress) return null;
    this.shotInProgress = true;
    const speed = 12 + power * 20;
    const vel = aimVec.clone().multiplyScalar(speed);
    vel.y = 3 + power * 4;
    this.ballState = { pos: this.ball.position.clone(), vel, radius: this.ballRadius };
    return this.ballState;
  }

  updateMeshFromState(state: { pos: THREE.Vector3; vel: THREE.Vector3; radius: number }) {
    this.ball.position.copy(state.pos);
  }
}
