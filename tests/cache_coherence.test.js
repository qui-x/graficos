'use strict';
const fs=require('fs'); const path=require('path'); const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const main=fs.readFileSync(path.join(root,'js/main.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
function ok(c,m){if(!c)throw new Error(m);}
for(const f of ['style.css','mathEngine.js','models.js','graphObjects.js','graphEngine.js','ui.js','main.js']) ok(html.includes(`${f}?v=6.0.0`),`version missing for ${f}`);
ok(/register\('\.\/sw\.js\?v=6\.0\.0'/.test(main),'versioned sw registration missing');
ok(/updateViaCache:\s*'none'/.test(main),'updateViaCache none missing');
ok(/v6\.0-20260912/.test(sw),'cache version not bumped');
ok(/models\.js/.test(sw),'models catalog missing from app shell');
ok(/const isCode =/.test(sw),'network-first code rule missing');
console.log('PWA cache coherence OK');
