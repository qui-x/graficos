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
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js?v=6.2.0', { scope: './', updateViaCache: 'none' });
        registration.update().catch(()=>{});
        let reloadedForUpdate = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloadedForUpdate || sessionStorage.getItem('orbisv-sw-reloaded-v6.2.0') === '1') return;
          reloadedForUpdate = true;
          sessionStorage.setItem('orbisv-sw-reloaded-v6.2.0','1');
          location.reload();
        });
      } catch (error) {
        console.warn('OrbisV: não foi possível registrar o service worker.', error);
      }
    }, { once: true });
  }
})();
