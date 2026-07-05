(function(exports){
  // Simple goalkeeping AI
  function GoalkeeperAI(difficulty="medium"){
    this.difficulty = difficulty; // "easy"|"medium"|"hard"
    this.reaction = {easy:0.6, medium:0.35, hard:0.15}[difficulty] || 0.35;
    this.predictBias = {easy:0, medium:0.3, hard:0.7}[difficulty] || 0.3;
    this.lastPlayerShots = [];
  }
  GoalkeeperAI.prototype.observeShot = function(shotDir){
    // record last shots for pattern learning
    this.lastPlayerShots.push(shotDir);
    if(this.lastPlayerShots.length>8) this.lastPlayerShots.shift();
  };
  GoalkeeperAI.prototype.decideDive = function(playerAimVec){
    // playerAimVec: normalized Vector3 (x horizontal, y vertical)
    // returns target x offset relative to center (-1..1) and diveDelay
    // pattern: average of last shots to bias prediction
    let avg = 0;
    if(this.lastPlayerShots.length){
      avg = this.lastPlayerShots.reduce((a,b)=>a+b,0)/this.lastPlayerShots.length;
    }
    const noise = (Math.random()*2-1)*(1-this.predictBias);
    const prediction = playerAimVec.x*(0.6+this.predictBias*0.4) + avg*0.4 + noise*0.6;
    const clamped = Math.max(-1, Math.min(1, prediction));
    const diveDelay = this.reaction + Math.random()*0.2 - 0.1; // seconds
    return {targetX: clamped, diveDelay};
  };
  exports.GoalkeeperAI = GoalkeeperAI;
})(window);
