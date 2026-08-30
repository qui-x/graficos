const path=require('path');const fs=require('fs');const vm=require('vm');const context={window:{},Math,Number,String,RegExp,Error,Set,Object};vm.createContext(context);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../js/mathEngine.js'),'utf8'),context);const M=context.window.MathEngine;function near(a,b){if(Math.abs(a-b)>1e-10)throw new Error(`${a} != ${b}`)}near(M.evalExpr('2*pi',{pi:Math.PI}),2*Math.PI);near(M.evalExpr('2^3+sqrt(16)',{}),12);near(M.evalExpr('sin(pi/2)',{}),1);near(M.evalExpr('x^2+1',{x:3}),10);near(M.evalExpr('tau/2',{}),Math.PI);near(M.evalExpr('phi^2',{}),Math.E*0+((1+Math.sqrt(5))/2)**2);near(M.evalExpr('log2(8)',{}),3);near(M.evalExpr('sign(-5)',{}),-1);if(M.evalExpr('1,5+2',{})!==3.5)throw new Error('decimal comma');console.log('mathEngine OK');
if (M.defaultVariables.join(',') !== 'x,y,z,t') throw new Error('defaultVariables mismatch');
near(M.evalExpr('x+y+z', {x:1,y:2,z:3}), 6);
near(M.evalExpr('x+2', {x:4}), 6);
near(M.evalExpr('z^2', {z:3}), 9);

