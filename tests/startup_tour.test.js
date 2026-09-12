'use strict';
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'js','ui.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css','style.css'),'utf8');
function ok(c,m){if(!c)throw new Error(m);}
for(const id of ['orbisvIntro','orbisvIntroLogoStage','orbisvIntroSkip','projectSheet','continueProjectBtn','projectModelsBtn','projectA11yBtn','startTourBtn','firstRunTourBtn','tourLayer','tourFocus','tourCard','tourNextBtn','tourPrevBtn','tourSkipBtn'])ok(html.includes(`id="${id}"`),`missing ${id}`);
ok(/openStartupProjectHome\(\)/.test(ui),'startup project home not called');
ok(/playIntroAnimation\(\(\)=>this\.openStartupProjectHome\(\)\)/.test(ui),'intro must finish before startup project home');
ok(/STORAGE_TOUR/.test(ui)&&/orbisvTourCompletedV1/.test(ui),'first-run tour persistence missing');
for(const fn of ['startTour','showTourStep','positionTour','nextTourStep','prevTourStep','endTour'])ok(new RegExp(`${fn}\\(`).test(ui),`missing ${fn}`);
ok((ui.match(/title:'/g)||[]).length>=10,'tour should cover the principal functional areas');
ok(/\.tour-focus\{/.test(css)&&/\.project-home\{/.test(css)&&/\.orbisv-intro\{/.test(css),'tour/project home/intro styles missing');
console.log('startup menu + guided tour OK');
