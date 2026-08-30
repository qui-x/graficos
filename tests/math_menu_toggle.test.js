const fs=require('fs');
const ui=fs.readFileSync('js/ui.js','utf8');
const css=fs.readFileSync('css/style.css','utf8');
if(!ui.includes("const isOpen = !globalMenu.classList.contains('hidden')")) throw new Error('math menu toggle state missing');
if(!ui.includes("globalBtn.classList.add('is-active')")) throw new Error('math menu active state missing');
if(!ui.includes("gb.classList.remove('is-active')")) throw new Error('math menu active reset missing');
if(!css.includes('.math-tools-btn.is-active')) throw new Error('math menu active style missing');
console.log('math menu toggle OK');
