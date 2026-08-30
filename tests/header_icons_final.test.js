const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');
for (const id of ['undoBtn','redoBtn','collapseControlsBtn','exportBtn','exportSvgBtn']) {
  const block = html.match(new RegExp(`<button[^>]*id="${id}"[\\s\\S]*?<\\/button>`));
  if (!block) throw new Error(`${id} missing`);
  if (!/<svg[\s\S]*<\/svg>/.test(block[0])) throw new Error(`${id} has no inline SVG`);
}
if (!html.includes('id="showControlsBtn"')) throw new Error('showControlsBtn missing');
if (!css.includes('.show-controls-btn')) throw new Error('show-controls-btn styles missing');
if (!ui.includes('.collapse-icon-left') || !ui.includes('.collapse-icon-right')) throw new Error('collapse SVG toggle missing');
if (/[↶↷□]/.test(html)) throw new Error('legacy unicode header icons remain');
console.log('header icons final OK');
