'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const context={window:{},Math,Number,String,RegExp,Error,Set,Object,Array,Date}; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'js/mathEngine.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root,'js/models.js'),'utf8'),context);
const M=context.window.MathEngine,C=context.window.OrbisVModels;
if(!C||C.models.length<40)throw new Error('catalog too small');
const ids=new Set();
for(const m of C.models){if(ids.has(m.id))throw new Error(`duplicate model id ${m.id}`);ids.add(m.id);if(!m.title||!m.mode||!m.draft)throw new Error(`incomplete model ${m.id}`);
  if(m.mode==='function')M.compile(m.draft.expression,{x:1})({x:1});
  if(m.mode==='parametric'){M.compile(m.draft.xExpr,{t:1})({t:1});M.compile(m.draft.yExpr,{t:1})({t:1});}
  if(m.mode==='washers'){M.compile(m.draft.outerExpr,{[m.draft.axis]:1})({[m.draft.axis]:1}); if(m.draft.method==='washers')M.compile(m.draft.innerExpr,{[m.draft.axis]:1})({[m.draft.axis]:1});}
}
for(const mode of ['function','parametric','vector','geometry','washers'])if(!C.byMode(mode).length)throw new Error(`missing mode ${mode}`);
console.log(`models catalog OK (${C.models.length})`);
