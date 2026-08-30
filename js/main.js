(function () {
  'use strict';
  const objects = new GraphObjects();
  const engine = new GraphEngine(document.getElementById('graphCanvas'), objects);
  AppUI.init(objects, engine);
  engine.center();
  setTimeout(() => { engine.resize(); engine.requestRender(); }, 100);
})();
