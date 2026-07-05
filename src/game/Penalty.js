(function(exports){
  // Penalty class handles one-shot lifecycle
  function Penalty(scene, params){
    params = params || {};
    this.scene = scene;
    this.ball = null;
    this.ballRadius = 0.11;
    this.shotInProgress = false;
    this.onResult = function(){};
    this.init();
  }
  Penalty.prototype.init = function(){
    // create ball mesh
    const mat = new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.6, metalness:0.1});
    const geo = new THREE.SphereGeometry(this.ballRadius, 24, 16);
    this.ball = new THREE.Mesh(geo, mat);
    this.ball.castShadow = true;
    this.ball.receiveShadow = false;
    this.reset();
    this.scene.add(this.ball);
  };
  Penalty.prototype.reset = function(){
    this.shotInProgress = false;
    this.ballPos = new THREE.Vector3(0,0.3,8.5); // penalty spot forward
    this.ballVel = new THREE.Vector3();
    this.ball.position.copy(this.ballPos);
  };
  Penalty.prototype.aimPreview = function(aimVec, power){
    // update ball position slightly for preview
    if(this.shotInProgress) return;
    this.ball.position.copy(this.ballPos).addScaledVector(aimVec, power*1.2);
    this.ball.material.color.setHSL(0.05+power*0.2,0.8,0.6);
  };
  Penalty.prototype.shoot = function(aimVec, power){
    if(this.shotInProgress) return;
    this.shotInProgress = true;
    // initial velocity
    const speed = 12 + power*20; // tune
    this.ballVel.copy(aimVec).multiplyScalar(speed);
    // slight upward component
    this.ballVel.y = 3 + power*4;
    // return ball state for external physics step
    this.ballState = {pos:this.ball.position.clone(), vel:this.ballVel.clone(), radius:this.ballRadius};
    return this.ballState;
  };
  Penalty.prototype.updateMeshFromState = function(state){
    this.ball.position.copy(state.pos);
  };
  exports.Penalty = Penalty;
})(window);
