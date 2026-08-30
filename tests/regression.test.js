const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..');
const engine=fs.readFileSync(path.join(root,'js/graphEngine.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'js/ui.js'),'utf8');
const main=fs.readFileSync(path.join(root,'js/main.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'css/style.css'),'utf8');
if((engine.match(/const lightTheme = document\.documentElement\.classList\.contains\('theme-light'\);/g)||[]).length<2) throw new Error('lightTheme guard missing from drawGrid/drawAxes');
if(!ui.includes("return el ? (el.value || '') : ''")) throw new Error('plain input getFieldValue missing');
if(!ui.includes("el.value=this.display(String(value||''))")) throw new Error('plain input setFieldValue missing');
if(!ui.includes("const pretty=token==='pi'?'π'")) throw new Error('plain input symbol insertion missing');
if(!main.includes('engine.center()')) throw new Error('main initialization missing');
if(/MathLive|mathlive|math-field/.test(ui+main+html)) throw new Error('MathLive dependency still referenced in runtime files');
for(const id of ['functionExpr','paramX','paramY']){
  const re=new RegExp(`<input[^>]+id=["']${id}["']`);
  if(!re.test(html)) throw new Error(`${id} is not a text input`);
}
if(!html.includes('katex@0.18.4')) throw new Error('KaTeX missing');
if(css.includes('math-field')) throw new Error('MathLive CSS still present');
if(!html.includes('id=\"paramError\"')) throw new Error('paramError missing');
if(!html.includes('id=\"mobileControlsToggle\"')) throw new Error('mobile toggle missing');
console.log('regressions OK');
