(function(exports){
  function UI(game){
    this.game = game;
    this.root = document.getElementById('ui-root');
    this.createMenu();
    this.bindControls();
    this.updateScore();
    this.loadProgress();
    // event listeners for effects
    window.addEventListener('game:goal', ()=>this.confettiBurst());
    window.addEventListener('game:miss', ()=>this.crowdGasp());
  }
  UI.prototype.createMenu = function(){
    const menu = document.createElement('div'); menu.id='menu'; menu.className='panel';
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

    const score = document.createElement('div'); score.id='score'; score.className='panel';
    score.innerHTML = `<div style="font-weight:700">Score</div><div id="score-values" style="font-size:20px;margin-top:6px">You 0 - 0 AI</div>`;
    this.root.appendChild(score);

    const controls = document.createElement('div'); controls.id='controls'; controls.className='panel';
    controls.innerHTML = `<div style="font-weight:600">Power</div><div id="power-bar"><div id="power-fill"></div></div>`;
    this.root.appendChild(controls);

    const msg = document.createElement('div'); msg.id='message'; this.root.appendChild(msg);

    document.getElementById('quick').onclick = ()=>{ this.startQuick(); };
    document.getElementById('league').onclick = ()=>{ this.startLeague(); };
    document.getElementById('difficulty').onchange = (e)=>{ this.game.setDifficulty(e.target.value); };
    document.getElementById('club').onchange = (e)=>{ localStorage.setItem('ps_club', e.target.value); };
    // keep initial club saved
    const club = localStorage.getItem('ps_club') || 'Manchester City';
    document.getElementById('club').value = club;
  };

  UI.prototype.startQuick = function(){
    // reset score
    this.game.score = {player:0,ai:0};
    this.updateScore();
    this.saveProgress();
  };

  UI.prototype.startLeague = function(){
    // simple league kickoff: keep running tally saved to localStorage
    const stored = JSON.parse(localStorage.getItem('ps_league')||'{"tier":0,"wins":0,"losses":0,"draws":0,"trophies":[]}');
    alert('League Mode starts. Tier: ' + stored.tier);
    // more elaborate progression can be added
  };

  UI.prototype.bindControls = function(){
    this.aim = new THREE.Vector3(0,0,-1);
    this.power = 0;
    this.powerGrowing = true;
    this.mouseDown = false;
    this.startX = 0;
    // mouse aim
    window.addEventListener('pointerdown', (e)=>{
      this.mouseDown = true; this.startX = e.clientX;
    });
    window.addEventListener('pointermove', (e)=>{
      if(!this.mouseDown) return;
      const dx = (e.clientX - this.startX)/window.innerWidth;
      this.aim.x = THREE.MathUtils.clamp(dx*2, -0.8, 0.8);
      this.aim.y = 0.08;
      this.aim.z = -1;
      this.aim.normalize();
      this.game.penalty.aimPreview(this.aim, this.power);
    });
    window.addEventListener('pointerup', ()=>{ this.mouseDown=false; });

    // keyboard
    window.addEventListener('keydown', (e)=>{
      if(e.key === ' '){
        // stop power
        this.powerGrowing = false;
      } else if(e.key === 'Enter'){
        // shoot
        this.doShoot();
      } else if(e.key === 'r' || e.key === 'R'){
        this.game.penalty.reset();
      } else if(e.key === 'Escape'){
        this.game.paused = !this.game.paused;
      } else if(e.key === 'ArrowLeft'){
        this.aim.x = Math.max(-0.8, this.aim.x - 0.06);
        this.game.penalty.aimPreview(this.aim, this.power);
      } else if(e.key === 'ArrowRight'){
        this.aim.x = Math.min(0.8, this.aim.x + 0.06);
        this.game.penalty.aimPreview(this.aim, this.power);
      }
    });

    // power loop
    const tickPower = ()=>{
      if(this.powerGrowing){
        this.power += 0.01;
        if(this.power > 1) { this.power = 1; this.powerGrowing = false; }
      } else {
        this.power -= 0.005;
        if(this.power < 0) { this.power = 0; this.powerGrowing = true; }
      }
      const fill = document.getElementById('power-fill');
      if(fill) fill.style.width = Math.round(this.power*100) + "%";
      requestAnimationFrame(tickPower);
    };
    tickPower();
  };

  UI.prototype.doShoot = function(){
    if(this.game.penalty.shotInProgress) return;
    const shotState = this.game.penalty.shoot(this.aim, this.power);
    // notify game AI
    this.game.onShotFired(shotState, this.aim.clone());
    // set callback handling
    this.game.onResult = (out)=>{
      this.updateScore();
      this.saveProgress();
      // quick camera shake
      this.cameraShake();
    };
  };

  UI.prototype.updateScore = function(){
    const el = document.getElementById('score-values');
    el.innerText = `You ${this.game.score.player} - ${this.game.score.ai} AI`;
  };

  UI.prototype.cameraShake = function(){
    // small camera shake by adjusting position
    const cam = this.game.camera;
    const orig = cam.position.clone();
    let t = 0;
    const shake = ()=>{
      t+=0.05;
      cam.position.x = orig.x + (Math.random()*2-1)*0.12*(1-t);
      cam.position.y = orig.y + (Math.random()*2-1)*0.06*(1-t);
      if(t<1) requestAnimationFrame(shake);
      else cam.position.copy(orig);
    };
    shake();
  };

  UI.prototype.confettiBurst = function(){
    // simple colored falling rectangles using DOM for speed
    const cont = document.createElement('div'); cont.className='confetti';
    for(let i=0;i<40;i++){
      const d = document.createElement('div');
      d.style.position='absolute';
      d.style.left = Math.random()*100 + '%';
      d.style.top = (Math.random()*40 - 10) + '%';
      d.style.width='8px'; d.style.height='14px';
      d.style.background = ['#ffd700','#ff6b6b','#6bffb2','#66d0ff'][Math.floor(Math.random()*4)];
      d.style.opacity=0.95;
      d.style.transform = `rotate(${Math.random()*360}deg)`;
      cont.appendChild(d);
      // animate
      d.animate([
        {transform:d.style.transform, top: d.style.top},
        {transform:`rotate(${Math.random()*360}deg)`, top: '120%'}
      ], {duration:1000+Math.random()*1400, easing:'cubic-bezier(.2,.7,.2,1)'});
    }
    document.body.appendChild(cont);
    setTimeout(()=>cont.remove(),2200);
  };

  UI.prototype.crowdGasp = function(){
    // darken slightly
    const overlay = document.createElement('div');
    overlay.style.position='fixed'; overlay.style.left=0; overlay.style.top=0; overlay.style.right=0; overlay.style.bottom=0;
    overlay.style.background='rgba(0,0,0,0.25)'; overlay.style.pointerEvents='none';
    document.body.appendChild(overlay);
    setTimeout(()=>overlay.remove(),700);
  };

  UI.prototype.saveProgress = function(){
    const cur = {
      club: document.getElementById('club').value,
      score: this.game.score
    };
    localStorage.setItem('ps_progress', JSON.stringify(cur));
  };

  UI.prototype.loadProgress = function(){
    const cur = JSON.parse(localStorage.getItem('ps_progress')||'null');
    if(cur){
      document.getElementById('club').value = cur.club || document.getElementById('club').value;
      this.game.score = cur.score || this.game.score;
      this.updateScore();
    }
  };

  exports.UI = UI;
})(window);
