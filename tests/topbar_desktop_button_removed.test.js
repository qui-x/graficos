const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
if(html.includes('id="sidebarToggle"')) throw new Error('Desktop topbar mode button must be removed');
if(!html.includes('id="mobileModesBtn"')||!html.includes('id="mobileControlsBtn"')) throw new Error('Mobile panel buttons missing');
console.log('topbar desktop button removed OK');
