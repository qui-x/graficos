const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
const math = fs.readFileSync(path.join(root, 'js/mathEngine.js'), 'utf8');
const graph = fs.readFileSync(path.join(root, 'js/graphEngine.js'), 'utf8');

for (const id of [
  'appShell','graphCanvas','modeRail','inspectorPanel','modeForm','objectsList','historyList',
  'moreModesBtn','mathEditorModal','mathDisplay','mathKeyboard','a11ySheet',
  'visualizationSheet','projectSheet','exportSheet','objectContextMenu','confirmDialog','visPointValuesToggle'
]) {
  if (!html.includes(`id="${id}"`)) throw new Error(`missing required UI id: ${id}`);
}

if (!html.includes('class="mobile-nav"')) throw new Error('mobile navigation missing');

for (const asset of ['assets/orbisv-wordmark-official.png','assets/orbisv-v-symbol.png','assets/orbisv-v-64.png']) {
  if (!html.includes(asset)) throw new Error(`official brand asset not wired: ${asset}`);
}
if (!ui.includes('math-calculator-pad') || !ui.includes("key('7'") || !ui.includes("'equals','apply'")) throw new Error('calculator-style mobile keypad missing');

for (const mode of ['function','parametric','vector','geometry','washers','curve3d','line3d']) {
  if (!html.includes(`data-mode="${mode}"`)) throw new Error(`missing mode: ${mode}`);
}

for (const term of ['OrbisV','Visualize · Explore · Descubra','Matemática em qualquer dimensão']) {
  if (!html.includes(term)) throw new Error(`missing brand term: ${term}`);
}

for (const f of ['js/mathEngine.js','js/graphObjects.js','js/graphEngine.js','js/ui.js','js/main.js']) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  if (/\beval\s*\(/.test(src) || /new\s+Function\s*\(/.test(src)) throw new Error(`unsafe dynamic execution in ${f}`);
}

if (!css.includes('@media(max-width:760px)')) throw new Error('mobile breakpoint missing');
if (!css.includes('@media(min-width:761px)')) throw new Error('tablet/desktop breakpoint missing');
if (!css.includes('100dvh')) throw new Error('dynamic viewport sizing missing');
if (!ui.includes("openModal('mathEditorModal')")) throw new Error('dedicated math editor modal is not wired');
if (!ui.includes("nativeKeyboard:false")) throw new Error('native mobile keyboard should be disabled by default');
if (!math.includes('<mfrac>') || !math.includes('<msqrt>') || !math.includes('<msup>')) throw new Error('structural MathML rendering missing');
if (!graph.includes('fitToObjects') || !graph.includes('inspectMode')) throw new Error('graph fit/inspection tools missing');
if (/[\u{1F300}-\u{1FAFF}]/u.test(html + ui + css)) throw new Error('emoji found in project UI');
console.log('OrbisV UI architecture OK');

if (!html.includes('Valores dos pontos')) throw new Error('point values toggle missing');
if (!graph.includes('showPointValues') || !graph.includes('drawPointValueLabel')) throw new Error('point values on graph missing');

if (!html.includes('option value="auto"')) throw new Error('auto snap option missing');
if (!ui.includes("snap:'auto'")) throw new Error('auto snap default missing');
