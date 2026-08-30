'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');

const requiredSvgButtons = ['undoBtn','redoBtn','fullscreenBtn','exportBtn','exportSvgBtn','collapseControlsBtn'];
for (const id of requiredSvgButtons) {
  const m = html.match(new RegExp(`<button[^>]*id="${id}"[\\s\\S]*?</button>`));
  if (!m || !m[0].includes('<svg')) throw new Error(`SVG ausente em ${id}`);
}
if (!html.includes('id="showControlsBtn"')) throw new Error('showControlsBtn ausente');
if (!html.includes('<span>Mostrar controles</span>')) throw new Error('texto do botão flutuante ausente');
if (!html.includes('class="collapse-icon-left"')) throw new Error('ícone esquerdo ausente');
if (!html.includes('class="collapse-icon-right hidden"')) throw new Error('ícone direito ausente');
for (const legacy of ['>↶<','>↷<','>□<']) if (html.includes(legacy)) throw new Error(`ícone Unicode legado encontrado: ${legacy}`);
if (!ui.includes("leftIcon?.classList.toggle('hidden',collapsed)")) throw new Error('toggle do ícone esquerdo ausente');
if (!ui.includes("rightIcon?.classList.toggle('hidden',!collapsed)")) throw new Error('toggle do ícone direito ausente');
if (!ui.includes("this.$.showControls?.classList.toggle('hidden',!collapsed)")) throw new Error('toggle do botão flutuante ausente');
if (!ui.includes("this.$.showControls?.addEventListener('click',()=>this.openSidebar())")) throw new Error('listener do botão flutuante ausente');
if (!css.includes('.show-controls-btn{position:absolute')) throw new Error('CSS do botão flutuante ausente');
if (!css.includes('.icon-btn,.action-btn{display:inline-flex')) throw new Error('alinhamento de ícones ausente');
console.log('icon regression OK');
