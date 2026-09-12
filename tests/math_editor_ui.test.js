'use strict';
const fs=require('fs'); const path=require('path'); const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'js/ui.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css/style.css'),'utf8');
function ok(c,m){if(!c)throw new Error(m);}
ok(/mathDeleteForward\(\)/.test(ui),'forward delete missing');
ok(/handleMathKeyboardEvent\(e\)/.test(ui),'physical keyboard handler missing');
ok(/e\.key==='Delete'/.test(ui),'Delete key missing');
ok(/e\.key==='Backspace'/.test(ui),'Backspace key missing');
ok(/e\.key==='Home'/.test(ui)&&/e\.key==='End'/.test(ui),'Home/End navigation missing');
ok(/'backspace'/.test(ui)&&/backspace-key/.test(ui),'integrated backspace key missing');
ok(/'delete-forward'/.test(ui),'integrated forward-delete key missing');
ok(/math-command-pad/.test(ui)&&/math-command-pad/.test(css),'integrated edit pad missing');
ok(/Digite pelo teclado físico/.test(html),'didactic keyboard hint missing');
// Regression: non-parenthesized exponent must not greedily absorb + or - from following terms.
ok(/if\(expr\[end\]==='\+'\|\|expr\[end\]==='-'\)end\+=1/.test(ui),'bounded exponent parser missing');
console.log('math editor UI OK');
