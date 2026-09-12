(function (global) {
  'use strict';

  const LIGHT_OBJECT_COLORS = Object.freeze({
    '#46e6ff':'#006c87','#a47dff':'#6b45c6','#ff6fb8':'#a3286a','#58d9a7':'#23724f',
    '#ffd166':'#785600','#ff9b66':'#a9471f','#668cff':'#315dcb','#cf8cff':'#7943b0'
  });
  const DARK_HIGH_OBJECT_COLORS = Object.freeze({
    '#46e6ff':'#7cf2ff','#a47dff':'#d1bcff','#ff6fb8':'#ffa3d2','#58d9a7':'#8ae8c3',
    '#ffd166':'#ffe08a','#ff9b66':'#ffc08f','#668cff':'#a4b8ff','#cf8cff':'#ddb6ff'
  });
  const LIGHT_HIGH_OBJECT_COLORS = Object.freeze({
    '#46e6ff':'#004f65','#a47dff':'#5630a5','#ff6fb8':'#8d1e59','#58d9a7':'#195c40',
    '#ffd166':'#664900','#ff9b66':'#843715','#668cff':'#2146a8','#cf8cff':'#653090'
  });

  class GraphEngine {
    constructor(canvas, objects) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.objects = objects;
      this.scale = 42;
      this.viewMode = '2d';
      this.camera3d = { yaw: -0.72, pitch: 0.58, distance: 13, target: { x: 0, y: 0, z: 0 }, fov: 52 };
      this.cameraPan3d = { x: 0, y: 0 };
      this.offsetX = 0;
      this.offsetY = 0;
      this.showGrid = true;
      this.showMinorGrid = true;
      this.showAxes = true;
      this.showLabels = true;
      this.showCoordinates = true;
      this.showPointValues = true;
      this.inspectMode = false;
      this.inspectX = null;
      this.selectedId = null;
      this.notablePoints = [];
      this.notableSourceId = null;
      this.notableViewKey = '';
      this.hoverPoints = [];
      this.hoveredPoint = null;
      this.pointTooltip = document.getElementById('pointTooltip');
      this.framePending = false;
      this.dragging = false;
      this.last = { x: 0, y: 0 };
      this.pointer = null;
      this.activePointers = new Map();
      this.pinchDistance = null;
      this.cache = new Map();
      this.resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => this.resize()) : null;
      this.resizeObserver?.observe(canvas.parentElement);
      this.bindEvents();
      this.resize();
    }

    get theme() {
      const light = document.documentElement.dataset.theme === 'light';
      const high = document.documentElement.classList.contains('high-contrast');
      if (light && high) return { bg:'#ffffff', grid:'rgba(0,0,0,.20)', gridMajor:'rgba(0,0,0,.42)', axis:'#000000', label:'#1e2a35', guide:'#004f65' };
      if (high) return { bg:'#000000', grid:'rgba(255,255,255,.26)', gridMajor:'rgba(255,255,255,.52)', axis:'#ffffff', label:'#e6f1fa', guide:'#7cf2ff' };
      if (light) return { bg:'#ffffff', grid:'rgba(16,32,51,.11)', gridMajor:'rgba(16,32,51,.23)', axis:'#20384e', label:'#455e75', guide:'#315dcb' };
      return { bg:'#06101c', grid:'rgba(160,190,220,.12)', gridMajor:'rgba(165,200,235,.24)', axis:'#d9e8f5', label:'#a7b9ca', guide:'#77dffc' };
    }

    objectColor(obj) {
      const raw = String(obj?.color || '#46e6ff').toLowerCase();
      const light = document.documentElement.dataset.theme === 'light';
      const high = document.documentElement.classList.contains('high-contrast');
      if (light && high) return LIGHT_HIGH_OBJECT_COLORS[raw] || raw;
      if (high) return DARK_HIGH_OBJECT_COLORS[raw] || raw;
      if (light) return LIGHT_OBJECT_COLORS[raw] || raw;
      return raw;
    }

    resize() {
      const parent = this.canvas?.parentElement; if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const w = Math.max(260, Math.floor(rect.width || parent.clientWidth || global.innerWidth || 800));
      const h = Math.max(220, Math.floor(rect.height || parent.clientHeight || global.innerHeight || 600));
      const dpr = Math.max(1, Math.min(2.5, global.devicePixelRatio || 1));
      const pw = Math.floor(w * dpr), ph = Math.floor(h * dpr);
      if (this.canvas.width !== pw || this.canvas.height !== ph) { this.canvas.width = pw; this.canvas.height = ph; }
      this.canvas.style.width = `${w}px`; this.canvas.style.height = `${h}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.invalidateCache(); this.requestRender();
    }
    get size() { return { w: Math.max(260, this.canvas.clientWidth || 320), h: Math.max(220, this.canvas.clientHeight || 320) }; }
    worldToScreen(x, y) { const { w, h } = this.size; return { x: w / 2 + this.offsetX + x * this.scale, y: h / 2 + this.offsetY - y * this.scale }; }
    screenToWorld(px, py) { const { w, h } = this.size; return { x: (px - w / 2 - this.offsetX) / this.scale, y: (h / 2 + this.offsetY - py) / this.scale }; }
    currentBounds() { const { w, h } = this.size; const a = this.screenToWorld(0, h), b = this.screenToWorld(w, 0); return { xmin: a.x, xmax: b.x, ymin: a.y, ymax: b.y }; }

    setViewMode(mode) {
      const next = mode === '3d' ? '3d' : '2d';
      if (this.viewMode === next) return;
      this.viewMode = next;
      this.inspectMode = false;
      this.inspectX = null;
      this.pointer = null;
      this.hidePointTooltip();
      this.requestRender();
    }
    resetCamera3D() {
      this.camera3d = { yaw: -0.72, pitch: 0.58, distance: 13, target: { x: 0, y: 0, z: 0 }, fov: 52 };
      this.cameraPan3d = { x: 0, y: 0 };
    }
    center() {
      if (this.viewMode === '3d') { this.resetCamera3D(); this.requestRender(); return; }
      this.offsetX = 0; this.offsetY = 0; this.scale = Math.max(28, Math.min(62, this.size.w / 16)); this.inspectX = null; this.requestRender();
    }
    setView(view) {
      if (!view) return;
      if (Number.isFinite(view.scale)) this.scale = Math.max(5, Math.min(1200, view.scale));
      if (Number.isFinite(view.offsetX)) this.offsetX = view.offsetX;
      if (Number.isFinite(view.offsetY)) this.offsetY = view.offsetY;
      if (view.camera3d && typeof view.camera3d === 'object') {
        const c=view.camera3d,t=c.target||{};
        if(Number.isFinite(c.yaw))this.camera3d.yaw=c.yaw;
        if(Number.isFinite(c.pitch))this.camera3d.pitch=Math.max(-1.45,Math.min(1.45,c.pitch));
        if(Number.isFinite(c.distance))this.camera3d.distance=Math.max(2.5,Math.min(180,c.distance));
        if(Number.isFinite(c.fov))this.camera3d.fov=Math.max(28,Math.min(85,c.fov));
        if(Number.isFinite(t.x))this.camera3d.target.x=t.x;if(Number.isFinite(t.y))this.camera3d.target.y=t.y;if(Number.isFinite(t.z))this.camera3d.target.z=t.z;
      }
      this.requestRender();
    }
    getView() { return { scale: this.scale, offsetX: this.offsetX, offsetY: this.offsetY, showGrid: this.showGrid, showMinorGrid: this.showMinorGrid, showAxes: this.showAxes, showLabels: this.showLabels, camera3d: JSON.parse(JSON.stringify(this.camera3d)) }; }
    requestRender() { if (this.framePending) return; this.framePending = true; requestAnimationFrame(() => { this.framePending = false; this.render(); }); }
    invalidateCache() { this.cache.clear(); }
    getCompiled(id, expression, variables) {
      const key = `${id}|${expression}|${Object.keys(variables).sort().join(',')}`;
      if (this.cache.has(key)) return this.cache.get(key);
      const fn = MathEngine.compile(expression, variables); this.cache.set(key, fn); return fn;
    }

    bindEvents() {
      this.canvas.addEventListener('pointerdown', (e) => {
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.activePointers.size === 2) {
          const p = [...this.activePointers.values()]; this.pinchDistance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); this.dragging = false; return;
        }
        this.dragging = !this.inspectMode;
        this.last = { x: e.clientX, y: e.clientY };
        try { this.canvas.setPointerCapture(e.pointerId); } catch {}
        this.updatePointer(e);
      });
      this.canvas.addEventListener('pointermove', (e) => {
        if (this.activePointers.has(e.pointerId)) this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        this.updatePointer(e);
        if (this.activePointers.size >= 2) {
          const p = [...this.activePointers.values()]; const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
          if (this.pinchDistance && d > 0) {
            const r = this.canvas.getBoundingClientRect(); const cx = (p[0].x + p[1].x) / 2 - r.left; const cy = (p[0].y + p[1].y) / 2 - r.top;
            if(this.viewMode==='3d'){this.camera3d.distance=Math.max(2.5,Math.min(180,this.camera3d.distance/(d/this.pinchDistance)));this.requestRender();}else this.zoomAt(cx, cy, d / this.pinchDistance); this.pinchDistance = d;
          }
          return;
        }
        if (this.viewMode === '3d') {
          if (!this.dragging) return;
          const dx=e.clientX-this.last.x,dy=e.clientY-this.last.y;this.last={x:e.clientX,y:e.clientY};
          if(e.shiftKey||e.buttons===2){const k=this.camera3d.distance/520;this.camera3d.target.x-=dx*k*Math.cos(this.camera3d.yaw);this.camera3d.target.y-=dx*k*Math.sin(this.camera3d.yaw);this.camera3d.target.z+=dy*k;}
          else{this.camera3d.yaw+=dx*.008;this.camera3d.pitch=Math.max(-1.45,Math.min(1.45,this.camera3d.pitch+dy*.008));}
          this.requestRender();return;
        }
        if (this.inspectMode) { if (this.pointer) { this.inspectX = this.pointer.x; global.AppUI?.updateInspection(this.inspectX); this.requestRender(); } return; }
        if (!this.dragging) return;
        this.offsetX += e.clientX - this.last.x; this.offsetY += e.clientY - this.last.y; this.last = { x: e.clientX, y: e.clientY }; this.requestRender();
      });
      const stop = (e) => { this.activePointers.delete(e.pointerId); this.pinchDistance = null; this.dragging = false; if (e.pointerType === 'touch' && !this.inspectMode) global.AppUI?.updateCoordinates(null); };
      this.canvas.addEventListener('pointerup', stop); this.canvas.addEventListener('pointercancel', stop);
      this.canvas.addEventListener('pointerleave', () => { if (!this.inspectMode) { this.pointer = null; global.AppUI?.updateCoordinates(null); } this.hidePointTooltip(); });
      this.canvas.addEventListener('wheel', (e) => { e.preventDefault(); if(this.viewMode==='3d'){this.camera3d.distance=Math.max(2.5,Math.min(180,this.camera3d.distance*Math.exp(e.deltaY*.0014)));this.requestRender();return;} const r = this.canvas.getBoundingClientRect(); this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .0015)); }, { passive: false });
      this.canvas.addEventListener('dblclick', () => this.fitToObjects());
      this.canvas.addEventListener('keydown', (e) => {
        const step = e.shiftKey ? 48 : 24;
        if(this.viewMode==='3d'){
          if(e.key==='ArrowLeft'){this.camera3d.yaw-=.10;e.preventDefault();}
          else if(e.key==='ArrowRight'){this.camera3d.yaw+=.10;e.preventDefault();}
          else if(e.key==='ArrowUp'){this.camera3d.pitch=Math.max(-1.45,this.camera3d.pitch-.08);e.preventDefault();}
          else if(e.key==='ArrowDown'){this.camera3d.pitch=Math.min(1.45,this.camera3d.pitch+.08);e.preventDefault();}
          else if(e.key==='+'||e.key==='='){this.camera3d.distance=Math.max(2.5,this.camera3d.distance/1.14);e.preventDefault();}
          else if(e.key==='-'){this.camera3d.distance=Math.min(180,this.camera3d.distance*1.14);e.preventDefault();}
          else return;this.requestRender();return;
        }
        if (e.key === 'ArrowLeft') { this.offsetX += step; e.preventDefault(); }
        else if (e.key === 'ArrowRight') { this.offsetX -= step; e.preventDefault(); }
        else if (e.key === 'ArrowUp') { this.offsetY += step; e.preventDefault(); }
        else if (e.key === 'ArrowDown') { this.offsetY -= step; e.preventDefault(); }
        else if (e.key === '+' || e.key === '=') { const { w, h } = this.size; this.zoomAt(w / 2, h / 2, 1.16); e.preventDefault(); return; }
        else if (e.key === '-') { const { w, h } = this.size; this.zoomAt(w / 2, h / 2, 1 / 1.16); e.preventDefault(); return; }
        else return;
        this.requestRender();
      });
    }
    updatePointer(e) {
      const r = this.canvas.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top;
      if (px < 0 || py < 0 || px > r.width || py > r.height) return;
      if(this.viewMode==='3d'){this.pointer=null;global.AppUI?.updateCoordinates(null);this.updatePointTooltip(px,py,e.pointerType);return;}
      let p = this.screenToWorld(px, py); p = global.AppUI?.applySnap ? global.AppUI.applySnap(p) : p; this.pointer = p;
      if (this.showCoordinates) global.AppUI?.updateCoordinates(p, e.pointerType === 'touch');
      this.updatePointTooltip(px,py,e.pointerType);
    }
    zoomAt(px, py, factor) {
      const before = this.screenToWorld(px, py); this.scale = Math.max(5, Math.min(1200, this.scale * factor)); const after = this.screenToWorld(px, py);
      this.offsetX += (after.x - before.x) * this.scale; this.offsetY -= (after.y - before.y) * this.scale; this.invalidateCache(); this.requestRender();
    }

    formatTooltipNumber(value) {
      const n=Number(value); if(!Number.isFinite(n))return '—';
      const abs=Math.abs(n);
      if((abs>0&&abs<1e-5)||abs>=1e6)return n.toExponential(4).replace('.',',');
      return Number(n.toFixed(6)).toLocaleString('pt-BR',{maximumFractionDigits:6});
    }
    registerHoverPoint(obj,screenPoint,worldPoint,meta={}) {
      if(!screenPoint||!worldPoint||!Number.isFinite(screenPoint.x)||!Number.isFinite(screenPoint.y)||!Number.isFinite(worldPoint.x)||!Number.isFinite(worldPoint.y))return;
      this.hoverPoints.push({obj,screen:{x:screenPoint.x,y:screenPoint.y},world:{x:worldPoint.x,y:worldPoint.y,z:Number.isFinite(worldPoint.z)?worldPoint.z:undefined},kind:meta.kind||'ponto',label:meta.label||'',expression:meta.expression||obj?.data?.expression||''});
    }
    nearestHoverPoint(px,py,radius=11) {
      let best=null,bestD=radius;
      for(const item of this.hoverPoints){const d=Math.hypot(item.screen.x-px,item.screen.y-py);if(d<=bestD){best=item;bestD=d;}}
      return best;
    }
    updatePointTooltip(px,py,pointerType='mouse') {
      if(pointerType==='touch'&&this.dragging)return;
      const hit=this.nearestHoverPoint(px,py,pointerType==='touch'?16:11);
      if(!hit){this.hidePointTooltip();return;}
      this.hoveredPoint=hit;
      const el=this.pointTooltip;if(!el)return;
      const title=hit.label||hit.kind||'Ponto';
      const x=this.formatTooltipNumber(hit.world.x),y=this.formatTooltipNumber(hit.world.y),z=Number.isFinite(hit.world.z)?this.formatTooltipNumber(hit.world.z):null;
      const meta=hit.expression?`<span class="point-tooltip-meta">${String(hit.expression).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}</span>`:'';
      el.innerHTML=`<span class="point-tooltip-title">${String(title).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))}</span><span class="point-tooltip-coords">x = ${x} · y = ${y}${z!==null?` · z = ${z}`:''}</span>${meta}`;
      el.hidden=false;el.classList.add('visible');
      const {w,h}=this.size,margin=10;
      let left=Math.min(w-margin,Math.max(margin,hit.screen.x));
      let top=Math.min(h-margin,Math.max(margin,hit.screen.y));
      el.style.left=`${left}px`;el.style.top=`${top}px`;
      requestAnimationFrame(()=>{
        const r=el.getBoundingClientRect(),cr=this.canvas.getBoundingClientRect();
        if(r.right>cr.right-margin)el.style.left=`${Math.max(margin,hit.screen.x-r.width-14)}px`;
        if(r.top<cr.top+margin)el.style.top=`${Math.min(h-margin,hit.screen.y+r.height*.55+10)}px`;
        if(r.bottom>cr.bottom-margin)el.style.top=`${Math.max(margin,hit.screen.y-r.height*.55-10)}px`;
      });
    }
    hidePointTooltip(){this.hoveredPoint=null;const el=this.pointTooltip;if(!el)return;el.classList.remove('visible');el.hidden=true;}

    gridStep() {
      const targetPixels = this.scale >= 800 ? 48 : this.scale >= 520 ? 54 : 62;
      const raw = targetPixels / Math.max(this.scale, 1e-9);
      const exp = Math.floor(Math.log10(Math.max(raw, 1e-12)));
      const norm = raw / Math.pow(10, exp);
      const factor = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
      const step = factor * Math.pow(10, exp);
      return this.scale >= 950 ? Math.min(step, 0.1) : step;
    }
    formatGridLabel(value) {
      const abs = Math.abs(value); if (abs >= 10000 || (abs > 0 && abs < .001)) return value.toExponential(1).replace('.', ',');
      return Number(value.toFixed(4)).toLocaleString('pt-BR', { maximumFractionDigits: 4 });
    }
    drawGrid() {
      if (!this.showGrid) return;
      const { w, h } = this.size, c = this.ctx, theme = this.theme; const ox = w / 2 + this.offsetX, oy = h / 2 + this.offsetY;
      const worldStep = this.gridStep(), step = worldStep * this.scale, majorEvery = 5, majorPx = step * majorEvery;
      c.save();
      if (this.showMinorGrid) {
        c.lineWidth = 1; c.strokeStyle = theme.grid;
        for (let x = ((ox % step) + step) % step; x < w; x += step) { c.beginPath(); c.moveTo(Math.round(x)+.5,0); c.lineTo(Math.round(x)+.5,h); c.stroke(); }
        for (let y = ((oy % step) + step) % step; y < h; y += step) { c.beginPath(); c.moveTo(0,Math.round(y)+.5); c.lineTo(w,Math.round(y)+.5); c.stroke(); }
      }
      c.lineWidth = 1.15; c.strokeStyle = theme.gridMajor;
      for (let x = ((ox % majorPx) + majorPx) % majorPx; x < w; x += majorPx) { c.beginPath(); c.moveTo(Math.round(x)+.5,0); c.lineTo(Math.round(x)+.5,h); c.stroke(); }
      for (let y = ((oy % majorPx) + majorPx) % majorPx; y < h; y += majorPx) { c.beginPath(); c.moveTo(0,Math.round(y)+.5); c.lineTo(w,Math.round(y)+.5); c.stroke(); }
      if (this.showLabels) {
        c.fillStyle = theme.label; c.font = '11px system-ui'; c.textBaseline = 'top'; c.textAlign = 'center';
        const startX = Math.ceil((-ox) / majorPx), endX = Math.floor((w - ox) / majorPx);
        for (let i = startX; i <= endX; i += 1) { const value = i * worldStep * majorEvery; if (Math.abs(value) < 1e-12) continue; const sx = ox + i * majorPx; const sy = Math.min(h - 16, Math.max(4, oy + 7)); c.fillText(this.formatGridLabel(value), sx, sy); }
        c.textAlign = 'right'; c.textBaseline = 'middle'; const startY = Math.ceil((-oy) / majorPx), endY = Math.floor((h - oy) / majorPx);
        for (let j = startY; j <= endY; j += 1) { const value = -j * worldStep * majorEvery; if (Math.abs(value) < 1e-12) continue; const sy = oy + j * majorPx; const sx = Math.min(w - 5, Math.max(30, ox - 7)); c.fillText(this.formatGridLabel(value), sx, sy); }
      }
      c.restore();
    }
    drawAxes() {
      if (!this.showAxes) return; const { w, h } = this.size, c = this.ctx, theme = this.theme, ox = w/2 + this.offsetX, oy = h/2 + this.offsetY;
      c.save(); c.strokeStyle = theme.axis; c.fillStyle = theme.axis; c.lineWidth = 1.6; c.lineCap = 'round';
      if (oy >= 0 && oy <= h) { c.beginPath(); c.moveTo(0,oy); c.lineTo(w-10,oy); c.stroke(); c.beginPath(); c.moveTo(w-10,oy-4); c.lineTo(w,oy); c.lineTo(w-10,oy+4); c.fill(); }
      if (ox >= 0 && ox <= w) { c.beginPath(); c.moveTo(ox,h); c.lineTo(ox,10); c.stroke(); c.beginPath(); c.moveTo(ox-4,10); c.lineTo(ox,0); c.lineTo(ox+4,10); c.fill(); }
      if (this.showLabels) { c.font = '600 13px system-ui'; if (oy >= 12 && oy <= h-12) c.fillText('x', w-22, oy-10); if (ox >= 12 && ox <= w-12) c.fillText('y', ox+8, 15); }
      c.restore();
    }

    objectDash(obj) {
      if (!global.AppUI?.a11yPrefs?.linePatterns) return [];
      const index = Math.max(0, this.objects.items.findIndex((o) => o.id === obj.id));
      const patterns = [[],[9,4],[3,4],[11,3,2,3],[14,5]];
      return patterns[index % patterns.length] || [];
    }
    lineStyle(obj, width = 2.2) {
      const c = this.ctx, color = this.objectColor(obj); c.strokeStyle = color; c.lineWidth = obj.id === this.selectedId ? width + 1.4 : width; c.lineCap = 'round'; c.lineJoin = 'round'; c.setLineDash(this.objectDash(obj));
      if (obj.id === this.selectedId) { c.shadowColor = color; c.shadowBlur = 7; } else c.shadowBlur = 0;
    }
    finishStyle() { this.ctx.setLineDash([]); this.ctx.shadowBlur = 0; }
    drawObjectMarker(obj, p, size = 5, alpha = 1) {
      if (!global.AppUI?.a11yPrefs?.markers || !p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      const c=this.ctx,color=this.objectColor(obj),index=Math.max(0,this.objects.items.findIndex(o=>o.id===obj.id)),shape=index%4;
      c.save();c.globalAlpha=Math.max(0,Math.min(1,alpha));c.fillStyle=this.theme.bg;c.strokeStyle=color;c.lineWidth=2;c.setLineDash([]);c.beginPath();
      if(shape===0)c.arc(p.x,p.y,size,0,Math.PI*2);
      else if(shape===1)c.rect(p.x-size,p.y-size,size*2,size*2);
      else if(shape===2){c.moveTo(p.x,p.y-size-1);c.lineTo(p.x+size+1,p.y);c.lineTo(p.x,p.y+size+1);c.lineTo(p.x-size-1,p.y);c.closePath();}
      else{c.moveTo(p.x,p.y-size-1);c.lineTo(p.x+size+1,p.y+size);c.lineTo(p.x-size-1,p.y+size);c.closePath();}
      c.fill();c.stroke();c.restore();
    }
    roundRectPath(x,y,w,h,r=9){const c=this.ctx,rr=Math.max(0,Math.min(r,Math.min(w,h)/2));c.beginPath();c.moveTo(x+rr,y);c.arcTo(x+w,y,x+w,y+h,rr);c.arcTo(x+w,y+h,x,y+h,rr);c.arcTo(x,y+h,x,y,rr);c.arcTo(x,y,x+w,y,rr);c.closePath();}
    formatPointValueNumber(value) {
      const n=Number(value); if(!Number.isFinite(n))return '—';
      const abs=Math.abs(n); if((abs>0&&abs<1e-5)||abs>=1e5)return n.toExponential(2).replace('.',',');
      const digits=this.scale>=950?3:this.scale>=520?2:this.scale>=145?2:1;
      return Number(n.toFixed(digits)).toLocaleString('pt-BR',{maximumFractionDigits:digits});
    }
    pointValuePolicy(kind='function') {
      const visibleCount=Math.max(1,(this.objects?.visible||this.objects?.items?.filter(o=>o.visible)||[]).length);
      const crowdFactor=visibleCount>=4?3:visibleCount>=3?2:1;
      if(kind==='point') return { enabled:this.showPointValues, stride:1, force:true };
      if(kind==='notable') return { enabled:this.showPointValues, stride:1, force:true };
      if(this.scale<170) return { enabled:false, stride:Infinity, force:false };
      let stride=this.scale>=950?1:this.scale>=520?2:this.scale>=320?4:6;
      stride*=crowdFactor;
      return { enabled:this.showPointValues, stride, force:false };
    }
    drawPointValueLabel(obj,p,world,index=0,overrideText='',options={}) {
      if(!this.showPointValues||!p||!world||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(world.x)||!Number.isFinite(world.y))return false;
      const force=Boolean(options.force);
      const budget=Number.isFinite(this.pointLabelBudget)?this.pointLabelBudget:24;
      const count=Number.isFinite(this.pointLabelCount)?this.pointLabelCount:0;
      if(!force && count>=budget)return false;
      const text=overrideText||`(${this.formatPointValueNumber(world.x)}; ${this.formatPointValueNumber(world.y)})`;
      const c=this.ctx,color=this.objectColor(obj),{w,h}=this.size;
      const font=this.scale>=520?'600 11px system-ui':'600 10px system-ui';
      c.save(); c.font=font;
      const padX=8,labelH=(this.scale>=520?24:22);
      const labelW=Math.ceil(c.measureText(text).width)+padX*2;
      const placements=[{dx:12,dy:-labelH-10},{dx:12,dy:10},{dx:-labelW-12,dy:-labelH-10},{dx:-labelW-12,dy:10}];
      const start=Math.abs(index)%placements.length;
      let chosen=null;
      const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
      const boxes=this.pointLabelBoxes||(this.pointLabelBoxes=[]);
      for(let k=0;k<placements.length;k+=1){
        const pl=placements[(start+k)%placements.length];
        const candidate={x:Math.max(6,Math.min(w-labelW-6,p.x+pl.dx)),y:Math.max(6,Math.min(h-labelH-6,p.y+pl.dy)),w:labelW,h:labelH};
        if(!boxes.some(box=>overlaps(candidate,box))){chosen=candidate;break;}
      }
      if(!chosen){
        if(!force){ c.restore(); return false; }
        chosen={x:Math.max(6,Math.min(w-labelW-6,p.x+12)),y:Math.max(6,Math.min(h-labelH-6,p.y-labelH-10)),w:labelW,h:labelH};
      }
      boxes.push(chosen);
      this.pointLabelCount=(this.pointLabelCount||0)+1;
      c.globalAlpha=document.documentElement.dataset.theme==='light'?.96:.93;
      c.fillStyle=document.documentElement.dataset.theme==='light'?'rgba(255,255,255,.96)':'rgba(6,16,28,.93)';
      c.strokeStyle=color; c.lineWidth=1.15; c.setLineDash([]);
      this.roundRectPath(chosen.x,chosen.y,chosen.w,chosen.h,9); c.fill(); c.stroke();
      c.globalAlpha=1; c.fillStyle=color; c.textAlign='center'; c.textBaseline='middle';
      c.fillText(text,chosen.x+chosen.w/2,chosen.y+chosen.h/2+0.5); c.restore();
      return true;
    }

    adaptiveFunctionMarkerXs(bounds) {
      const b=bounds||this.currentBounds();
      if (!b || !Number.isFinite(b.xmin) || !Number.isFinite(b.xmax) || b.xmax<=b.xmin || this.scale < 24) return [];
      const stepBase=this.gridStep();
      let step=stepBase*5;
      if(this.scale>=36)step=stepBase*2;
      if(this.scale>=70)step=stepBase;
      if(this.scale>=145)step=stepBase/2;
      if(this.scale>=280)step=stepBase/5;
      if(this.scale>=520)step=Math.min(step,0.2);
      if(this.scale>=950)step=Math.min(step,0.1);
      step=Math.max(1e-10,step);
      const start=Math.ceil(b.xmin/step)*step,end=Math.floor(b.xmax/step)*step,out=[];
      const maxPoints=this.scale>=950?240:this.scale>=520?160:72;
      for(let x=start;x<=end+step*1e-9 && out.length<maxPoints;x+=step){
        const normalized=Math.abs(x)<step*1e-9?0:Number(x.toPrecision(12));
        out.push(normalized);
      }
      return out;
    }

    drawAdaptiveFunctionMarkers(obj, fn, domainMin, domainMax) {
      if(!global.AppUI?.a11yPrefs?.markers)return;
      const bounds=this.currentBounds(), xs=this.adaptiveFunctionMarkerXs(bounds);
      if(!xs.length)return;
      const policy=this.pointValuePolicy('function');
      const size=this.scale>=950?3.2:this.scale>=520?3.6:this.scale>=145?4.2:this.scale>=70?4:3.8;
      const alpha=this.scale<36?.68:this.scale>=950?.82:.92;
      let markerIndex=0;
      for(const x of xs){
        if(x<domainMin||x>domainMax)continue;
        const y=fn({x}); if(!Number.isFinite(y)||Math.abs(y)>1e8)continue;
        const p=this.worldToScreen(x,y); if(p.x<-8||p.x>this.size.w+8||p.y<-8||p.y>this.size.h+8)continue;
        this.drawObjectMarker(obj,p,size,alpha);
        if(policy.enabled && markerIndex % Math.max(1,policy.stride) === 0) this.drawPointValueLabel(obj,p,{x,y},markerIndex);
        this.registerHoverPoint(obj,p,{x,y},{kind:'ponto da função',label:'Ponto da função',expression:obj.data.expression});
        markerIndex+=1;
      }
    }

    setNotableSource(id) {
      this.notableSourceId=Number.isFinite(Number(id))?Number(id):null;
      this.notableViewKey='';
      if(!this.notableSourceId)this.notablePoints=[];
      this.refreshNotablePoints(true);
      this.requestRender();
    }
    clearNotablePoints(){this.notableSourceId=null;this.notableViewKey='';this.notablePoints=[];this.requestRender();}
    refreshNotablePoints(force=false){
      if(!this.notableSourceId)return;
      const obj=this.objects.getById?.(this.notableSourceId)||this.objects.items.find(o=>o.id===this.notableSourceId);
      if(!obj||obj.type!=='function'||!obj.visible){this.notablePoints=[];return;}
      const b=this.currentBounds(),key=[obj.id,obj.data.expression,b.xmin.toFixed(5),b.xmax.toFixed(5),this.scale.toFixed(2)].join('|');
      if(!force&&key===this.notableViewKey)return;
      this.notableViewKey=key;
      try{
        const density=Math.max(260,Math.min(1200,Math.floor(this.size.w*1.15)));
        const roots=MathEngine.roots(obj.data.expression,b.xmin,b.xmax,{},density);
        const ext=MathEngine.extrema(obj.data.expression,b.xmin,b.xmax,{},Math.max(220,Math.floor(density*.75)));
        const fn=this.getCompiled(obj.id,obj.data.expression,{x:0}),points=[];
        roots.forEach(x=>points.push({x,y:0,color:obj.color,kind:'raiz'}));
        if(b.xmin<=0&&b.xmax>=0){const y0=fn({x:0});if(Number.isFinite(y0)&&y0>=b.ymin&&y0<=b.ymax)points.push({x:0,y:y0,color:obj.color,kind:'interseção y'});}
        ext.forEach(pt=>{if(Number.isFinite(pt.x)&&Number.isFinite(pt.y)&&pt.x>=b.xmin&&pt.x<=b.xmax&&pt.y>=b.ymin&&pt.y<=b.ymax)points.push({...pt,color:obj.color,kind:pt.kind||'extremo'});});
        const eps=Math.max(1e-8,3/Math.max(this.scale,1));
        this.notablePoints=points.filter((p,i,a)=>a.findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<eps)===i);
      }catch{this.notablePoints=[];}
    }
    drawFunction(obj) {
      let fn; try { fn = this.getCompiled(obj.id, obj.data.expression, { x: 0 }); } catch { return; }
      const { w, h } = this.size; const domainMin = Number.isFinite(obj.data.xMin) ? obj.data.xMin : -Infinity; const domainMax = Number.isFinite(obj.data.xMax) ? obj.data.xMax : Infinity;
      this.lineStyle(obj); this.ctx.beginPath(); let started = false, prevY = null, prevWorldY=null;
      const steps=Math.min(4200,Math.max(700,Math.ceil(w*Math.min(2.25,1.15+this.scale/260))));
      for (let i=0;i<=steps;i+=1) {
        const px=(i/steps)*w,x=this.screenToWorld(px,0).x;
        if(x<domainMin||x>domainMax){started=false;prevY=null;prevWorldY=null;continue;}
        const y=fn({x});
        if(!Number.isFinite(y)||Math.abs(y)>1e10){started=false;prevY=null;prevWorldY=null;continue;}
        const p=this.worldToScreen(x,y);
        const screenJump=prevY!==null?Math.abs(p.y-prevY):0;
        const worldJump=prevWorldY!==null?Math.abs(y-prevWorldY):0;
        const breakSegment=!started||screenJump>h*.92||(worldJump*this.scale>h*1.3);
        if(breakSegment)this.ctx.moveTo(p.x,p.y);else this.ctx.lineTo(p.x,p.y);
        started=true;prevY=p.y;prevWorldY=y;
      }
      this.ctx.stroke(); this.finishStyle(); this.drawAdaptiveFunctionMarkers(obj,fn,domainMin,domainMax);
    }
    drawParametric(obj) {
      let fx,fy; try{fx=this.getCompiled(`${obj.id}:x`,obj.data.xExpr,{t:0});fy=this.getCompiled(`${obj.id}:y`,obj.data.yExpr,{t:0});}catch{return;}
      const steps=900; this.lineStyle(obj); this.ctx.beginPath(); let started=false,markerPoint=null;
      for(let i=0;i<=steps;i+=1){const t=obj.data.tMin+(obj.data.tMax-obj.data.tMin)*i/steps,x=fx({t}),y=fy({t});if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1e8||Math.abs(y)>1e8){started=false;continue;}const p=this.worldToScreen(x,y);if(!started){this.ctx.moveTo(p.x,p.y);started=true;}else this.ctx.lineTo(p.x,p.y);if(!markerPoint&&i>=steps*.48&&i<=steps*.52)markerPoint=p;}this.ctx.stroke();this.finishStyle();this.drawObjectMarker(obj,markerPoint);
    }
    drawVector(obj) { const d=obj.data,a=this.worldToScreen(d.x1,d.y1),b=this.worldToScreen(d.x2,d.y2),color=this.objectColor(obj);this.lineStyle(obj,2.5);this.ctx.beginPath();this.ctx.moveTo(a.x,a.y);this.ctx.lineTo(b.x,b.y);this.ctx.stroke();this.finishStyle();this.drawObjectMarker(obj,{x:(a.x+b.x)/2,y:(a.y+b.y)/2},4.5);const ang=Math.atan2(b.y-a.y,b.x-a.x),len=12;this.ctx.fillStyle=color;this.ctx.beginPath();this.ctx.moveTo(b.x,b.y);this.ctx.lineTo(b.x-len*Math.cos(ang-.55),b.y-len*Math.sin(ang-.55));this.ctx.lineTo(b.x-len*Math.cos(ang+.55),b.y-len*Math.sin(ang+.55));this.ctx.closePath();this.ctx.fill(); }
    drawPoint(obj) { const p=this.worldToScreen(obj.data.x,obj.data.y),color=this.objectColor(obj);this.registerHoverPoint(obj,p,{x:obj.data.x,y:obj.data.y},{kind:'ponto',label:'Ponto'});if(global.AppUI?.a11yPrefs?.markers)this.drawObjectMarker(obj,p,obj.id===this.selectedId?6:5);else{this.ctx.save();this.ctx.fillStyle=color;this.ctx.shadowColor=obj.id===this.selectedId?color:'transparent';this.ctx.shadowBlur=obj.id===this.selectedId?8:0;this.ctx.beginPath();this.ctx.arc(p.x,p.y,obj.id===this.selectedId?5.5:4,0,Math.PI*2);this.ctx.fill();this.ctx.restore(); }this.drawPointValueLabel(obj,p,{x:obj.data.x,y:obj.data.y},0,'',{force:true}); }
    drawCircle(obj){this.drawPolar(obj,t=>[obj.data.cx+obj.data.r*Math.cos(t),obj.data.cy+obj.data.r*Math.sin(t)]);} drawEllipse(obj){this.drawPolar(obj,t=>[obj.data.cx+obj.data.a*Math.cos(t),obj.data.cy+obj.data.b*Math.sin(t)]);} drawPolar(obj,fn){this.lineStyle(obj);this.ctx.beginPath();let markerPoint=null;for(let i=0;i<=260;i+=1){const t=i/260*Math.PI*2,[x,y]=fn(t),p=this.worldToScreen(x,y);if(i===0){this.ctx.moveTo(p.x,p.y);markerPoint=p;}else this.ctx.lineTo(p.x,p.y);}this.ctx.stroke();this.finishStyle();this.drawObjectMarker(obj,markerPoint);}
    drawLine(obj){const{a,b,c}=obj.data;if(Math.abs(b)>1e-12){const bounds=this.currentBounds(),x1=bounds.xmin-2,x2=bounds.xmax+2;this.strokeSegment(obj,x1,(-a*x1-c)/b,x2,(-a*x2-c)/b);}else if(Math.abs(a)>1e-12){const bounds=this.currentBounds(),x=-c/a;this.strokeSegment(obj,x,bounds.ymin-2,x,bounds.ymax+2);}}
    drawPolygon(obj){const pts=Array.isArray(obj.data.vertices)?obj.data.vertices:[];if(pts.length<2)return;const color=this.objectColor(obj);this.lineStyle(obj);this.ctx.beginPath();let markerPoint=null;pts.forEach((v,i)=>{const p=this.worldToScreen(v[0],v[1]);if(i===0){this.ctx.moveTo(p.x,p.y);markerPoint=p;}else this.ctx.lineTo(p.x,p.y);});this.ctx.closePath();this.ctx.globalAlpha=.12;this.ctx.fillStyle=color;this.ctx.fill();this.ctx.globalAlpha=1;this.ctx.stroke();this.finishStyle();this.drawObjectMarker(obj,markerPoint);}
    drawWashers(obj){
      const axis=obj.data.axis==='y'?'y':'x',vars={[axis]:0};let outer,inner;
      try{outer=this.getCompiled(`${obj.id}:outer:${axis}`,obj.data.outerExpr,vars);inner=this.getCompiled(`${obj.id}:inner:${axis}`,obj.data.innerExpr||'0',vars);}catch{return;}
      const a=obj.data.a,b=obj.data.b,steps=300,color=this.objectColor(obj),isWasher=obj.data.method==='washers';
      const P=(u,r)=>axis==='x'?this.worldToScreen(u,r):this.worldToScreen(r,u);
      const radial=(fn,u)=>{const v=fn({[axis]:u});return Number.isFinite(v)?Math.max(0,v):NaN;};
      const outerSamples=[],innerSamples=[];
      for(let i=0;i<=steps;i+=1){const u=a+(b-a)*i/steps,R=radial(outer,u),r=isWasher?radial(inner,u):0;if(!Number.isFinite(R)||!Number.isFinite(r))continue;outerSamples.push({u,r:R});innerSamples.push({u,r:Math.min(R,r)});}
      if(outerSamples.length<2)return;
      const c=this.ctx;c.save();
      // Eixo de rotação destacado apenas no intervalo do sólido.
      const axisA=P(a,0),axisB=P(b,0);c.strokeStyle=this.theme.guide;c.lineWidth=1.25;c.globalAlpha=.72;c.setLineDash([7,5]);c.beginPath();c.moveTo(axisA.x,axisA.y);c.lineTo(axisB.x,axisB.y);c.stroke();c.setLineDash([]);
      // Envelope completo do sólido: +R e -R, com vazio central ±r para anéis.
      c.beginPath();
      outerSamples.forEach((q,i)=>{const p=P(q.u,q.r);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});
      [...outerSamples].reverse().forEach(q=>{const p=P(q.u,-q.r);c.lineTo(p.x,p.y);});c.closePath();
      if(isWasher){
        innerSamples.forEach((q,i)=>{const p=P(q.u,q.r);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});
        [...innerSamples].reverse().forEach(q=>{const p=P(q.u,-q.r);c.lineTo(p.x,p.y);});c.closePath();
      }
      c.fillStyle=color;c.globalAlpha=.13;try{c.fill('evenodd');}catch{c.fill();}
      // Fronteiras externas e internas espelhadas em torno do eixo de rotação.
      c.globalAlpha=1;c.strokeStyle=color;c.lineWidth=obj.id===this.selectedId?3.2:2.1;c.lineCap='round';c.lineJoin='round';c.setLineDash(this.objectDash(obj));
      for(const sign of [1,-1]){c.beginPath();outerSamples.forEach((q,i)=>{const p=P(q.u,sign*q.r);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});c.stroke();}
      if(isWasher){for(const sign of [1,-1]){c.beginPath();innerSamples.forEach((q,i)=>{const p=P(q.u,sign*q.r);i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);});c.stroke();}}
      c.setLineDash([]);
      // Faces inicial/final e seções didáticas ao longo do intervalo.
      const drawSection=(u,R,r,strong=false)=>{c.save();c.strokeStyle=color;c.lineWidth=strong?1.6:1;c.globalAlpha=strong?.88:.34;c.setLineDash(strong?[]:[3,5]);const a1=P(u,R),a2=P(u,r),b1=P(u,-R),b2=P(u,-r);c.beginPath();if(isWasher&&r>1e-10){c.moveTo(a1.x,a1.y);c.lineTo(a2.x,a2.y);c.moveTo(b2.x,b2.y);c.lineTo(b1.x,b1.y);}else{c.moveTo(a1.x,a1.y);c.lineTo(b1.x,b1.y);}c.stroke();c.restore();};
      for(const u of [a,b]){const R=radial(outer,u),r=isWasher?Math.min(R,radial(inner,u)):0;if(Number.isFinite(R)&&Number.isFinite(r))drawSection(u,R,r,true);}
      const sections=6;for(let k=1;k<=sections;k+=1){const u=a+(b-a)*k/(sections+1),R=radial(outer,u),r=isWasher?Math.min(R,radial(inner,u)):0;if(!Number.isFinite(R)||!Number.isFinite(r))continue;drawSection(u,R,r,false);const area=Math.PI*Math.max(0,R*R-r*r),hit=P(u,R);this.registerHoverPoint(obj,hit,axis==='x'?{x:u,y:R}:{x:R,y:u},{kind:isWasher?'seção de anel':'seção de disco',label:isWasher?'Seção de anel':'Seção de disco',expression:`${axis} = ${this.formatTooltipNumber(u)} · R = ${this.formatTooltipNumber(R)}${isWasher?` · r = ${this.formatTooltipNumber(r)}`:''} · A ≈ ${this.formatTooltipNumber(area)}`});}
      // Raios didáticos na seção central.
      const mid=(a+b)/2,Rm=radial(outer,mid),rm=isWasher?Math.min(Rm,radial(inner,mid)):0;
      if(Number.isFinite(Rm)){const center=P(mid,0),out=P(mid,Rm);c.save();c.strokeStyle=this.theme.guide;c.fillStyle=this.theme.label;c.lineWidth=1.25;c.globalAlpha=.9;c.setLineDash([4,3]);c.beginPath();c.moveTo(center.x,center.y);c.lineTo(out.x,out.y);c.stroke();c.setLineDash([]);c.font='600 11px system-ui';c.textAlign='left';c.textBaseline='middle';c.fillText('R',out.x+6,out.y);if(isWasher&&rm>1e-10){const inn=P(mid,rm);c.beginPath();c.moveTo(center.x,center.y);c.lineTo(inn.x,inn.y);c.stroke();c.fillText('r',inn.x+6,inn.y);}c.restore();}
      c.restore();this.finishStyle();
    }
    strokeSegment(obj,x1,y1,x2,y2){const p1=this.worldToScreen(x1,y1),p2=this.worldToScreen(x2,y2);this.lineStyle(obj);this.ctx.beginPath();this.ctx.moveTo(p1.x,p1.y);this.ctx.lineTo(p2.x,p2.y);this.ctx.stroke();this.finishStyle();this.drawObjectMarker(obj,{x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2});}
    drawObject(obj){if(obj.type==='function')this.drawFunction(obj);else if(obj.type==='parametric')this.drawParametric(obj);else if(obj.type==='vector')this.drawVector(obj);else if(obj.type==='point')this.drawPoint(obj);else if(obj.type==='circle')this.drawCircle(obj);else if(obj.type==='ellipse')this.drawEllipse(obj);else if(obj.type==='line')this.drawLine(obj);else if(obj.type==='polygon')this.drawPolygon(obj);else if(obj.type==='washers')this.drawWashers(obj);}

    project3D(point) {
      const {w,h}=this.size,c=this.camera3d,t=c.target||{x:0,y:0,z:0};
      const x=point.x-t.x,y=point.y-t.y,z=point.z-t.z;
      const cy=Math.cos(c.yaw),sy=Math.sin(c.yaw),cp=Math.cos(c.pitch),sp=Math.sin(c.pitch);
      const rx=cy*x+sy*y, ry=-sy*x+cy*y;
      const rz=sp*ry+cp*z, rv=cp*ry-sp*z;
      const depth=c.distance-rv;
      if(depth<=.08)return null;
      const focal=(Math.min(w,h)*.5)/Math.tan((c.fov*Math.PI/180)/2);
      return{x:w/2+rx*focal/depth,y:h/2-rz*focal/depth,depth};
    }
    drawLine3DProjected(a,b,color,width=1,alpha=1,dash=[]) {
      const pa=this.project3D(a),pb=this.project3D(b);if(!pa||!pb)return;
      const c=this.ctx;c.save();c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.setLineDash(dash);c.beginPath();c.moveTo(pa.x,pa.y);c.lineTo(pb.x,pb.y);c.stroke();c.restore();
    }
    drawGrid3D() {
      if(!this.showGrid)return;
      const c=this.ctx,theme=this.theme,extent=Math.max(6,Math.min(30,Math.ceil(this.camera3d.distance*.75))),step=extent>18?2:1;
      for(let i=-extent;i<=extent;i+=step){const major=i===0||i%(step*5)===0;const color=major?theme.gridMajor:theme.grid;this.drawLine3DProjected({x:-extent,y:i,z:0},{x:extent,y:i,z:0},color,major?1.15:1,major?.9:.72);this.drawLine3DProjected({x:i,y:-extent,z:0},{x:i,y:extent,z:0},color,major?1.15:1,major?.9:.72);}
    }
    drawAxes3D() {
      if(!this.showAxes)return;
      const extent=Math.max(5,Math.min(24,Math.ceil(this.camera3d.distance*.62))),theme=this.theme,c=this.ctx;
      const axes=[['x',{x:-extent,y:0,z:0},{x:extent,y:0,z:0},'#48dff7'],['y',{x:0,y:-extent,z:0},{x:0,y:extent,z:0},'#a47dff'],['z',{x:0,y:0,z:-extent},{x:0,y:0,z:extent},'#ff6fb8']];
      axes.forEach(([label,a,b,color])=>{this.drawLine3DProjected(a,b,color,1.8,.95);if(this.showLabels){const p=this.project3D(b);if(p){c.save();c.fillStyle=color;c.font='700 12px system-ui';c.fillText(label,p.x+6,p.y-6);c.restore();}}});
    }
    sampleCurve3D(obj,steps=520) {
      try{const fx=this.getCompiled(`${obj.id}:3dx`,obj.data.xExpr,{t:0}),fy=this.getCompiled(`${obj.id}:3dy`,obj.data.yExpr,{t:0}),fz=this.getCompiled(`${obj.id}:3dz`,obj.data.zExpr,{t:0}),pts=[];for(let i=0;i<=steps;i++){const t=obj.data.tMin+(obj.data.tMax-obj.data.tMin)*i/steps,x=fx({t}),y=fy({t}),z=fz({t});pts.push(Number.isFinite(x)&&Number.isFinite(y)&&Number.isFinite(z)&&Math.max(Math.abs(x),Math.abs(y),Math.abs(z))<1e8?{x,y,z,t}:null);}return pts;}catch{return[];}
    }
    drawCurve3D(obj) {
      const pts=this.sampleCurve3D(obj,Math.max(320,Math.min(1200,Math.floor(this.size.w*1.05)))),color=this.objectColor(obj),c=this.ctx;c.save();c.strokeStyle=color;c.lineWidth=obj.id===this.selectedId?3.5:2.3;c.lineCap='round';c.lineJoin='round';c.setLineDash(this.objectDash(obj));if(obj.id===this.selectedId){c.shadowColor=color;c.shadowBlur=7;}c.beginPath();let pen=false;
      pts.forEach((q,i)=>{if(!q){pen=false;return;}const p=this.project3D(q);if(!p){pen=false;return;}if(!pen){c.moveTo(p.x,p.y);pen=true;}else c.lineTo(p.x,p.y);if(global.AppUI?.a11yPrefs?.markers&&i%Math.max(1,Math.floor(pts.length/28))===0){this.registerHoverPoint(obj,p,q,{kind:'ponto da curva 3D',label:'Curva 3D',expression:`x(t)=${obj.data.xExpr}; y(t)=${obj.data.yExpr}; z(t)=${obj.data.zExpr}`});}});c.stroke();c.restore();
      if(global.AppUI?.a11yPrefs?.markers){for(let i=0;i<pts.length;i+=Math.max(1,Math.floor(pts.length/24))){const q=pts[i];if(!q)continue;const p=this.project3D(q);if(!p)continue;this.drawObjectMarker(obj,p,3.4,.86);this.registerHoverPoint(obj,p,q,{kind:'ponto da curva 3D',label:'Curva 3D',expression:`t = ${this.formatTooltipNumber(q.t)}`});}}
    }
    line3DPoints(obj,extent=10){const d=obj.data;if(d.method==='twoPoints'){const a={x:d.x1,y:d.y1,z:d.z1},b={x:d.x2,y:d.y2,z:d.z2},v={x:b.x-a.x,y:b.y-a.y,z:b.z-a.z};return[{x:a.x-v.x*extent,y:a.y-v.y*extent,z:a.z-v.z*extent},{x:a.x+v.x*extent,y:a.y+v.y*extent,z:a.z+v.z*extent},a,b];}const a={x:d.x0,y:d.y0,z:d.z0},v={x:d.a,y:d.b,z:d.c};return[{x:a.x-v.x*extent,y:a.y-v.y*extent,z:a.z-v.z*extent},{x:a.x+v.x*extent,y:a.y+v.y*extent,z:a.z+v.z*extent},a,{x:a.x+v.x,y:a.y+v.y,z:a.z+v.z}];}
    drawLine3D(obj){const [a,b,p0,p1]=this.line3DPoints(obj,4),color=this.objectColor(obj);this.drawLine3DProjected(a,b,color,obj.id===this.selectedId?3.4:2.3,1,this.objectDash(obj));[p0,p1].forEach((q,i)=>{const p=this.project3D(q);if(!p)return;if(global.AppUI?.a11yPrefs?.markers)this.drawObjectMarker(obj,p,i?4:5,.95);this.registerHoverPoint(obj,p,q,{kind:i?'direção/ponto B':'ponto base',label:'Reta 3D'});});}
    draw3DScene() {
      const {w,h}=this.size,c=this.ctx;this.hoverPoints=[];c.clearRect(0,0,w,h);c.fillStyle=this.theme.bg;c.fillRect(0,0,w,h);this.drawGrid3D();this.drawAxes3D();
      for(const obj of this.objects.items){if(!obj.visible)continue;if(obj.type==='curve3d')this.drawCurve3D(obj);else if(obj.type==='line3d')this.drawLine3D(obj);}
      if(this.hoveredPoint){this.updatePointTooltip(this.hoveredPoint.screen.x,this.hoveredPoint.screen.y,'mouse');}
    }
    getObjectBounds3D(obj){try{if(obj.type==='curve3d'){const pts=this.sampleCurve3D(obj,320).filter(Boolean);if(!pts.length)return null;return{xmin:Math.min(...pts.map(p=>p.x)),xmax:Math.max(...pts.map(p=>p.x)),ymin:Math.min(...pts.map(p=>p.y)),ymax:Math.max(...pts.map(p=>p.y)),zmin:Math.min(...pts.map(p=>p.z)),zmax:Math.max(...pts.map(p=>p.z))};}if(obj.type==='line3d'){const [, ,p0,p1]=this.line3DPoints(obj,1);return{xmin:Math.min(p0.x,p1.x),xmax:Math.max(p0.x,p1.x),ymin:Math.min(p0.y,p1.y),ymax:Math.max(p0.y,p1.y),zmin:Math.min(p0.z,p1.z),zmax:Math.max(p0.z,p1.z)};}}catch{}return null;}

    drawInspection() {
      if (!this.inspectMode || !Number.isFinite(this.inspectX)) return; const { h } = this.size, c=this.ctx, theme=this.theme, p=this.worldToScreen(this.inspectX,0);
      c.save();c.strokeStyle=theme.guide;c.lineWidth=1.2;c.setLineDash([5,5]);c.beginPath();c.moveTo(p.x,0);c.lineTo(p.x,h);c.stroke();c.setLineDash([]);
      for(const obj of this.objects.visible){if(obj.type!=='function')continue;try{const fn=this.getCompiled(obj.id,obj.data.expression,{x:0}),y=fn({x:this.inspectX});if(!Number.isFinite(y))continue;const q=this.worldToScreen(this.inspectX,y);if(q.y<-20||q.y>h+20)continue;c.fillStyle=this.objectColor(obj);c.beginPath();c.arc(q.x,q.y,4.5,0,Math.PI*2);c.fill();}catch{}}
      c.restore();
    }
    drawNotablePoints(){if(!this.notablePoints?.length)return;const c=this.ctx;c.save();let idx=0;for(const n of this.notablePoints){const p=this.worldToScreen(n.x,n.y);c.fillStyle=this.objectColor({color:n.color||'#ffd166'});c.strokeStyle=this.theme.bg;c.lineWidth=2;c.beginPath();c.arc(p.x,p.y,5,0,Math.PI*2);c.fill();c.stroke();const obj=this.objects.getById?.(this.notableSourceId)||this.objects.items.find(o=>o.id===this.notableSourceId);this.drawPointValueLabel(obj||{color:n.color||'#ffd166'},p,{x:n.x,y:n.y},idx++,String(n.kind||'Ponto').replace(/^./,m=>m.toUpperCase())+`: (${this.formatPointValueNumber(n.x)}; ${this.formatPointValueNumber(n.y)})`,{force:true});this.registerHoverPoint(obj,p,{x:n.x,y:n.y},{kind:n.kind||'ponto notável',label:n.kind||'Ponto notável',expression:obj?.data?.expression||''});}c.restore();}
    render(){if(this.viewMode==='3d'){this.draw3DScene();return;}const{w,h}=this.size,c=this.ctx;this.hoverPoints=[];this.pointLabelBoxes=[];this.pointLabelCount=0;this.pointLabelBudget=Math.max(10,Math.min(28,Math.floor((w*h)/70000)));c.clearRect(0,0,w,h);c.fillStyle=this.theme.bg;c.fillRect(0,0,w,h);this.drawGrid();this.drawAxes();for(const obj of this.objects.items)if(obj.visible)this.drawObject(obj);this.refreshNotablePoints();this.drawNotablePoints();this.drawInspection();if(this.pointer){const sp=this.worldToScreen(this.pointer.x,this.pointer.y);this.updatePointTooltip(sp.x,sp.y,'mouse');}else this.hidePointTooltip();}

    getObjectBounds(obj) {
      try {
        if(obj.type==='point')return{xmin:obj.data.x,xmax:obj.data.x,ymin:obj.data.y,ymax:obj.data.y};
        if(obj.type==='vector')return{xmin:Math.min(obj.data.x1,obj.data.x2),xmax:Math.max(obj.data.x1,obj.data.x2),ymin:Math.min(obj.data.y1,obj.data.y2),ymax:Math.max(obj.data.y1,obj.data.y2)};
        if(obj.type==='circle')return{xmin:obj.data.cx-obj.data.r,xmax:obj.data.cx+obj.data.r,ymin:obj.data.cy-obj.data.r,ymax:obj.data.cy+obj.data.r};
        if(obj.type==='ellipse')return{xmin:obj.data.cx-obj.data.a,xmax:obj.data.cx+obj.data.a,ymin:obj.data.cy-obj.data.b,ymax:obj.data.cy+obj.data.b};
        if(obj.type==='polygon'){const v=obj.data.vertices||[];if(!v.length)return null;return{xmin:Math.min(...v.map(p=>p[0])),xmax:Math.max(...v.map(p=>p[0])),ymin:Math.min(...v.map(p=>p[1])),ymax:Math.max(...v.map(p=>p[1]))};}
        if(obj.type==='washers'){const axis=obj.data.axis==='y'?'y':'x',fn=this.getCompiled(`${obj.id}:outer:${axis}`,obj.data.outerExpr,{[axis]:0});let rmax=0;for(let i=0;i<=240;i+=1){const u=obj.data.a+(obj.data.b-obj.data.a)*i/240,r=fn({[axis]:u});if(Number.isFinite(r))rmax=Math.max(rmax,Math.max(0,r));}return axis==='x'?{xmin:obj.data.a,xmax:obj.data.b,ymin:-rmax,ymax:rmax}:{xmin:-rmax,xmax:rmax,ymin:obj.data.a,ymax:obj.data.b};}
        if(obj.type==='function'){const fn=this.getCompiled(obj.id,obj.data.expression,{x:0});const xmin=Number.isFinite(obj.data.xMin)?obj.data.xMin:-10,xmax=Number.isFinite(obj.data.xMax)?obj.data.xMax:10;let ymin=Infinity,ymax=-Infinity;for(let i=0;i<=220;i+=1){const x=xmin+(xmax-xmin)*i/220,y=fn({x});if(Number.isFinite(y)&&Math.abs(y)<1e6){ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}}return Number.isFinite(ymin)?{xmin,xmax,ymin,ymax}:null;}
        if(obj.type==='parametric'){const fx=this.getCompiled(`${obj.id}:x`,obj.data.xExpr,{t:0}),fy=this.getCompiled(`${obj.id}:y`,obj.data.yExpr,{t:0});let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;for(let i=0;i<=220;i+=1){const t=obj.data.tMin+(obj.data.tMax-obj.data.tMin)*i/220,x=fx({t}),y=fy({t});if(Number.isFinite(x)&&Number.isFinite(y)){xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}}return Number.isFinite(xmin)?{xmin,xmax,ymin,ymax}:null;}
      } catch {}
      return null;
    }
    fitToObjects(){if(this.viewMode==='3d'){const arr=this.objects.visible.map(o=>this.getObjectBounds3D(o)).filter(Boolean);if(!arr.length){this.center();return;}const xmin=Math.min(...arr.map(b=>b.xmin)),xmax=Math.max(...arr.map(b=>b.xmax)),ymin=Math.min(...arr.map(b=>b.ymin)),ymax=Math.max(...arr.map(b=>b.ymax)),zmin=Math.min(...arr.map(b=>b.zmin)),zmax=Math.max(...arr.map(b=>b.zmax));const cx=(xmin+xmax)/2,cy=(ymin+ymax)/2,cz=(zmin+zmax)/2,span=Math.max(xmax-xmin,ymax-ymin,zmax-zmin,1);this.camera3d.target={x:cx,y:cy,z:cz};this.camera3d.distance=Math.max(4,Math.min(180,span*2.35));this.requestRender();return;}const arr=this.objects.visible.map(o=>this.getObjectBounds(o)).filter(Boolean);if(!arr.length){this.center();return;}let xmin=Math.min(...arr.map(b=>b.xmin)),xmax=Math.max(...arr.map(b=>b.xmax)),ymin=Math.min(...arr.map(b=>b.ymin)),ymax=Math.max(...arr.map(b=>b.ymax));if(xmin===xmax){xmin-=1;xmax+=1;}if(ymin===ymax){ymin-=1;ymax+=1;}const{w,h}=this.size,pad=46,sx=(w-pad*2)/(xmax-xmin),sy=(h-pad*2)/(ymax-ymin);this.scale=Math.max(5,Math.min(450,Math.min(sx,sy)));const cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;this.offsetX=-cx*this.scale;this.offsetY=cy*this.scale;this.requestRender();}
    inspectionValues(x){const values=[];for(const obj of this.objects.visible){if(obj.type==='function'){try{const y=this.getCompiled(obj.id,obj.data.expression,{x:0})({x});if(Number.isFinite(y))values.push({id:obj.id,label:`f${obj.id}(x)`,expression:obj.data.expression,y,color:this.objectColor(obj)});}catch{}}}return values;}

    exportPng(filename='OrbisV-grafico.png'){this.render();const link=document.createElement('a');link.download=filename;link.href=this.canvas.toDataURL('image/png');link.click();}
    exportSvg(filename='OrbisV-grafico.svg'){
      const{w,h}=this.size,theme=this.theme,parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,`<rect width="100%" height="100%" fill="${theme.bg}"/>`];
      if(this.showGrid){const step=this.gridStep()*this.scale,ox=w/2+this.offsetX,oy=h/2+this.offsetY;parts.push(`<g stroke="${theme.gridMajor}" stroke-width="1">`);for(let x=((ox%step)+step)%step;x<w;x+=step)parts.push(`<line x1="${x.toFixed(2)}" y1="0" x2="${x.toFixed(2)}" y2="${h}"/>`);for(let y=((oy%step)+step)%step;y<h;y+=step)parts.push(`<line x1="0" y1="${y.toFixed(2)}" x2="${w}" y2="${y.toFixed(2)}"/>`);parts.push('</g>');}
      if(this.showAxes){const ox=w/2+this.offsetX,oy=h/2+this.offsetY;parts.push(`<g stroke="${theme.axis}" stroke-width="1.6"><line x1="0" y1="${oy}" x2="${w}" y2="${oy}"/><line x1="${ox}" y1="0" x2="${ox}" y2="${h}"/></g>`);}
      for(const obj of this.objects.visible){const s=this.objectToSvg(obj);if(s)parts.push(s);}parts.push('</svg>');this.downloadText(parts.join(''),'image/svg+xml',filename);
    }
    objectToSvg(obj){const p=(x,y)=>this.worldToScreen(x,y),color=this.objectColor(obj);if(obj.type==='point'){const q=p(obj.data.x,obj.data.y);return`<circle cx="${q.x}" cy="${q.y}" r="4" fill="${color}"/>`;}if(obj.type==='vector'){const a=p(obj.data.x1,obj.data.y1),b=p(obj.data.x2,obj.data.y2);return`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="2.5"/>`;}if(obj.type==='circle'){const q=p(obj.data.cx,obj.data.cy);return`<circle cx="${q.x}" cy="${q.y}" r="${obj.data.r*this.scale}" fill="none" stroke="${color}" stroke-width="2.2"/>`;}if(obj.type==='ellipse'){const q=p(obj.data.cx,obj.data.cy);return`<ellipse cx="${q.x}" cy="${q.y}" rx="${obj.data.a*this.scale}" ry="${obj.data.b*this.scale}" fill="none" stroke="${color}" stroke-width="2.2"/>`;}if(obj.type==='line'){const b=this.currentBounds(),d=obj.data;if(Math.abs(d.b)>1e-12)return this.svgLine(b.xmin,(-d.a*b.xmin-d.c)/d.b,b.xmax,(-d.a*b.xmax-d.c)/d.b,color);if(Math.abs(d.a)>1e-12){const x=-d.c/d.a;return this.svgLine(x,b.ymin,x,b.ymax,color);}return'';}if(obj.type==='polygon'){const pts=(obj.data.vertices||[]).map(v=>p(v[0],v[1]));return pts.length?`<polygon points="${pts.map(q=>`${q.x},${q.y}`).join(' ')}" fill="${color}" fill-opacity=".12" stroke="${color}" stroke-width="2.2"/>`:'';}if(obj.type==='function'||obj.type==='parametric'){try{const pts=[];if(obj.type==='function'){const fn=this.getCompiled(obj.id,obj.data.expression,{x:0}),bounds=this.currentBounds();for(let i=0;i<=800;i+=1){const x=bounds.xmin+(bounds.xmax-bounds.xmin)*i/800,y=fn({x});if(Number.isFinite(y)&&Math.abs(y)<1e8)pts.push(p(x,y));else pts.push(null);}}else{const fx=this.getCompiled(`${obj.id}:x`,obj.data.xExpr,{t:0}),fy=this.getCompiled(`${obj.id}:y`,obj.data.yExpr,{t:0});for(let i=0;i<=800;i+=1){const t=obj.data.tMin+(obj.data.tMax-obj.data.tMin)*i/800,x=fx({t}),y=fy({t});pts.push(Number.isFinite(x)&&Number.isFinite(y)?p(x,y):null);}}let d='',pen=false;for(const q of pts){if(!q){pen=false;continue;}d+=`${pen?'L':'M'}${q.x.toFixed(2)},${q.y.toFixed(2)} `;pen=true;}return`<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`;}catch{return'';}}return'';}
    svgLine(x1,y1,x2,y2,color){const a=this.worldToScreen(x1,y1),b=this.worldToScreen(x2,y2);return`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="2.2"/>`;}
    downloadText(text,type,filename){const blob=new Blob([text],{type:`${type};charset=utf-8`}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
  }

  global.GraphEngine = GraphEngine;
})(window);
