'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');

if (html.includes('id="sidebarToggle"')) throw new Error('Desktop topbar mode button must be removed');
const mustHave = [
  'id="showControlsBtn"', 'class="show-controls-btn hidden"',
  'id="backdrop"', 'id="mobileMenuBtn"', 'id="closeControlsBtn"',
  'class="controls-arrow-left hidden"', 'class="controls-arrow-right"',
  'id="undoBtn"', 'id="redoBtn"', 'id="exportBtn"', 'id="exportSvgBtn"'
];
for (const token of mustHave) if (!html.includes(token)) throw new Error(`HTML token missing: ${token}`);
for (const token of ['openSidebar(','closeSidebar(','toggleSidebar(']) if (!ui.includes(token)) throw new Error(`Sidebar method missing: ${token}`);
for (const token of ["this.$.closeControls?.addEventListener('click',()=>this.closeSidebar())", "this.$.mobileMenuBtn?.addEventListener('click',()=>this.openSidebar())"]) if (!ui.includes(token)) throw new Error(`Sidebar event missing: ${token}`);
for (const token of ['.workspace.sidebar-collapsed', '.controls-panel.open', '.backdrop.show', '.fab']) if (!css.includes(token)) throw new Error(`CSS token missing: ${token}`);
if (!html.includes('>↶<') && !html.includes('>↷<') && !html.includes('>□<') && !html.includes('>‹<') && !html.includes('>›<')) console.log('OK: no legacy header Unicode icons');
console.log('ui-icons OK');

const objectsSection = html.match(/<section[^>]+manage-zone[\s\S]*?<\/section>/i)?.[0] || '';
if (!objectsSection.includes('id=\"undoBtn\"') || !objectsSection.includes('id=\"redoBtn\"')) throw new Error('Undo/redo must live inside the Objects section');
