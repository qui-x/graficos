(function () {
  'use strict';
  const canvas = document.getElementById('graphCanvas');
  const objects = new GraphObjects();
  const engine = new GraphEngine(canvas, objects);
  AppUI.init(objects, engine);
  if (!objects.items.length) engine.center();
  else engine.requestRender();
  const recalibrate = () => { engine.resize(); engine.requestRender(); };
  requestAnimationFrame(() => requestAnimationFrame(recalibrate));
  setTimeout(recalibrate, 120);
  document.addEventListener('fullscreenchange', recalibrate);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => {
        console.warn('OrbisV: não foi possível registrar o service worker.', error);
      });
    }, { once: true });
  }
})();
