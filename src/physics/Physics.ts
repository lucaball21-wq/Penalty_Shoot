import * as THREE from 'three';

export class Physics {
  gravity = new THREE.Vector3(0, -9.8, 0);
  airDrag = 0.99;
  groundFriction = 0.98;

  step(ball: { pos: THREE.Vector3; vel: THREE.Vector3; radius: number }, dt: number) {
    ball.vel.addScaledVector(this.gravity, dt);
    ball.vel.multiplyScalar(Math.pow(this.airDrag, dt * 60));
    ball.pos.addScaledVector(ball.vel, dt);
    const groundY = 0.2;
    if (ball.pos.y - ball.radius <= groundY) {
      ball.pos.y = groundY + ball.radius;
      if (ball.vel.y < 0) ball.vel.y *= -0.35;
      ball.vel.x *= this.groundFriction;
      ball.vel.z *= this.groundFriction;
    }
    if (ball.vel.length() < 0.05) ball.vel.set(0, 0, 0);
  }
}
