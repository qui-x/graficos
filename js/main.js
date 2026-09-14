(function () {
  'use strict';
  const canvas = document.getElementById('graphCanvas');
  const objects = new GraphObjects();
  const engine = new GraphEngine(canvas, objects);
  AppUI.init(objects, engine);
  window.addEventListener('error', (event) => {
    if (!event?.error) return;
    AppUI.reportRuntimeError?.(event.error, 'execução');
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason instanceof Error ? event.reason : new Error(String(event?.reason || 'Falha assíncrona não identificada.'));
    AppUI.reportRuntimeError?.(reason, 'operação assíncrona');
  });
  window.OrbisManualBridge = { handle(action){ AppUI.handleManualAction(action,{fromManual:true}); }, focus(){ try{ window.focus(); }catch{} }, close(){ AppUI.closeManual(); } };
  if (!objects.items.length) engine.center();
  else engine.requestRender();
  const recalibrate = () => { engine.resize(); engine.requestRender(); };
  requestAnimationFrame(() => requestAnimationFrame(recalibrate));
  setTimeout(recalibrate, 120);
  document.addEventListener('fullscreenchange', recalibrate);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js?v=6.7.0', { scope: './', updateViaCache: 'none' });
        registration.update().catch(()=>{});
        let reloadedForUpdate = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (reloadedForUpdate || sessionStorage.getItem('orbisv-sw-reloaded-v6.7.0') === '1') return;
          reloadedForUpdate = true;
          sessionStorage.setItem('orbisv-sw-reloaded-v6.7.0','1');
          location.reload();
        });
      } catch (error) {
        console.warn('OrbisV: não foi possível registrar o service worker.', error);
      }
    }, { once: true });
  }
})();
