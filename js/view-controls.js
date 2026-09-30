(function (g) {
  'use strict';

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const wrap = n => ((n + 180) % 360 + 360) % 360 - 180;
  const presets = Object.freeze({ orbit: [-40, 30], xy: [0, 90], xz: [0, 0], yz: [90, 0] });
  const esc = v => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => Number(n.toFixed(5)).toLocaleString('pt-BR', { maximumFractionDigits: 5 });
  const icons = {
    minus: '<path d="M5 12h14"/>', plus: '<path d="M5 12h14M12 5v14"/>',
    fit: '<path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4"/><path d="M9 12h6"/>',
    reset: '<path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/>',
    sliders: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>'
  };
  function icon(name) { return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`; }

  // Both renderers supply the same small adapter. Camera values never edit objects.
  function mount(host, adapter, options = {}) {
    const native = !!options.native, prefix = native ? 'scene' : 'wb';
    let opened = options.open ?? !native, step = 1, section=adapter.get().dimension===3?'orientation':'center';
    const id = action => native ? ({fit:'fitViewBtn',reset:'resetViewBtn'}[action] || '') : '';
    const button = (action, label, glyph) => `<button type="button" ${id(action) ? `id="${id(action)}"` : ''} data-view-action="${action}" title="${label}" aria-label="${label}">${icon(glyph)}</button>`;
    host.classList.add('ovc');
    host.innerHTML = `<div class="ovc-quick" role="group" aria-label="Enquadramento do gráfico">
      ${button('out','Afastar','minus')}${button('in','Aproximar','plus')}${button('fit','Enquadrar objetos','fit')}${button('reset','Restaurar vista','reset')}
      <button class="ovc-toggle" type="button" data-view-action="toggle" aria-controls="${prefix}ViewPanel" aria-expanded="${opened}">${icon('sliders')}<span>Vista e eixos</span></button>
    </div><section class="ovc-panel" id="${prefix}ViewPanel" aria-label="Controles da visualização" ${opened ? '' : 'hidden'}>
      <div class="ovc-heading"><strong>Vista e eixos</strong><output data-view-summary></output><button type="button" data-view-action="close" aria-label="Recolher controles">×</button></div>
      <div class="ovc-tabs" role="tablist" aria-label="Ajustes da vista">${[['orientation','Câmera'],['center','Centro'],['guides','Eixos']].map(([key,label])=>`<button type="button" role="tab" id="${prefix}ViewTab-${key}" data-view-tab="${key}" aria-controls="${prefix}ViewSection-${key}" ${key==='orientation'?'data-view-3d':''}>${label}</button>`).join('')}</div>
      <div class="ovc-content">
        <fieldset class="ovc-orientation" data-view-section="orientation" id="${prefix}ViewSection-orientation" role="tabpanel" aria-labelledby="${prefix}ViewTab-orientation"><legend>Orientação</legend>
          <div class="ovc-presets" role="group" aria-label="Vistas dos planos coordenados">${[['orbit','3D'],['xy','XY'],['xz','XZ'],['yz','YZ']].map(([value,label]) => `<button type="button" data-view-preset="${value}" ${native ? '' : `data-wb-view="${value}"`} title="${value === 'orbit' ? 'Vista espacial' : 'Olhar de frente para o plano '+label}" aria-pressed="false">${label}</button>`).join('')}</div>
          ${[['yaw','Rotação em torno de Z',-180,180],['pitch','Inclinação',-90,90]].map(([key,label,min,max]) => `<div class="ovc-angle"><label for="${prefix}${key === 'yaw' ? 'Yaw' : 'Pitch'}">${label}</label><button type="button" class="ovc-value" data-view-edit="${key}" aria-label="Editar ${label.toLowerCase()} em graus"></button><input id="${prefix}${key === 'yaw' ? 'Yaw' : 'Pitch'}" data-view-angle="${key}" type="range" min="${min}" max="${max}" step="1" value="0"></div>`).join('')}
          <div class="ovc-options" role="group" aria-label="Ação ao arrastar"><button type="button" data-view-drag="orbit">Girar</button><button type="button" data-view-drag="pan">Mover</button></div>
          ${native ? '<label class="ovc-select">Projeção<select data-view-select="projection"><option value="perspective">Perspectiva</option><option value="orthographic">Ortogonal</option></select></label>' : '<p class="ovc-note">Projeção ortogonal · unidades proporcionais.</p>'}
        </fieldset>
        <fieldset class="ovc-center" data-view-section="center" id="${prefix}ViewSection-center" role="tabpanel" aria-labelledby="${prefix}ViewTab-center"><legend>Centro da vista</legend><p class="ovc-note">Desloque o enquadramento pelas coordenadas.</p>
          ${['x','y','z'].map(axis => `<div class="ovc-axis-row" ${axis === 'z' ? 'data-view-3d' : ''}><span class="ovc-axis ovc-axis-${axis}">${axis.toUpperCase()}</span><button type="button" data-view-shift="${axis}:-1" aria-label="Diminuir centro em ${axis.toUpperCase()}">−</button><button type="button" class="ovc-value math-field" data-view-edit="${axis}" aria-label="Editar centro em ${axis.toUpperCase()}"></button><button type="button" data-view-shift="${axis}:1" aria-label="Aumentar centro em ${axis.toUpperCase()}">+</button></div>`).join('')}
          <div class="ovc-center-options"><label class="ovc-select">Passo<select data-view-select="step"><option value="0.1">0,1</option><option value="1" selected>1</option><option value="5">5</option><option value="10">10</option></select></label><button type="button" data-view-action="origin">Ir à origem</button></div>
        </fieldset>
        <fieldset class="ovc-guides" data-view-section="guides" id="${prefix}ViewSection-guides" role="tabpanel" aria-labelledby="${prefix}ViewTab-guides"><legend>Referências visuais</legend><div class="ovc-options">${['x','y','z'].map(axis => `<label class="ovc-check ovc-axis-${axis}" ${axis === 'z' ? 'data-view-3d' : ''}><input type="checkbox" data-view-axis="${axis}"> Eixo ${axis.toUpperCase()}</label>`).join('')}<label class="ovc-check"><input type="checkbox" data-view-grid> Grade</label></div>
          <label class="ovc-select" data-view-3d>Plano da grade<select data-view-select="gridPlane"><option value="xy">XY</option><option value="xz">XZ</option><option value="yz">YZ</option></select></label>
          <label class="ovc-check" data-view-2d><input type="checkbox" data-view-equal> Mesma unidade em X e Y</label>
          ${native ? '<button type="button" data-view-action="inspect" id="inspectBtn" aria-pressed="false">Inspecionar valores</button>' : ''}
        </fieldset>
      </div><p class="ovc-help" data-view-help></p>
    </section>`;
    const panel = host.querySelector('.ovc-panel'), toggle = host.querySelector('.ovc-toggle');
    function setOpen(next, focus = false) {
      opened = next; panel.hidden = !next; toggle.setAttribute('aria-expanded', String(next));
      if (focus) toggle.focus({preventScroll:true});
    }
    function update() {
      if (!host.isConnected) return;
      const s = adapter.get(), is3 = s.dimension === 3;
      if(!is3&&section==='orientation')section='center';
      host.dataset.dimension = s.dimension;
      host.querySelectorAll('[data-view-3d]').forEach(el => el.hidden = !is3);
      host.querySelectorAll('[data-view-2d]').forEach(el => el.hidden = is3);
      host.querySelectorAll('[data-view-section]').forEach(el=>el.hidden=el.dataset.viewSection!==section);
      host.querySelectorAll('[data-view-tab]').forEach(el=>{const selected=el.dataset.viewTab===section;el.setAttribute('aria-selected',String(selected));el.tabIndex=selected?0:-1;});
      host.querySelector('[data-view-summary]').textContent = `${is3 ? 'X · Y · Z' : 'X · Y'} · ${Math.round(s.zoom * 100)}%`;
      host.querySelectorAll('[data-view-angle]').forEach(el => {
        const v = s[el.dataset.viewAngle]; el.value = v;
        el.setAttribute('aria-valuetext', `${fmt(v)} graus`);
      });
      host.querySelectorAll('[data-view-edit]').forEach(el => {
        const key = el.dataset.viewEdit, angular = key === 'yaw' || key === 'pitch', v = angular ? s[key] : s.center[key];
        if (el.dataset.value === String(v)) return;
        el.dataset.value = String(v);
        const text = String(Number(v.toFixed(8)));
        el.innerHTML = angular ? `${fmt(v)}°` : `<span class="math-render">${g.AppUI?.renderMath(text) || esc(text)}</span><span class="ovc-edit-mark" aria-hidden="true">↗</span>`;
      });
      host.querySelectorAll('[data-view-preset]').forEach(el => {
        const p = presets[el.dataset.viewPreset];
        el.setAttribute('aria-pressed',String(is3 && Math.abs(wrap(s.yaw-p[0])) < .1 && Math.abs(s.pitch-p[1]) < .1));
      });
      host.querySelectorAll('[data-view-drag]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.viewDrag === s.dragMode)));
      host.querySelectorAll('[data-view-axis]').forEach(el => el.checked = !!s.axes[el.dataset.viewAxis]);
      host.querySelector('[data-view-grid]').checked = s.grid;
      host.querySelector('[data-view-equal]').checked = s.equal;
      for (const key of ['projection','gridPlane']) { const el = host.querySelector(`[data-view-select="${key}"]`); if (el) el.value = s[key]; }
      const inspect = host.querySelector('[data-view-action="inspect"]');
      if (inspect) { inspect.hidden = is3; inspect.setAttribute('aria-pressed',String(!!s.inspect)); }
      host.querySelector('[data-view-help]').textContent = is3
        ? 'Arraste para '+(s.dragMode === 'pan' ? 'mover' : 'girar')+'. Dois dedos movem e aproximam. Setas giram; Shift + setas move. + / − ajustam o zoom.'
        : 'Arraste para mover. Use dois dedos ou a roda para aproximar. No gráfico, setas movem; + / − ajustam o zoom.';
    }
    function edit(key) {
      const s = adapter.get(), angular = key === 'yaw' || key === 'pitch';
      const min = angular ? (key === 'yaw' ? -180 : -90) : -1e9, max = angular ? (key === 'yaw' ? 180 : 90) : 1e9;
      const parse = value => { const n = g.AppUI.num(value); if (!Number.isFinite(n) || n < min || n > max) throw new Error(`Use um valor entre ${min} e ${max}.`); return n; };
      g.AppUI.openMathInput({label: angular ? (key === 'yaw' ? 'Rotação em torno de Z (graus)' : 'Inclinação (graus)') : 'Centro da vista · '+key.toUpperCase(), value:String(Number((angular ? s[key] : s.center[key]).toFixed(8))), type:'number', allowedVariables:[], allowCalculus:false, context:'VISUALIZAÇÃO',validate:parse,onSave:value => {
        const n = parse(value); adapter.set(angular ? {[key]:n} : {center:{...adapter.get().center,[key]:n}}); adapter.flush?.(); update();
      }});
    }
    const click = e => {
      const b = e.target.closest('button'); if (!b || !host.contains(b)) return;
      const s = adapter.get(), a = b.dataset.viewAction;
      if(b.dataset.viewTab){section=b.dataset.viewTab;update();return;}
      if (a === 'toggle') return setOpen(!opened);
      if (a === 'close') return setOpen(false,true);
      if (a === 'in' || a === 'out') adapter.zoom(a === 'in' ? 1.2 : 1/1.2);
      else if (a === 'fit' || a === 'reset' || a === 'inspect') adapter[a]?.();
      else if (a === 'origin') adapter.set({center:{x:0,y:0,z:0}});
      else if (b.dataset.viewPreset) { const p = presets[b.dataset.viewPreset]; adapter.set({yaw:p[0],pitch:p[1],projection:'orthographic',gridPlane:b.dataset.viewPreset === 'orbit' ? 'xy' : b.dataset.viewPreset}); }
      else if (b.dataset.viewDrag) adapter.set({dragMode:b.dataset.viewDrag});
      else if (b.dataset.viewShift) { const [axis,sign] = b.dataset.viewShift.split(':'); adapter.set({center:{...s.center,[axis]:clamp(s.center[axis]+Number(sign)*step,-1e9,1e9)}}); }
      else if (b.dataset.viewEdit) return edit(b.dataset.viewEdit);
      adapter.flush?.(); update();
    };
    const input = e => { if (e.target.dataset.viewAngle) { adapter.set({[e.target.dataset.viewAngle]:Number(e.target.value)}); adapter.flush?.();update(); } };
    const change = e => {
      const el = e.target, s = adapter.get();
      if (el.dataset.viewAxis) adapter.set({axes:{...s.axes,[el.dataset.viewAxis]:el.checked}});
      else if (el.hasAttribute('data-view-grid')) adapter.set({grid:el.checked});
      else if (el.hasAttribute('data-view-equal')) adapter.set({equal:el.checked});
      else if (el.dataset.viewSelect === 'step') step = Number(el.value);
      else if (el.dataset.viewSelect) adapter.set({[el.dataset.viewSelect]:el.value});
      adapter.flush?.();update();
    };
    const keydown = e => {
      if (e.key === 'Escape' && opened) { e.stopPropagation(); setOpen(false,true); }
      if(e.target.matches('[data-view-tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){
        e.preventDefault();const tabs=[...host.querySelectorAll('[data-view-tab]')].filter(el=>!el.hidden),index=tabs.indexOf(e.target),next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
        section=tabs[next].dataset.viewTab;update();tabs[next].focus();
      }
    };
    host.addEventListener('click',click); host.addEventListener('input',input); host.addEventListener('change',change); host.addEventListener('keydown',keydown);
    update();
    return {
      update,
      close:()=>setOpen(false),
      openSection(name='orientation'){section=['orientation','center','guides'].includes(name)?name:'orientation';setOpen(true);update();},
      setPreset(name){const p=presets[name];if(!p)return;adapter.set({yaw:p[0],pitch:p[1],projection:'orthographic',gridPlane:name==='orbit'?'xy':name});adapter.flush?.();update();},
      destroy:()=>{host.removeEventListener('click',click);host.removeEventListener('input',input);host.removeEventListener('change',change);host.removeEventListener('keydown',keydown);}
    };
  }

  function installNative(engine, ui) {
    const host = document.getElementById('nativeViewControls');
    if (!host) return;
    const adapter = {
      get:()=> { const c=engine.camera3d, is3=engine.viewMode==='3d', middle=engine.screenToWorld(engine.size.w/2,engine.size.h/2); return {dimension:is3?3:2,yaw:wrap(c.yaw*180/Math.PI),pitch:c.pitch*180/Math.PI,center:is3?{...c.target}:{...middle,z:0},zoom:is3?13/c.distance:engine.scale/42,axes:{x:engine.showAxes&&engine.axisVisibility.x,y:engine.showAxes&&engine.axisVisibility.y,z:engine.showAxes&&engine.axisVisibility.z},grid:engine.showGrid,gridPlane:engine.gridPlane,projection:c.projection||'perspective',equal:engine.equalScale,dragMode:engine.dragMode,inspect:engine.inspectMode}; },
      set:p=> {
        const c=engine.camera3d;
        if (p.center) { if(engine.viewMode==='3d') c.target={...p.center}; else {engine.offsetX=-p.center.x*engine.scaleX;engine.offsetY=p.center.y*engine.scaleY;} }
        if (Number.isFinite(p.yaw)) c.yaw=wrap(p.yaw)*Math.PI/180;
        if (Number.isFinite(p.pitch)) c.pitch=clamp(p.pitch,-90,90)*Math.PI/180;
        if (p.projection) c.projection=p.projection;
        if (p.gridPlane) engine.gridPlane=p.gridPlane;
        if (p.dragMode) {engine.dragMode=p.dragMode;engine.inspectMode=false;}
        if (p.axes) { engine.axisVisibility={...p.axes};engine.showAxes=Object.values(p.axes).some(Boolean); }
        if (typeof p.grid==='boolean') engine.showGrid=p.grid;
        if (typeof p.equal==='boolean') engine.setEqualScale(p.equal,false);
        ui.syncViewControls();ui.saveViewPrefs();engine.requestRender();
      },
      zoom:factor=>engine.zoomView(factor), fit:()=>engine.fitToObjects(), reset:()=>engine.center(),
      inspect:()=>{engine.inspectMode=!engine.inspectMode;if(!engine.inspectMode){engine.inspectX=null;ui.$.inspectCard.hidden=true;}engine.requestRender();}
    };
    const control=mount(host,adapter,{native:true,open:false});
    engine.onViewChange=()=>{control.update();engine.canvas.setAttribute('aria-label',engine.viewMode==='3d'?'Espaço cartesiano interativo em três dimensões':'Plano cartesiano interativo');const help=document.getElementById('graphHelp');if(help)help.textContent=host.querySelector('[data-view-help]').textContent;};
    return control;
  }

  // Shared pointer behavior for the SVG workbenches; listeners stay on the host
  // while the SVG is redrawn. Explicit teardown prevents accumulation on recalculation.
  function gestures(host, adapter) {
    const abort = new AbortController(), signal=abort.signal, pointers=new Map();
    let previous=null;
    const geometry=()=> {const p=[...pointers.values()];return {x:p.reduce((n,v)=>n+v.x,0)/p.length,y:p.reduce((n,v)=>n+v.y,0)/p.length,d:p.length>1?Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y):0};};
    host.addEventListener('pointerdown',e=>{if(e.button!==0&&e.button!==2)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});previous=geometry();host.setPointerCapture(e.pointerId);host.focus({preventScroll:true});},{signal});
    host.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const next=geometry(),dx=next.x-previous.x,dy=next.y-previous.y,s=adapter.get();if(pointers.size>1){if(previous.d>0&&next.d>0)adapter.zoom(next.d/previous.d);adapter.pan(dx,dy);}else if(s.dimension===3&&s.dragMode!=='pan'&&!e.shiftKey&&e.buttons!==2)adapter.set({yaw:wrap(s.yaw+dx*.45),pitch:clamp(s.pitch+dy*.45,-90,90)});else adapter.pan(dx,dy);previous=next;},{signal});
    const stop=e=>{pointers.delete(e.pointerId);previous=pointers.size?geometry():null;};
    for(const type of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(type,stop,{signal});
    host.addEventListener('contextmenu',e=>e.preventDefault(),{signal});
    host.addEventListener('wheel',e=>{if(document.activeElement!==host&&!e.ctrlKey)return;e.preventDefault();adapter.zoom(Math.exp(-clamp(e.deltaY,-180,180)*.002));},{passive:false,signal});
    host.addEventListener('dblclick',()=>adapter.fit(),{signal});
    host.addEventListener('keydown',e=>{if(e.target!==host)return;const s=adapter.get(),arrows={ArrowLeft:[24,0],ArrowRight:[-24,0],ArrowUp:[0,24],ArrowDown:[0,-24]};if(arrows[e.key]){const [dx,dy]=arrows[e.key];if(s.dimension===3&&!e.shiftKey&&s.dragMode!=='pan')adapter.set({yaw:wrap(s.yaw-dx/4),pitch:clamp(s.pitch-dy/4,-90,90)});else adapter.pan(dx,dy);}else if(e.key==='+'||e.key==='=')adapter.zoom(1.2);else if(e.key==='-')adapter.zoom(1/1.2);else if(e.key==='Home')adapter.reset();else return;e.preventDefault();},{signal});
    return ()=>abort.abort();
  }
  g.OrbisViewControls={mount,installNative,gestures,presets,wrap,clamp};
})(window);
