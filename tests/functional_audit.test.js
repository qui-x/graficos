'use strict';
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'js','ui.js'),'utf8');
const graph=fs.readFileSync(path.join(root,'js','graphEngine.js'),'utf8');
const objects=fs.readFileSync(path.join(root,'js','graphObjects.js'),'utf8');
function ok(c,m){if(!c)throw new Error(m);}
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);const dup=ids.filter((x,i)=>ids.indexOf(x)!==i);ok(!dup.length,`duplicate ids: ${[...new Set(dup)].join(', ')}`);
const refs=[...ui.matchAll(/(?:getElementById|id)\(['"]([^'"]+)['"]\)/g)].map(m=>m[1]);for(const ref of refs)ok(ids.includes(ref),`ui references missing DOM id: ${ref}`);
for(const feature of ["bindCore()","bindFormsDelegation()","bindModals()","bindAccessibility()","bindVisualization()","bindProject()","bindMathEditor()","bindModels()"] )ok(ui.includes(feature),`binding missing: ${feature}`);
for(const action of ['exportPng','exportSvg','fitToObjects','inspectionValues'])ok(graph.includes(action),`graph capability missing: ${action}`);
for(const action of ['add(type','update(id','remove(id','toggle(id','setLocked(id','duplicate(id','reorder(id','batch(ids','undo()','redo()','save()','load()','importProject'])ok(objects.includes(action),`object capability missing: ${action}`);
ok(/curve3dForm[\s\S]*disabled/.test(ui)&&/line3dForm[\s\S]*disabled/.test(ui),'3D status should remain explicit while engine is not connected');
ok(/equalScaleToggle[\s\S]*checked=true/.test(ui),'equal-scale limitation should stay explicit');
console.log('functional contract audit OK');
