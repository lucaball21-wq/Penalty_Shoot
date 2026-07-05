(function(exports){
  // Simple physics integrator for the ball
  function Physics(){
    this.gravity = new THREE.Vector3(0,-9.8,0);
    this.airDrag = 0.99;
    this.groundFriction = 0.98;
  }
  Physics.prototype.step = function(ball, dt){
    // ball has: pos (Vector3), vel (Vector3), radius
    // integrate
    ball.vel.addScaledVector(this.gravity, dt);
    ball.vel.multiplyScalar(Math.pow(this.airDrag, dt*60));
    ball.pos.addScaledVector(ball.vel, dt);

    // ground collision at y=0.2 (field height)
    const groundY = 0.2;
    if(ball.pos.y - ball.radius <= groundY){
      ball.pos.y = groundY + ball.radius;
      if(ball.vel.y < 0) ball.vel.y *= -0.35; // bounce
      // friction on x,z
      ball.vel.x *= this.groundFriction;
      ball.vel.z *= this.groundFriction;
    }
    // small threshold stop
    if(ball.vel.length() < 0.05){
      ball.vel.set(0,0,0);
    }
  };
  exports.Physics = Physics;
})(window);
