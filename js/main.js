(function () {
  'use strict';

  // Cada inicialização começa uma sessão nova: área gráfica e histórico não são restaurados.
  try {
    localStorage.removeItem('graphCalcSessionV2');
    localStorage.removeItem('graphCalcHistoryV2');
  } catch (_) {}

  const objects = new GraphObjects();
  const engine = new GraphEngine(document.getElementById('graphCanvas'), objects);
  AppUI.init(objects, engine);
  engine.center();
  const recalibrate = () => { engine.resize(); engine.requestRender(); };
  requestAnimationFrame(() => requestAnimationFrame(recalibrate));
  setTimeout(recalibrate, 100);

  // Registro do Service Worker para funcionamento como PWA.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => {
        console.warn('Falha ao registrar o Service Worker:', error);
      });
    }, { once: true });
  }
})();
