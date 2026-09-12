'use strict';
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const graph=fs.readFileSync(path.join(root,'js','graphEngine.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'js','ui.js'),'utf8');
function ok(c,m){if(!c)throw new Error(m);}
ok(graph.includes('adaptiveFunctionMarkerXs'),'adaptive point generator missing');
ok(graph.includes('drawAdaptiveFunctionMarkers'),'adaptive marker drawing missing');
ok(graph.includes('this.scale>=145')&&graph.includes('this.scale>=280'),'zoom-sensitive marker density missing');
ok(graph.includes('refreshNotablePoints'),'dynamic notable-point refresh missing');
ok(graph.includes('this.refreshNotablePoints();this.drawNotablePoints()'),'notable points do not refresh during render');
ok(graph.includes('Math.min(4200')&&graph.includes('screenJump>h*.92'),'adaptive curve sampling/discontinuity guard missing');
ok(ui.includes('setNotableSource?.(obj.id)'),'UI does not activate dynamic notable-point tracking');
ok(ui.includes('recalculados ao mover ou ampliar'),'zoom/pan dynamic feedback missing');
console.log('adaptive graph rendering OK');

ok(graph.includes('Math.min(step,0.1)'),'grid step to 0.1 at maximum zoom missing');
ok(graph.includes('Math.min(1200'),'extended zoom ceiling missing');

ok(graph.includes('pointValuePolicy'),'point label declutter policy missing');
ok(graph.includes('this.scale<170'),'minimum zoom threshold for point labels missing');
