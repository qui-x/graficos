'use strict';
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const ge=fs.readFileSync(path.join(root,'js/graphEngine.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'js/ui.js'),'utf8');
function ok(c,m){if(!c)throw new Error(m);}
ok(/project3D\(/.test(ge),'3D projection missing');
ok(/drawGrid3D\(/.test(ge),'3D grid missing');
ok(/drawAxes3D\(/.test(ge),'3D axes missing');
ok(/drawCurve3D\(/.test(ge),'3D curve renderer missing');
ok(/drawLine3D\(/.test(ge),'3D line renderer missing');
ok(/camera3d/.test(ge),'3D camera missing');
ok(/saveCurve3D\(/.test(ui),'3D curve save missing');
ok(/saveLine3D\(/.test(ui),'3D line save missing');
ok(/setViewMode\?\.\(\['curve3d','line3d'\]/.test(ui),'UI does not switch renderer to 3D');
console.log('3D engine OK');
