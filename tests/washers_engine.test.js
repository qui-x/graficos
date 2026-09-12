'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');const root=path.resolve(__dirname,'..');
const context={window:{},Math,Number,String,RegExp,Error,Set,Object};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'js/mathEngine.js'),'utf8'),context);const M=context.window.MathEngine;
function ok(c,m){if(!c)throw new Error(m);}function near(a,b,t=1e-4){if(!Number.isFinite(a)||Math.abs(a-b)>t)throw new Error(`${a} != ${b}`);}
let a=M.analyzeRevolution({method:'disks',axis:'x',outerExpr:'sqrt(x)',a:0,b:4});ok(a.valid,'disk analysis invalid');near(a.volume,8*Math.PI,2e-4);
let w=M.analyzeRevolution({method:'washers',axis:'x',outerExpr:'sqrt(x)+1',innerExpr:'1',a:0,b:4});ok(w.valid,'washer analysis invalid');near(w.volume,(56/3)*Math.PI,3e-4);
let y=M.analyzeRevolution({method:'disks',axis:'y',outerExpr:'sqrt(y)',a:0,b:4});ok(y.valid,'y-axis disk invalid');near(y.volume,8*Math.PI,2e-4);
let bad=M.analyzeRevolution({method:'washers',axis:'x',outerExpr:'1',innerExpr:'2',a:0,b:1});ok(!bad.valid&&/interno/.test(bad.error),'R < r must be rejected');
let neg=M.analyzeRevolution({method:'disks',axis:'x',outerExpr:'-1',a:0,b:1});ok(!neg.valid&&/não negativos/.test(neg.error),'negative radius must be rejected');
const graph=fs.readFileSync(path.join(root,'js/graphEngine.js'),'utf8');ok(graph.includes("fill('evenodd')"),'washer hole fill missing');ok(graph.includes('for(const sign of [1,-1])'),'symmetric revolution profile missing');ok(graph.includes('seção de anel'),'didactic section hover missing');
console.log('washers/disks engine OK');
