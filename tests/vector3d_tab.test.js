const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const goCode = fs.readFileSync('js/graphObjects.js', 'utf8');
const engineCode = fs.readFileSync('js/graphEngine.js', 'utf8');
const mathCode = fs.readFileSync('js/mathEngine.js', 'utf8');

const uiCode = fs.readFileSync('js/ui.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const sandbox = {
  console,
  localStorage: { setItem(){}, getItem(){ return null; }, removeItem(){} },
  ResizeObserver: class { observe(){} },
  devicePixelRatio: 1,
  innerWidth: 1000,
  innerHeight: 700,
  document: {
    documentElement: { classList: { contains(){ return false; } } },
    getElementById(){ return null; },
    querySelectorAll(){ return []; },
    addEventListener(){},
  },
  Math,
  requestAnimationFrame(cb){ cb(); },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(goCode, sandbox);
const objects = new sandbox.window.GraphObjects();
const vector = objects.addVector3D([0,0,1], [3,4,5], '#5ac8fa', true);
assert.deepStrictEqual(JSON.parse(JSON.stringify(vector.data.p1)), [0,0,1]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(vector.data.p2)), [3,4,5]);
assert.strictEqual(vector.data.arrow, true);
const segment = objects.addSegment3D([1,2,3], [4,5,6], '#fff');
assert.strictEqual(segment.data.arrow, false);

vm.runInContext(mathCode, sandbox);
vm.runInContext(engineCode, sandbox);
const canvas = {
  parentElement: { clientWidth: 800, clientHeight: 600 },
  clientWidth: 800,
  clientHeight: 600,
  width: 800,
  height: 600,
  style: {},
  getContext(){
    return { setTransform(){}, clearRect(){}, fillRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, fill(){}, save(){}, restore(){}, arc(){}, closePath(){}, fillText(){}, measureText(){return {width:1}} };
  },
  addEventListener(){},
};
const engine = new sandbox.window.GraphEngine(canvas, objects);
assert.strictEqual(engine.has3DObjects(), true);
assert.strictEqual(JSON.stringify(engine.getVector3DPoints(vector)), JSON.stringify([[0,0,1],[3,4,5]]));
const p = engine.project3D(1,2,3);
assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));

assert.ok(html.includes('id="vz1"') && html.includes('id="vz2"') && html.includes('id="vectorType"'));
assert.ok(uiCode.includes('this.$.vz1') && uiCode.includes('this.$.vz2'));
console.log('vector3d tab OK');
