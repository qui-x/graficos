'use strict';
const fs=require('fs');const path=require('path');const vm=require('vm');
const context={window:{},Math,Number,String,RegExp,Error,Set,Object};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../js/mathEngine.js'),'utf8'),context);
const M=context.window.MathEngine;
function near(a,b){if(Math.abs(a-b)>1e-10)throw new Error(`${a} != ${b}`)}
if(!M.isStandardIdentifier('n')||!M.isStandardIdentifier('a')||!M.isStandardIdentifier('theta'))throw new Error('standard identifiers missing');
if(M.isStandardIdentifier('sqrt')||M.isStandardIdentifier('sin'))throw new Error('reserved names treated as variables');
M.parse('t^n',{t:0});
near(M.evalExpr('t^n',{t:3}),3); // n automático = 1
near(M.evalExpr('ax+b',{x:2}),3); // a=b=1
near(M.evalExpr('xy',{x:2,y:4}),8); // multiplicação implícita da literatura
near(M.evalExpr('θ+t',{t:2}),3); // theta automático = 1
M.parse('x₁+x',{x:2});
const ids=M.identifierNames('t^n+a');
if(!ids.includes('t')||!ids.includes('n')||!ids.includes('a'))throw new Error('identifier detection failed');
console.log('standard math identifiers OK');
