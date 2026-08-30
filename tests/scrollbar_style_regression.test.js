const fs = require('fs');
const path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'style.css'), 'utf8');
for (const token of ['scrollbar-width: thin', 'scrollbar-color:', '::-webkit-scrollbar', '::-webkit-scrollbar-thumb', '::-webkit-scrollbar-track']) {
  if (!css.includes(token)) throw new Error(`Missing custom scrollbar rule: ${token}`);
}
for (const selector of ['.controls-panel', '.objects-list', '.history-list', '.parameter-list', '.math-menu']) {
  if (!css.includes(selector)) throw new Error(`Missing scrollbar target: ${selector}`);
}
console.log('scrollbar style OK');
