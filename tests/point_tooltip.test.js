'use strict';
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const css=fs.readFileSync(path.join(root,'css/style.css'),'utf8');const ge=fs.readFileSync(path.join(root,'js/graphEngine.js'),'utf8');
function ok(c,m){if(!c)throw new Error(m);}
ok(html.includes('id=\"pointTooltip\"'),'point tooltip element missing');
ok(css.includes('.point-tooltip'),'point tooltip css missing');
ok(ge.includes('registerHoverPoint'),'hover point registry missing');
ok(ge.includes('nearestHoverPoint'),'hover hit test missing');
ok(ge.includes('updatePointTooltip'),'tooltip updater missing');
ok(ge.includes("label:'Ponto da função'"),'function point tooltip metadata missing');
ok(ge.includes("kind:n.kind||'ponto notável'"),'notable point tooltip metadata missing');
console.log('point tooltip OK');
