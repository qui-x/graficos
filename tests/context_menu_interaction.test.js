'use strict';
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css','style.css'),'utf8');
const ui=fs.readFileSync(path.join(root,'js','ui.js'),'utf8');
const modalStart=html.indexOf('<div class="modal-layer"');
const modalEnd=html.indexOf('<input id="projectFileInput"');
const menu=html.indexOf('id="objectContextMenu"');
if(menu<0)throw new Error('objectContextMenu missing');
// It must be after the modal-layer closing div, immediately before projectFileInput area.
const layerChunk=html.slice(modalStart,menu);
if(!/\n\s*<\/div>\s*\n\s*<!-- Menu contextual/.test(layerChunk.slice(-300)))throw new Error('context menu still nested in modal-layer');
if(!/\.context-menu\{[^}]*pointer-events:auto/.test(css))throw new Error('context menu must accept pointer events');
for(const action of ['edit','duplicate','visibility','lock','up','down','notables','delete']){
 if(!ui.includes(`action==='${action}'`) && !(action==='down'&&ui.includes("action==='up'||action==='down'"))) throw new Error(`action handler missing: ${action}`);
}
if(!ui.includes("menu.addEventListener('click',this._objectMenuClick)"))throw new Error('delegated menu click listener missing');
console.log('context menu interaction OK');
