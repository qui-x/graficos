const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/style.css','utf8');
const ui=fs.readFileSync('js/ui.js','utf8');
if(!html.includes('id="mobileModesBtn"')||!html.includes('id="mobileControlsBtn"')) throw new Error('mobile top panel buttons missing');
if(!css.includes('.mode-sidebar.mobile-open')) throw new Error('mobile modes drawer missing');
if(!css.includes('.show-controls-btn')||!css.includes('grid-template-columns:180px minmax(0,1fr) 0')) throw new Error('desktop controls handle/layout missing');
if(!ui.includes('openModesMobile')||!ui.includes('mobileControlsBtn')) throw new Error('panel methods/listeners missing');
console.log('mobile panel controls OK');

if(!html.includes('class="show-controls-icon"')) throw new Error('desktop controls handle icon missing');
if(!css.includes('@media (max-width: 899px)')) throw new Error('mobile layout media query missing');
console.log('desktop handle + mobile top controls OK');
