const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');

for (const id of ['undoBtn','redoBtn','collapseControlsBtn','fullscreenBtn','exportBtn','exportSvgBtn','showControlsBtn']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`missing ${id}`);
}
for (const cls of ['.action-btn{','.icon-btn svg','.show-controls-btn{','.math-tools-btn{','.dropdown-btn{','.clear-field-btn{']) {
  if (!css.includes(cls)) throw new Error(`missing style ${cls}`);
}
if (/<button[^>]*>(?:↶|↷|□|‹|›)<\/button>/u.test(html)) throw new Error('unicode icon-only button remains');
if (!html.match(/id="exportBtn"[^>]*>[\s\S]*?<svg[\s\S]*?<span>PNG<\/span>/)) throw new Error('PNG icon markup invalid');
if (!html.match(/id="exportSvgBtn"[^>]*>[\s\S]*?<svg[\s\S]*?<span>SVG<\/span>/)) throw new Error('SVG icon markup invalid');
console.log('button style regression OK');
