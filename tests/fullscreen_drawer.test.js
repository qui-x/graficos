const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

for (const id of ['sidebarToggle','backdrop','mobileMenuBtn','closeControlsBtn']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`missing ${id}`);
}
if (!/html, body\s*\{[^}]*height:\s*100%/s.test(css)) throw new Error('viewport height missing');
if (!/\.app-shell\s*\{[^}]*width:\s*100%[^}]*height:\s*100vh[^}]*height:\s*100dvh[^}]*margin:\s*0/s.test(css)) throw new Error('fullscreen shell rules missing');
if (!css.includes('grid-template-columns: var(--sidebar-width, 380px) minmax(0, 1fr)')) throw new Error('desktop drawer grid missing');
if (!css.includes('grid-template-columns: 0 minmax(0, 1fr)')) throw new Error('desktop collapsed grid missing');
if (!css.includes('height: min(72dvh, 760px)')) throw new Error('mobile bottom sheet missing');
if (!css.includes('.controls-panel.open')) throw new Error('mobile open state missing');
if (!ui.includes('toggleSidebar()')) throw new Error('toggleSidebar missing');
if (!ui.includes('engine.resize()')) throw new Error('resize hook missing');
if (!sw.includes("calc-grafica-v30")) throw new Error('service worker cache not bumped');
console.log('fullscreen drawer OK');
