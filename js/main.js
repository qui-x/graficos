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

  // PWA: manifest e Service Worker só podem ser usados em contexto HTTP(S).
  // Ao abrir index.html diretamente como file://, o app continua funcionando sem
  // disparar erros de CORS/manifest no console.
  const isWebOrigin = window.location.protocol === 'http:' || window.location.protocol === 'https:';
  if (isWebOrigin) {
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = './manifest.webmanifest';
    document.head.appendChild(manifest);

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((error) => {
          console.warn('Falha ao registrar o Service Worker:', error);
        });
      }, { once: true });
    }
  }
})();
