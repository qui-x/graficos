const fs=require('fs');const path=require('path');const root=path.join(__dirname,'..');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const ui=fs.readFileSync(path.join(root,'js','ui.js'),'utf8');
if(!html.includes('parameterName')||!html.includes('parameterValue')||!html.includes('vector-variable-box'))throw new Error('UI de parâmetros ausente');
for(const id of ['vx1','vy1','vz1','vx2','vy2','vz2'])if(!html.includes(`id="${id}" class="numeric-input expression-input"`))throw new Error(`Campo ${id} não aceita expressão`);
if(!ui.includes('getParameterValues')||!ui.includes('addParameter')||!ui.includes('parameterStorageKey'))throw new Error('Integração de parâmetros ausente');
console.log('variables_vector_ui OK');
if(!ui.includes("...Object.keys(this.parameterValues || {})"))throw new Error('Parâmetros não entram no escopo ativo');
if(!ui.includes('data-use-param'))throw new Error('Inserção rápida de parâmetro ausente');
console.log('parameter scope OK');
