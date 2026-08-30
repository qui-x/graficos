(function () {
  'use strict';
  const objects = new GraphObjects();
  const engine = new GraphEngine(document.getElementById('graphCanvas'), objects);
  AppUI.init(objects, engine);
  engine.center();
  const recalibrate = () => { engine.resize(); engine.requestRender(); };
  requestAnimationFrame(() => requestAnimationFrame(recalibrate));
  setTimeout(recalibrate, 100);
})();
