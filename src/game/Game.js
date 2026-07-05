(function(exports){
  // Game manager: scene, camera, goalkeeper, UI hooks
  function Game(canvas){
    this.canvas = canvas;
    this.width = canvas.clientWidth;
    this.height = canvas.clientHeight;
    this.renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true});
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 200);
    this.camera.position.set(0,2.6,14);
    this.controls = null;
    this.clock = new THREE.Clock();
    this.physics = new Physics();
    this.penalty = null;
    this.goalKeeper = null;
    this.score = {player:0,ai:0};
    this.isSlowMo = false;
    this.slowMoT = 0;
    this.initScene();
    this.bindResize();
    this.setupGoalKeeper();
    this.bindLights();
    this.loop = this.loop.bind(this);
    this.paused = false;
  }

  Game.prototype.initScene = function(){
    const s = this.scene;
    // ground / pitch
    const groundMat = new THREE.MeshStandardMaterial({color:0x1e8b3a, roughness:0.9});
    const groundGeo = new THREE.PlaneGeometry(40,60,4,4);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;
    ground.position.y = 0;
    s.add(ground);

    // simple stadium walls (curved impression)
    const fb = new THREE.Mesh(new THREE.BoxGeometry(40,6,2), new THREE.MeshStandardMaterial({color:0x0b2b45}));
    fb.position.set(0,3,-20);
    fb.receiveShadow = true; s.add(fb);
    const back = new THREE.Mesh(new THREE.BoxGeometry(40,6,2), new THREE.MeshStandardMaterial({color:0x0b2b45}));
    back.position.set(0,3,30);
    s.add(back);

    // goal
    const goal = new THREE.Group();
    const postMat = new THREE.MeshStandardMaterial({color:0xffffff});
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(7.32,0.18,0.18), postMat); // crossbar
    bar1.position.set(0,2.44,-18.3);
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.18,2.4,0.18), postMat);
    left.position.set(-3.66,1.2,-18.3);
    const right = left.clone(); right.position.set(3.66,1.2,-18.3);
    goal.add(bar1,left,right);
    s.add(goal);

    // crowd approximation: planes with color
    for(let i=0;i<12;i++){
      const y = 0.6 + (i%4)*0.2;
      const plane = new THREE.Mesh(new THREE.BoxGeometry(40,1,1), new THREE.MeshStandardMaterial({color: 0x223d6a + (i*1500), roughness:1}));
      plane.position.set(0,3.5 + i*0.45, -14 - i*1.2);
      s.add(plane);
    }

    // ambient
    s.background = new THREE.Color(0x081229);

    // Penalty handler
    this.penalty = new Penalty(this.scene);
  };

  Game.prototype.bindLights = function(){
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5,12,8); dir.castShadow = true;
    dir.shadow.camera.near = 0.5; dir.shadow.camera.far = 50;
    dir.shadow.mapSize.width = 1024; dir.shadow.mapSize.height = 1024;
    this.scene.add(dir);
    const amb = new THREE.AmbientLight(0x6688aa, 0.4);
    this.scene.add(amb);
  };

  Game.prototype.setupGoalKeeper = function(){
    // goalkeeper mesh
    const geo = new THREE.BoxGeometry(0.8,1.8,0.6);
    const mat = new THREE.MeshStandardMaterial({color:0x0033cc});
    const gk = new THREE.Mesh(geo, mat);
    gk.position.set(0,0.9,-17.3);
    gk.castShadow = true;
    this.scene.add(gk);
    this.goalKeeper = {
      mesh: gk,
      state: 'idle',
      diveTargetX: 0,
      diveStart: 0,
      diveDur: 0.6,
      difficulty: 'medium',
      ai: new GoalkeeperAI('medium')
    };
  };

  Game.prototype.onShotFired = function(state, playerAimVec){
    // tell AI about shot
    this.goalKeeper.ai.observeShot(playerAimVec.x);
    const decision = this.goalKeeper.ai.decideDive(playerAimVec);
    // set dive
    this.goalKeeper.diveTargetX = decision.targetX * 3.6; // meters across goal
    this.goalKeeper.diveStart = this.clock.getElapsedTime() + decision.diveDelay;
    this.goalKeeper.diveDur = 0.25 + Math.random()*0.45;
    this.goalKeeper.state = 'prepare';
  };

  Game.prototype.stepGoalkeeper = function(now, dt){
    const gk = this.goalKeeper;
    if(gk.state === 'prepare' || gk.state === 'diving'){
      if(now >= gk.diveStart){
        gk.state = 'diving';
        // simple interpolation
        const t = Math.min(1, (now - gk.diveStart)/gk.diveDur);
        const ease = t<0.5?2*t*t:1 - Math.pow(-2*t+2,2)/2;
        const target = gk.diveTargetX;
        gk.mesh.position.x = THREE.MathUtils.lerp(0, target, ease);
        gk.mesh.position.y = 0.9 - Math.abs(ease-0.5)*1.2; // dip
      }
    } else {
      // return to center
      gk.mesh.position.x *= 0.9;
      gk.mesh.position.y += (0.9 - gk.mesh.position.y)*0.2;
    }
  };

  Game.prototype.update = function(){
    const dtRaw = this.clock.getDelta();
    const now = this.clock.getElapsedTime();
    const dt = this.isSlowMo ? dtRaw*0.35 : dtRaw;
    if(this.paused) return;
    // step goalkeeper
    this.stepGoalkeeper(now, dt);
    // physics step if shot in progress
    if(this.penalty.shotInProgress && this.penalty.ballState){
      this.physics.step(this.penalty.ballState, dt);
      this.penalty.updateMeshFromState(this.penalty.ballState);
      // collision with crossbar/goal area (simplified)
      const b = this.penalty.ballState;
      // check if ball entered goal plane z < -18 and x within posts and y below crossbar
      if(b.pos.z < -18.4 && Math.abs(b.pos.x) < 3.66 && b.pos.y < 2.5){
        // check keeper interception proximity
        const distToGK = Math.hypot(b.pos.x - this.goalKeeper.mesh.position.x, b.pos.y - this.goalKeeper.mesh.position.y);
        if(distToGK < 0.8){
          // saved!
          this.penalty.shotInProgress = false;
          this.onSave();
        } else {
          // goal!
          this.penalty.shotInProgress = false;
          this.onGoal();
        }
      }
      // out of play or stopped
      if(b.pos.z < -22 || b.vel.length()===0 && b.pos.z < 12){
        this.penalty.shotInProgress = false;
        this.onMiss();
      }
    }
  };

  Game.prototype.onGoal = function(){
    this.score.player++;
    this.triggerGoalEffects();
    if(this.onResult) this.onResult("goal");
  };

  Game.prototype.onSave = function(){
    this.score.ai++;
    this.triggerMissEffects();
    if(this.onResult) this.onResult("saved");
  };

  Game.prototype.onMiss = function(){
    this.triggerMissEffects();
    if(this.onResult) this.onResult("miss");
  };

  Game.prototype.triggerGoalEffects = function(){
    // quick camera shake handled in main
    const msg = document.getElementById('message');
    msg.innerText = "GOAL!";
    msg.style.color = "#ffd700";
    setTimeout(()=>msg.innerText="",1200);
    // confetti trigger event
    window.dispatchEvent(new CustomEvent('game:goal'));
  };

  Game.prototype.triggerMissEffects = function(){
    const msg = document.getElementById('message');
    msg.innerText = "MISS";
    msg.style.color = "#ff6b6b";
    setTimeout(()=>msg.innerText="",1200);
    window.dispatchEvent(new CustomEvent('game:miss'));
  };

  Game.prototype.setDifficulty = function(diff){
    this.goalKeeper.difficulty = diff;
    this.goalKeeper.ai = new GoalkeeperAI(diff);
  };

  Game.prototype.startLoop = function(){
    requestAnimationFrame(this.loop);
  };

  Game.prototype.loop = function(){
    this.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.loop);
  };

  exports.Game = Game;
})(window);
