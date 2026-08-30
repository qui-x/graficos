(function () {
  'use strict';
  const objects = new GraphObjects();
  const engine = new GraphEngine(document.getElementById('graphCanvas'), objects);
  AppUI.init(objects, engine);

  const initMathLive = () => {
    const ml = window.mathlive || window.MathLive;
    try {
      if (ml?.renderMathInDocument) ml.renderMathInDocument();
      document.querySelectorAll('math-field').forEach((field) => field.classList.add('mathlive-ready'));
    } catch (e) {
      console.warn('MathLive initialization failed', e);
    }
  };

  const bootMathLive = () => {
    if (customElements?.whenDefined) {
      customElements.whenDefined('math-field').then(initMathLive).catch(() => setTimeout(initMathLive, 150));
    } else {
      initMathLive();
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootMathLive, { once: true });
  } else {
    bootMathLive();
  }
  window.addEventListener('load', initMathLive, { once: true });
  setTimeout(initMathLive, 250);

  engine.center();
  const recalibrate = () => { engine.resize(); engine.requestRender(); };
  requestAnimationFrame(() => requestAnimationFrame(recalibrate));
  setTimeout(recalibrate, 100);
})();
