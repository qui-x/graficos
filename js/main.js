(function () {
  'use strict';
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;
  const objects = new GraphObjects();
  const engine = new GraphEngine(canvas, objects);
  AppUI.init(objects, engine);
  engine.center();

  const recalibrate = () => {
    engine.resize();
    engine.requestRender();
  };

  requestAnimationFrame(() => requestAnimationFrame(recalibrate));
  window.addEventListener('load', recalibrate, { once: true });
  setTimeout(recalibrate, 100);
})();
