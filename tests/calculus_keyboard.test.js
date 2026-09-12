'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const context={window:{},Math,Number,String,RegExp,Error,Set,Object};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'js/mathEngine.js'),'utf8'),context);
const M=context.window.MathEngine;
const ui=fs.readFileSync(path.join(root,'js/ui.js'),'utf8');
function ok(c,m){if(!c)throw new Error(m);}
function near(a,b,tol=1e-5){if(!Number.isFinite(a)||Math.abs(a-b)>tol)throw new Error(`${a} != ${b}`);}
near(M.evalExpr('diff(x^2;x)',{x:3}),6,1e-4);
near(M.evalExpr('partial(x^3;x)',{x:2}),12,1e-4);
near(M.evalExpr('integral(x;x;0;2)',{}),2,1e-6);
near(M.evalExpr('limit(sin(x)/x;x;0)',{}),1,1e-6);
near(M.evalExpr('sum(n;n;1;5)',{}),15,1e-10);
near(M.evalExpr('prod(n;n;1;4)',{}),24,1e-10);
ok(M.evalExpr('x<=2',{x:2})===1,'<= comparison failed');
ok(M.evalExpr('x>=2',{x:1})===0,'>= comparison failed');
ok(M.evalExpr('x!=2',{x:3})===1,'!= comparison failed');
ok(M.toMathML('integral(x^2;x;0;1)',{}).includes('<mo>∫</mo>'),'integral MathML missing');
ok(M.toMathML('sum(n;n;1;10)',{}).includes('<mo>∑</mo>'),'sum MathML missing');
ok(ui.includes("key('<span class=\"key-main\">d/dx</span><small>Derivada</small>"),'derivative key not active');
ok(ui.includes("key('<span class=\"key-main\">∫ₐᵇ</span><small>Integral</small>"),'integral key not active');
ok(!ui.includes("disabled('d/dx')"),'calculus keypad still disabled');
ok(ui.includes("kind==='derivative'")&&ui.includes("kind==='integral'")&&ui.includes("kind==='limit'"),'calculus insertion templates missing');
console.log('calculus keyboard OK');
