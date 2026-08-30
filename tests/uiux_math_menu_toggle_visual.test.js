const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
if(!html.includes('id="globalMathBtn"')) throw new Error('global math button missing');
if(!html.includes('id="globalMathMenu"')) throw new Error('global math menu missing');
console.log('math menu visual structure OK');
