const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const id of ['graphCanvas','functionExpr','paramX','paramY','geometryType','objectsList','historyList'])if(!html.includes(`id=\"${id}\"`))throw new Error(`missing ${id}`);
if(html.includes('<math-field')||html.includes('mathlive@'))throw new Error('MathLive must not be present in HTML');
for(const f of ['js/mathEngine.js','js/graphObjects.js','js/graphEngine.js','js/ui.js','js/main.js']){const s=fs.readFileSync(path.join(root,f),'utf8');if(/\beval\s*\(/.test(s)||/new\s+Function\s*\(/.test(s))throw new Error(`unsafe execution in ${f}`);}
console.log('static smoke OK');
