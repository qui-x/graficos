(function (global) {
  'use strict';

  const colors = ['#5ac8fa','#b28cff','#ff6fae','#63d391','#ffd166','#ff9f66','#78a7ff','#d29bff'];
  const symbols = [['π','pi'],['√','sqrt('],['x²','^2'],['x³','^3'],['×','*'],['÷','/'],['·','*'],['sen','sen('],['cos','cos('],['tan','tan('],['arcsen','arcsen('],['arccos','arccos('],['arctg','arctg('],['log','log('],['ln','ln('],['|x|','abs('],['eˣ','exp('],['τ','tau'],['φ','phi'],['(', '('],[')', ')']];
  const menuHtml = symbols.map(([label, value]) => `<button type="button" data-insert="${value}" aria-label="Inserir ${label}">${label}</button>`).join('');
  const ICON = Object.freeze({ hide: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>', show: '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M3 12s3-5.5 9-5.5 9 5.5 9 5.5-3 5.5-9 5.5S3 12 3 12z" fill="none" stroke="currentColor" stroke-width="2"/></svg>' });

  const AppUI = {
    objects: null, engine: null, history: [], activeTab: 'function', editingId: null, statusTimer: null, toastTimer: null, deferredInstallPrompt: null, lineLiveCommitted: false,
    init(objects, engine) {
      this.objects = objects; this.engine = engine; this.cache();
      // Configurações extras é um modal global e não depende da barra de controles.
      if (this.$?.extrasModal && this.$.extrasModal.parentElement !== document.body) {
        document.body.appendChild(this.$.extrasModal);
      }
      this.buildMenus(); this.bindTabs(); this.bindForms(); this.initGeometryFields(); this.bindObjectEvents(); this.history=[]; this.renderHistory(); this.renderObjects(); this.updatePreviews(); this.updateVectorResult(); this.updateUndoButtons(); this.updateEmptyState(); this.initPWAInstall(); this.syncVariableConfig(false); this.initMobileLayout();
    },
    initMobileLayout() {
      const apply = () => {
        const mobile = global.innerWidth < 900;
        if (!mobile) {
          this.$.controls?.classList.remove('open');
          this.$.controls?.classList.remove('collapsed');
          this.$.workspace?.classList.remove('sidebar-collapsed','sidebar-modes-collapsed','controls-collapsed');
          this.$.backdrop?.classList.remove('show');
          this.$.backdrop?.classList.add('hidden');
          this.$.mobileMenuBtn?.classList.add('hidden');
          this.$.mobileModesBtn?.classList.add('hidden');
          this.$.mobileControlsBtn?.classList.add('hidden');
          this.hideShowControlsButton();
                    this.updateSidebarButtons(false);
          const modesCollapsed = this.$.workspace?.classList.contains('sidebar-modes-collapsed');
          return;
        }
        this.$.workspace?.classList.remove('sidebar-collapsed','sidebar-modes-collapsed','controls-collapsed');
        this.$.controls?.classList.remove('collapsed');
        this.$.modeSidebar?.classList.remove('mobile-open');
        this.$.mobileModesBtn?.classList.remove('hidden');
        this.$.mobileControlsBtn?.classList.remove('hidden');
        this.updateModeMobileButton(false);
        this.updateMobileControlsButton(false);
        this.closeSidebar(false);
      };
      apply();
      const recalibrate = () => { this.engine?.resize?.(); this.engine?.requestRender?.(); };
      requestAnimationFrame(() => requestAnimationFrame(recalibrate));
      const onViewportChange = () => { apply(); requestAnimationFrame(() => requestAnimationFrame(recalibrate)); };
      global.addEventListener('resize', onViewportChange, { passive: true });
      global.addEventListener('orientationchange', onViewportChange, { passive: true });
    },
    hideShowControlsButton() {
      const btn = this.$?.showControls;
      if (!btn) return;
      if (document.activeElement === btn) btn.blur();
      btn.classList.add('hidden');
      btn.inert = true;
    },
    showShowControlsButton() {
      const btn = this.$?.showControls;
      if (!btn) return;
      btn.inert = false;
      btn.classList.remove('hidden');
    },
    updateSidebarButtons(collapsed) {
      const mobile = global.innerWidth < 900;
      const left = this.$?.controlsCollapse?.querySelector('.controls-arrow-left');
      const right = this.$?.controlsCollapse?.querySelector('.controls-arrow-right');
      left?.classList.toggle('hidden', !collapsed);
      right?.classList.toggle('hidden', collapsed);
      this.$?.controlsCollapse?.setAttribute('aria-pressed', String(collapsed));
      this.$?.controlsCollapse?.setAttribute('aria-label', collapsed ? 'Mostrar controles' : 'Recolher controles');
      this.$?.controlsCollapse?.setAttribute('title', collapsed ? 'Mostrar controles' : 'Recolher controles');
      if (mobile) {
        this.updateMobileControlsButton(this.$?.controls?.classList.contains('open'));
      } else {
        collapsed ? this.showShowControlsButton() : this.hideShowControlsButton();
      }
    },
    openModesMobile(redraw=true) {
      const mobile = global.innerWidth < 900;
      if (mobile) {
        this.$.controls?.classList.remove('open');
        this.updateMobileControlsButton(false);
        this.$.modeSidebar?.classList.add('mobile-open');
        this.$.backdrop?.classList.remove('hidden');
        this.$.backdrop?.classList.add('show');
        this.updateModeMobileButton(true);
      } else {
        const collapsed = this.$.workspace?.classList.toggle('sidebar-modes-collapsed');
      }
      if (redraw) requestAnimationFrame(() => requestAnimationFrame(() => { this.engine.resize(); this.engine.requestRender(); }));
    },
    closeModesMobile(redraw=true) {
      this.$.modeSidebar?.classList.remove('mobile-open');
      if (!this.$.controls?.classList.contains('open')) { this.$.backdrop?.classList.remove('show'); this.$.backdrop?.classList.add('hidden'); }
      this.updateModeMobileButton(false);
      if (redraw) requestAnimationFrame(() => requestAnimationFrame(() => { this.engine.resize(); this.engine.requestRender(); }));
    },
    updateModeMobileButton(open) {
      this.$.mobileModesBtn?.setAttribute('aria-expanded', String(open));
      this.$.mobileModesBtn?.setAttribute('aria-label', open ? 'Fechar modos' : 'Abrir modos');
      this.$.mobileModesBtn?.setAttribute('title', open ? 'Fechar modos' : 'Modos');
      this.$.mobileModesBtn?.querySelector('.panel-menu-icon')?.classList.toggle('hidden', open);
      this.$.mobileModesBtn?.querySelector('.panel-close-icon')?.classList.toggle('hidden', !open);
    },
    updateMobileControlsButton(open) {
      this.$.mobileControlsBtn?.setAttribute('aria-expanded', String(open));
      this.$.mobileControlsBtn?.setAttribute('aria-label', open ? 'Fechar controles' : 'Abrir controles');
      this.$.mobileControlsBtn?.setAttribute('title', open ? 'Fechar controles' : 'Controles');
    },
    openSidebar(redraw=true) {
      const mobile = global.innerWidth < 900;
      if (mobile) {
        this.$.modeSidebar?.classList.remove('mobile-open');
        this.updateModeMobileButton(false);
        this.$.controls?.classList.add('open');
        this.$.backdrop?.classList.remove('hidden');
        this.$.backdrop?.classList.add('show');
        this.$.mobileMenuBtn?.classList.add('hidden');
        this.hideShowControlsButton();
        this.updateMobileControlsButton(true);
        this.updateSidebarButtons(false);
        requestAnimationFrame(()=>this.focusFirstSidebarControl());
      } else {
        this.$.workspace?.classList.remove('controls-collapsed');
        this.$.controls?.classList.remove('collapsed');
        this.hideShowControlsButton();
        this.updateSidebarButtons(false);
      }
      if (redraw) requestAnimationFrame(() => requestAnimationFrame(() => { this.engine.resize(); this.engine.requestRender(); }));
    },
    closeSidebar(redraw=true) {
      const mobile = global.innerWidth < 900;
      if (mobile) {
        this.$.controls?.classList.remove('open');
        this.$.backdrop?.classList.remove('show');
        this.$.backdrop?.classList.add('hidden');
        this.$.mobileMenuBtn?.classList.remove('hidden');
        this.updateMobileControlsButton(false);
        this.updateSidebarButtons(true);
      } else {
        this.$.workspace?.classList.add('controls-collapsed');
        this.$.controls?.classList.add('collapsed');
        this.showShowControlsButton();
                this.updateSidebarButtons(true);
      }
      if (redraw) requestAnimationFrame(() => requestAnimationFrame(() => { this.engine.resize(); this.engine.requestRender(); }));
    },

    toggleSidebar() {
      const mobile = global.innerWidth < 900;
      if (mobile) {
        this.$.controls?.classList.contains('open') ? this.closeSidebar() : this.openSidebar();
      } else {
        const collapsed = this.$.workspace?.classList.contains('sidebar-modes-collapsed');
        collapsed ? this.openModesMobile() : this.closeModesMobile();
      }
    },
    toggleControlsSidebar() {
      const mobile = global.innerWidth < 900;
      if (mobile) {
        this.$.controls?.classList.contains('open') ? this.closeSidebar() : this.openSidebar();
      } else {
        this.$.workspace?.classList.contains('controls-collapsed') ? this.openSidebar() : this.closeSidebar();
      }
    },
    openExtrasModal() {
      const modal=this.$?.extrasModal;
      if(!modal) return;
      this._extrasReturnFocus=document.activeElement;
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden','false');
      document.body.classList.add('modal-open');
      requestAnimationFrame(()=>this.$?.closeExtrasModalBtn?.focus());
    },
    closeExtrasModal() {
      const modal=this.$?.extrasModal;
      if(!modal) return;
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden','true');
      document.body.classList.remove('modal-open');
      this._extrasReturnFocus?.focus?.();
      this._extrasReturnFocus=null;
    },
    focusFirstSidebarControl() {
      const root=this.$?.controls; if(!root) return;
      const first=root.querySelector('input:not([disabled]), select:not([disabled]), button:not([disabled]), [tabindex=\"0\"]');
      first?.focus();
    },
    handleSidebarKeydown(event) {
      const modal=this.$?.extrasModal;
      if(modal && !modal.classList.contains('hidden')) {
        if(event.key==='Escape') { event.preventDefault(); this.closeExtrasModal(); return; }
        if(event.key==='Tab') {
          const items=[...modal.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex=\"0\"]')];
          if(items.length) {
            const first=items[0], last=items[items.length-1];
            if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
            else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
          }
          return;
        }
      }
      if(event.key!=='Escape') return;
      const mobile=global.innerWidth<900;
      const open=mobile ? this.$?.controls?.classList.contains('open') : !this.$?.workspace?.classList.contains('controls-collapsed');
      if(open) { event.preventDefault(); this.closeSidebar(); this.$?.mobileModesBtn?.focus(); }
    },
    getConfiguredVariableNames() {
      const selected = this.$?.variableOptions?.filter((el) => el.checked).map((el) => el.value) || [];
      const custom = String(this.$?.customVariables?.value || '')
        .split(/[,;\s]+/)
        .map((name) => name.trim().toLowerCase())
        .filter(Boolean);
      return [...new Set([...selected, ...custom])];
    },
    syncVariableConfig(showFeedback=false) {
      try {
        const names = this.getConfiguredVariableNames();
        if (!names.length) throw new Error('Selecione pelo menos uma variável.');
        MathEngine.setDefaultVariables(names);
        if (this.$.variablesSummary) {
          this.$.variablesSummary.textContent = `Variáveis ativas: ${names.join(', ')}`;
        }
        this.$?.variableOptions?.forEach((el) => {
          el.closest('.variable-check')?.classList.toggle('active', el.checked);
        });
        if (this.$?.customVariables) this.$.customVariables.classList.remove('invalid');
        if (showFeedback) this.showToast(`Variáveis atualizadas: ${names.join(', ')}`);
        this.engine?.invalidateCache?.('variables');
        this.engine?.requestRender?.();
        return true;
      } catch (error) {
        if (this.$?.customVariables) this.$.customVariables.classList.add('invalid');
        this.showError(error);
        return false;
      }
    },
    getDefaultVariablesBase() {
      const vars = {};
      const names = MathEngine.defaultVariables || ['x','y','z','t'];
      for (const name of names) vars[name] = 0;
      return vars;
    },
    getDefaultVariables() {
      return { ...this.getDefaultVariablesBase(), ...this.getParameterValues() };
    },
    escapeHtml(value) { return String(value).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); },
    cache() {
      this.lastMathInputId='functionExpr';
      this.$ = { variableOptions:[...document.querySelectorAll('.variable-option')], customVariables:document.getElementById('customVariables'), variablesSummary:document.getElementById('variablesSummary'), resetVariables:document.getElementById('resetVariablesBtn'), tabs:[...document.querySelectorAll('.tab')], panels:[...document.querySelectorAll('.tab-panel')], functionExpr:document.getElementById('functionExpr'), functionVariable:document.getElementById('functionVariable'), functionEquationHint:document.getElementById('functionEquationHint'), paramX:document.getElementById('paramX'), paramY:document.getElementById('paramY'), tMin:document.getElementById('tMin'), tMax:document.getElementById('tMax'), surfaceExpr:document.getElementById('surfaceExpr'), surfaceRange:document.getElementById('surfaceRange'), curve3dX:document.getElementById('curve3dX'), curve3dY:document.getElementById('curve3dY'), curve3dZ:document.getElementById('curve3dZ'), curve3dTMin:document.getElementById('curve3dTMin'), curve3dTMax:document.getElementById('curve3dTMax'), line3dX1:document.getElementById('line3dX1'), line3dY1:document.getElementById('line3dY1'), line3dZ1:document.getElementById('line3dZ1'), line3dX2:document.getElementById('line3dX2'), line3dY2:document.getElementById('line3dY2'), line3dZ2:document.getElementById('line3dZ2'), vx1:document.getElementById('vx1'), vy1:document.getElementById('vy1'), vz1:document.getElementById('vz1'), vx2:document.getElementById('vx2'), vy2:document.getElementById('vy2'), vz2:document.getElementById('vz2'), vectorType:document.getElementById('vectorType'), v2x:document.getElementById('v2x'), v2y:document.getElementById('v2y'), v2z:document.getElementById('v2z'), objectsList:document.getElementById('objectsList'), historyList:document.getElementById('historyList'), geometryType:document.getElementById('geometryType'), geometryFields:document.getElementById('geometryFields'), status:document.getElementById('statusText'), emptyState:document.getElementById('emptyState'), coordinate:document.getElementById('coordinateReadout'), toast:document.getElementById('toast'), addFunction:document.getElementById('addFunctionBtn'), addParam:document.getElementById('addParamBtn'), addSurface:document.getElementById('addSurfaceBtn'), addCurve3D:document.getElementById('addCurve3DBtn'), addLine3D:document.getElementById('addLine3DBtn'), addVector:document.getElementById('addVectorBtn'), addGeometry:document.getElementById('addGeometryBtn'), clearObjects:document.getElementById('clearObjectsBtn'), clearHistory:document.getElementById('clearHistoryBtn'), undo:document.getElementById('undoBtn'), redo:document.getElementById('redoBtn'), showControls:document.getElementById('showControlsBtn'), backdrop:document.getElementById('backdrop'), mobileMenuBtn:document.getElementById('mobileMenuBtn'), closeControls:document.getElementById('closeControlsBtn'), saveSessionBtn:document.getElementById('saveSessionBtn'), panelAdd:document.getElementById('panelAddBtn'), install:document.getElementById('installBtn'), exportBtn:document.getElementById('exportBtn'), exportSvgBtn:document.getElementById('exportSvgBtn'), extrasBtn:document.getElementById('extrasBtn'), extrasModal:document.getElementById('extrasModal'), closeExtrasModalBtn:document.getElementById('closeExtrasModalBtn'), extraGridBtn:document.getElementById('extraGridBtn'), extraAxesBtn:document.getElementById('extraAxesBtn'), extraResetViewBtn:document.getElementById('extraResetViewBtn'), extraSaveBtn:document.getElementById('extraSaveBtn'), extraClearBtn:document.getElementById('extraClearBtn'), modeButtons:[...document.querySelectorAll('.mode-btn')], modeSidebar:document.querySelector('.mode-sidebar'), modeCollapse:document.getElementById('modeCollapseBtn'), controlsCollapse:document.getElementById('controlsCollapseBtn'), mobileMore:document.getElementById('mobileMoreBtn'), mobileModesBtn:document.getElementById('mobileModesBtn'), mobileControlsBtn:document.getElementById('mobileControlsBtn'), controls:document.querySelector('.controls-panel'), workspace:document.querySelector('.workspace'), shell:document.querySelector('.app-shell') };
    },
    buildMenus() {
      const menus = [...document.querySelectorAll('.math-menu')];
      const globalMenu = document.getElementById('globalMathMenu');
      const globalBtn = document.getElementById('globalMathBtn');
      this.mathMenuOpen = false;
      this.lastMathMenuAnchor = null;

      menus.forEach((m) => {
        if (m === globalMenu) return;
        m.innerHTML = '';
        m.classList.add('hidden');
      });
      if (!globalMenu || !globalBtn) return;

      globalMenu.innerHTML = menuHtml;
      globalMenu.classList.add('hidden');
      globalMenu.classList.remove('floating-math-menu');
      globalMenu.style.display = '';

      const setButtonState = (open) => {
        globalBtn.setAttribute('aria-expanded', String(open));
        globalBtn.classList.toggle('is-active', open);
      };

      const closeGlobalMenu = () => {
        this.mathMenuOpen = false;
        globalMenu.classList.add('hidden');
        setButtonState(false);
        this.lastMathMenuAnchor = null;
      };

      const positionMenu = (anchor) => {
        const r = anchor.getBoundingClientRect();
        const width = Math.min(320, Math.max(220, window.innerWidth - 24));
        let left = Math.min(r.right - width, window.innerWidth - width - 12);
        left = Math.max(12, left);
        const maxHeight = Math.min(420, window.innerHeight - 24);
        let top = r.bottom + 6;
        if (top + maxHeight > window.innerHeight - 12) top = Math.max(12, r.top - maxHeight - 6);
        globalMenu.classList.add('floating-math-menu');
        globalMenu.style.position = 'fixed';
        globalMenu.style.width = `${width}px`;
        globalMenu.style.left = `${left}px`;
        globalMenu.style.right = 'auto';
        globalMenu.style.top = `${top}px`;
        globalMenu.style.maxHeight = `${maxHeight}px`;
      };

      const openGlobalMenu = (anchor = globalBtn) => {
        this.mathMenuOpen = true;
        globalMenu.classList.remove('hidden');
        setButtonState(true);
        this.lastMathMenuAnchor = anchor;
        positionMenu(anchor);
      };

      const toggleGlobalMenu = (anchor = globalBtn) => {
        if (this.mathMenuOpen && !globalMenu.classList.contains('hidden')) {
          closeGlobalMenu();
          return;
        }
        openGlobalMenu(anchor);
      };

      globalBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleGlobalMenu(globalBtn);
      });

      document.querySelectorAll('.dropdown-btn').forEach((btn) => btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.lastMathInputId = btn.closest('.math-editor')?.querySelector('.math-input')?.id || this.lastMathInputId;
        if (this.mathMenuOpen && this.lastMathMenuAnchor === btn) {
          closeGlobalMenu();
        } else {
          openGlobalMenu(btn);
        }
      }));

      globalMenu.querySelectorAll('[data-insert]').forEach((button) => button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.insertAtActive(button.dataset.insert);
        closeGlobalMenu();
      }));

      document.addEventListener('click', (event) => {
        if (this.mathMenuOpen && !globalMenu.contains(event.target) && !globalBtn.contains(event.target) && !event.target.closest('.dropdown-btn')) {
          closeGlobalMenu();
        }
      });
      window.addEventListener('resize', closeGlobalMenu, { passive: true });
      window.addEventListener('scroll', closeGlobalMenu, { passive: true });
    },
    setTab(tabName) { this.cancelEdit(); this.activeTab=tabName; this.$.tabs.forEach((t)=>{const active=t.dataset.tab===tabName;t.classList.toggle('active',active);t.setAttribute('aria-selected',String(active));}); this.$.modeButtons?.forEach((t)=>{const active=t.dataset.mode===tabName;t.classList.toggle('active',active);t.setAttribute('aria-current',active?'true':'false');}); this.$.panels.forEach((p)=>{const active=p.dataset.panel===tabName;p.classList.toggle('active',active);p.hidden=!active;}); this.updatePreviews(); this.updateActionBar(); },
    bindTabs() {
      const tabs = this.$?.tabs || [];
      tabs.forEach((tab) => {
        tab.addEventListener('click', () => this.setTab(tab.dataset.tab));
        tab.addEventListener('keydown', (event) => {
          if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); this.moveTab(1); }
          else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); this.moveTab(-1); }
          else if (event.key === 'Home') { event.preventDefault(); tabs[0]?.focus(); this.setTab(tabs[0]?.dataset.tab); }
          else if (event.key === 'End') { event.preventDefault(); tabs[tabs.length - 1]?.focus(); this.setTab(tabs[tabs.length - 1]?.dataset.tab); }
        });
      });
      this.$?.modeButtons?.forEach((button) => {
        button.addEventListener('click', () => this.setTab(button.dataset.mode));
      });
    },

    bindForms() {
      ['functionExpr','paramX','paramY','tMin','tMax','surfaceExpr','surfaceRange','curve3dX','curve3dY','curve3dZ','curve3dTMin','curve3dTMax','line3dX1','line3dY1','line3dZ1','line3dX2','line3dY2','line3dZ2'].forEach(id=>document.getElementById(id).addEventListener('input',()=>{this.normalizeInput(id);this.updatePreviews();this.validateExpressionField(document.getElementById(id));}));
      document.querySelectorAll('input').forEach((input)=>input.addEventListener('focus',()=>{this.lastMathInputId=input.id;}));
      document.querySelectorAll('.clear-field-btn').forEach((btn)=>btn.addEventListener('click',()=>this.clearField(btn.dataset.clear)));
      document.querySelectorAll('.numeric-input').forEach((input)=>{input.addEventListener('input',()=>this.validateNumericField(input));this.validateNumericField(input);});
      this.$.variableOptions.forEach((el)=>el.addEventListener('change',()=>this.syncVariableConfig(true))); this.$.customVariables.addEventListener('input',()=>{clearTimeout(this.variableTimer);this.variableTimer=setTimeout(()=>this.syncVariableConfig(),180);}); this.$.resetVariables.addEventListener('click',()=>{this.$.variableOptions.forEach((el)=>{el.checked=['x','y','z','t'].includes(el.value);});this.$.customVariables.value='';this.syncVariableConfig(true);});
      this.$.addFunction.addEventListener('click',()=>this.addFunction()); this.$.functionVariable?.addEventListener('change',()=>{this.updateFunctionEquationHint(); this.updatePreviews(); this.validateExpressionField(this.$.functionExpr); this.engine?.invalidateCache?.('function-variable'); this.engine?.requestRender?.();}); this.$.addParam.addEventListener('click',()=>this.addParametric()); this.$.addSurface?.addEventListener('click',()=>this.addSurface()); this.$.addCurve3D?.addEventListener('click',()=>this.addCurve3D()); this.$.addLine3D?.addEventListener('click',()=>this.addLine3D()); this.$.addVector.addEventListener('click',()=>this.addVector());
      ['vx1','vy1','vz1','vx2','vy2','vz2','v2x','v2y','v2z'].forEach(id=>document.getElementById(id).addEventListener('input',(e)=>{this.updateVectorResult();this.validateExpressionField(e.currentTarget);}));
      document.getElementById('dotBtn').addEventListener('click',()=>this.vectorOperation('dot')); document.getElementById('crossBtn').addEventListener('click',()=>this.vectorOperation('cross'));
      document.getElementById('geometryType').addEventListener('change',()=>{this.cancelEdit();this.initGeometryFields();this.updateGeometryPreview();}); this.$.addGeometry.addEventListener('click',()=>this.addGeometry());
      this.$.clearObjects.addEventListener('click',()=>{this.objects.clear();this.persistSession();}); this.$.clearHistory.addEventListener('click',()=>this.clearHistory()); this.$.undo.addEventListener('click',()=>this.undo()); this.$.redo.addEventListener('click',()=>this.redo());
      document.getElementById('resetViewBtn').addEventListener('click',()=>this.engine.center()); document.getElementById('reset3DBtn')?.addEventListener('click',()=>{this.engine.rotationX=0.62;this.engine.rotationY=0.78;this.engine.projectionScale=1;this.engine.requestRender();this.showToast('Orientação 3D restaurada.');}); document.getElementById('gridBtn').addEventListener('click',(e)=>{this.engine.showGrid=!this.engine.showGrid;e.currentTarget.setAttribute('aria-pressed',String(this.engine.showGrid));this.engine.requestRender();}); document.getElementById('axesBtn').addEventListener('click',(e)=>{this.engine.showAxes=!this.engine.showAxes;e.currentTarget.setAttribute('aria-pressed',String(this.engine.showAxes));this.engine.requestRender();});
      this.$.exportBtn?.addEventListener('click',()=>this.engine.exportPng()); this.$.exportSvgBtn?.addEventListener('click',()=>this.engine.exportSvg());
      this.$.extrasBtn?.addEventListener('click',()=>this.openExtrasModal());
      this.$.closeExtrasModalBtn?.addEventListener('click',()=>this.closeExtrasModal());
      this.$.extrasModal?.addEventListener('click',(event)=>{ if(event.target.matches('[data-close-extras=\"true\"]')) this.closeExtrasModal(); });
      this.$.extraGridBtn?.addEventListener('click',()=>{ this.engine.showGrid=!this.engine.showGrid; this.engine.requestRender(); });
      this.$.extraAxesBtn?.addEventListener('click',()=>{ this.engine.showAxes=!this.engine.showAxes; this.engine.requestRender(); });
      this.$.extraResetViewBtn?.addEventListener('click',()=>this.engine.center());
      this.$.extraSaveBtn?.addEventListener('click',()=>{this.persistSession();this.showToast('Sessão salva.');});
      this.$.extraClearBtn?.addEventListener('click',()=>this.$.clearObjects?.click());
      document.querySelectorAll('.quick-grid').forEach((grid)=>grid.addEventListener('click',(e)=>{const btn=e.target.closest('[data-token]');if(btn)this.insertText(btn.dataset.token,grid.dataset.target);}));
      this.$.mobileMore?.addEventListener('click',()=>{const open=this.$.modeSidebar.classList.toggle('mobile-expanded');this.$.mobileMore.setAttribute('aria-expanded',String(open));requestAnimationFrame(()=>requestAnimationFrame(()=>{this.engine.resize();this.engine.requestRender();}));});
      this.$.modeCollapse?.addEventListener('click',()=>{const c=this.$.workspace.classList.toggle('sidebar-modes-collapsed'); this.$.modeCollapse.setAttribute('aria-pressed',String(c)); this.$.modeCollapse.setAttribute('aria-label',c?'Expandir barra de modos':'Recolher barra de modos'); this.$.modeCollapse.setAttribute('title',c?'Expandir barra de modos':'Recolher barra de modos'); requestAnimationFrame(()=>requestAnimationFrame(()=>{this.engine.resize();this.engine.requestRender();}));});
      this.$.mobileModesBtn?.addEventListener('click',()=>{ const open=this.$.modeSidebar?.classList.contains('mobile-open'); open?this.closeModesMobile():this.openModesMobile(); });
      this.$.mobileControlsBtn?.addEventListener('click',()=>this.toggleControlsSidebar());
      this.$.controlsCollapse?.addEventListener('click',()=>this.toggleControlsSidebar());
      this.$.closeControls?.addEventListener('click',()=>this.closeSidebar());
      this.$.backdrop?.addEventListener('click',()=>{this.closeSidebar(false);this.closeModesMobile(false);this.engine.resize();this.engine.requestRender();});
      this.$.mobileMenuBtn?.addEventListener('click',()=>this.openSidebar());
      this.$.saveSessionBtn?.addEventListener('click',()=>{this.persistSession();this.showToast('Sessão salva.');}); this.$.panelAdd?.addEventListener('click',()=>this.addActiveTab());
      global.addEventListener('keydown',(event)=>this.handleSidebarKeydown?.(event));
      this.$.showControls?.addEventListener('click',()=>this.toggleControlsSidebar());
      document.querySelectorAll('[data-tooltip]').forEach((el)=>el.setAttribute('title',el.dataset.tooltip));
      this.bindKeyboard();
    },
    bindObjectEvents() { this.objects.onChange=()=>{this.renderObjects();this.engine.invalidateCache();this.engine.requestRender();this.updateUndoButtons();this.updateEmptyState();this.persistSession();}; },
    bindKeyboard() {
      document.addEventListener('keydown',(e)=>{
        const tag=document.activeElement?.tagName;
        if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?this.redo():this.undo();return;}
        if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();this.redo();return;}
        if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='enter'){e.preventDefault();this.addActiveTab();return;}
        if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&tag==='BUTTON'&&document.activeElement?.classList.contains('tab')){e.preventDefault();this.moveTab(e.key==='ArrowRight'?1:-1);return;}
      });
    },
    moveTab(delta){const i=this.$.tabs.findIndex(t=>t.dataset.tab===this.activeTab);const next=(i+delta+this.$.tabs.length)%this.$.tabs.length;this.$.tabs[next].focus();this.setTab(this.$.tabs[next].dataset.tab);},
    updateActionBar(){if(!this.$.panelAdd)return;const labels={function:'Adicionar curva',parametric:'Adicionar curva paramétrica',vector:'Adicionar vetor',geometry:'Adicionar objeto geométrico',surface:'Adicionar superfície',curve3d:'Adicionar curva 3D',line3d:'Adicionar reta 3D'};const editing=Boolean(this.editingId);const label=editing?'Salvar alterações':(labels[this.activeTab]||'Adicionar');const s=this.$.panelAdd.querySelector('.action-label');if(s)s.textContent=label;this.$.panelAdd.setAttribute('aria-label',label);},addActiveTab(){if(this.activeTab==='function')this.addFunction();else if(this.activeTab==='parametric')this.addParametric();else if(this.activeTab==='vector')this.addVector();else if(this.activeTab==='surface')this.addSurface();else if(this.activeTab==='curve3d')this.addCurve3D();else if(this.activeTab==='line3d')this.addLine3D();else this.addGeometry();},
    normalizeInput(id){const input=document.getElementById(id);if(!input)return;const start=input.selectionStart??input.value.length;const before=input.value;const after=before.replace(/pi\b/gi,'π').replace(/tau\b/gi,'τ').replace(/phi\b/gi,'φ').replace(/sqrt\s*\(/gi,'√(').replace(/\^2(?!\d)/g,'²').replace(/\^3(?!\d)/g,'³').replace(/\*/g,'×').replace(/\//g,'÷').replace(/-/g,'−');if(after!==before){input.value=after;const delta=after.length-before.length;const pos=Math.max(0,Math.min(after.length,start+delta));input.setSelectionRange(pos,pos);}},
    toMathEngine(expr){return MathEngine.normalize(expr);},
    toLatex(expr){let s=String(expr??'').trim().replace(/−/g,'-').replace(/π/g,'\\pi').replace(/τ/g,'\\tau').replace(/φ/g,'\\phi').replace(/²/g,'^{2}').replace(/³/g,'^{3}').replace(/×/g,'\\cdot ').replace(/÷/g,'\\div ').replace(/\b(sen|sin)\b/g,'\\operatorname{sen}').replace(/\b(arcsen|asin)\b/g,'\\operatorname{arcsen}').replace(/\b(arccos|acos)\b/g,'\\operatorname{arccos}').replace(/\b(arctg|atan)\b/g,'\\operatorname{arctg}').replace(/\b(cos|tan|sinh|cosh|tanh|log|log2|ln|sqrt|abs|exp|sign)\b/g,'\\$1'); s=this.convertFractionsToLatex(s); s=s.replace(/√\(([^()]*)\)/g,'\\sqrt{$1}'); return s||'\\;';},
    convertFractionsToLatex(s){let out=s;for(let i=0;i<3;i++){out=out.replace(/\(([^()]+)\)\s*\\div\s*\(([^()]+)\)/g,'\\frac{$1}{$2}').replace(/\b([0-9]+(?:\.[0-9]+)?)\s*\\div\s*([0-9]+(?:\.[0-9]+)?)/g,'\\frac{$1}{$2}');}return out;},
    renderKatex(target,expr){const el=document.getElementById(target);if(!el)return;const safe=this.escapeHtml(this.display(String(expr??'')));el.innerHTML=`<span class="math-fallback">${safe}</span>`;el.classList.add('math-preview-fallback');},
    getFunctionVariable(){return this.$.functionVariable?.value==='y'?'y':'x'},
    updateFunctionEquationHint(){const v=this.getFunctionVariable(); const hint=v==='y'?'x = f(y)':'y = f(x)'; if(this.$.functionEquationHint)this.$.functionEquationHint.textContent=hint; this.$.functionExpr?.setAttribute('aria-label',`Expressão da função em ${v}`);},
    updatePreviews(){const v=this.getFunctionVariable(); const lhs=v==='y'?'x':'y'; this.renderKatex('functionPreview',`${lhs} = f(${v}) = ${this.$.functionExpr.value}`);this.renderKatex('paramPreview',`x(t) = ${this.$.paramX.value}, y(t) = ${this.$.paramY.value}`);this.updateGeometryPreview();if(this.$.surfaceExpr)this.renderKatex('surfacePreview',`z = ${this.$.surfaceExpr.value}`);if(this.$.curve3dX)this.renderKatex('curve3dPreview',`(x(t), y(t), z(t)) = (${this.$.curve3dX.value}, ${this.$.curve3dY.value}, ${this.$.curve3dZ.value})`);if(this.$.line3dX1)this.renderKatex('line3dPreview',`P_1=(${this.$.line3dX1.value},${this.$.line3dY1.value},${this.$.line3dZ1.value}), P_2=(${this.$.line3dX2.value},${this.$.line3dY2.value},${this.$.line3dZ2.value})`);},
    insertText(token,target){const input=document.getElementById(target);if(!input)return;const start=input.selectionStart??input.value.length,end=input.selectionEnd??input.value.length;const pretty=token==='pi'?'π':token==='tau'?'τ':token==='phi'?'φ':token==='sqrt('?'√(':token==='*'?'×':token==='/'?'÷':token==='-'?'−':token;input.value=input.value.slice(0,start)+pretty+input.value.slice(end);const pos=start+pretty.length;input.focus();input.setSelectionRange(pos,pos);this.updatePreviews();this.validateExpressionField(input);},
    insertAtActive(token){const candidate=document.activeElement?.classList?.contains('math-input')?document.activeElement.id:this.lastMathInputId;const target=document.getElementById(candidate)||document.getElementById(this.activeTab==='parametric'?'paramX':'functionExpr');this.insertText(token,target.id);},
    clearField(id){const input=document.getElementById(id);if(!input)return;input.value='';this.lastMathInputId=id;input.focus();this.updatePreviews();this.validateExpressionField(input);this.showToast('Campo limpo.');},
    validateNumericField(input){if(!input?.value.trim()){input.classList.remove('valid','invalid');return;}try{this.parseNum(input.value,{pi:Math.PI,tau:2*Math.PI,phi:(1+Math.sqrt(5))/2});input.classList.add('valid');input.classList.remove('invalid');}catch{input.classList.add('invalid');input.classList.remove('valid');}},
    validateExpressionField(input){if(!input?.value.trim()){input.classList.remove('valid','invalid');return;}try{MathEngine.compile(this.toMathEngine(input.value),this.getDefaultVariables());input.classList.add('valid');input.classList.remove('invalid');}catch{input.classList.add('invalid');input.classList.remove('valid');}},
    requireNonEmpty(value, message='Preencha o campo antes de adicionar.') {if(!String(value??'').trim()){this.showToast(message,true);return false;}return true;},
    beginEdit(o){this.cancelEdit();this.setTab(o.type==='function'?'function':o.type==='parametric'?'parametric':o.type==='vector'?'vector':'geometry');this.editingId=o.id;this.lineLiveCommitted=false;if(o.type==='function'){this.$.functionVariable.value=o.data.variable||'x';this.updateFunctionEquationHint();this.$.functionExpr.value=this.display(o.data.expression);}else if(o.type==='parametric'){this.$.paramX.value=this.display(o.data.xExpr);this.$.paramY.value=this.display(o.data.yExpr);this.$.tMin.value=o.data.tMin;this.$.tMax.value=o.data.tMax;}else if(o.type==='vector'){const pts=this.engine.vectorIs3D(o)?this.engine.getVector3DPoints(o):[[o.data.x1||0,o.data.y1||0,o.data.z1||0],[o.data.x2||0,o.data.y2||0,o.data.z2||0]];[['vx1',pts[0][0]],['vy1',pts[0][1]],['vz1',pts[0][2]],['vx2',pts[1][0]],['vy2',pts[1][1]],['vz2',pts[1][2]]].forEach(([id,v])=>document.getElementById(id).value=v);if(this.$.vectorType)this.$.vectorType.value=o.data.arrow===false?'segment':'vector';}else{this.$.geometryType.value=o.type;this.initGeometryFields();this.fillGeometry(o);}this.$.addFunction.textContent=o.type==='function'?'Salvar alterações':'Adicionar curva';this.$.addParam.textContent=o.type==='parametric'?'Salvar alterações':'Adicionar curva paramétrica';this.$.addVector.textContent=o.type==='vector'?'Salvar alterações':'Adicionar vetor';this.$.addGeometry.textContent=['line','circle','ellipse','point'].includes(o.type)?'Salvar alterações':'Adicionar objeto geométrico';if(o.type==='surface'){this.setTab('surface');this.$.surfaceExpr.value=this.display(o.data.expression);this.$.surfaceRange.value=o.data.range||5;this.editingId=o.id;this.$.addSurface.textContent='Salvar alterações';}else if(o.type==='curve3d'){this.setTab('curve3d');this.$.curve3dX.value=this.display(o.data.xExpr);this.$.curve3dY.value=this.display(o.data.yExpr);this.$.curve3dZ.value=this.display(o.data.zExpr);this.$.curve3dTMin.value=o.data.tMin;this.$.curve3dTMax.value=o.data.tMax;this.editingId=o.id;this.$.addCurve3D.textContent='Salvar alterações';}else if(o.type==='line3d'){this.setTab('line3d');['line3dX1','line3dY1','line3dZ1','line3dX2','line3dY2','line3dZ2'].forEach((id,i)=>document.getElementById(id).value=[...o.data.p1,...o.data.p2][i]);this.editingId=o.id;this.$.addLine3D.textContent='Salvar alterações';}this.updatePreviews();this.showToast('Objeto carregado para edição.');},
    cancelEdit(){this.editingId=null;this.$.addFunction.textContent='Adicionar curva';this.$.addParam.textContent='Adicionar curva paramétrica';this.$.addVector.textContent='Adicionar vetor';this.$.addGeometry.textContent='Adicionar objeto geométrico';if(this.$.addSurface)this.$.addSurface.textContent='Adicionar superfície';if(this.$.addCurve3D)this.$.addCurve3D.textContent='Adicionar curva 3D';if(this.$.addLine3D)this.$.addLine3D.textContent='Adicionar reta 3D';this.updateActionBar?.();},
    addFunction(){if(!this.requireNonEmpty(this.$.functionExpr.value,'Digite uma função, por exemplo x² + sen(x).'))return;const expr=this.toMathEngine(this.$.functionExpr.value);const variable=this.getFunctionVariable();try{MathEngine.compile(expr,{...this.getDefaultVariables(),[variable]:0});if(this.editingId){this.objects.update(this.editingId,{expression:expr,variable});this.showToast('Curva atualizada.');}else{const obj=this.objects.add('function',{expression:expr,variable},colors[this.objects.items.length%colors.length]);const lhs=variable==='y'?'x':'y';this.addHistory(`${lhs} = f(${variable}) = ${this.$.functionExpr.value}`,obj);this.showToast('Curva adicionada.');}this.cancelEdit();}catch(e){this.showError(e);}},
    addParametric(){if(!this.requireNonEmpty(this.$.paramX.value,'Preencha x(t).')||!this.requireNonEmpty(this.$.paramY.value,'Preencha y(t).'))return;const xExpr=this.toMathEngine(this.$.paramX.value),yExpr=this.toMathEngine(this.$.paramY.value);try{const tMin=this.parseNum(this.$.tMin.value,{pi:Math.PI}),tMax=this.parseNum(this.$.tMax.value,{pi:Math.PI});MathEngine.compile(xExpr,this.getDefaultVariables());MathEngine.compile(yExpr,this.getDefaultVariables());if(!(tMax>tMin))throw new Error('t máx. deve ser maior que t mín.');const data={xExpr,yExpr,tMin,tMax};if(this.editingId){this.objects.update(this.editingId,data);this.showToast('Curva paramétrica atualizada.');}else{const obj=this.objects.add('parametric',data,colors[this.objects.items.length%colors.length]);this.addHistory(`x(t) = ${this.$.paramX.value}, y(t) = ${this.$.paramY.value}`,obj);this.showToast('Curva paramétrica adicionada.');}this.cancelEdit();}catch(e){this.showError(e);}},
    parseNum(v,vars){const normalized=this.toMathEngine(String(v));if(!normalized.trim())throw new Error('Valor numérico vazio.');const n=Number(normalized);const value=Number.isFinite(n)?n:MathEngine.evalExpr(normalized,vars || this.getDefaultVariables());if(!Number.isFinite(value))throw new Error('Valor numérico inválido. Use, por exemplo, 1,5 ou 2·π.');return value;},
    addVector(){try{const rawP1=[this.$.vx1.value,this.$.vy1.value,this.$.vz1.value],rawP2=[this.$.vx2.value,this.$.vy2.value,this.$.vz2.value];const p1=rawP1.map(v=>this.parseNum(v)),p2=rawP2.map(v=>this.parseNum(v));if(p1.every((v,i)=>Math.abs(v-p2[i])<1e-12))throw new Error('Os pontos inicial e final devem ser diferentes.');const arrow=this.$.vectorType?.value!=='segment';const z1=String(rawP1[2]??'').trim(),z2=String(rawP2[2]??'').trim();const is3D=Math.abs(p1[2])>1e-12||Math.abs(p2[2])>1e-12||!/^[+-]?0+(?:[.,]0+)?$/.test(z1)||!/^[+-]?0+(?:[.,]0+)?$/.test(z2);const data={p1:is3D?p1:p1.slice(0,2),p2:is3D?p2:p2.slice(0,2),arrow,is3D};if(this.editingId){this.objects.update(this.editingId,data);this.showToast(arrow?'Vetor atualizado.':'Segmento atualizado.');}else{const obj=this.objects.addVector(data.p1,data.p2,colors[this.objects.items.length%colors.length],{arrow,is3D});this.addHistory(`${arrow?'Vetor':'Segmento'} (${data.p1.join(', ')}) ${arrow?'→':'—'} (${data.p2.join(', ')})`,obj);this.showToast(arrow?'Vetor adicionado.':'Segmento adicionado.');}this.cancelEdit();}catch(e){this.showError(e);}},
    updateVectorResult(){try{const x1=this.parseNum(this.$.vx1.value),y1=this.parseNum(this.$.vy1.value),z1=this.parseNum(this.$.vz1.value),x2=this.parseNum(this.$.vx2.value),y2=this.parseNum(this.$.vy2.value),z2=this.parseNum(this.$.vz2.value);const dx=x2-x1,dy=y2-y1,dz=z2-z1;const is2D=Math.abs(z1)<1e-12&&Math.abs(z2)<1e-12;document.getElementById('vectorResult').textContent=is2D?`v = (${this.fmt(dx)}, ${this.fmt(dy)}) · ‖v‖ = ${this.fmt(Math.hypot(dx,dy))}`:`v = (${this.fmt(dx)}, ${this.fmt(dy)}, ${this.fmt(dz)}) · ‖v‖ = ${this.fmt(Math.hypot(dx,dy,dz))}`;}catch{document.getElementById('vectorResult').textContent='—';}},
    vectorOperation(type){try{const ax=this.parseNum(this.$.vx2.value)-this.parseNum(this.$.vx1.value),ay=this.parseNum(this.$.vy2.value)-this.parseNum(this.$.vy1.value),az=this.parseNum(this.$.vz2.value)-this.parseNum(this.$.vz1.value),bx=this.parseNum(this.$.v2x.value),by=this.parseNum(this.$.v2y.value),bz=this.parseNum(this.$.v2z.value);if(type==='dot'){const r=ax*bx+ay*by+az*bz;document.getElementById('vectorOpsResult').textContent=`v · w = ${this.fmt(r)}`;}else{const cx=ay*bz-az*by,cy=az*bx-ax*bz,cz=ax*by-ay*bx;document.getElementById('vectorOpsResult').textContent=`v × w = (${this.fmt(cx)}, ${this.fmt(cy)}, ${this.fmt(cz)})`;}this.showToast(type==='dot'?'Produto escalar calculado.':'Produto vetorial calculado.');}catch(e){this.showError(e);}},
    fmt(n){return Number(n.toFixed(8)).toString();},
    initGeometryFields(){
      const type=this.$.geometryType.value;
      let html='';
      if(type==='line') {
        html='<div class="line-controls" id="lineControls">'+
          '<div class="line-coef"><label for="ga">a</label><div class="line-value"><input id="ga" class="numeric-input line-number" type="text" value="2" inputmode="decimal"><input id="gaRange" class="line-range" type="range" min="-5" max="5" step="0.1" value="2" aria-label="Coeficiente a"></div></div>'+
          '<div class="line-coef"><label for="gb">b</label><div class="line-value"><input id="gb" class="numeric-input line-number" type="text" value="3" inputmode="decimal"><input id="gbRange" class="line-range" type="range" min="-5" max="5" step="0.1" value="3" aria-label="Coeficiente b"></div></div>'+
          '<div class="line-coef"><label for="gc">c</label><div class="line-value"><input id="gc" class="numeric-input line-number" type="text" value="-6" inputmode="decimal"><input id="gcRange" class="line-range" type="range" min="-10" max="10" step="0.1" value="-6" aria-label="Coeficiente c"></div></div>'+
          '<div class="line-preview" id="linePreview" aria-live="polite"></div>'+
          '<div class="line-actions"><button class="secondary-btn" id="resetLineBtn" type="button">Restaurar valores</button></div>'+
        '</div>';
      } else if(type==='circle') html='<div class="three-col"><label>cx<input id="gcx" class="numeric-input" type="text" value="0"></label><label>cy<input id="gcy" class="numeric-input" type="text" value="0"></label><label>r<input id="gr" class="numeric-input" type="text" value="3"></label></div>';
      else if(type==='ellipse') html='<div class="four-col"><label>cx<input id="ecx" class="numeric-input" type="text" value="0"></label><label>cy<input id="ecy" class="numeric-input" type="text" value="0"></label><label>a<input id="ea" class="numeric-input" type="text" value="4"></label><label>b<input id="eb" class="numeric-input" type="text" value="2"></label></div>';
      else html='<div class="two-col"><label>x<input id="gpx" class="numeric-input" type="text" value="2"></label><label>y<input id="gpy" class="numeric-input" type="text" value="1"></label></div>';
      this.$.geometryFields.innerHTML=html;
      this.$.geometryFields.querySelectorAll('input:not([type="range"])').forEach((i)=>{i.addEventListener('input',()=>{this.validateNumericField(i);if(type==='line')this.syncLineControl(i.id);this.updateGeometryPreview();});this.validateNumericField(i);});
      if(type==='line') this.bindLineControls();
      this.updateGeometryPreview();
    },
    bindLineControls(){
      const map={ga:'gaRange',gb:'gbRange',gc:'gcRange'};
      Object.entries(map).forEach(([numId,rangeId])=>{
        const num=document.getElementById(numId), range=document.getElementById(rangeId);
        if(!num||!range)return;
        range.addEventListener('input',()=>{
          num.value=range.value;
          this.validateNumericField(num);
          this.updateGeometryPreview();
          this.liveUpdateEditingLine();
        });
      });
      document.getElementById('resetLineBtn')?.addEventListener('click',()=>{
        const defaults={ga:'2',gb:'3',gc:'-6'};
        Object.entries(defaults).forEach(([id,value])=>{const num=document.getElementById(id),range=document.getElementById(id+'Range');if(num)num.value=value;if(range)range.value=value;});
        this.updateGeometryPreview();
        this.liveUpdateEditingLine();
      });
    },
    syncLineControl(id){const range=document.getElementById(id+'Range'),num=document.getElementById(id);if(!range||!num)return;const value=this.parseNum(num.value);range.value=String(Math.max(Number(range.min),Math.min(Number(range.max),value)));this.liveUpdateEditingLine();},
    updateLinePreview(){
      const preview=document.getElementById('linePreview'); if(!preview)return;
      try { const a=this.parseNum(document.getElementById('ga').value),b=this.parseNum(document.getElementById('gb').value),c=this.parseNum(document.getElementById('gc').value); if(Math.abs(a)<1e-12&&Math.abs(b)<1e-12){preview.textContent='A e B não podem ser ambos zero.';preview.classList.add('invalid');return;} const term=(value,sym,first=false)=>{const n=this.fmt(Math.abs(value));if(Math.abs(value)<1e-12)return '';if(first)return value<0?'−'+n+sym:n+sym;return value<0?' − '+n+sym:' + '+n+sym;}; const parts=[term(a,'x',true),term(b,'y'),(Math.abs(c)<1e-12?'':(c<0?' − ':' + ')+this.fmt(Math.abs(c)))].filter(Boolean);preview.textContent=parts.join('')+' = 0';preview.classList.remove('invalid'); } catch { preview.textContent='Preencha a, b e c com valores válidos.';preview.classList.add('invalid');}
    },
    liveUpdateEditingLine(){
      if(!this.editingId)return;
      const item=this.objects.items.find((o)=>o.id===this.editingId);
      if(!item||item.type!=='line')return;
      try { const data={a:this.parseNum(document.getElementById('ga').value),b:this.parseNum(document.getElementById('gb').value),c:this.parseNum(document.getElementById('gc').value)}; if(Math.abs(data.a)<1e-12&&Math.abs(data.b)<1e-12)return; item.data=data; this.commitLiveLineEdit(); this.objects.onChange(); this.engine.requestRender(); } catch {}
    },
    fillGeometry(o){const map={line:[['ga',o.data.a],['gb',o.data.b],['gc',o.data.c]],circle:[['gcx',o.data.cx],['gcy',o.data.cy],['gr',o.data.r]],ellipse:[['ecx',o.data.cx],['ecy',o.data.cy],['ea',o.data.a],['eb',o.data.b]],point:[['gpx',o.data.x],['gpy',o.data.y]]};(map[o.type]||[]).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.value=v;});this.updateGeometryPreview();},
    commitLiveLineEdit(){
      if(this.lineLiveCommitted)return;
      const previous=this.objects.snapshot();
      this.lineLiveCommitted=true;
      this.objects.undoStack.push({items:previous,action:'editar reta'});
      if(this.objects.undoStack.length>100)this.objects.undoStack.shift();
      this.objects.redoStack=[];
    },
    updateGeometryPreview(){const t=this.$.geometryType.value;let text='';try{if(t==='line'){this.updateLinePreview();const a=this.parseNum(document.getElementById('ga').value),b=this.parseNum(document.getElementById('gb').value),c=this.parseNum(document.getElementById('gc').value);if(Math.abs(a)<1e-12&&Math.abs(b)<1e-12)throw new Error('A e B não podem ser ambos zero.');text=`${this.fmt(a)}x + ${this.fmt(b)}y + ${this.fmt(c)} = 0`;}else if(t==='circle'){const cx=this.parseNum(document.getElementById('gcx').value),cy=this.parseNum(document.getElementById('gcy').value),r=this.parseNum(document.getElementById('gr').value);if(r<=0)throw new Error('Raio deve ser positivo.');text=`(x − ${this.fmt(cx)})² + (y − ${this.fmt(cy)})² = ${this.fmt(r)}²`;}else if(t==='ellipse'){const cx=this.parseNum(document.getElementById('ecx').value),cy=this.parseNum(document.getElementById('ecy').value),a=this.parseNum(document.getElementById('ea').value),b=this.parseNum(document.getElementById('eb').value);if(a<=0||b<=0)throw new Error('Semieixos devem ser positivos.');text=`(x − ${this.fmt(cx)})² / ${this.fmt(a)}² + (y − ${this.fmt(cy)})² / ${this.fmt(b)}² = 1`;}else{text=`P = (${this.parseNum(document.getElementById('gpx').value)}, ${this.parseNum(document.getElementById('gpy').value)})`;}this.renderKatex('geometryPreview',text);}catch(e){document.getElementById('geometryPreview').textContent=e.message;}},
    addSurface(){if(!this.requireNonEmpty(this.$.surfaceExpr?.value,'Digite z = f(x,y).'))return;try{const expression=this.toMathEngine(this.$.surfaceExpr.value);MathEngine.compile(expression,this.getDefaultVariables());const range=this.parseNum(this.$.surfaceRange.value,{pi:Math.PI,tau:2*Math.PI,phi:(1+Math.sqrt(5))/2});if(!(range>0))throw new Error('A faixa da superfície deve ser positiva.');const data={expression,range};if(this.editingId){this.objects.update(this.editingId,data);this.showToast('Superfície atualizada.');}else{const obj=this.objects.addSurface(expression,colors[this.objects.items.length%colors.length]);obj.data.range=range;this.addHistory(`z = ${this.$.surfaceExpr.value}`,obj);this.showToast('Superfície adicionada.');}this.cancelEdit();}catch(e){this.showError(e);}},
    addCurve3D(){if(!this.requireNonEmpty(this.$.curve3dX?.value,'Preencha x(t).')||!this.requireNonEmpty(this.$.curve3dY?.value,'Preencha y(t).')||!this.requireNonEmpty(this.$.curve3dZ?.value,'Preencha z(t).'))return;try{const xExpr=this.toMathEngine(this.$.curve3dX.value),yExpr=this.toMathEngine(this.$.curve3dY.value),zExpr=this.toMathEngine(this.$.curve3dZ.value),tMin=this.parseNum(this.$.curve3dTMin.value,{pi:Math.PI,tau:2*Math.PI,phi:(1+Math.sqrt(5))/2}),tMax=this.parseNum(this.$.curve3dTMax.value,{pi:Math.PI,tau:2*Math.PI,phi:(1+Math.sqrt(5))/2});MathEngine.compile(xExpr,this.getDefaultVariables());MathEngine.compile(yExpr,this.getDefaultVariables());MathEngine.compile(zExpr,this.getDefaultVariables());if(!(tMax>tMin))throw new Error('t máx. deve ser maior que t mín.');const data={xExpr,yExpr,zExpr,tMin,tMax};if(this.editingId){this.objects.update(this.editingId,data);this.showToast('Curva 3D atualizada.');}else{const obj=this.objects.addCurve3D(xExpr,yExpr,zExpr,tMin,tMax,colors[this.objects.items.length%colors.length]);this.addHistory(`3D: (${this.$.curve3dX.value}, ${this.$.curve3dY.value}, ${this.$.curve3dZ.value})`,obj);this.showToast('Curva 3D adicionada.');}this.cancelEdit();}catch(e){this.showError(e);}},
    addLine3D(){try{const p1=['line3dX1','line3dY1','line3dZ1'].map(id=>this.parseNum(document.getElementById(id).value)),p2=['line3dX2','line3dY2','line3dZ2'].map(id=>this.parseNum(document.getElementById(id).value));if(p1.every((v,i)=>Math.abs(v-p2[i])<1e-12))throw new Error('Os pontos da reta 3D devem ser diferentes.');const data={p1,p2};if(this.editingId){this.objects.update(this.editingId,data);this.showToast('Reta 3D atualizada.');}else{const obj=this.objects.addLine3D(p1,p2,colors[this.objects.items.length%colors.length]);this.addHistory(`Reta 3D: (${p1.join(', ')}) → (${p2.join(', ')})`,obj);this.showToast('Reta 3D adicionada.');}this.cancelEdit();}catch(e){this.showError(e);}},

    addGeometry(){const t=this.$.geometryType.value;try{let data;if(t==='line'){data={a:this.parseNum(document.getElementById('ga').value),b:this.parseNum(document.getElementById('gb').value),c:this.parseNum(document.getElementById('gc').value)};if(Math.abs(data.a)<1e-12&&Math.abs(data.b)<1e-12)throw new Error('A e B não podem ser ambos zero.');}else if(t==='circle'){data={cx:this.parseNum(document.getElementById('gcx').value),cy:this.parseNum(document.getElementById('gcy').value),r:this.parseNum(document.getElementById('gr').value)};if(data.r<=0)throw new Error('Raio deve ser positivo.');}else if(t==='ellipse'){data={cx:this.parseNum(document.getElementById('ecx').value),cy:this.parseNum(document.getElementById('ecy').value),a:this.parseNum(document.getElementById('ea').value),b:this.parseNum(document.getElementById('eb').value)};if(data.a<=0||data.b<=0)throw new Error('Semieixos devem ser positivos.');}else data={x:this.parseNum(document.getElementById('gpx').value),y:this.parseNum(document.getElementById('gpy').value)};if(this.editingId){const current=this.objects.items.find((o)=>o.id===this.editingId);if(t==='line'&&current?.type==='line'&&this.lineLiveCommitted){this.showToast('Reta atualizada.');}else{this.objects.update(this.editingId,data);this.showToast('Objeto geométrico atualizado.');}}else{const obj=this.objects.add(t,data,colors[this.objects.items.length%colors.length]);this.addHistory(t==='line'?'Reta':t==='circle'?'Círculo':t==='ellipse'?'Elipse':'Ponto',obj);this.showToast('Objeto geométrico adicionado.');}this.cancelEdit();}catch(e){this.showError(e);}},
    renderObjects(){const list=this.$.objectsList;list.innerHTML='';if(!this.objects.items.length){list.innerHTML='<div class="empty-list">Nenhum objeto adicionado.</div>';return;}this.objects.items.forEach((o)=>{const label=this.objectLabel(o);const row=document.createElement('div');row.className='object-row';row.innerHTML=`<span class="swatch" style="background:${o.color}" aria-hidden="true"></span><button class="object-label" type="button" title="Editar ${this.escape(label)}">${this.escape(label)}</button><button class="row-btn" data-action="toggle" type="button" aria-label="${o.visible?'Ocultar':'Mostrar'} objeto">${o.visible?ICON.hide:ICON.show}</button><button class="row-btn" data-action="delete" type="button" aria-label="Excluir objeto">Excluir</button>`;row.querySelector('[data-action="toggle"]').addEventListener('click',()=>this.objects.toggle(o.id));row.querySelector('[data-action="delete"]').addEventListener('click',()=>{this.objects.remove(o.id);this.showToast('Objeto excluído.');});row.querySelector('.object-label').addEventListener('click',()=>this.beginEdit(o));list.appendChild(row);});},
    escape(s){return String(s).replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
    objectLabel(o){if(o.type==='function')return`y = ${this.display(o.data.expression)}`;if(o.type==='parametric')return`x=${this.display(o.data.xExpr)}, y=${this.display(o.data.yExpr)}`;if(o.type==='vector'){const pts=this.engine.vectorIs3D(o)?this.engine.getVector3DPoints(o):[[o.data.x1||0,o.data.y1||0,o.data.z1||0],[o.data.x2||0,o.data.y2||0,o.data.z2||0]];return`${o.data.arrow===false?'Segmento':'Vetor'} (${pts[0].join(', ')}) ${o.data.arrow===false?'—':'→'} (${pts[1].join(', ')})`;}if(o.type==='line')return`${o.data.a}x + ${o.data.b}y + ${o.data.c} = 0`;if(o.type==='circle')return`Círculo (${o.data.cx}, ${o.data.cy}), r=${o.data.r}`;if(o.type==='ellipse')return`Elipse (${o.data.cx}, ${o.data.cy}), a=${o.data.a}, b=${o.data.b}`;if(o.type==='surface')return`z = ${this.display(o.data.expression)}`;if(o.type==='curve3d')return`3D: (${this.display(o.data.xExpr)}, ${this.display(o.data.yExpr)}, ${this.display(o.data.zExpr)})`;if(o.type==='line3d')return`Reta 3D: (${o.data.p1.join(', ')}) → (${o.data.p2.join(', ')})`;return`Ponto (${o.data.x}, ${o.data.y})`;},
    display(s){return String(s).replace(/\bsin\b/gi,'sen').replace(/\basin\b/gi,'arcsen').replace(/\bacos\b/gi,'arccos').replace(/\batan\b/gi,'arctg').replace(/\bpi\b/g,'π').replace(/\btau\b/g,'τ').replace(/\bphi\b/g,'φ').replace(/sqrt\(/g,'√(').replace(/\^2/g,'²').replace(/\^3/g,'³').replace(/\*/g,'×').replace(/\//g,'÷').replace(/-/g,'−');},
    loadHistory(){try{this.history=JSON.parse(localStorage.getItem('graphCalcHistoryV2')||'[]');if(!Array.isArray(this.history))this.history=[];}catch{this.history=[];}this.renderHistory();},
    addHistory(text,obj=null){const entry={text,time:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),object:obj?{type:obj.type,color:obj.color,data:JSON.parse(JSON.stringify(obj.data))}:null};this.history.unshift(entry);this.history=this.history.slice(0,50);localStorage.setItem('graphCalcHistoryV2',JSON.stringify(this.history));this.renderHistory();},
    renderHistory(){this.$.historyList.innerHTML=this.history.length?this.history.map((h)=>`<button class="history-row" type="button"><span>${this.escape(h.text)}</span><small>${this.escape(h.time)}</small></button>`).join(''):'<div class="empty-list">Sem histórico.</div>';this.$.historyList.querySelectorAll('.history-row').forEach((row,i)=>row.addEventListener('click',()=>this.reuseHistory(this.history[i])));},
    reuseHistory(entry){const text=typeof entry==='string'?entry:entry?.text||'';if(entry?.object){const o=entry.object;this.cancelEdit();this.setTab(o.type==='function'?'function':o.type==='parametric'?'parametric':o.type==='vector'?'vector':'geometry');if(o.type==='function')this.$.functionExpr.value=this.display(o.data.expression);else if(o.type==='parametric'){this.$.paramX.value=this.display(o.data.xExpr);this.$.paramY.value=this.display(o.data.yExpr);this.$.tMin.value=o.data.tMin;this.$.tMax.value=o.data.tMax;}else if(o.type==='vector'){const pts=this.engine.vectorIs3D(o)?this.engine.getVector3DPoints(o):[[o.data.x1||0,o.data.y1||0,o.data.z1||0],[o.data.x2||0,o.data.y2||0,o.data.z2||0]];[['vx1',pts[0][0]],['vy1',pts[0][1]],['vz1',pts[0][2]],['vx2',pts[1][0]],['vy2',pts[1][1]],['vz2',pts[1][2]]].forEach(([id,v])=>document.getElementById(id).value=v);if(this.$.vectorType)this.$.vectorType.value=o.data.arrow===false?'segment':'vector';}else{this.$.geometryType.value=o.type;this.initGeometryFields();this.fillGeometry({type:o.type,data:o.data});}this.updatePreviews();this.showToast('Objeto recuperado do histórico.');return;}const m=text.match(/^y = (.+)$/);if(m){this.setTab('function');this.$.functionExpr.value=m[1];this.updatePreviews();return;}const p=text.match(/^x\(t\) = (.+), y\(t\) = (.+)$/);if(p){this.setTab('parametric');this.$.paramX.value=p[1];this.$.paramY.value=p[2];this.updatePreviews();}},
    clearHistory(){this.history=[];localStorage.removeItem('graphCalcHistoryV2');this.renderHistory();this.showToast('Histórico limpo.');},
    persistSession(){this.objects.save();},
    undo(){if(this.objects.undo()){this.showToast('Ação desfeita.');}else this.showToast('Nada para desfazer.');this.updateUndoButtons();},
    redo(){if(this.objects.redo()){this.showToast('Ação refeita.');}else this.showToast('Nada para refazer.');this.updateUndoButtons();},
    updateUndoButtons(){this.$.undo.disabled=!this.objects?.undoStack?.length;this.$.redo.disabled=!this.objects?.redoStack?.length;},
    updateEmptyState(){this.$.emptyState.classList.toggle('hidden',this.objects.items.length>0);},
    updateCoordinates(p){const x=Number(p?.x),y=Number(p?.y);this.$.coordinate.textContent=Number.isFinite(x)&&Number.isFinite(y)?`x: ${this.fmt(x)} · y: ${this.fmt(y)}`:'x: — · y: —';},
    setStatus(msg,error=false){this.$.status.textContent=msg;this.$.status.className=error?'error':'';clearTimeout(this.statusTimer);this.statusTimer=setTimeout(()=>{this.$.status.textContent='Pronto';this.$.status.className='';},3000);},
    showError(error){const message=error?.message||'Não foi possível concluir a operação.';this.setStatus(message,true);this.showToast(message,true);},
    showToast(message,error=false){if(!this.$.toast)return;clearTimeout(this.toastTimer);this.$.toast.textContent=message;this.$.toast.className=`toast show${error?' error':''}`;this.toastTimer=setTimeout(()=>this.$.toast.className='toast',3200);},
    renderPreview(){/* ponto de extensão */}
  };
  global.AppUI=AppUI;
})(window);
