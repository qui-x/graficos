const fs=require('fs');const html=fs.readFileSync('index.html','utf8');const ui=fs.readFileSync('js/ui.js','utf8');const css=fs.readFileSync('css/style.css','utf8');
for(const s of ['panel-scroll','context-zone','input-zone','manage-zone','advanced-section','action-bar','panelAddBtn'])if(!html.includes(s))throw new Error('missing '+s);
for(const s of ['updateActionBar','panelAdd','addActiveTab'])if(!ui.includes(s))throw new Error('ui missing '+s);
for(const s of ['panel-scroll','action-bar','grid-template-columns:1.35fr 1fr','advanced-section'])if(!css.includes(s))throw new Error('css missing '+s);
console.log('panel layout v32 OK');
