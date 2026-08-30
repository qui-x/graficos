'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');

const mustHave = [
  'id="showControlsBtn"', 'class="show-controls-btn hidden"', 'id="sidebarToggle"',
  'id="backdrop"', 'id="mobileMenuBtn"', 'id="closeControlsBtn"',
  'class="collapse-icon-left"', 'class="collapse-icon-right hidden"',
  'id="undoBtn"', 'id="redoBtn"', 'id="fullscreenBtn"', 'id="exportBtn"', 'id="exportSvgBtn"'
];
for (const token of mustHave) if (!html.includes(token)) throw new Error(`HTML token missing: ${token}`);
for (const token of ['openSidebar(','closeSidebar(','toggleSidebar(']) if (!ui.includes(token)) throw new Error(`Sidebar method missing: ${token}`);
for (const token of ["this.$.sidebarToggle?.addEventListener('click',()=>this.toggleSidebar())", "this.$.closeControls?.addEventListener('click',()=>this.closeSidebar())", "this.$.mobileMenuBtn?.addEventListener('click',()=>this.openSidebar())"]) if (!ui.includes(token)) throw new Error(`Sidebar event missing: ${token}`);
for (const token of ['.workspace.sidebar-collapsed', '.controls-panel.open', '.backdrop.show', '.fab']) if (!css.includes(token)) throw new Error(`CSS token missing: ${token}`);
if (!html.includes('>↶<') && !html.includes('>↷<') && !html.includes('>□<') && !html.includes('>‹<') && !html.includes('>›<')) console.log('OK: no legacy header Unicode icons');
console.log('ui-icons OK');
