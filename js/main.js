(function () {
  'use strict';
  const objects = new GraphObjects();
  const engine = new GraphEngine(document.getElementById('graphCanvas'), objects);
  AppUI.init(objects, engine);
  if (globalThis.customElements?.whenDefined) {
    customElements.whenDefined('math-field').then(() => {
      document.querySelectorAll('math-field').forEach((field) => field.classList.add('mathlive-ready'));
    });
  }
  engine.center();
  const recalibrate = () => { engine.resize(); engine.requestRender(); };
  requestAnimationFrame(() => requestAnimationFrame(recalibrate));
  setTimeout(recalibrate, 100);
})();
