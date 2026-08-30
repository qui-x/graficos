'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'js', 'graphEngine.js'), 'utf8');

for (const id of ['undoBtn','redoBtn','controlsCollapseBtn','exportBtn','exportSvgBtn','showControlsBtn','graphCanvas','coordinateReadout']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`missing ${id}`);
}
for (const id of ['undoBtn','redoBtn','exportBtn','exportSvgBtn','controlsCollapseBtn','showControlsBtn']) {
  const m = html.match(new RegExp(`<button[^>]*id="${id}"[\\s\\S]*?</button>`));
  if (!m || !/<svg[\s>]/.test(m[0])) throw new Error(`${id} must contain inline SVG`);
}
if (!html.includes('tabindex="0"')) throw new Error('canvas tabindex missing');
if (!html.includes('role="img"')) throw new Error('canvas role missing');
if (!html.includes('aria-live="polite"')) throw new Error('aria-live missing');
if (!css.includes('.workspace.sidebar-collapsed')) throw new Error('sidebar collapsed grid rule missing');
if (!css.includes('.show-controls-btn')) throw new Error('show button hidden rule missing');
if (!ui.includes("classList.toggle('open')") && !ui.includes('sidebar-collapsed')) throw new Error('sidebar state handling missing');
if (!ui.includes("querySelector('.controls-arrow-left')")) throw new Error('left SVG toggle missing');
if (!ui.includes("querySelector('.controls-arrow-right')")) throw new Error('right SVG toggle missing');
if (!ui.includes('requestAnimationFrame(()=>requestAnimationFrame')) throw new Error('double RAF resize missing');
if (!engine.includes("const lightTheme=document.documentElement.classList.contains('theme-light');")) throw new Error('theme guard missing');
if (!engine.includes('targetPixels = 60')) throw new Error('adaptive grid target missing');
console.log('uiux OK');

const objectsSection = html.match(/<section[^>]+manage-zone[\s\S]*?<\/section>/i)?.[0] || '';
if (!objectsSection.includes('id=\"undoBtn\"') || !objectsSection.includes('id=\"redoBtn\"')) throw new Error('Undo/redo must live inside the Objects section');
