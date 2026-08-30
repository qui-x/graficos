const fs = require('fs');
const html = fs.readFileSync('index.html','utf8');
if (/id=\"fullscreenBtn\"/.test(html)) throw new Error('fullscreen button should be removed');
console.log('fullscreen button removed OK');
