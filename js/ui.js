(function (global) {
  'use strict';

  const COLORS = ['#46e6ff','#a47dff','#ff6fb8','#58d9a7','#ffd166','#ff9b66','#668cff','#cf8cff'];
  const MODE_META = Object.freeze({
    function:{label:'Função',title:'Nova função'},parametric:{label:'Paramétrica',title:'Curva paramétrica'},vector:{label:'Vetor',title:'Novo vetor'},
    geometry:{label:'Geometria',title:'Construção geométrica'},washers:{label:'Discos/Anéis',title:'Método dos discos e anéis'},curve3d:{label:'Curva 3D',title:'Curva paramétrica 3D'},line3d:{label:'Reta 3D',title:'Reta no espaço'}
  });
  const ICONS = Object.freeze({
    eye:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    eyeOff:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a15.5 15.5 0 0 1-2.4 3.1M6.1 6.1C3.7 8 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3-.5"/></svg>',
    more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>'
  });
  const STORAGE_A11Y = 'orbisvA11yV1';
  const STORAGE_VIEW = 'orbisvViewPrefsV1';
  const STORAGE_TOUR = 'orbisvTourCompletedV1';

  function deepClone(v){return JSON.parse(JSON.stringify(v));}
  function defaultDrafts(){return{
    function:{expression:'sin(x)',xMin:'',xMax:''},
    parametric:{xExpr:'cos(t)',yExpr:'sin(t)',tMin:'0',tMax:'2pi'},
    vector:{x1:'0',y1:'0',x2:'3',y2:'4'},
    geometry:{type:'point',x:'2',y:'1',a:'1',b:'-1',c:'0',cx:'0',cy:'0',r:'3',ea:'4',eb:'2',vertices:[[-2,-1],[2,-1],[0,2]]},
    washers:{method:'washers',axis:'x',outerExpr:'sqrt(x)',innerExpr:'0',a:'0',b:'4'},
    curve3d:{xExpr:'cos(t)',yExpr:'sin(t)',zExpr:'t/4',tMin:'0',tMax:'4pi'},
    line3d:{method:'pointVector',x0:'0',y0:'0',z0:'0',a:'1',b:'1',c:'1',x1:'0',y1:'0',z1:'0',x2:'2',y2:'2',z2:'2'}
  };}

  const AppUI = {
    objects:null,engine:null,drafts:defaultDrafts(),activeMode:'function',activeInspector:'entry',editingId:null,selectionMode:false,selectedIds:new Set(),sheetState:'mid',toastTimer:null,
    mathState:null,confirmResolver:null,a11yPrefs:null,viewPrefs:null,tourState:null,tourResizeHandler:null,

    init(objects,engine){
      this.objects=objects;this.engine=engine;this.cache();this.loadPrefs();this.applyA11y();this.applyViewPrefs();
      this.bindCore();this.bindFormsDelegation();this.bindModals();this.bindAccessibility();this.bindVisualization();this.bindProject();this.bindMathEditor();this.bindModels();this.buildMoreModes();
      this.bindObjectEvents();this.objects.load();this.renderAll();this.setMode('function',false);this.updateResponsiveState();
      global.addEventListener('resize',()=>this.updateResponsiveState());
      requestAnimationFrame(()=>this.playIntroAnimation(()=>this.openStartupProjectHome()));
    },
    cache(){
      const id=(x)=>document.getElementById(x);
      this.$={shell:id('appShell'),workspace:id('workspace'),modeRail:id('modeRail'),railToggle:id('railToggleBtn'),modeButtons:[...document.querySelectorAll('.mode-btn[data-mode]')],mobileModeButtons:[...document.querySelectorAll('.mobile-nav-btn[data-mode]')],moreModes:id('moreModesBtn'),inspector:id('inspectorPanel'),modeLabel:id('currentModeLabel'),modeTitle:id('currentModeTitle'),modeForm:id('modeForm'),inspectorTabs:[...document.querySelectorAll('.inspector-tab')],inspectorViews:[...document.querySelectorAll('.inspector-view')],objectsList:id('objectsList'),historyList:id('historyList'),objectCount:id('objectCountBadge'),multiActions:id('multiActions'),multiCount:id('multiCount'),empty:id('emptyState'),coordinate:id('coordinateReadout'),inspectCard:id('inspectCard'),selectionBadge:id('selectionBadge'),toast:id('toast'),modalLayer:id('modalLayer'),contextMenu:id('objectContextMenu'),undo:id('undoBtn'),redo:id('redoBtn'),historyUndo:id('historyUndoBtn'),historyRedo:id('historyRedoBtn'),autosave:id('autosaveStatus'),fileInput:id('projectFileInput'),mathModal:id('mathEditorModal'),mathDisplay:id('mathDisplay'),mathValidation:id('mathValidation'),mathKeyboard:id('mathKeyboard'),mathSave:id('mathSaveBtn'),mathContext:id('mathEditorContext'),mathTitle:id('mathEditorTitle'),modelsGrid:id('modelsGrid'),modelsSearch:id('modelsSearch'),modelsCategory:id('modelsCategory'),modelsSummary:id('modelsSummary'),tourLayer:id('tourLayer'),tourFocus:id('tourFocus'),tourCard:id('tourCard'),tourTitle:id('tourTitle'),tourText:id('tourText'),tourStepLabel:id('tourStepLabel'),tourProgressBar:id('tourProgressBar'),intro:id('orbisvIntro'),introLogoStage:id('orbisvIntroLogoStage'),introSkip:id('orbisvIntroSkip')};
    },

    playIntroAnimation(done){
      const intro=this.$.intro,stage=this.$.introLogoStage,skip=this.$.introSkip;
      if(!intro||!stage){done?.();return;}
      let finished=false,timer=null;
      const introKey=(e)=>{if(e.key==='Escape'||e.key==='Enter'){e.preventDefault();finish();}};
      const finish=()=>{if(finished)return;finished=true;if(timer)clearTimeout(timer);document.removeEventListener('keydown',introKey);intro.classList.add('intro-exit');setTimeout(()=>{intro.hidden=true;done?.();},680);};
      if(this.a11yPrefs?.reduceMotion||global.matchMedia?.('(prefers-reduced-motion: reduce)').matches){stage.classList.add('playing');timer=setTimeout(finish,900);}else{requestAnimationFrame(()=>stage.classList.add('playing'));timer=setTimeout(finish,8550);}
      skip?.addEventListener('click',finish,{once:true});
      document.addEventListener('keydown',introKey);
    },

    bindCore(){
      [...this.$.modeButtons,...this.$.mobileModeButtons].forEach((b)=>b.addEventListener('click',()=>this.setMode(b.dataset.mode)));
      this.$.moreModes.addEventListener('click',()=>this.openModal('moreModesSheet'));
      this.$.railToggle.addEventListener('click',()=>{const collapsed=this.$.workspace.classList.toggle('rail-collapsed');this.$.railToggle.setAttribute('aria-pressed',String(collapsed));requestAnimationFrame(()=>this.engine.resize());});
      this.$.inspectorTabs.forEach((b)=>b.addEventListener('click',()=>this.setInspectorTab(b.dataset.inspectorTab)));
      idListen('sheetExpandBtn','click',()=>this.cycleSheet());idListen('sheetHandle','click',()=>this.cycleSheet());
      idListen('resetViewBtn','click',()=>this.engine.center());idListen('fitViewBtn','click',()=>this.engine.fitToObjects());
      idListen('gridBtn','click',(e)=>{this.engine.showGrid=!this.engine.showGrid;e.currentTarget.classList.toggle('active',this.engine.showGrid);e.currentTarget.setAttribute('aria-pressed',String(this.engine.showGrid));this.syncViewControls();this.saveViewPrefs();this.engine.requestRender();});
      idListen('axesBtn','click',(e)=>{this.engine.showAxes=!this.engine.showAxes;e.currentTarget.classList.toggle('active',this.engine.showAxes);e.currentTarget.setAttribute('aria-pressed',String(this.engine.showAxes));this.syncViewControls();this.saveViewPrefs();this.engine.requestRender();});
      idListen('inspectBtn','click',(e)=>{if(this.engine.viewMode==='3d'){this.showToast('No modo 3D, aproxime o ponteiro dos marcadores para inspecionar coordenadas x, y e z.');return;}this.engine.inspectMode=!this.engine.inspectMode;e.currentTarget.classList.toggle('active',this.engine.inspectMode);e.currentTarget.setAttribute('aria-pressed',String(this.engine.inspectMode));if(!this.engine.inspectMode){this.engine.inspectX=null;this.$.inspectCard.hidden=true;}else this.showToast('Modo Inspecionar ativo. Mova o ponteiro sobre o gráfico.');this.engine.requestRender();});
      idListen('fullscreenBtn','click',()=>this.toggleFullscreen());
      idListen('undoBtn','click',()=>this.undo());idListen('redoBtn','click',()=>this.redo());idListen('historyUndoBtn','click',()=>this.undo());idListen('historyRedoBtn','click',()=>this.redo());
      idListen('selectObjectsBtn','click',()=>this.toggleSelectionMode());
      idListen('clearObjectsBtn','click',async()=>{if(!this.objects.items.length)return;const ok=await this.confirm('Os objetos não bloqueados serão removidos da cena.','Limpar cena?');if(ok){this.objects.clear(false);this.selectedIds.clear();}});
      idListen('clearHistoryBtn','click',async()=>{if(!this.objects.events.length)return;const ok=await this.confirm('O registro visual de ações será limpo. Desfazer e refazer continuam disponíveis nesta sessão.','Limpar histórico?');if(ok){this.objects.events=[];this.objects.save();this.renderHistory();}});
      idListen('multiHideBtn','click',()=>{this.objects.batch([...this.selectedIds],'hide');this.clearSelection();});
      idListen('multiDuplicateBtn','click',()=>{this.objects.batch([...this.selectedIds],'duplicate');this.clearSelection();});
      idListen('multiDeleteBtn','click',()=>{this.objects.batch([...this.selectedIds],'delete');this.clearSelection();});
      document.addEventListener('keydown',(e)=>{if(!this.$.mathModal.hidden)return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?this.redo():this.undo();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();this.redo();}else if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();this.submitCurrent();}else if(e.key==='Escape'){this.closeAllTransient();}});
    },

    bindFormsDelegation(){
      this.$.modeForm.addEventListener('click',(e)=>{
        const math=e.target.closest('[data-edit-path]');if(math){this.openMathEditor(math.dataset.editPath,math.dataset.editorType||'math',math.dataset.vars||'',math.dataset.label||'Expressão');return;}
        const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
        if(action==='submit')this.submitCurrent();else if(action==='cancel-edit')this.cancelEdit();else if(action==='add-vertex'){this.drafts.geometry.vertices.push([0,0]);this.renderModeForm();}else if(action==='remove-vertex'){const i=Number(e.target.closest('[data-index]').dataset.index);if(this.drafts.geometry.vertices.length>3)this.drafts.geometry.vertices.splice(i,1);this.renderModeForm();}else if(action==='notables')this.showNotablePoints();else if(action==='clear-notables'){this.engine.clearNotablePoints?.();}else if(action==='table-csv')this.exportCsv();else if(action==='open-models')this.openModels();
      });
      this.$.modeForm.addEventListener('change',(e)=>{
        const key=e.target.dataset.draftKey;if(!key)return;this.setPath(this.drafts[this.activeMode],key,e.target.value);if(this.activeMode==='geometry'&&key==='type')this.renderModeForm();if(this.activeMode==='washers'&&(key==='method'||key==='axis'))this.renderModeForm();if(this.activeMode==='line3d'&&key==='method')this.renderModeForm();
      });
    },

    bindObjectEvents(){
      this.objects.onChange=(meta)=>{this.objects.save();this.engine.invalidateCache();this.renderObjects();this.renderHistory();this.updateUndoButtons();this.updateEmptyState();this.updateGraphDescription();this.engine.requestRender();this.$.autosave.textContent='Salvo agora';setTimeout(()=>{if(this.$.autosave)this.$.autosave.textContent='Ativo';},1300);if(meta?.action)this.announce(meta.action);};
    },

    renderAll(){this.renderObjects();this.renderHistory();this.renderModeForm();this.updateUndoButtons();this.updateEmptyState();this.updateGraphDescription();},
    setMode(mode,openSheet=true){
      if(!MODE_META[mode])return;this.activeMode=mode;if(this.editingId&&!this.modeMatchesObject(mode,this.objects.getById(this.editingId)))this.cancelEdit(false);
      const m=MODE_META[mode];this.engine.setViewMode?.(['curve3d','line3d'].includes(mode)?'3d':'2d');this.$.modeLabel.textContent=m.label.toUpperCase();this.$.modeTitle.textContent=this.editingId?'Editar objeto':m.title;
      [...this.$.modeButtons,...this.$.mobileModeButtons].forEach((b)=>{const active=b.dataset.mode===mode;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
      this.$.moreModes.classList.toggle('active',!['function','parametric','vector'].includes(mode));this.setInspectorTab('entry');this.renderModeForm();this.closeModal('moreModesSheet');if(openSheet&&this.isMobile()){this.sheetState='mid';this.applySheetState();}
    },
    setInspectorTab(tab){this.activeInspector=tab;this.$.inspectorTabs.forEach(b=>{const a=b.dataset.inspectorTab===tab;b.classList.toggle('active',a);b.setAttribute('aria-selected',String(a));});this.$.inspectorViews.forEach(v=>{const a=v.dataset.inspectorView===tab;v.classList.toggle('active',a);v.hidden=!a;});if(this.isMobile()&&this.sheetState==='collapsed'){this.sheetState='mid';this.applySheetState();}},
    cycleSheet(){if(!this.isMobile())return;this.sheetState=this.sheetState==='collapsed'?'mid':this.sheetState==='mid'?'expanded':'collapsed';this.applySheetState();},
    applySheetState(){this.$.inspector.classList.remove('sheet-collapsed','sheet-mid','sheet-expanded');this.$.inspector.classList.add(`sheet-${this.sheetState}`);requestAnimationFrame(()=>this.engine.resize());},
    isMobile(){return matchMedia('(max-width:760px) and (orientation:portrait)').matches;},
    updateResponsiveState(){if(this.isMobile()){if(!this.$.inspector.classList.contains('sheet-collapsed')&&!this.$.inspector.classList.contains('sheet-mid')&&!this.$.inspector.classList.contains('sheet-expanded'))this.applySheetState();}else this.$.inspector.classList.remove('sheet-collapsed','sheet-mid','sheet-expanded');requestAnimationFrame(()=>this.engine.resize());},

    renderModeForm(){
      const d=this.drafts[this.activeMode];let html='';
      if(this.activeMode==='function')html=this.functionForm(d);
      else if(this.activeMode==='parametric')html=this.parametricForm(d);
      else if(this.activeMode==='vector')html=this.vectorForm(d);
      else if(this.activeMode==='geometry')html=this.geometryForm(d);
      else if(this.activeMode==='washers')html=this.washersForm(d);
      else if(this.activeMode==='curve3d')html=this.curve3dForm(d);
      else if(this.activeMode==='line3d')html=this.line3dForm(d);
      this.$.modeForm.innerHTML=html;
    },
    functionForm(d){const analysis=this.editingId?this.analysisCard(this.objects.getById(this.editingId)):'';return`<div class="form-section"><div class="form-group"><h3 class="group-title">Expressão</h3>${this.mathField('f(x)','expression',d.expression,'x','math')}<div class="field-help">A expressão é editada diretamente em notação matemática.</div><button class="secondary-wide models-open-btn" data-action="open-models" type="button">Explorar modelos matemáticos</button></div><details class="advanced-details"><summary>Opções avançadas</summary><div class="advanced-content"><div class="field-grid">${this.mathField('Domínio inicial','xMin',d.xMin,'','number',true)}${this.mathField('Domínio final','xMax',d.xMax,'','number',true)}</div></div></details>${analysis}${this.formActions()}</div>`;},
    parametricForm(d){return`<div class="form-section"><button class="secondary-wide models-open-btn" data-action="open-models" type="button">Modelos paramétricos</button><div class="form-group"><h3 class="group-title">Equações paramétricas</h3>${this.mathField('x(t)','xExpr',d.xExpr,'t')}${this.mathField('y(t)','yExpr',d.yExpr,'t')}</div><div class="form-group"><h3 class="group-title">Intervalo do parâmetro</h3><div class="field-grid">${this.mathField('t inicial','tMin',d.tMin,'','number')}${this.mathField('t final','tMax',d.tMax,'','number')}</div></div>${this.formActions()}</div>`;},
    vectorForm(d){let magnitude='—',angle='—';try{const x1=this.num(d.x1),y1=this.num(d.y1),x2=this.num(d.x2),y2=this.num(d.y2),dx=x2-x1,dy=y2-y1;magnitude=MathEngine.formatNumber(Math.hypot(dx,dy));angle=`${MathEngine.formatNumber(Math.atan2(dy,dx)*180/Math.PI)}°`;}catch{}return`<div class="form-section"><button class="secondary-wide models-open-btn" data-action="open-models" type="button">Modelos de vetores</button><div class="form-group"><h3 class="group-title">Origem</h3><div class="field-grid">${this.mathField('x₁','x1',d.x1,'','number')}${this.mathField('y₁','y1',d.y1,'','number')}</div></div><div class="form-group"><h3 class="group-title">Extremidade</h3><div class="field-grid">${this.mathField('x₂','x2',d.x2,'','number')}${this.mathField('y₂','y2',d.y2,'','number')}</div></div><div class="analysis-card"><h3>Análise do vetor</h3><div class="analysis-grid"><span>Módulo</span><b>${magnitude}</b><span>Direção</span><b>${angle}</b></div></div>${this.formActions()}</div>`;},
    geometryForm(d){let fields='';if(d.type==='point')fields=`<div class="field-grid">${this.mathField('x','x',d.x,'','number')}${this.mathField('y','y',d.y,'','number')}</div>`;else if(d.type==='line')fields=`<div class="field-help" style="margin-bottom:8px">Forma geral: ax + by + c = 0</div><div class="field-grid three">${this.mathField('a','a',d.a,'','number')}${this.mathField('b','b',d.b,'','number')}${this.mathField('c','c',d.c,'','number')}</div>`;else if(d.type==='circle')fields=`<div class="field-grid">${this.mathField('Centro x','cx',d.cx,'','number')}${this.mathField('Centro y','cy',d.cy,'','number')}${this.mathField('Raio','r',d.r,'','number')}</div>`;else if(d.type==='ellipse')fields=`<div class="field-grid">${this.mathField('Centro x','cx',d.cx,'','number')}${this.mathField('Centro y','cy',d.cy,'','number')}${this.mathField('Semieixo a','ea',d.ea,'','number')}${this.mathField('Semieixo b','eb',d.eb,'','number')}</div>`;else{fields=`<div class="field-stack">${d.vertices.map((v,i)=>`<div class="form-group"><div class="view-toolbar"><span class="field-label">Vértice ${i+1}</span>${d.vertices.length>3?`<button class="text-btn danger-text" data-action="remove-vertex" data-index="${i}" type="button">Remover</button>`:''}</div><div class="field-grid">${this.mathField('x',`vertices.${i}.0`,String(v[0]),'','number')}${this.mathField('y',`vertices.${i}.1`,String(v[1]),'','number')}</div></div>`).join('')}<button class="secondary-wide" data-action="add-vertex" type="button">Adicionar vértice</button></div>`;}return`<div class="form-section"><button class="secondary-wide models-open-btn" data-action="open-models" type="button">Modelos de geometria</button><div class="form-group"><label class="field-label" for="geometryTypeDynamic">Tipo geométrico</label><select class="select-field" id="geometryTypeDynamic" data-draft-key="type"><option value="point" ${d.type==='point'?'selected':''}>Ponto</option><option value="line" ${d.type==='line'?'selected':''}>Reta</option><option value="circle" ${d.type==='circle'?'selected':''}>Círculo</option><option value="polygon" ${d.type==='polygon'?'selected':''}>Polígono</option><option value="ellipse" ${d.type==='ellipse'?'selected':''}>Elipse</option></select></div><div class="form-group">${fields}</div>${this.formActions()}</div>`;},
    washersForm(d){let volume='—';try{volume=this.computeWashersVolume(d);if(Number.isFinite(volume))volume=`${MathEngine.formatNumber(volume)} u³`;else volume='—';}catch{}return`<div class="form-section"><button class="secondary-wide models-open-btn" data-action="open-models" type="button">Modelos de cálculo integral</button><div class="form-group"><div class="field-grid"><label><span class="field-label">Método</span><select class="select-field" data-draft-key="method"><option value="washers" ${d.method==='washers'?'selected':''}>Anéis</option><option value="disks" ${d.method==='disks'?'selected':''}>Discos</option></select></label><label><span class="field-label">Eixo de rotação</span><select class="select-field" data-draft-key="axis"><option value="x" ${d.axis==='x'?'selected':''}>Eixo x</option><option value="y" ${d.axis==='y'?'selected':''}>Eixo y</option></select></label></div></div><div class="form-group"><h3 class="group-title">Raios</h3>${this.mathField(d.axis==='x'?'R(x) — raio externo':'R(y) — raio externo','outerExpr',d.outerExpr,d.axis)}${d.method==='washers'?this.mathField(d.axis==='x'?'r(x) — raio interno':'r(y) — raio interno','innerExpr',d.innerExpr,d.axis):''}</div><div class="form-group"><h3 class="group-title">Intervalo</h3><div class="field-grid">${this.mathField('Início','a',d.a,'','number')}${this.mathField('Fim','b',d.b,'','number')}</div></div><div class="analysis-card"><h3>Volume calculado</h3><div class="analysis-grid"><span>Resultado numérico</span><b>${volume}</b></div></div>${this.formActions('Adicionar ao gráfico')}</div>`;},
    curve3dForm(d){return`<div class="form-section"><div class="form-group"><h3 class="group-title">Vetor posição</h3>${this.mathField('x(t)','xExpr',d.xExpr,'t')}${this.mathField('y(t)','yExpr',d.yExpr,'t')}${this.mathField('z(t)','zExpr',d.zExpr,'t')}</div><div class="form-group"><h3 class="group-title">Intervalo do parâmetro</h3><div class="field-grid">${this.mathField('t inicial','tMin',d.tMin,'','number')}${this.mathField('t final','tMax',d.tMax,'','number')}</div></div><div class="status-note">Visualização 3D ativa. Arraste o gráfico para orbitar a câmera, use a roda/pinça para aproximar e Shift + arraste para deslocar o alvo.</div>${this.formActions('Adicionar curva 3D')}</div>`;},
    line3dForm(d){const pv=d.method==='pointVector';return`<div class="form-section"><div class="form-group"><label><span class="field-label">Definir reta por</span><select class="select-field" data-draft-key="method"><option value="pointVector" ${pv?'selected':''}>Ponto + vetor diretor</option><option value="twoPoints" ${!pv?'selected':''}>Dois pontos</option></select></label></div>${pv?`<div class="form-group"><h3 class="group-title">Ponto inicial</h3><div class="field-grid three">${this.mathField('x₀','x0',d.x0,'','number')}${this.mathField('y₀','y0',d.y0,'','number')}${this.mathField('z₀','z0',d.z0,'','number')}</div></div><div class="form-group"><h3 class="group-title">Vetor diretor</h3><div class="field-grid three">${this.mathField('a','a',d.a,'','number')}${this.mathField('b','b',d.b,'','number')}${this.mathField('c','c',d.c,'','number')}</div></div>`:`<div class="form-group"><h3 class="group-title">Ponto A</h3><div class="field-grid three">${this.mathField('x₁','x1',d.x1,'','number')}${this.mathField('y₁','y1',d.y1,'','number')}${this.mathField('z₁','z1',d.z1,'','number')}</div><h3 class="group-title" style="margin-top:10px">Ponto B</h3><div class="field-grid three">${this.mathField('x₂','x2',d.x2,'','number')}${this.mathField('y₂','y2',d.y2,'','number')}${this.mathField('z₂','z2',d.z2,'','number')}</div></div>`}<div class="status-note">Visualização 3D ativa. A reta é projetada no espaço e pode ser inspecionada ao orbitar a câmera.</div>${this.formActions('Adicionar reta 3D')}</div>`;},
    formActions(customLabel){return`<div class="form-actions ${this.editingId?'editing':''}"><button class="primary-btn" data-action="submit" type="button">${this.editingId?'Salvar alterações':customLabel||'Adicionar ao gráfico'}</button>${this.editingId?'<button class="secondary-btn" data-action="cancel-edit" type="button">Cancelar</button>':''}</div>`;},
    mathField(label,path,value,vars='',type='math',optional=false){const display=value?this.renderMath(value,this.varsMap(vars)):`<span class="math-placeholder">${optional?'Opcional':'Toque para editar'}</span>`;return`<div class="field-stack"><span class="field-label">${this.escape(label)}</span><button class="math-field" type="button" data-edit-path="${this.escape(path)}" data-editor-type="${type}" data-vars="${this.escape(vars)}" data-label="${this.escape(label)}"><span class="math-render">${display}</span><span class="math-edit-label">Editar</span></button></div>`;},
    renderMath(expr,vars={}){if(!expr)return'';try{return MathEngine.toMathML(expr,vars);}catch{return`<span>${this.escape(this.pretty(expr))}</span>`;}},
    varsMap(vars){const map={};String(vars||'').split(',').filter(Boolean).forEach(v=>map[v.trim()]=0);return map;},
    pretty(s){return String(s).replace(/\bsin\b/g,'sen').replace(/\btan\b/g,'tg').replace(/\bpi\b/g,'π').replace(/sqrt\(/g,'√(').replace(/\*/g,'×').replace(/-/g,'−').replace(/\^2\b/g,'²').replace(/\^3\b/g,'³');},
    escapeMathText(s){return String(s).replace(/[&<>"]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));},
    superscriptMap(ch){return ({'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻','(':'⁽',')':'⁾','n':'ⁿ','i':'ⁱ','=':'⁼'})[ch]||ch;},
    tokenizeEditableMath(expr){
      const out=[];let i=0;
      const push=(text,start,end,cls='')=>out.push({text,start,end,cls});
      while(i<expr.length){
        const start=i;
        const next=expr.slice(i);
        if(/^sqrt/.test(next)){push('√',i,i+4,'fn');i+=4;continue;}
        if(/^sin/.test(next)){push('sen',i,i+3,'fn');i+=3;continue;}
        if(/^tan/.test(next)){push('tg',i,i+3,'fn');i+=3;continue;}
        if(/^cos/.test(next)){push('cos',i,i+3,'fn');i+=3;continue;}
        if(/^log/.test(next)){push('log',i,i+3,'fn');i+=3;continue;}
        if(/^ln/.test(next)){push('ln',i,i+2,'fn');i+=2;continue;}
        if(/^abs/.test(next)){push('abs',i,i+3,'fn');i+=3;continue;}
        if(/^pi/.test(next)){push('π',i,i+2,'const');i+=2;continue;}
        if(/^phi/.test(next)){push('φ',i,i+3,'const');i+=3;continue;}
        if(/^tau/.test(next)){push('τ',i,i+3,'const');i+=3;continue;}
        if(expr[i]==='^'){
          let end=i+1, rendered='';
          if(expr[end]==='('){let depth=1;end+=1;let body='';while(end<expr.length&&depth>0){const ch=expr[end];if(ch==='('){depth+=1;body+=ch;}else if(ch===')'){depth-=1;if(depth>0)body+=ch;}else body+=ch;end+=1;}rendered=[...body].map((ch)=>this.superscriptMap(ch)).join('');}
          else {
            const bodyStart=end;
            if(expr[end]==='+'||expr[end]==='-')end+=1;
            if(/[0-9.]/.test(expr[end]||'')){while(end<expr.length&&/[0-9.]/.test(expr[end]))end+=1;}
            else if(/[A-Za-zÀ-ÿ]/.test(expr[end]||'')){while(end<expr.length&&/[A-Za-zÀ-ÿ0-9]/.test(expr[end]))end+=1;}
            else if(end===bodyStart)end+=1;
            const body=expr.slice(i+1,end)||' ';
            rendered=[...body].map((ch)=>this.superscriptMap(ch)).join('');
          }
          push(rendered||'⁽⁾',i,end,'sup');i=end;continue;
        }
        if(expr[i]==='*'){push('×',i,i+1,'op');i+=1;continue;}
        if(expr[i]==='/'){push('÷',i,i+1,'op');i+=1;continue;}
        if(expr[i]==='-'){push('−',i,i+1,'op');i+=1;continue;}
        if(expr[i]==='+'){push('+',i,i+1,'op');i+=1;continue;}
        if(expr[i]===','){push(',',i,i+1,'comma');i+=1;continue;}
        if(expr[i]==='.') {push(',',i,i+1,'comma');i+=1;continue;}
        if(/[0-9]/.test(expr[i])){let end=i+1;while(end<expr.length&&/[0-9.]/.test(expr[end]))end+=1;push(expr.slice(i,end).replace(/\./g,','),i,end,'number');i=end;continue;}
        if(/[A-Za-zÀ-ÿ]/.test(expr[i])){let end=i+1;while(end<expr.length&&/[A-Za-zÀ-ÿ0-9]/.test(expr[end]))end+=1;push(expr.slice(i,end),i,end,'var');i=end;continue;}
        push(expr[i],i,i+1,'symbol');i+=1;
      }
      return out;
    },
    renderEditableMath(expr,cursor){
      const pieces=this.tokenizeEditableMath(expr);const html=[];const cursorHtml='<span class="math-cursor" aria-hidden="true"><span class="math-cursor-handle"></span></span>';
      if(cursor<=0)html.push(cursorHtml);
      let placed=cursor<=0;
      for(const part of pieces){
        if(!placed && cursor<=part.start){html.push(cursorHtml);placed=true;}
        html.push(`<span class="math-unit ${part.cls||''}" data-start="${part.start}" data-end="${part.end}">${this.escapeMathText(part.text)}</span>`);
        if(!placed && cursor===part.end){html.push(cursorHtml);placed=true;}
      }
      if(!placed)html.push(cursorHtml);
      return `<div class="math-editable" role="presentation">${html.join('')}</div>`;
    },

    submitCurrent(){
      try{
        if(this.activeMode==='function')this.saveFunction();else if(this.activeMode==='parametric')this.saveParametric();else if(this.activeMode==='vector')this.saveVector();else if(this.activeMode==='geometry')this.saveGeometry();else if(this.activeMode==='washers')this.saveWashers();else if(this.activeMode==='curve3d')this.saveCurve3D();else if(this.activeMode==='line3d')this.saveLine3D();else return;
        this.cancelEdit(false);this.renderModeForm();this.setInspectorTab('objects');if(this.isMobile()){this.sheetState='mid';this.applySheetState();}
      }catch(err){this.showToast(err.message||'Não foi possível concluir a operação.',true);}
    },
    saveFunction(){const d=this.drafts.function;MathEngine.compile(d.expression,{x:0});const data={expression:MathEngine.normalize(d.expression)};if(d.xMin!=='')data.xMin=this.num(d.xMin);if(d.xMax!=='')data.xMax=this.num(d.xMax);if(Number.isFinite(data.xMin)&&Number.isFinite(data.xMax)&&data.xMin>=data.xMax)throw new Error('O domínio inicial deve ser menor que o final.');this.saveObject('function',data);},
    saveParametric(){const d=this.drafts.parametric;MathEngine.compile(d.xExpr,{t:0});MathEngine.compile(d.yExpr,{t:0});const data={xExpr:MathEngine.normalize(d.xExpr),yExpr:MathEngine.normalize(d.yExpr),tMin:this.num(d.tMin),tMax:this.num(d.tMax)};if(data.tMin>=data.tMax)throw new Error('O intervalo de t deve ser crescente.');this.saveObject('parametric',data);},
    saveVector(){const d=this.drafts.vector,data={x1:this.num(d.x1),y1:this.num(d.y1),x2:this.num(d.x2),y2:this.num(d.y2)};this.saveObject('vector',data);},
    saveGeometry(){const d=this.drafts.geometry;let data,type=d.type;if(type==='point')data={x:this.num(d.x),y:this.num(d.y)};else if(type==='line'){data={a:this.num(d.a),b:this.num(d.b),c:this.num(d.c)};if(Math.abs(data.a)<1e-12&&Math.abs(data.b)<1e-12)throw new Error('Os coeficientes a e b não podem ser ambos zero.');}else if(type==='circle'){data={cx:this.num(d.cx),cy:this.num(d.cy),r:this.num(d.r)};if(data.r<=0)throw new Error('O raio deve ser positivo.');}else if(type==='ellipse'){data={cx:this.num(d.cx),cy:this.num(d.cy),a:this.num(d.ea),b:this.num(d.eb)};if(data.a<=0||data.b<=0)throw new Error('Os semieixos devem ser positivos.');}else{data={vertices:d.vertices.map(v=>[this.num(String(v[0])),this.num(String(v[1]))])};if(data.vertices.length<3)throw new Error('Um polígono precisa de pelo menos três vértices.');}this.saveObject(type,data);},
    saveWashers(){const d=this.drafts.washers;MathEngine.compile(d.outerExpr,{[d.axis]:0});if(d.method==='washers')MathEngine.compile(d.innerExpr||'0',{[d.axis]:0});const a=this.num(d.a),b=this.num(d.b);if(a>=b)throw new Error('O intervalo deve ser crescente.');const volume=this.computeWashersVolume(d);const data={method:d.method,axis:d.axis,outerExpr:MathEngine.normalize(d.outerExpr),innerExpr:d.method==='washers'?MathEngine.normalize(d.innerExpr||'0'):'0',a,b,volume};this.saveObject('washers',data);},
    saveCurve3D(){const d=this.drafts.curve3d;MathEngine.compile(d.xExpr,{t:0});MathEngine.compile(d.yExpr,{t:0});MathEngine.compile(d.zExpr,{t:0});const data={xExpr:MathEngine.normalize(d.xExpr),yExpr:MathEngine.normalize(d.yExpr),zExpr:MathEngine.normalize(d.zExpr),tMin:this.num(d.tMin),tMax:this.num(d.tMax)};if(data.tMin>=data.tMax)throw new Error('O intervalo de t deve ser crescente.');this.saveObject('curve3d',data);this.engine.fitToObjects();},
    saveLine3D(){const d=this.drafts.line3d;let data;if(d.method==='twoPoints'){data={method:'twoPoints',x1:this.num(d.x1),y1:this.num(d.y1),z1:this.num(d.z1),x2:this.num(d.x2),y2:this.num(d.y2),z2:this.num(d.z2)};if(Math.hypot(data.x2-data.x1,data.y2-data.y1,data.z2-data.z1)<1e-10)throw new Error('Os dois pontos da reta precisam ser distintos.');}else{data={method:'pointVector',x0:this.num(d.x0),y0:this.num(d.y0),z0:this.num(d.z0),a:this.num(d.a),b:this.num(d.b),c:this.num(d.c)};if(Math.hypot(data.a,data.b,data.c)<1e-10)throw new Error('O vetor diretor não pode ser nulo.');}this.saveObject('line3d',data);this.engine.fitToObjects();},
    saveObject(type,data){if(this.editingId){const ok=this.objects.update(this.editingId,data);if(!ok)throw new Error('O objeto está bloqueado. Desbloqueie-o antes de editar.');this.showToast('Alterações salvas.');}else{this.objects.add(type,data,COLORS[this.objects.items.length%COLORS.length]);this.showToast('Objeto adicionado ao gráfico.');}},
    num(value){const n=MathEngine.evalExpr(String(value),{});if(!Number.isFinite(n))throw new Error('Valor numérico inválido.');return n;},
    numericIntegral(expr,a,b,varName){const fn=MathEngine.compile(expr,{[varName]:0}),n=600,h=(b-a)/n;let sum=0;for(let i=0;i<=n;i+=1){const x=a+i*h,y=fn({[varName]:x});if(!Number.isFinite(y))return NaN;sum+=(i===0||i===n?1:i%2?4:2)*y;}return sum*h/3;},
    computeWashersVolume(d){const a=this.num(d.a),b=this.num(d.b),v=d.axis,outer=`(${d.outerExpr})^2`,inner=d.method==='washers'?`(${d.innerExpr||'0'})^2`:'0';return Math.PI*this.numericIntegral(`(${outer})-(${inner})`,a,b,v);},

    beginEdit(obj){if(!obj)return;if(obj.locked){this.showToast('Objeto bloqueado. Desbloqueie-o para editar.');return;}this.editingId=obj.id;this.engine.selectedId=obj.id;if(obj.type==='function'){this.drafts.function={expression:obj.data.expression,xMin:Number.isFinite(obj.data.xMin)?String(obj.data.xMin):'',xMax:Number.isFinite(obj.data.xMax)?String(obj.data.xMax):''};this.setMode('function');}else if(obj.type==='parametric'){this.drafts.parametric={xExpr:obj.data.xExpr,yExpr:obj.data.yExpr,tMin:String(obj.data.tMin),tMax:String(obj.data.tMax)};this.setMode('parametric');}else if(obj.type==='vector'){this.drafts.vector=Object.fromEntries(Object.entries(obj.data).map(([k,v])=>[k,String(v)]));this.setMode('vector');}else if(['point','line','circle','ellipse','polygon'].includes(obj.type)){const d=this.drafts.geometry={...defaultDrafts().geometry,type:obj.type};if(obj.type==='point'){d.x=String(obj.data.x);d.y=String(obj.data.y);}else if(obj.type==='line'){d.a=String(obj.data.a);d.b=String(obj.data.b);d.c=String(obj.data.c);}else if(obj.type==='circle'){d.cx=String(obj.data.cx);d.cy=String(obj.data.cy);d.r=String(obj.data.r);}else if(obj.type==='ellipse'){d.cx=String(obj.data.cx);d.cy=String(obj.data.cy);d.ea=String(obj.data.a);d.eb=String(obj.data.b);}else d.vertices=deepClone(obj.data.vertices);this.setMode('geometry');}else if(obj.type==='washers'){this.drafts.washers={method:obj.data.method,axis:obj.data.axis,outerExpr:obj.data.outerExpr,innerExpr:obj.data.innerExpr,a:String(obj.data.a),b:String(obj.data.b)};this.setMode('washers');}else if(obj.type==='curve3d'){this.drafts.curve3d={xExpr:obj.data.xExpr,yExpr:obj.data.yExpr,zExpr:obj.data.zExpr,tMin:String(obj.data.tMin),tMax:String(obj.data.tMax)};this.setMode('curve3d');}else if(obj.type==='line3d'){this.drafts.line3d={...defaultDrafts().line3d,...Object.fromEntries(Object.entries(obj.data).map(([k,v])=>[k,typeof v==='number'?String(v):v]))};this.setMode('line3d');}this.$.modeTitle.textContent='Editar objeto';this.setInspectorTab('entry');if(this.isMobile()){this.sheetState='expanded';this.applySheetState();}this.renderObjects();this.engine.requestRender();this.showToast('Objeto carregado para edição.');},
    cancelEdit(render=true){this.editingId=null;this.engine.selectedId=null;this.engine.clearNotablePoints?.();if(render){this.$.modeTitle.textContent=MODE_META[this.activeMode].title;this.renderModeForm();this.renderObjects();this.engine.requestRender();}},
    modeMatchesObject(mode,obj){if(!obj)return false;if(mode==='geometry')return['point','line','circle','ellipse','polygon'].includes(obj.type);return mode===obj.type;},

    renderObjects(){const list=this.$.objectsList,count=this.objects.items.length;this.$.objectCount.textContent=String(count);if(!count){list.innerHTML='<div class="empty-list">Nenhum objeto na cena.</div>';this.updateSelectionUi();return;}list.innerHTML='';[...this.objects.items].reverse().forEach((o)=>{const card=document.createElement('div'),displayColor=this.engine?.objectColor?.(o)||o.color;card.className=`object-card${this.selectedIds.has(o.id)?' selected':''}${this.editingId===o.id?' editing':''}${o.locked?' locked':''}`;card.dataset.id=o.id;card.draggable=!this.isMobile();card.innerHTML=`${this.selectionMode?`<input class="object-select" type="checkbox" aria-label="Selecionar objeto" ${this.selectedIds.has(o.id)?'checked':''}>`:`<span class="object-swatch" style="background:${displayColor}"></span>`}<button class="object-main" type="button"><span class="object-title">${this.escape(this.objectLabel(o))}</span><span class="object-meta">${this.escape(this.objectMeta(o))}</span></button><div class="object-actions"><button class="object-icon" data-action="visibility" type="button" aria-label="${o.visible?'Ocultar':'Mostrar'}">${o.visible?ICONS.eye:ICONS.eyeOff}</button><button class="object-icon" data-action="menu" type="button" aria-label="Mais ações">${ICONS.more}</button></div>`;
        card.querySelector('.object-main').addEventListener('click',()=>this.selectionMode?this.toggleSelected(o.id):this.beginEdit(o));card.querySelector('.object-select')?.addEventListener('change',()=>this.toggleSelected(o.id));card.querySelector('[data-action="visibility"]').addEventListener('click',()=>this.objects.toggle(o.id));card.querySelector('[data-action="menu"]').addEventListener('click',(e)=>this.openObjectMenu(o,e.currentTarget));
        card.addEventListener('dragstart',(e)=>{e.dataTransfer.setData('text/plain',String(o.id));e.dataTransfer.effectAllowed='move';});card.addEventListener('dragover',(e)=>e.preventDefault());card.addEventListener('drop',(e)=>{e.preventDefault();const source=Number(e.dataTransfer.getData('text/plain'));const target=o.id;const si=this.objects.items.findIndex(x=>x.id===source),ti=this.objects.items.findIndex(x=>x.id===target);if(si>=0&&ti>=0)this.objects.reorder(source,ti);});list.appendChild(card);});this.updateSelectionUi();},
    objectTypeLabel(o){if(['point','line','circle','ellipse','polygon'].includes(o?.type))return 'Geometria';if(o?.type==='washers')return 'Discos / Anéis';return MODE_META[o?.type]?.label||o?.type||'Objeto';},
    objectLabel(o){if(o.name)return o.name;if(o.type==='function')return`f(x) = ${this.pretty(o.data.expression)}`;if(o.type==='parametric')return`r(t): ${this.pretty(o.data.xExpr)}, ${this.pretty(o.data.yExpr)}`;if(o.type==='vector')return`v = (${this.fmt(o.data.x2-o.data.x1)}, ${this.fmt(o.data.y2-o.data.y1)})`;if(o.type==='point')return`P = (${this.fmt(o.data.x)}, ${this.fmt(o.data.y)})`;if(o.type==='line')return`${this.fmt(o.data.a)}x + ${this.fmt(o.data.b)}y + ${this.fmt(o.data.c)} = 0`;if(o.type==='circle')return`Círculo r = ${this.fmt(o.data.r)}`;if(o.type==='ellipse')return`Elipse a = ${this.fmt(o.data.a)}, b = ${this.fmt(o.data.b)}`;if(o.type==='polygon')return`Polígono · ${o.data.vertices.length} vértices`;if(o.type==='washers')return`${o.data.method==='washers'?'Anéis':'Discos'} · V ≈ ${this.fmt(o.data.volume)}`;if(o.type==='curve3d')return`r(t) = (${this.pretty(o.data.xExpr)}, ${this.pretty(o.data.yExpr)}, ${this.pretty(o.data.zExpr)})`;if(o.type==='line3d'){if(o.data.method==='twoPoints')return`Reta 3D · A→B`;return`Reta 3D · (${this.fmt(o.data.a)}, ${this.fmt(o.data.b)}, ${this.fmt(o.data.c)})`;}return this.objectTypeLabel(o);},
    objectMeta(o){const parts=[o.visible?'visível':'oculto'];if(o.locked)parts.push('bloqueado');return`${this.objectTypeLabel(o)} · ${parts.join(' · ')}`;},
    openObjectMenu(o,anchor){
      const menu=this.$.contextMenu;if(!menu||!o)return;
      if(this._closeMenu){document.removeEventListener('pointerdown',this._closeMenu,true);this._closeMenu=null;}
      const index=this.objects.items.findIndex(x=>x.id===o.id);
      const canUp=index>=0&&index<this.objects.items.length-1,canDown=index>0;
      const actions=[
        {id:'edit',label:'Editar',disabled:o.locked},
        {id:'duplicate',label:'Duplicar'},
        {id:'visibility',label:o.visible?'Ocultar':'Mostrar'},
        {id:'lock',label:o.locked?'Desbloquear':'Bloquear'},
        {id:'up',label:'Mover para cima',disabled:!canUp},
        {id:'down',label:'Mover para baixo',disabled:!canDown},
        ...(o.type==='function'?[{id:'notables',label:'Mostrar pontos notáveis'}]:[]),
        {id:'delete',label:'Excluir',disabled:o.locked,cls:'danger'}
      ];
      menu.innerHTML='';
      actions.forEach(a=>{const b=document.createElement('button');b.type='button';b.textContent=a.label;b.dataset.objectAction=a.id;b.dataset.objectId=String(o.id);b.setAttribute('role','menuitem');if(a.cls)b.classList.add(a.cls);b.disabled=Boolean(a.disabled);menu.appendChild(b);});
      if(this._objectMenuClick)menu.removeEventListener('click',this._objectMenuClick);
      this._objectMenuClick=(e)=>{const b=e.target.closest('[data-object-action]');if(!b||b.disabled||!menu.contains(b))return;e.preventDefault();e.stopPropagation();const action=b.dataset.objectAction,id=Number(b.dataset.objectId);this.closeObjectMenu();void this.performObjectAction(action,id);};
      menu.addEventListener('click',this._objectMenuClick);
      const r=anchor.getBoundingClientRect(),mw=Math.min(250,innerWidth-16);menu.style.width=`${mw}px`;menu.style.left=`${Math.min(innerWidth-mw-8,Math.max(8,r.right-mw))}px`;menu.style.top='0px';menu.hidden=false;
      const mh=menu.getBoundingClientRect().height||310;menu.style.top=`${Math.min(innerHeight-mh-8,Math.max(8,r.bottom+5))}px`;
      setTimeout(()=>{this._closeMenu=(e)=>{if(!menu.contains(e.target)&&e.target!==anchor)this.closeObjectMenu();};document.addEventListener('pointerdown',this._closeMenu,true);},0);
    },
    closeObjectMenu(){const menu=this.$.contextMenu;if(menu){menu.hidden=true;if(this._objectMenuClick){menu.removeEventListener('click',this._objectMenuClick);this._objectMenuClick=null;}}if(this._closeMenu){document.removeEventListener('pointerdown',this._closeMenu,true);this._closeMenu=null;}},
    async performObjectAction(action,id){
      const o=this.objects.getById(id);if(!o){this.showToast('O objeto não está mais disponível.',true);return;}
      if(action==='edit'){this.beginEdit(o);return;}
      if(action==='duplicate'){const copy=this.objects.duplicate(id);this.showToast(copy?'Objeto duplicado.':'Não foi possível duplicar.',!copy);return;}
      if(action==='visibility'){const ok=this.objects.toggle(id);this.showToast(ok?(o.visible?'Objeto exibido.':'Objeto ocultado.'):'Não foi possível alterar a visibilidade.',!ok);return;}
      if(action==='lock'){const ok=this.objects.setLocked(id,!o.locked);this.showToast(ok?(o.locked?'Objeto bloqueado.':'Objeto desbloqueado.'):'Não foi possível alterar o bloqueio.',!ok);return;}
      if(action==='up'||action==='down'){const ok=this.objects.reorder(id,action);this.showToast(ok?'Ordem do objeto atualizada.':'O objeto já está no limite dessa posição.',!ok);return;}
      if(action==='notables'){this.engine.selectedId=id;this.showNotablePoints(o);if(this.isMobile()){this.sheetState='collapsed';this.applySheetState();}return;}
      if(action==='delete'){const ok=await this.confirm('Esta ação pode ser desfeita pelo histórico.','Excluir objeto?');if(ok){const removed=this.objects.remove(id);this.showToast(removed?'Objeto excluído.':'Não foi possível excluir o objeto.',!removed);}return;}
    },
    toggleSelectionMode(){this.selectionMode=!this.selectionMode;if(!this.selectionMode)this.selectedIds.clear();this.renderObjects();},toggleSelected(id){this.selectedIds.has(id)?this.selectedIds.delete(id):this.selectedIds.add(id);this.renderObjects();},clearSelection(){this.selectedIds.clear();this.selectionMode=false;this.renderObjects();},updateSelectionUi(){const n=this.selectedIds.size;this.$.multiActions.hidden=!this.selectionMode;this.$.multiCount.textContent=`${n} selecionado${n===1?'':'s'}`;this.$.selectionBadge.hidden=!n;this.$.selectionBadge.textContent=n?`${n} objeto${n===1?'':'s'} selecionado${n===1?'':'s'}`:'';},

    renderHistory(){const list=this.$.historyList;if(!this.objects.events.length){list.innerHTML='<div class="empty-list">Nenhuma ação registrada.</div>';return;}list.innerHTML=this.objects.events.map((h)=>`<div class="history-row"><time>${this.escape(new Date(h.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))}</time><strong>${this.escape(h.action)}</strong>${h.detail?`<span>${this.escape(this.pretty(h.detail))}</span>`:''}</div>`).join('');},
    undo(){if(this.objects.undo())this.showToast('Ação desfeita.');else this.showToast('Nada para desfazer.');},redo(){if(this.objects.redo())this.showToast('Ação refeita.');else this.showToast('Nada para refazer.');},updateUndoButtons(){const u=!this.objects.undoStack.length,r=!this.objects.redoStack.length;this.$.undo.disabled=u;this.$.historyUndo.disabled=u;this.$.redo.disabled=r;this.$.historyRedo.disabled=r;},updateEmptyState(){this.$.empty.hidden=this.objects.items.length>0;},

    analysisCard(obj){if(!obj||obj.type!=='function')return'';try{const b=this.engine.currentBounds(),roots=MathEngine.roots(obj.data.expression,b.xmin,b.xmax,{},360),ext=MathEngine.extrema(obj.data.expression,b.xmin,b.xmax,{},260),f=MathEngine.compile(obj.data.expression,{x:0}),y0=f({x:0});return`<div class="analysis-card"><h3>Análise na janela atual</h3><div class="analysis-grid"><span>Raízes detectadas</span><b>${roots.length}</b><span>Interseção com y</span><b>${Number.isFinite(y0)?this.fmt(y0):'—'}</b><span>Extremos locais</span><b>${ext.length}</b></div><div class="field-grid" style="margin-top:9px"><button class="mini-btn" data-action="notables" type="button">Pontos notáveis</button><button class="mini-btn" data-action="table-csv" type="button">Tabela CSV</button></div></div>`;}catch{return'<div class="status-note">A análise será atualizada quando a expressão estiver válida.</div>'; }},
    showNotablePoints(explicitObj){const obj=explicitObj||this.objects.getById(this.editingId)||this.objects.items.find(o=>o.type==='function');if(!obj||obj.type!=='function'){this.showToast('Selecione uma função para analisar.');return;}try{this.engine.selectedId=obj.id;this.engine.setNotableSource?.(obj.id);this.engine.refreshNotablePoints?.(true);this.showToast(`${this.engine.notablePoints.length} ponto(s) notável(is) destacado(s). Eles serão recalculados ao mover ou ampliar o gráfico.`);}catch(e){this.showToast(e.message,true);}},
    updateInspection(x){if(!this.engine.inspectMode)return;const values=this.engine.inspectionValues(x);this.$.inspectCard.hidden=false;this.$.inspectCard.innerHTML=`<strong>x = ${this.fmt(x)}</strong>${values.length?values.slice(0,6).map(v=>`<div class="inspect-row"><span>${this.escape(this.pretty(v.expression))}</span><b>${this.fmt(v.y)}</b></div>`).join(''):'<div class="inspect-row"><span>Nenhuma função visível</span></div>'}`;},
    updateCoordinates(p,isTouch=false){if(!p||!this.viewPrefs.coords){this.$.coordinate.hidden=true;return;}this.$.coordinate.textContent=`x = ${this.fmt(p.x)} · y = ${this.fmt(p.y)}`;this.$.coordinate.hidden=false;if(isTouch){clearTimeout(this.coordTimer);this.coordTimer=setTimeout(()=>{if(!this.engine.inspectMode)this.$.coordinate.hidden=true;},1000);}},
    applySnap(p){const mode=this.viewPrefs.snap||'off';if(mode==='off')return p;const tolerance=.13;if(mode==='integer'){const rx=Math.round(p.x),ry=Math.round(p.y);return{x:Math.abs(p.x-rx)<tolerance?rx:p.x,y:Math.abs(p.y-ry)<tolerance?ry:p.y};}if(mode==='grid'){const s=this.engine.gridStep();const rx=Math.round(p.x/s)*s,ry=Math.round(p.y/s)*s;return{x:Math.abs(p.x-rx)<s*.2?rx:p.x,y:Math.abs(p.y-ry)<s*.2?ry:p.y};}if(mode==='notable'&&this.engine.notablePoints.length){let best=null,dist=Infinity;for(const n of this.engine.notablePoints){const d=Math.hypot(p.x-n.x,p.y-n.y);if(d<dist){best=n;dist=d;}}if(best&&dist<Math.max(.18,6/this.engine.scale))return{x:best.x,y:best.y};}return p;},

    bindModels(){
      if(!this.$.modelsGrid)return;
      this.$.modelsSearch?.addEventListener('input',()=>this.renderModels());
      this.$.modelsCategory?.addEventListener('change',()=>this.renderModels());
      this.$.modelsGrid.addEventListener('click',(e)=>{const b=e.target.closest('[data-model-id]');if(!b)return;this.applyModel(b.dataset.modelId);});
    },
    openModels(){
      if(!global.OrbisVModels){this.showToast('A biblioteca de modelos não foi carregada.',true);return;}
      const category=this.$.modelsCategory;category.innerHTML='<option value="all">Todas as categorias</option>'+global.OrbisVModels.categories.map(c=>`<option value="${this.escape(c)}">${this.escape(c)}</option>`).join('');
      if(this.$.modelsSearch)this.$.modelsSearch.value='';category.value='all';this.renderModels();this.openModal('modelsSheet');
    },
    renderModels(){
      if(!global.OrbisVModels||!this.$.modelsGrid)return;
      const q=(this.$.modelsSearch?.value||'').trim().toLowerCase(),cat=this.$.modelsCategory?.value||'all';
      const currentMode=this.activeMode;
      const compatible=global.OrbisVModels.models.filter(m=>m.mode===currentMode);
      const filtered=compatible.filter(m=>(cat==='all'||m.category===cat)&&(!q||`${m.title} ${m.formula} ${m.description} ${m.category}`.toLowerCase().includes(q)));
      this.$.modelsSummary.textContent=`${filtered.length} de ${compatible.length} modelos compatíveis com ${MODE_META[currentMode]?.label||currentMode}`;
      this.$.modelsGrid.innerHTML=filtered.length?filtered.map(m=>`<article class="model-card"><div class="model-card-head"><span class="model-category">${this.escape(m.category)}</span><h3>${this.escape(m.title)}</h3></div><div class="model-formula">${this.escape(m.formula)}</div><p>${this.escape(m.description)}</p><button class="primary-inline model-use" type="button" data-model-id="${this.escape(m.id)}">Usar modelo</button></article>`).join(''):'<div class="empty-list">Nenhum modelo encontrado para este modo.</div>';
    },
    applyModel(id){
      const m=global.OrbisVModels?.find(id);if(!m)return;
      this.cancelEdit(false);this.activeMode=m.mode;const base=defaultDrafts()[m.mode]||{};this.drafts[m.mode]={...deepClone(base),...deepClone(m.draft)};
      this.setMode(m.mode,false);this.renderModeForm();this.setInspectorTab('entry');this.closeModal('modelsSheet');if(this.isMobile()){this.sheetState='expanded';this.applySheetState();}
      this.showToast(`Modelo carregado: ${m.title}.`);
    },

    openMathEditor(path,type,vars,label){const value=String(this.getPath(this.drafts[this.activeMode],path)??'');this.mathState={path,type,vars,label,expr:value,cursor:value.length,undo:[],redo:[],keyTab:'basic'};this.$.mathContext.textContent=type==='number'?'VALOR NUMÉRICO':'NOTAÇÃO MATEMÁTICA';this.$.mathTitle.textContent=label;this.openModal('mathEditorModal');document.querySelector('.math-keyboard-tabs').hidden=type==='number';this.renderMathKeyboard();this.renderMathEditor();this.$.mathDisplay.focus();},
    bindMathEditor(){
      document.querySelectorAll('.math-key-tab').forEach(b=>b.addEventListener('click',()=>{if(!this.mathState)return;this.mathState.keyTab=b.dataset.keyTab;document.querySelectorAll('.math-key-tab').forEach(x=>x.classList.toggle('active',x===b));this.renderMathKeyboard();this.focusMathEditor();}));
      idListen('mathCancelBtn','click',()=>this.closeModal('mathEditorModal'));
      this.$.mathSave.addEventListener('click',()=>this.saveMathEditor());
      this.$.mathKeyboard.addEventListener('pointerdown',(e)=>{if(e.target.closest('button'))e.preventDefault();});
      this.$.mathKeyboard.addEventListener('click',(e)=>{
        const b=e.target.closest('button');if(!b||b.disabled||!this.mathState)return;
        const action=b.dataset.action;
        if(action==='clear'){this.mathClear();}
        else if(action==='backspace'){this.mathBackspace();}
        else if(action==='delete-forward'){this.mathDeleteForward();}
        else if(action==='undo'){this.mathUndo();}
        else if(action==='redo'){this.mathRedo();}
        else if(action==='cursor-left'){this.moveMathCursor(-1);}
        else if(action==='cursor-right'){this.moveMathCursor(1);}
        else if(action==='cursor-home'){this.mathState.cursor=0;this.renderMathEditor();}
        else if(action==='cursor-end'){this.mathState.cursor=this.mathState.expr.length;this.renderMathEditor();}
        else if(action==='apply'){this.saveMathEditor();return;}
        else if(b.dataset.token!==undefined)this.insertMathToken(b.dataset.token,b.dataset.kind||'text');
        this.focusMathEditor();
      });
      this.$.mathDisplay.addEventListener('keydown',(e)=>this.handleMathKeyboardEvent(e));
      this.$.mathDisplay.addEventListener('click',(e)=>{if(!this.mathState)return;const unit=e.target.closest('.math-unit');if(!unit){this.focusMathEditor();return;}const start=Number(unit.dataset.start||0),end=Number(unit.dataset.end||start);const rect=unit.getBoundingClientRect();const pos=(e.clientX-rect.left)<(rect.width/2)?start:end;this.mathState.cursor=Math.max(0,Math.min(this.mathState.expr.length,pos));this.renderMathEditor();this.focusMathEditor();});
    },
    focusMathEditor(){requestAnimationFrame(()=>this.$.mathDisplay?.focus({preventScroll:true}));},
    handleMathKeyboardEvent(e){
      const s=this.mathState;if(!s)return;
      const mod=e.ctrlKey||e.metaKey;
      if(e.key==='Escape'){e.preventDefault();this.closeModal('mathEditorModal');return;}
      if(e.key==='Enter'){e.preventDefault();this.saveMathEditor();return;}
      if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?this.mathRedo():this.mathUndo();return;}
      if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();this.mathRedo();return;}
      if(e.key==='ArrowLeft'){e.preventDefault();this.moveMathCursor(-1);return;}
      if(e.key==='ArrowRight'){e.preventDefault();this.moveMathCursor(1);return;}
      if(e.key==='Home'){e.preventDefault();s.cursor=0;this.renderMathEditor();return;}
      if(e.key==='End'){e.preventDefault();s.cursor=s.expr.length;this.renderMathEditor();return;}
      if(e.key==='Backspace'){e.preventDefault();this.mathBackspace();return;}
      if(e.key==='Delete'){e.preventDefault();this.mathDeleteForward();return;}
      if(mod)return;
      if(e.key.length===1&&/[0-9A-Za-zÀ-ÿ+\-*/^().,!π×÷ ]/.test(e.key)){e.preventDefault();this.insertMathToken(e.key,'text');}
    },
    moveMathCursor(delta){if(!this.mathState)return;this.mathState.cursor=Math.max(0,Math.min(this.mathState.expr.length,this.mathState.cursor+delta));this.renderMathEditor();},
    renderMathKeyboard(){
      if(!this.mathState)return;
      const numeric=this.mathState.type==='number',tab=this.mathState.keyTab,vars=this.mathState.vars.split(',').filter(Boolean);
      const key=(label,token='',kind='text',cls='',action='',aria='')=>`<button class="math-key ${cls}" type="button"${aria?` aria-label="${this.escape(aria)}"`:''}${action?` data-action="${action}"`:` data-token="${this.escape(token||label)}" data-kind="${kind}"`}>${label}</button>`;
      const command=[
        key('<span class="key-main">↶</span><small>Desfazer</small>','','text','command','undo','Desfazer'),
        key('<span class="key-main">↷</span><small>Refazer</small>','','text','command','redo','Refazer'),
        key('<span class="key-main">←</span><small>Cursor</small>','','text','command','cursor-left','Mover cursor para esquerda'),
        key('<span class="key-main">→</span><small>Cursor</small>','','text','command','cursor-right','Mover cursor para direita'),
        key('<span class="key-main">⌫</span><small>Apagar</small>','','text','command danger-soft','backspace','Apagar caractere anterior'),
        key('<span class="key-main">Del</span><small>À frente</small>','','text','command','delete-forward','Apagar caractere seguinte')
      ].join('');
      const core=[
        key('AC','','text','utility clear-key','clear','Limpar expressão'),key('(', '(','text','utility'),key(')',')','text','utility'),key('÷','/','text','operator'),
        key('7','7','text','number'),key('8','8','text','number'),key('9','9','text','number'),key('×','*','text','operator'),
        key('4','4','text','number'),key('5','5','text','number'),key('6','6','text','number'),key('−','-','text','operator'),
        key('1','1','text','number'),key('2','2','text','number'),key('3','3','text','number'),key('+','+','text','operator'),
        key('0','0','text','number'),key(',','.','text','number'),key('<span class="key-main">⌫</span><small>Apagar</small>','','text','utility backspace-key','backspace','Apagar caractere anterior'),key('=','','text','equals','apply','Salvar expressão')
      ].join('');
      let scientific='',note='';
      if(numeric){
        scientific=[
          key('π','pi','text','function'),key('e','e','text','function'),key('√','sqrt','sqrt','function'),
          key('a⁄b','/','fraction','function'),key('x²','^2','square','function')
        ].join('');
      }else if(tab==='basic'){
        const basic=[];
        const detected=MathEngine.identifierNames?.(this.mathState.expr||'')||[];
        const variableKeys=[...new Set([...vars,...detected,'n','a','b','x','y','t'])].filter((v)=>MathEngine.isStandardIdentifier?.(v)).slice(0,6);
        variableKeys.forEach(v=>basic.push(key(v,v,'text','variable')));
        basic.push(
          key('π','pi','text','function'),key('e','e','text','function'),key('√','sqrt','sqrt','function'),
          key('x²','^2','square','function'),key('xⁿ','^','power','function'),key('a⁄b','/','fraction','function'),
          key('|x|','abs','abs','function')
        );
        scientific=basic.join('');
      }else if(tab==='functions'){
        scientific=[
          key('sen','sin','func','function'),key('cos','cos','func','function'),key('tg','tan','func','function'),key('ln','ln','func','function'),key('log','log','func','function'),
          key('arcsen','asin','func','function'),key('arccos','acos','func','function'),key('arctg','atan','func','function'),key('eˣ','exp','func','function'),key('sinh','sinh','func','function'),
          key('cosh','cosh','func','function'),key('tanh','tanh','func','function')
        ].join('');
      }else{
        const disabled=(label)=>`<button class="math-key function" type="button" disabled aria-disabled="true">${label}</button>`;
        scientific=[disabled('d/dx'),disabled('∫'),disabled('lim'),disabled('Σ'),disabled('Π'),disabled('∞'),disabled('≤'),disabled('≥'),disabled('≠'),disabled('∂')].join('');
        note='<div class="math-pad-note">Os operadores de cálculo avançado serão ativados junto ao motor simbólico. Os controles de edição e o teclado físico já funcionam neste campo.</div>';
      }
      this.$.mathKeyboard.innerHTML=`<div class="math-calculator-shell"><div class="math-command-pad" aria-label="Controles de edição">${command}</div>${scientific?`<div class="math-scientific-pad">${scientific}</div>`:''}${note}<div class="math-calculator-pad">${core}</div><div class="math-keyboard-help"><span><kbd>Enter</kbd> salvar</span><span><kbd>Backspace</kbd> apagar</span><span><kbd>Delete</kbd> apagar à frente</span><span><kbd>← →</kbd> mover cursor</span><span><kbd>Ctrl+Z</kbd> desfazer</span></div></div>`;
    },
    pushMathUndo(){if(!this.mathState)return;this.mathState.undo.push({expr:this.mathState.expr,cursor:this.mathState.cursor});if(this.mathState.undo.length>80)this.mathState.undo.shift();this.mathState.redo=[];},
    insertMathToken(token,kind){const s=this.mathState;if(!s)return;this.pushMathUndo();let insert=token,cursorOffset=String(token).length;if(kind==='func'){insert=`${token}()`;cursorOffset=token.length+1;}else if(kind==='sqrt'){insert='sqrt()';cursorOffset=5;}else if(kind==='abs'){insert='abs()';cursorOffset=4;}else if(kind==='power'){insert='^()';cursorOffset=2;}else if(kind==='fraction'){if(s.expr&&s.cursor===s.expr.length){s.expr=`(${s.expr})/()`;s.cursor=s.expr.length-1;this.renderMathEditor();return;}insert='/()';cursorOffset=2;}else if(kind==='square'){insert='^2';cursorOffset=2;}insert=insert.replace('×','*').replace('÷','/').replace('−','-').replace('π','pi').replace(',','.');s.expr=s.expr.slice(0,s.cursor)+insert+s.expr.slice(s.cursor);s.cursor+=cursorOffset;this.renderMathEditor();},
    mathBackspace(){const s=this.mathState;if(!s||s.cursor<=0)return;this.pushMathUndo();s.expr=s.expr.slice(0,s.cursor-1)+s.expr.slice(s.cursor);s.cursor-=1;this.renderMathEditor();},
    mathDeleteForward(){const s=this.mathState;if(!s||s.cursor>=s.expr.length)return;this.pushMathUndo();s.expr=s.expr.slice(0,s.cursor)+s.expr.slice(s.cursor+1);this.renderMathEditor();},
    mathClear(){const s=this.mathState;if(!s||!s.expr)return;this.pushMathUndo();s.expr='';s.cursor=0;this.renderMathEditor();},
    mathUndo(){const s=this.mathState,entry=s?.undo.pop();if(!entry)return;s.redo.push({expr:s.expr,cursor:s.cursor});s.expr=entry.expr;s.cursor=entry.cursor;this.renderMathEditor();},mathRedo(){const s=this.mathState,entry=s?.redo.pop();if(!entry)return;s.undo.push({expr:s.expr,cursor:s.cursor});s.expr=entry.expr;s.cursor=entry.cursor;this.renderMathEditor();},
    renderMathEditor(){const s=this.mathState;if(!s)return;const vars=this.varsMap(s.vars);if(!s.expr){this.$.mathDisplay.innerHTML='<span class="math-placeholder">Construa a expressão com o teclado OrbisV</span>';this.$.mathDisplay.setAttribute('aria-label','Editor matemático vazio');this.$.mathValidation.textContent='Expressão vazia';this.$.mathValidation.className='math-source-hint invalid';this.$.mathSave.disabled=true;return;}this.$.mathDisplay.innerHTML=this.renderEditableMath(s.expr,s.cursor);this.$.mathDisplay.setAttribute('aria-label',`Expressão matemática: ${MathEngine.toAccessibleText(s.expr)}`);try{const identifiers=MathEngine.identifierNames?.(s.expr)||[];const contextVars=new Set(Object.keys(vars));const parameters=identifiers.filter((name)=>!contextVars.has(name));if(s.type==='number'&&parameters.length)throw new Error(`Este campo aceita apenas valores numéricos e constantes. Identificador encontrado: ${parameters[0]}.`);MathEngine.toMathML(s.expr,vars);const paramNote=parameters.length?` · parâmetro${parameters.length>1?'s':''} automático${parameters.length>1?'s':''}: ${parameters.map((name)=>`${name}=${MathEngine.standardIdentifierDefault}`).join(', ')}`:'';this.$.mathValidation.textContent=`Expressão válida${paramNote}`;this.$.mathValidation.className='math-source-hint';this.$.mathSave.disabled=false;}catch(e){this.$.mathValidation.textContent=e.message;this.$.mathValidation.className='math-source-hint invalid';this.$.mathSave.disabled=true;}},
    saveMathEditor(){if(!this.mathState||this.$.mathSave.disabled)return;const s=this.mathState;const normalized=MathEngine.normalize(s.expr);this.setPath(this.drafts[this.activeMode],s.path,normalized);this.closeModal('mathEditorModal');this.mathState=null;this.renderModeForm();},

    buildMoreModes(){const grid=document.getElementById('modeGrid');grid.innerHTML=Object.entries(MODE_META).map(([id,m])=>`<button class="mode-btn" type="button" data-more-mode="${id}"><span class="micro-label">MODO</span><span>${m.label}</span></button>`).join('');grid.querySelectorAll('[data-more-mode]').forEach(b=>b.addEventListener('click',()=>this.setMode(b.dataset.moreMode)));},
    bindModals(){document.querySelectorAll('[data-close-modal]').forEach(b=>b.addEventListener('click',()=>this.closeModal(b.dataset.closeModal)));this.$.modalLayer.addEventListener('pointerdown',(e)=>{if(e.target===this.$.modalLayer)this.closeAllModals();});idListen('confirmCancelBtn','click',()=>{const resolve=this.confirmResolver;this.confirmResolver=null;this.closeModal('confirmDialog');resolve?.(false);});idListen('confirmOkBtn','click',()=>{const resolve=this.confirmResolver;this.confirmResolver=null;this.closeModal('confirmDialog');resolve?.(true);});},
    openModal(id){this.closeAllModals();const el=document.getElementById(id);if(!el)return;el.hidden=false;this.$.modalLayer.classList.add('modal-open');setTimeout(()=>el.querySelector('button,[tabindex]')?.focus(),0);},closeModal(id){const el=document.getElementById(id);if(el)el.hidden=true;if(![...this.$.modalLayer.children].some(x=>x.matches?.('.sheet-modal:not([hidden]),.confirm-dialog:not([hidden])')))this.$.modalLayer.classList.remove('modal-open');},closeAllModals(){this.$.modalLayer.querySelectorAll('.sheet-modal,.confirm-dialog').forEach(x=>x.hidden=true);this.$.modalLayer.classList.remove('modal-open');if(this.confirmResolver){const resolve=this.confirmResolver;this.confirmResolver=null;resolve(false);}},closeAllTransient(){this.closeObjectMenu();this.closeAllModals();},
    confirm(text,title='Confirmar ação'){this.closeAllModals();return new Promise(resolve=>{this.confirmResolver=resolve;document.getElementById('confirmTitle').textContent=title;document.getElementById('confirmText').textContent=text;const el=document.getElementById('confirmDialog');el.hidden=false;this.$.modalLayer.classList.add('modal-open');setTimeout(()=>document.getElementById('confirmCancelBtn')?.focus(),0);});},

    bindProject(){
      idListen('projectBtn','click',()=>this.openProjectHome());
      idListen('continueProjectBtn','click',()=>this.closeModal('projectSheet'));
      idListen('newProjectBtn','click',async()=>{const hasScene=this.objects.items.length>0;if(hasScene){const ok=await this.confirm(`A cena atual possui ${this.objects.items.length} objeto(s). Ao continuar, ela será substituída por uma cena vazia.`,'Criar novo gráfico?');if(!ok){this.openProjectHome();return;}}this.objects.clear(true);this.objects.items=[];this.objects.events=[];this.objects.undoStack=[];this.objects.redoStack=[];this.objects.save();this.engine.center();this.cancelEdit();this.setMode('function',false);this.closeAllModals();this.renderAll();this.showToast('Novo gráfico iniciado.');});
      idListen('openProjectBtn','click',()=>this.$.fileInput.click());this.$.fileInput.addEventListener('change',(e)=>this.openProjectFile(e.target.files?.[0]));
      idListen('saveProjectBtn','click',()=>this.saveProjectFile());
      idListen('openExportBtn','click',()=>this.openModal('exportSheet'));
      idListen('projectModelsBtn','click',()=>{this.closeModal('projectSheet');this.openModels();});
      idListen('projectA11yBtn','click',()=>{this.closeModal('projectSheet');this.syncA11yControls();this.openModal('a11ySheet');});
      idListen('projectVisualBtn','click',()=>{this.closeModal('projectSheet');this.syncViewControls();this.openModal('visualizationSheet');});
      idListen('startTourBtn','click',()=>this.startTour(false));idListen('firstRunTourBtn','click',()=>this.startTour(false));
      idListen('tourNextBtn','click',()=>this.nextTourStep());idListen('tourPrevBtn','click',()=>this.prevTourStep());idListen('tourSkipBtn','click',()=>this.endTour(true));
      document.addEventListener('keydown',(e)=>{if(!this.tourState)return;if(e.key==='Escape'){e.preventDefault();this.endTour(true);}else if(e.key==='ArrowRight'||e.key==='Enter'){e.preventDefault();this.nextTourStep();}else if(e.key==='ArrowLeft'){e.preventDefault();this.prevTourStep();}});
    },
    openStartupProjectHome(){this.openProjectHome();const first=!localStorage.getItem(STORAGE_TOUR);const card=document.getElementById('firstRunCard');if(card)card.hidden=!first;if(first)setTimeout(()=>{if(!document.getElementById('projectSheet')?.hidden&&!this.tourState)this.startTour(true);},650);},
    openProjectHome(){this.syncProjectHome();this.openModal('projectSheet');},
    syncProjectHome(){const count=this.objects?.items?.length||0;const label=document.getElementById('continueProjectLabel'),summary=document.getElementById('projectSessionSummary');if(label)label.textContent=count?'Continuar projeto atual':'Entrar no OrbisV';if(summary)summary.textContent=count?`${count} objeto(s) carregado(s) · autosave ativo`:'Cena vazia pronta para começar';const card=document.getElementById('firstRunCard');if(card)card.hidden=Boolean(localStorage.getItem(STORAGE_TOUR));},
    tourSteps(){return[
      {title:'Bem-vindo ao OrbisV',text:'Esta é a tela inicial do programa. Sempre que o OrbisV for aberto, você poderá continuar a sessão, criar ou abrir projetos, acessar modelos, exportação, acessibilidade e este tour.',target:()=>document.getElementById('projectSheet'),prepare:()=>this.openProjectHome()},
      {title:'Modos matemáticos',text:'Escolha o tipo de construção: Função, Paramétrica, Vetor, Geometria, Discos/Anéis e os modos 3D preparados. No celular, os modos principais ficam na barra inferior e os demais em Mais.',target:()=>this.isMobile()?document.querySelector('.mobile-nav'):document.getElementById('modeRail'),prepare:()=>{this.closeAllModals();this.setMode('function',false);}},
      {title:'Área gráfica e ferramentas',text:'O gráfico é o centro da exploração. Use recenter, grade, eixos, ajuste à tela e inspeção. Pan e zoom preservam a cena e os objetos adicionados.',target:()=>document.querySelector('.floating-toolbar'),prepare:()=>this.closeAllModals()},
      {title:'Entrada matemática',text:'O painel Entrada reúne os dados do modo atual. Expressões são exibidas em notação matemática e, no mobile, abrem o editor próprio do OrbisV sem depender do teclado do sistema.',target:()=>document.getElementById('inspectorPanel'),prepare:()=>{this.setMode('function',false);this.setInspectorTab('entry');if(this.isMobile()){this.sheetState='expanded';this.applySheetState();}}},
      {title:'Editor de expressão',text:'Toque no campo f(x) para editar visualmente. O teclado oferece variáveis, operadores, funções, potências, raízes e estruturas matemáticas, com cursor visual e validação.',target:()=>document.querySelector('[data-edit-path="expression"]'),prepare:()=>{this.setMode('function',false);this.setInspectorTab('entry');this.renderModeForm();}},
      {title:'Modelos matemáticos',text:'A biblioteca reúne modelos pré-prontos por categoria. Usar um modelo preenche o formulário para revisão antes de adicionar ao gráfico.',target:()=>document.querySelector('.models-open-btn'),prepare:()=>{this.setMode('function',false);this.setInspectorTab('entry');this.renderModeForm();}},
      {title:'Objetos da cena',text:'A aba Objetos permite editar, ocultar, bloquear, duplicar, ordenar, selecionar vários itens e abrir o menu contextual de cada construção.',target:()=>document.querySelector('[data-inspector-tab="objects"]'),prepare:()=>{this.setInspectorTab('objects');if(this.isMobile()){this.sheetState='expanded';this.applySheetState();}}},
      {title:'Histórico e desfazer/refazer',text:'O histórico registra ações reais da cena. Você pode desfazer e refazer operações, mantendo o registro separado do undo interno do editor matemático.',target:()=>document.querySelector('[data-inspector-tab="history"]'),prepare:()=>{this.setInspectorTab('history');if(this.isMobile()){this.sheetState='expanded';this.applySheetState();}}},
      {title:'Acessibilidade',text:'A Central de acessibilidade controla tema claro/escuro, alto contraste, tamanho do texto, redução de movimento, visão de cores, traços distintos e descrição acessível do gráfico.',target:()=>document.getElementById('a11yBtn'),prepare:()=>{this.closeAllModals();}},
      {title:'Visualização do gráfico',text:'As preferências de visualização controlam grade, eixos, números, coordenadas temporárias e opções de snap sem alterar seus objetos matemáticos.',target:()=>document.getElementById('settingsBtn'),prepare:()=>this.closeAllModals()},
      {title:'Projetos e exportações',text:'O menu Projeto é também a página inicial do OrbisV. Nele você salva e abre arquivos .orbisv, inicia novos trabalhos e exporta resultados em formatos suportados.',target:()=>document.getElementById('projectBtn'),prepare:()=>this.closeAllModals()},
      {title:'Pronto para explorar',text:'Você pode repetir este tour a qualquer momento pelo menu Projeto. O OrbisV salva a sessão automaticamente no navegador para que seu trabalho continue disponível.',target:()=>document.querySelector('.brand-block'),prepare:()=>{this.closeAllModals();this.setInspectorTab('entry');}}
    ];},
    startTour(auto=false){if(this.tourState)return;this.closeObjectMenu();this.tourState={index:0,auto};document.body.classList.add('tour-active');this.$.tourLayer.hidden=false;this.tourResizeHandler=()=>this.positionTour();global.addEventListener('resize',this.tourResizeHandler);this.showTourStep(0);},
    showTourStep(index){if(!this.tourState)return;const steps=this.tourSteps();const i=Math.max(0,Math.min(steps.length-1,index));this.tourState.index=i;const step=steps[i];step.prepare?.();requestAnimationFrame(()=>{this.$.tourTitle.textContent=step.title;this.$.tourText.textContent=step.text;this.$.tourStepLabel.textContent=`${i+1} de ${steps.length}`;this.$.tourProgressBar.style.width=`${((i+1)/steps.length)*100}%`;const prev=document.getElementById('tourPrevBtn'),next=document.getElementById('tourNextBtn');if(prev)prev.disabled=i===0;if(next)next.textContent=i===steps.length-1?'Concluir':'Próximo';this.positionTour();next?.focus();});},
    positionTour(){if(!this.tourState||this.$.tourLayer.hidden)return;const steps=this.tourSteps(),step=steps[this.tourState.index],target=step?.target?.();const focus=this.$.tourFocus,card=this.$.tourCard;if(!target||!target.getBoundingClientRect){focus.style.cssText='left:12px;top:12px;width:calc(100vw - 24px);height:calc(100vh - 24px)';card.style.left='50%';card.style.top='50%';card.style.transform='translate(-50%,-50%)';return;}const r=target.getBoundingClientRect(),pad=this.isMobile()?6:8,left=Math.max(6,r.left-pad),top=Math.max(6,r.top-pad),right=Math.min(innerWidth-6,r.right+pad),bottom=Math.min(innerHeight-6,r.bottom+pad);focus.style.left=`${left}px`;focus.style.top=`${top}px`;focus.style.width=`${Math.max(24,right-left)}px`;focus.style.height=`${Math.max(24,bottom-top)}px`;card.style.transform='none';if(this.isMobile()){card.style.left='10px';card.style.top='auto';card.style.bottom='10px';return;}const cw=Math.min(390,innerWidth-24),ch=240,gap=14;let x=right+gap,y=Math.max(12,Math.min(top,innerHeight-ch-12));if(x+cw>innerWidth-12)x=Math.max(12,left-cw-gap);if(x<12){x=Math.max(12,(innerWidth-cw)/2);y=bottom+gap;if(y+ch>innerHeight-12)y=Math.max(12,top-ch-gap);}card.style.left=`${x}px`;card.style.top=`${y}px`;card.style.bottom='auto';},
    nextTourStep(){if(!this.tourState)return;const steps=this.tourSteps();if(this.tourState.index>=steps.length-1){this.endTour(false);return;}this.showTourStep(this.tourState.index+1);},
    prevTourStep(){if(!this.tourState||this.tourState.index<=0)return;this.showTourStep(this.tourState.index-1);},
    endTour(skipped=false){if(!this.tourState)return;localStorage.setItem(STORAGE_TOUR,'1');this.tourState=null;this.$.tourLayer.hidden=true;document.body.classList.remove('tour-active');if(this.tourResizeHandler){global.removeEventListener('resize',this.tourResizeHandler);this.tourResizeHandler=null;}this.closeAllModals();this.setInspectorTab('entry');this.syncProjectHome();this.showToast(skipped?'Tour encerrado. Você pode reiniciá-lo pelo menu Projeto.':'Tour concluído. Bem-vindo ao OrbisV.');},
    saveProjectFile(){const project={format:'orbisv-project',version:1,name:'Projeto OrbisV',savedAt:new Date().toISOString(),brand:{name:'OrbisV',tagline:'Visualize · Explore · Descubra',signature:'Matemática em qualquer dimensão'},scene:{objects:deepClone(this.objects.items),view:this.engine.getView()},history:deepClone(this.objects.events),ui:{mode:this.activeMode}};this.download(JSON.stringify(project,null,2),'application/json','projeto.orbisv');this.showToast('Projeto OrbisV salvo.');},
    async openProjectFile(file){if(!file)return;try{const text=await file.text(),project=JSON.parse(text);this.objects.importProject(project);if(Array.isArray(project.history))this.objects.events=deepClone(project.history).slice(0,this.objects.maxEvents||180);if(project.scene?.view)this.engine.setView(project.scene.view);if(project.ui?.mode&&MODE_META[project.ui.mode])this.setMode(project.ui.mode,false);this.closeAllModals();this.showToast('Projeto aberto com sucesso.');}catch(e){this.showToast(e.message||'Não foi possível abrir o projeto.',true);}finally{this.$.fileInput.value='';}},
    exportAs(type){this.closeModal('exportSheet');if(type==='png')this.engine.exportPng();else if(type==='svg')this.engine.exportSvg();else if(type==='pdf'){document.title='OrbisV — Relatório matemático';global.print();}else if(type==='csv')this.exportCsv();},
    exportCsv(){const funcs=this.objects.visible.filter(o=>o.type==='function');if(!funcs.length){this.showToast('Adicione ao menos uma função visível para gerar a tabela CSV.',true);return;}const b=this.engine.currentBounds(),rows=121,heads=['x',...funcs.map((o,i)=>`f${i+1}(x)`)],data=[heads.join(';')];const compiled=funcs.map(o=>{try{return MathEngine.compile(o.data.expression,{x:0});}catch{return null;}});for(let i=0;i<rows;i+=1){const x=b.xmin+(b.xmax-b.xmin)*i/(rows-1),line=[this.csvNumber(x)];compiled.forEach(fn=>{const y=fn?fn({x}):NaN;line.push(Number.isFinite(y)?this.csvNumber(y):'');});data.push(line.join(';'));}this.download('\ufeff'+data.join('\r\n'),'text/csv;charset=utf-8','OrbisV-tabela.csv');this.showToast('Tabela CSV exportada.');},
    csvNumber(n){return Number(n.toFixed(8)).toString().replace('.',',');},download(content,type,name){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);},

    loadPrefs(){const defaults={theme:'dark',highContrast:false,fontScale:1,letterSpacing:false,reduceMotion:false,simpleReading:false,colorVision:'none',linePatterns:true,markers:true,graphDescription:true,keyboardNav:true,nativeKeyboard:false};try{this.a11yPrefs={...defaults,...JSON.parse(localStorage.getItem(STORAGE_A11Y)||'{}')};}catch{this.a11yPrefs=defaults;}const view={grid:true,minorGrid:true,axes:true,labels:true,equalScale:true,coords:true,pointValues:true,snap:'off'};try{this.viewPrefs={...view,...JSON.parse(localStorage.getItem(STORAGE_VIEW)||'{}')};}catch{this.viewPrefs=view;}},
    saveA11y(){localStorage.setItem(STORAGE_A11Y,JSON.stringify(this.a11yPrefs));},saveViewPrefs(){this.viewPrefs={grid:this.engine.showGrid,minorGrid:this.engine.showMinorGrid,axes:this.engine.showAxes,labels:this.engine.showLabels,equalScale:true,coords:this.engine.showCoordinates,pointValues:this.engine.showPointValues,snap:this.viewPrefs.snap||'off'};localStorage.setItem(STORAGE_VIEW,JSON.stringify(this.viewPrefs));},
    applyA11y(){const p=this.a11yPrefs,root=document.documentElement,allowedVision=new Set(['none','protanopia','deuteranopia','tritanopia','achromatopsia']);root.dataset.theme=p.theme==='light'?'light':'dark';root.dataset.colorVision=allowedVision.has(p.colorVision)?p.colorVision:'none';root.classList.toggle('high-contrast',Boolean(p.highContrast));root.classList.toggle('reduce-motion',Boolean(p.reduceMotion));document.body.classList.toggle('simple-reading',Boolean(p.simpleReading));document.body.classList.toggle('letter-spaced',Boolean(p.letterSpacing));root.style.setProperty('--font-scale',p.fontScale);root.style.colorScheme=root.dataset.theme;const themeMeta=document.getElementById('themeColorMeta');if(themeMeta)themeMeta.content=root.dataset.theme==='light'?(p.highContrast?'#ffffff':'#f4f8fc'):(p.highContrast?'#000000':'#07111e');this.syncBrandAssets();this.syncA11yControls();this.renderObjects?.();this.engine?.requestRender();},
    syncBrandAssets(){const light=document.documentElement.dataset.theme==='light';document.querySelectorAll('img[data-dark-src][data-light-src]').forEach((img)=>{const target=light?img.dataset.lightSrc:img.dataset.darkSrc;if(target&&img.getAttribute('src')!==target)img.setAttribute('src',target);});},
    bindAccessibility(){idListen('a11yBtn','click',()=>{this.syncA11yControls();this.openModal('a11ySheet');});document.querySelectorAll('[data-theme-choice]').forEach(b=>b.addEventListener('click',()=>{this.a11yPrefs.theme=b.dataset.themeChoice;this.applyA11y();this.saveA11y();}));const map=[['highContrastToggle','highContrast'],['letterSpacingToggle','letterSpacing'],['reduceMotionToggle','reduceMotion'],['simpleReadingToggle','simpleReading'],['linePatternToggle','linePatterns'],['markerToggle','markers'],['graphDescriptionToggle','graphDescription'],['keyboardNavToggle','keyboardNav'],['nativeKeyboardToggle','nativeKeyboard']];map.forEach(([id,key])=>idListen(id,'change',(e)=>{this.a11yPrefs[key]=e.target.checked;this.applyA11y();this.saveA11y();this.updateGraphDescription();}));idListen('colorVisionSelect','change',(e)=>{this.a11yPrefs.colorVision=e.target.value;this.applyA11y();this.saveA11y();});idListen('fontDownBtn','click',()=>this.changeFont(-.1));idListen('fontUpBtn','click',()=>this.changeFont(.1));idListen('restoreA11yBtn','click',()=>{localStorage.removeItem(STORAGE_A11Y);this.loadPrefs();this.applyA11y();this.showToast('Acessibilidade restaurada aos padrões.');});},
    changeFont(delta){this.a11yPrefs.fontScale=Math.max(.9,Math.min(1.5,Math.round((this.a11yPrefs.fontScale+delta)*10)/10));this.applyA11y();this.saveA11y();this.updateResponsiveState();},syncA11yControls(){const p=this.a11yPrefs;if(!p)return;document.querySelectorAll('[data-theme-choice]').forEach(b=>b.classList.toggle('active',b.dataset.themeChoice===p.theme));const pairs={highContrastToggle:'highContrast',letterSpacingToggle:'letterSpacing',reduceMotionToggle:'reduceMotion',simpleReadingToggle:'simpleReading',linePatternToggle:'linePatterns',markerToggle:'markers',graphDescriptionToggle:'graphDescription',keyboardNavToggle:'keyboardNav',nativeKeyboardToggle:'nativeKeyboard'};Object.entries(pairs).forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.checked=Boolean(p[key]);});const cv=document.getElementById('colorVisionSelect');if(cv)cv.value=p.colorVision;const out=document.getElementById('fontScaleOut');if(out)out.textContent=`${Math.round(p.fontScale*100)}%`;},

    applyViewPrefs(){if(!this.engine)return;const p=this.viewPrefs;this.engine.showGrid=p.grid;this.engine.showMinorGrid=p.minorGrid;this.engine.showAxes=p.axes;this.engine.showLabels=p.labels;this.engine.showCoordinates=p.coords;this.engine.showPointValues=p.pointValues!==false;this.syncViewControls();},
    bindVisualization(){idListen('settingsBtn','click',()=>{this.syncViewControls();this.openModal('visualizationSheet');});const pairs=[['visGridToggle','showGrid','grid'],['visMinorGridToggle','showMinorGrid','minorGrid'],['visAxesToggle','showAxes','axes'],['visLabelsToggle','showLabels','labels'],['coordsToggle','showCoordinates','coords'],['visPointValuesToggle','showPointValues','pointValues']];pairs.forEach(([id,prop,pref])=>idListen(id,'change',(e)=>{this.engine[prop]=e.target.checked;this.viewPrefs[pref]=e.target.checked;this.saveViewPrefs();this.syncViewControls();this.engine.requestRender();}));idListen('snapSelect','change',(e)=>{this.viewPrefs.snap=e.target.value;this.saveViewPrefs();});idListen('equalScaleToggle','change',(e)=>{e.target.checked=true;this.showToast('A escala proporcional permanece ativa nesta versão de teste; a escala independente será fechada junto ao motor de visualização.');});idListen('restoreViewBtn','click',()=>{this.viewPrefs={grid:true,minorGrid:true,axes:true,labels:true,equalScale:true,coords:true,pointValues:true,snap:'off'};this.applyViewPrefs();this.saveViewPrefs();this.engine.center();this.showToast('Visualização restaurada.');});},
    syncViewControls(){const set=(id,v)=>{const el=document.getElementById(id);if(el)el.checked=Boolean(v);};set('visGridToggle',this.engine.showGrid);set('visMinorGridToggle',this.engine.showMinorGrid);set('visAxesToggle',this.engine.showAxes);set('visLabelsToggle',this.engine.showLabels);set('coordsToggle',this.engine.showCoordinates);set('visPointValuesToggle',this.engine.showPointValues);set('equalScaleToggle',true);const snap=document.getElementById('snapSelect');if(snap)snap.value=this.viewPrefs.snap||'off';const gb=document.getElementById('gridBtn'),ab=document.getElementById('axesBtn');gb?.classList.toggle('active',this.engine.showGrid);gb?.setAttribute('aria-pressed',String(this.engine.showGrid));ab?.classList.toggle('active',this.engine.showAxes);ab?.setAttribute('aria-pressed',String(this.engine.showAxes));},

    updateGraphDescription(){if(!this.a11yPrefs?.graphDescription){this.engine.canvas.setAttribute('aria-label','Plano cartesiano interativo do OrbisV.');return;}const visible=this.objects.visible,types=visible.reduce((m,o)=>(m[o.type]=(m[o.type]||0)+1,m),{}),desc=Object.entries(types).map(([t,n])=>`${n} ${this.objectTypeLabel({type:t})}`).join(', ');this.engine.canvas.setAttribute('aria-label',`Plano cartesiano interativo do OrbisV. ${visible.length} objeto(s) visível(is)${desc?`: ${desc}`:''}.`);},
    toggleFullscreen(){if(!document.fullscreenElement)this.$.shell.requestFullscreen?.();else document.exitFullscreen?.();},
    showToast(message,error=false){clearTimeout(this.toastTimer);this.$.toast.textContent=message;this.$.toast.className=`toast show${error?' error':''}`;this.toastTimer=setTimeout(()=>this.$.toast.className='toast',3000);},announce(message){const r=document.getElementById('liveRegion');r.textContent='';setTimeout(()=>r.textContent=message,10);},fmt(n){return MathEngine.formatNumber(Number(n),4);},escape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
    getPath(obj,path){return String(path).split('.').reduce((a,k)=>a?.[k],obj);},setPath(obj,path,value){const keys=String(path).split('.');let cur=obj;for(let i=0;i<keys.length-1;i+=1){const k=keys[i];if(cur[k]===undefined)cur[k]={};cur=cur[k];}cur[keys.at(-1)]=value;},
  };

  function idListen(id,event,handler){document.getElementById(id)?.addEventListener(event,handler);}
  global.AppUI=AppUI;
})(window);
