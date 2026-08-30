const vm=require('vm');const fs=require('fs');const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','js','mathEngine.js'),'utf8');
const ctx={window:{},Math,console};vm.createContext(ctx);vm.runInContext(src,ctx);
const M=ctx.window.MathEngine;
const cases=[['sen(0)',0],['cos(0)',1],['tan(0)',0],['arcsen(0)',0],['arccos(1)',0],['arctg(0)',0]];
for(const [expr,expected] of cases){const got=M.evalExpr(expr);if(Math.abs(got-expected)>1e-12)throw new Error(`${expr} => ${got}`);}
console.log('math aliases OK');
