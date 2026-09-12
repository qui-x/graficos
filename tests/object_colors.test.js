'use strict';
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const ui=fs.readFileSync(path.join(root,'js','ui.js'),'utf8');
const objects=fs.readFileSync(path.join(root,'js','graphObjects.js'),'utf8');
const css=fs.readFileSync(path.join(root,'css','style.css'),'utf8');
function ok(c,m){if(!c)throw new Error(m);}
ok(ui.includes('nextColorForType(type'),'mode-aware automatic color allocation missing');
ok(ui.includes('objectModeKey(type)'),'mode color grouping missing');
ok(ui.includes('colorEditor()'),'object color editor missing');
ok(ui.includes('data-color-choice'),'palette color choices missing');
ok(ui.includes('data-object-color-picker'),'custom color picker missing');
ok(ui.includes('this.objects.update(this.editingId,data,{color})'),'edited color is not persisted');
ok(ui.includes('this.objects.add(type,data,this.nextColorForType(type))'),'new object does not get next mode color');
ok(objects.includes('duplicate(id, colorOverride = null)'),'duplicate color override missing');
ok(css.includes('.object-color-palette')&&css.includes('.object-color-choice.active'),'color editor styles missing');
console.log('object colors OK');
