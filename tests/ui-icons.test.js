'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');

const mustHave = [
  'id="showControlsBtn"',
  'class="show-controls-btn hidden"',
  'id="collapseControlsBtn"',
  '<svg',
  'class="collapse-icon-left"',
  'class="collapse-icon-right hidden"',
  'id="undoBtn"',
  'id="redoBtn"',
  'id="fullscreenBtn"',
  'id="exportBtn"',
  'id="exportSvgBtn"'
];
for (const token of mustHave) if (!html.includes(token)) throw new Error(`HTML token missing: ${token}`);
if (!ui.includes('this.$.showControls?.classList.toggle(\'hidden\',!collapsed)')) throw new Error('showControls toggle missing');
if (!ui.includes('leftIcon?.classList.toggle(\'hidden\',collapsed)')) throw new Error('collapse left icon toggle missing');
if (!ui.includes('rightIcon?.classList.toggle(\'hidden\',!collapsed)')) throw new Error('collapse right icon toggle missing');
if (!ui.includes('this.$.showControls?.addEventListener(\'click\',()=>toggleControls(false))')) throw new Error('show controls click missing');
if (!css.includes('.show-controls-btn{position:absolute')) throw new Error('show controls CSS missing');
if (!css.includes('.hidden{display:none!important}')) throw new Error('generic hidden CSS missing');
if (!html.includes('>↶<') && !html.includes('>↷<') && !html.includes('>□<')) console.log('OK: no legacy header Unicode icons');
console.log('ui-icons OK');
