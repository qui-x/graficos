const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'js/graphEngine.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');

for (const id of ['graphLegend', 'graphTooltip', 'mobileControlsFab', 'functionError', 'paramError', 'saveBtn']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`missing ${id}`);
}
if (!html.includes('tabindex="0"') || !html.includes('role="img"')) throw new Error('canvas accessibility missing');
if (!css.includes('.graph-legend') || !css.includes('.graph-tooltip')) throw new Error('graph overlays missing');
if (!css.includes('@media (max-width:700px)')) throw new Error('mobile media query missing');
if (!css.includes('.mobile-controls-fab')) throw new Error('mobile controls button styling missing');
if (!engine.includes("const lightTheme = document.documentElement.classList.contains('theme-light');")) throw new Error('theme detection missing');
if (!engine.includes("e.key === 'ArrowLeft'")) throw new Error('canvas keyboard pan missing');
if (!engine.includes("e.key === '+'")) throw new Error('canvas keyboard zoom missing');
if (!engine.includes("this.canvas.addEventListener('dblclick'")) throw new Error('double click zoom missing');
if (!engine.includes('finishBoxZoom()')) throw new Error('box zoom missing');
if (!engine.includes('updateLegend()') || !engine.includes('updateGraphTooltip()')) throw new Error('legend/tooltip integration missing');
if (!ui.includes("this.$.save.addEventListener('click'")) throw new Error('manual save action missing');
if (!ui.includes('functionError') || !ui.includes('paramError')) throw new Error('inline expression errors missing');
console.log('uiux OK');
