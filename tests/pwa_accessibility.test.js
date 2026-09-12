'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const manifest = JSON.parse(read('manifest.webmanifest'));
const html = read('index.html');
const css = read('css/style.css');
const ui = read('js/ui.js');
const graph = read('js/graphEngine.js');
const main = read('js/main.js');
const sw = read('sw.js');
function ok(cond, msg){ if(!cond) throw new Error(msg); }

// PWA core
ok(manifest.name === 'OrbisV' && manifest.short_name === 'OrbisV', 'manifest identity');
ok(manifest.id === './' && manifest.scope === './' && manifest.start_url === './', 'manifest id/scope/start_url');
ok(manifest.display === 'standalone', 'manifest display');
ok(manifest.lang === 'pt-BR', 'manifest language');
ok(Array.isArray(manifest.icons), 'manifest icons');
for (const [size,purpose] of [[192,'any'],[512,'any'],[192,'maskable'],[512,'maskable']]) {
  const icon = manifest.icons.find(i => i.sizes === `${size}x${size}` && String(i.purpose).split(/\s+/).includes(purpose));
  ok(icon, `missing ${size} ${purpose} icon`);
  ok(exists(icon.src), `icon file missing: ${icon.src}`);
  const b=fs.readFileSync(path.join(root,icon.src));
  ok(b.toString('ascii',1,4)==='PNG', `not PNG: ${icon.src}`);
  ok(b.readUInt32BE(16)===size && b.readUInt32BE(20)===size, `wrong icon dimensions: ${icon.src}`);
}
ok(exists('assets/orbisv-v-180.png'), 'apple icon missing');
ok(/apple-touch-icon[^>]+180x180/.test(html), 'apple 180 metadata missing');
ok(/rel="manifest" href="manifest\.webmanifest(?:\?v=[^"]+)?"/.test(html), 'manifest link missing');
ok(/themeColorMeta/.test(html), 'dynamic theme-color meta missing');
ok(exists('sw.js'), 'service worker missing');
ok(/serviceWorker\.register\('\.\/sw\.js(?:\?v=[^']+)?'/.test(main), 'service worker registration missing');
ok(/self\.addEventListener\('install'/.test(sw) && /self\.addEventListener\('fetch'/.test(sw), 'service worker lifecycle missing');
const shellMatch = sw.match(/const APP_SHELL = \[([\s\S]*?)\];/);
ok(shellMatch, 'APP_SHELL missing');
const shellFiles=[...shellMatch[1].matchAll(/(?:'|`)\.\/([^'`$]*)(?:[^'`]*)?(?:'|`)/g)].map(m=>m[1]).filter(Boolean).map(f=>f.split('?')[0]);
for(const f of shellFiles) ok(exists(f), `precache file missing: ${f}`);
ok(/updateViaCache:\s*'none'/.test(main), 'service worker updateViaCache none missing');
ok(/const isCode =/.test(sw) && /request\.mode === 'navigate' \|\| isCode/.test(sw), 'code assets are not network-first');

// Theme contrast audit (WCAG relative luminance; normal text target >= 4.5:1)
function rgb(hex){hex=hex.replace('#','');return [0,2,4].map(i=>parseInt(hex.slice(i,i+2),16)/255);}
function lum(hex){return rgb(hex).map(c=>c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)).reduce((a,c,i)=>a+c*[.2126,.7152,.0722][i],0);}
function contrast(a,b){const x=lum(a),y=lum(b),hi=Math.max(x,y),lo=Math.min(x,y);return (hi+.05)/(lo+.05);}
const palettes={
 dark:{surface:'#0d1a2a', text:'#f4f9ff', muted:'#a7b9ca', muted2:'#8499ae', accent:'#4de8ff', danger:'#ffc1d2', warning:'#ffe08a'},
 light:{surface:'#ffffff', text:'#102033', muted:'#455e75', muted2:'#5f758a', accent:'#006c87', danger:'#8b1e43', warning:'#6e5000'},
 darkHigh:{surface:'#06111c', text:'#ffffff', muted:'#e6f1fa', muted2:'#c9dbea', accent:'#7cf2ff', danger:'#ffd3df', warning:'#ffe9a9'},
 lightHigh:{surface:'#ffffff', text:'#000000', muted:'#1e2a35', muted2:'#34485a', accent:'#004f65', danger:'#76132f', warning:'#5b4100'}
};
for(const [name,p] of Object.entries(palettes)) for(const key of ['text','muted','muted2','accent','danger','warning']) ok(contrast(p[key],p.surface)>=4.5, `${name} ${key} contrast < 4.5`);
ok(/html\[data-theme="light"\]/.test(css) && /html\.high-contrast/.test(css) && /html\[data-theme="light"\]\.high-contrast/.test(css), 'theme variants missing');

// Color-vision simulation: SVG matrices rather than rough hue/saturation overlays.
for(const id of ['cvd-protanopia','cvd-deuteranopia','cvd-tritanopia','cvd-achromatopsia']) ok(html.includes(`id="${id}"`), `missing ${id}`);
ok(/data-color-vision="protanopia"[\s\S]*filter:url\(#cvd-protanopia\)/.test(css), 'protanopia CSS filter not wired');
ok(/data-color-vision="deuteranopia"[\s\S]*filter:url\(#cvd-deuteranopia\)/.test(css), 'deuteranopia CSS filter not wired');
ok(/data-color-vision="tritanopia"[\s\S]*filter:url\(#cvd-tritanopia\)/.test(css), 'tritanopia CSS filter not wired');
ok(/data-color-vision="achromatopsia"[\s\S]*filter:url\(#cvd-achromatopsia\)/.test(css), 'achromatopsia CSS filter not wired');
ok(!css.includes('.color-vision-overlay.protanopia'), 'legacy approximate overlay remains');
ok(/root\.dataset\.colorVision/.test(ui), 'CVD preference not applied to root');

function matrixFor(id){
  const re=new RegExp(`<filter id="${id}"[\\s\\S]*?<feColorMatrix[^>]+values="([^"]+)"`);
  const m=html.match(re); ok(m,`matrix missing ${id}`); const a=m[1].trim().split(/\s+/).map(Number); ok(a.length===20,`matrix length ${id}`); return a;
}
function transform(m, rgb){return [0,1,2].map(r=>Math.max(0,Math.min(1,m[r*5]*rgb[0]+m[r*5+1]*rgb[1]+m[r*5+2]*rgb[2]+m[r*5+4])));}
const sample=[.9,.25,.15];
const transformed=['cvd-protanopia','cvd-deuteranopia','cvd-tritanopia'].map(id=>transform(matrixFor(id),sample));
for(const v of transformed) ok(v.every(Number.isFinite), 'non-finite CVD transform');
ok(new Set(transformed.map(v=>v.map(x=>x.toFixed(3)).join(','))).size===3,'CVD matrices do not produce distinct simulations');
const gray=transform(matrixFor('cvd-achromatopsia'),sample);ok(Math.abs(gray[0]-gray[1])<1e-9&&Math.abs(gray[1]-gray[2])<1e-9,'achromatopsia is not grayscale');

// Non-color differentiators must really affect the graph.
ok(/a11yPrefs\?\.linePatterns/.test(graph), 'line pattern preference not used');
ok(/a11yPrefs\?\.markers/.test(graph), 'marker preference not used');
ok(/drawObjectMarker/.test(graph), 'distinct markers not implemented');
ok(/LIGHT_OBJECT_COLORS/.test(graph) && /LIGHT_HIGH_OBJECT_COLORS/.test(graph), 'theme-aware graph colors missing');

console.log('PWA + accessibility colors OK');
