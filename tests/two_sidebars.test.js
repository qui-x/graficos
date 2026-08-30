const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
const css = fs.readFileSync('css/style.css','utf8');
const ui = fs.readFileSync('js/ui.js','utf8');
for (const id of ['mode-sidebar','modeCollapseBtn','controls-panel','controlsCollapseBtn','mobileMenuBtn','backdrop','mobileMoreBtn','extrasModal','exportBtn','exportSvgBtn','extrasBtn']) {
  if (!html.includes(id)) throw new Error(`missing ${id}`);
}
for (const cls of ['sidebar-modes-collapsed','controls-collapsed','mode-sidebar','controls-panel','mobile-more-btn']) {
  if (!css.includes(cls)) throw new Error(`missing css ${cls}`);
}
for (const token of ['setTab(tabName)','modeButtons','toggleSidebar','modeCollapse','mobileMore']) {
  if (!ui.includes(token)) throw new Error(`missing ui ${token}`);
}
if (!css.includes("grid-template-columns:180px 320px minmax(0,1fr)")) throw new Error('desktop three-column layout missing');
console.log('two sidebars OK');
