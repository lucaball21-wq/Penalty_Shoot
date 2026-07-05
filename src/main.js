// Bootstrapping: create game and UI and start loop
(function(){
  const canvas = document.getElementById('three-canvas');
  const game = new Game(canvas);
  const ui = new UI(game);

  // wire simple scene ambient animations
  const animate = ()=>{
    // rotate subtle background / lights
    requestAnimationFrame(animate);
  };
  animate();

  // exposures for debugging
  window.game = game;
  window.ui = ui;

  // start render loop
  game.startLoop();
})();
