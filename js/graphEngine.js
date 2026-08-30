(function (global) {
  'use strict';

  class GraphEngine {
    constructor(canvas, objects) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.objects = objects;
      this.scale = 42;
      this.offsetX = 0;
      this.offsetY = 0;
      this.dragging = false;
      this.last = { x: 0, y: 0 };
      this.pointer = null;
      this.showGrid = true;
      this.showAxes = true;
      this.framePending = false;
      this.pointerActive = false;
      this.activePointers = new Map();
      this.pinchDistance = null;
      this.boxZoom = null;
      this.cache = new Map();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas.parentElement);
      this.bindEvents();
      this.resize();
    }

    resize() {
      const parent = this.canvas?.parentElement;
      if (!parent) return;
      const fallbackW = Number.isFinite(global.innerWidth) ? global.innerWidth : 800;
      const fallbackH = Number.isFinite(global.innerHeight) ? global.innerHeight : 600;
      const clientW = Number(parent.clientWidth) || 0;
      const clientH = Number(parent.clientHeight) || 0;
      const rect = typeof parent.getBoundingClientRect === 'function' ? parent.getBoundingClientRect() : null;
      const rectW = Number(rect?.width) || 0;
      const rectH = Number(rect?.height) || 0;
      const w = Math.max(320, Math.floor(clientW || rectW || fallbackW));
      const h = Math.max(320, Math.floor(clientH || rectH || fallbackH));
      const dpr = Math.max(1, Math.min(2, global.devicePixelRatio || 1));
      const pixelW = Math.floor(w * dpr);
      const pixelH = Math.floor(h * dpr);
      if (this.canvas.width !== pixelW || this.canvas.height !== pixelH) {
        this.canvas.width = pixelW;
        this.canvas.height = pixelH;
      }
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.invalidateCache('resize');
      this.requestRender();
    }

    get size() {
      const w = this.canvas.clientWidth || parseFloat(this.canvas.style.width) || 320;
      const h = this.canvas.clientHeight || parseFloat(this.canvas.style.height) || 320;
      return { w: Math.max(320, w), h: Math.max(320, h) };
    }

    center() {
      this.offsetX = 0;
      this.offsetY = 0;
      this.scale = Math.max(24, Math.min(64, this.size.w / 16));
      this.requestRender();
    }

    requestRender() {
      if (this.framePending) return;
      this.framePending = true;
      requestAnimationFrame(() => { this.framePending = false; this.render(); });
    }

    invalidateCache(reason) {
      if (reason === 'resize') this.cache.clear();
      else if (reason?.id) this.cache.delete(reason.id);
      else this.cache.clear();
    }

    worldToScreen(x, y) { const { w, h } = this.size; return { x: w / 2 + this.offsetX + x * this.scale, y: h / 2 + this.offsetY - y * this.scale }; }
    screenToWorld(px, py) { const { w, h } = this.size; return { x: (px - w / 2 - this.offsetX) / this.scale, y: (h / 2 + this.offsetY - py) / this.scale }; }

    bindEvents() {
      this.canvas.addEventListener('pointerdown', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (e.shiftKey && this.activePointers.size === 1) {
          this.boxZoom = { startX: px, startY: py, currentX: px, currentY: py };
          this.dragging = false;
          this.pointerActive = true;
          this.requestRender();
          return;
        }
        if (this.activePointers.size === 2) {
          const points = [...this.activePointers.values()];
          this.pinchDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
          this.dragging = false;
          return;
        }
        this.dragging = true;
        this.pointerActive = true;
        this.last = { x: e.clientX, y: e.clientY };
        this.canvas.setPointerCapture(e.pointerId);
      });
      this.canvas.addEventListener('pointermove', (e) => {
        if (this.activePointers.has(e.pointerId)) this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const rect = this.canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0 || px < 0 || py < 0 || px > rect.width || py > rect.height) {
          this.pointer = null;
          global.AppUI?.updateCoordinates(null);
          return;
        }
        this.pointer = this.screenToWorld(px, py);
        global.AppUI?.updateCoordinates(this.pointer);
        this.updateGraphTooltip();
        if (this.boxZoom) {
          this.boxZoom.currentX = px;
          this.boxZoom.currentY = py;
          this.requestRender();
          return;
        }
        if (this.activePointers.size >= 2) {
          const points = [...this.activePointers.values()];
          const nextDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
          if (this.pinchDistance && nextDistance > 0) {
            const centerX = (points[0].x + points[1].x) / 2 - rect.left;
            const centerY = (points[0].y + points[1].y) / 2 - rect.top;
            this.zoomAt(centerX, centerY, nextDistance / this.pinchDistance);
            this.pinchDistance = nextDistance;
          }
          return;
        }
        if (!this.dragging) return;
        this.offsetX += e.clientX - this.last.x;
        this.offsetY += e.clientY - this.last.y;
        this.last = { x: e.clientX, y: e.clientY };
        this.invalidateCache('pan');
        this.requestRender();
      });
      const stop = (e) => {
        if (this.boxZoom && this.activePointers.has(e.pointerId)) {
          this.finishBoxZoom();
        }
        this.activePointers.delete(e.pointerId);
        this.pinchDistance = null;
        this.dragging = false;
        this.pointerActive = false;
      };
      this.canvas.addEventListener('pointerup', stop);
      this.canvas.addEventListener('pointercancel', stop);
      this.canvas.addEventListener('pointerleave', () => { this.pointerActive = false; this.pointer = null; global.AppUI?.updateCoordinates(null); });
      this.canvas.addEventListener('dblclick', (e) => {
        const r = this.canvas.getBoundingClientRect();
        this.zoomAt(e.clientX - r.left, e.clientY - r.top, 1.6);
      });
      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const r = this.canvas.getBoundingClientRect();
        this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
      }, { passive: false });
      this.canvas.addEventListener('keydown', (e) => {
        if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
          e.preventDefault();
          const amount = e.shiftKey ? 48 : 24;
          if (e.key === 'ArrowLeft') this.offsetX += amount;
          if (e.key === 'ArrowRight') this.offsetX -= amount;
          if (e.key === 'ArrowUp') this.offsetY += amount;
          if (e.key === 'ArrowDown') this.offsetY -= amount;
          this.invalidateCache('pan');
          this.requestRender();
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault(); this.zoomAt(this.size.w / 2, this.size.h / 2, 1.2);
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault(); this.zoomAt(this.size.w / 2, this.size.h / 2, 1 / 1.2);
        }
      });
    }

    zoomAt(px, py, factor) {
      const before = this.screenToWorld(px, py);
      this.scale = Math.max(5, Math.min(300, this.scale * factor));
      const after = this.screenToWorld(px, py);
      this.offsetX += (after.x - before.x) * this.scale;
      this.offsetY -= (after.y - before.y) * this.scale;
      this.invalidateCache('zoom');
      this.requestRender();
    }

    finishBoxZoom() {
      if (!this.boxZoom) return;
      const { w, h } = this.size;
      const x1 = Math.max(0, Math.min(w, this.boxZoom.startX));
      const x2 = Math.max(0, Math.min(w, this.boxZoom.currentX));
      const y1 = Math.max(0, Math.min(h, this.boxZoom.startY));
      const y2 = Math.max(0, Math.min(h, this.boxZoom.currentY));
      this.boxZoom = null;
      if (Math.abs(x2 - x1) < 20 || Math.abs(y2 - y1) < 20) { this.requestRender(); return; }
      const a = this.screenToWorld(x1, y2);
      const b = this.screenToWorld(x2, y1);
      const worldW = Math.abs(b.x - a.x), worldH = Math.abs(b.y - a.y);
      if (!(worldW > 0 && worldH > 0)) return;
      this.offsetX = (w / 2) - ((a.x + b.x) / 2) * this.scale;
      this.offsetY = (h / 2) - ((a.y + b.y) / 2) * this.scale;
      const scaleX = w / worldW;
      const scaleY = h / worldH;
      this.scale = Math.max(5, Math.min(300, Math.min(scaleX, scaleY)));
      this.offsetX = 0;
      this.offsetY = 0;
      const centerWorldX = (a.x + b.x) / 2;
      const centerWorldY = (a.y + b.y) / 2;
      this.offsetX = w / 2 - w / 2 - centerWorldX * this.scale;
      this.offsetY = h / 2 - h / 2 + centerWorldY * this.scale;
      this.invalidateCache('zoom');
      this.requestRender();
    }

    lineStyle(color, width = 2) { this.ctx.strokeStyle = color; this.ctx.lineWidth = width; this.ctx.lineCap = 'round'; this.ctx.lineJoin = 'round'; }

    drawGrid() {
      if (!this.showGrid) return;
      const { w, h } = this.size;
      const c = this.ctx;
      const ox = w / 2 + this.offsetX;
      const oy = h / 2 + this.offsetY;
      const targetPx = 72;
      const rawWorld = targetPx / Math.max(this.scale, 1e-6);
      const exponent = Math.floor(Math.log10(Math.max(rawWorld, 1e-12)));
      const base = Math.pow(10, exponent);
      const mantissa = rawWorld / base;
      const factor = mantissa >= 5 ? 5 : mantissa >= 2 ? 2 : 1;
      const worldStep = factor * base;
      const step = worldStep * this.scale;
      const majorEvery = worldStep < 1 ? 5 : 5;
      const lightTheme = document.documentElement.classList.contains('theme-light');
      const minorStroke = lightTheme ? 'rgba(70,130,180,.16)' : 'rgba(110,170,210,.24)';
      const majorStroke = lightTheme ? 'rgba(45,95,145,.28)' : 'rgba(140,195,230,.34)';
      c.save();
      c.lineWidth = 1;
      const startI = Math.floor((-ox) / step) - 1;
      const endI = Math.ceil((w - ox) / step) + 1;
      for (let i = startI; i <= endI; i++) {
        const x = ox + i * step;
        if (x < 0 || x > w) continue;
        const major = Math.abs(i) % majorEvery === 0;
        c.strokeStyle = major ? majorStroke : minorStroke;
        c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
      }
      const startJ = Math.floor((-oy) / step) - 1;
      const endJ = Math.ceil((h - oy) / step) + 1;
      for (let j = startJ; j <= endJ; j++) {
        const y = oy + j * step;
        if (y < 0 || y > h) continue;
        const major = Math.abs(j) % majorEvery === 0;
        c.strokeStyle = major ? majorStroke : minorStroke;
        c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
      }
      c.fillStyle = lightTheme ? 'rgba(35,45,55,.8)' : 'rgba(230,240,250,.76)';
      c.font = '12px system-ui, sans-serif';
      if (oy >= 0 && oy <= h) {
        for (let i = startI; i <= endI; i++) {
          const x = ox + i * step;
          if (x < 4 || x > w - 28 || Math.abs(i * worldStep) < 1e-12) continue;
          c.fillText(this.formatGridLabel(i * worldStep), x + 4, Math.min(h - 6, oy + 17));
        }
      }
      if (ox >= 0 && ox <= w) {
        for (let j = startJ; j <= endJ; j++) {
          const y = oy + j * step;
          if (y < 12 || y > h - 4 || Math.abs(j * worldStep) < 1e-12) continue;
          const label = this.formatGridLabel(-j * worldStep);
          c.fillText(label, Math.min(w - 34, ox + 7), y - 5);
        }
      }
      if (ox >= -20 && ox <= w + 20 && oy >= -20 && oy <= h + 20) {
        c.font = '700 12px system-ui, sans-serif';
        c.fillText('0', Math.max(4, Math.min(w - 16, ox + 5)), Math.max(14, Math.min(h - 5, oy + 16)));
      }
      c.restore();
    }

    formatGridLabel(value) { return Math.abs(value) >= 1000 ? value.toExponential(1) : Number(value.toFixed(2)).toString(); }

    drawAxes() {
      if (!this.showAxes) return;
      const { w, h } = this.size;
      const c = this.ctx;
      const ox = w / 2 + this.offsetX;
      const oy = h / 2 + this.offsetY;
      const lightTheme = document.documentElement.classList.contains('theme-light');
      const axisColor = lightTheme ? '#1b2430' : '#e9f2f8';
      c.save();
      c.strokeStyle = axisColor;
      c.fillStyle = axisColor;
      c.lineWidth = 2.2;
      if (oy >= 0 && oy <= h) {
        c.beginPath(); c.moveTo(0, oy); c.lineTo(w - 12, oy); c.stroke();
        c.beginPath(); c.moveTo(w - 2, oy); c.lineTo(w - 13, oy - 6); c.lineTo(w - 13, oy + 6); c.closePath(); c.fill();
      }
      if (ox >= 0 && ox <= w) {
        c.beginPath(); c.moveTo(ox, h); c.lineTo(ox, 12); c.stroke();
        c.beginPath(); c.moveTo(ox, 2); c.lineTo(ox - 6, 13); c.lineTo(ox + 6, 13); c.closePath(); c.fill();
      }
      c.font = '700 15px system-ui, sans-serif';
      if (oy >= 0 && oy <= h) c.fillText('x', Math.max(8, w - 23), Math.max(17, oy - 10));
      if (ox >= 0 && ox <= w) c.fillText('y', Math.min(w - 18, ox + 10), 18);
      c.restore();
    }

    getCompiled(id, expression, variables) {
      const key = `${id}|${expression}|${Object.keys(variables).join(',')}`;
      const cached = this.cache.get(key);
      if (cached) return cached;
      const compiled = MathEngine.compile(expression, variables);
      this.cache.set(key, compiled);
      return compiled;
    }

    drawFunction(obj) {
      let solver;
      try { solver = this.getCompiled(obj.id, obj.data.expression, { x: 0 }); } catch { return; }
      const { w, h } = this.size;
      this.lineStyle(obj.color, 2.2); this.ctx.beginPath();
      let started = false; let prev = null;
      const steps = Math.min(1800, Math.max(500, Math.floor(w * 1.15)));
      for (let i = 0; i <= steps; i++) {
        const px = (i / steps) * w;
        const x = this.screenToWorld(px, 0).x;
        const y = solver({ x });
        if (!Number.isFinite(y) || Math.abs(y) > 1e7) { started = false; prev = null; continue; }
        const p = this.worldToScreen(x, y);
        if (!started || (prev !== null && Math.abs(p.y - prev) > h * 1.25)) this.ctx.moveTo(p.x, p.y); else this.ctx.lineTo(p.x, p.y);
        started = true; prev = p.y;
      }
      this.ctx.stroke();
    }

    drawParametric(obj) {
      let sx, sy;
      try { sx = this.getCompiled(`${obj.id}:x`, obj.data.xExpr, { t: 0 }); sy = this.getCompiled(`${obj.id}:y`, obj.data.yExpr, { t: 0 }); } catch { return; }
      const steps = 900;
      this.lineStyle(obj.color, 2.2); this.ctx.beginPath(); let started = false;
      for (let i = 0; i <= steps; i++) {
        const t = obj.data.tMin + (obj.data.tMax - obj.data.tMin) * i / steps;
        const x = sx({ t }); const y = sy({ t });
        if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1e7 || Math.abs(y) > 1e7) { started = false; continue; }
        const p = this.worldToScreen(x, y);
        if (!started) { this.ctx.moveTo(p.x, p.y); started = true; } else this.ctx.lineTo(p.x, p.y);
      }
      this.ctx.stroke();
    }

    drawVector(obj) {
      const { x1, y1, x2, y2 } = obj.data; const a = this.worldToScreen(x1, y1); const b = this.worldToScreen(x2, y2);
      this.lineStyle(obj.color, 2.5); this.ctx.beginPath(); this.ctx.moveTo(a.x, a.y); this.ctx.lineTo(b.x, b.y); this.ctx.stroke();
      const ang = Math.atan2(b.y - a.y, b.x - a.x), len = 12;
      this.ctx.fillStyle = obj.color; this.ctx.beginPath(); this.ctx.moveTo(b.x, b.y); this.ctx.lineTo(b.x - len * Math.cos(ang - Math.PI / 6), b.y - len * Math.sin(ang - Math.PI / 6)); this.ctx.lineTo(b.x - len * Math.cos(ang + Math.PI / 6), b.y - len * Math.sin(ang + Math.PI / 6)); this.ctx.closePath(); this.ctx.fill();
    }

    drawPoint(obj) { const p = this.worldToScreen(obj.data.x, obj.data.y); this.ctx.fillStyle = obj.color; this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); this.ctx.fill(); }

    drawCircle(obj) { this.drawPolar(obj.color, (t) => [obj.data.cx + obj.data.r * Math.cos(t), obj.data.cy + obj.data.r * Math.sin(t)]); }
    drawEllipse(obj) { this.drawPolar(obj.color, (t) => [obj.data.cx + obj.data.a * Math.cos(t), obj.data.cy + obj.data.b * Math.sin(t)]); }
    drawPolar(color, fn) { this.lineStyle(color, 2.2); this.ctx.beginPath(); for (let i = 0; i <= 240; i++) { const t = i / 240 * Math.PI * 2; const [x, y] = fn(t); const p = this.worldToScreen(x, y); if (i === 0) this.ctx.moveTo(p.x, p.y); else this.ctx.lineTo(p.x, p.y); } this.ctx.stroke(); }

    drawLine(obj) {
      const { a, b, c } = obj.data;
      if (Math.abs(b) > 1e-12) { const xmin = this.screenToWorld(0, 0).x - 2; const xmax = this.screenToWorld(this.size.w, 0).x + 2; const y1 = (-a * xmin - c) / b; const y2 = (-a * xmax - c) / b; this.strokeSegment(obj.color, xmin, y1, xmax, y2); }
      else if (Math.abs(a) > 1e-12) { const ymin = this.screenToWorld(0, this.size.h).y - 2; const ymax = this.screenToWorld(0, 0).y + 2; const x = -c / a; this.strokeSegment(obj.color, x, ymin, x, ymax); }
    }

    strokeSegment(color, x1, y1, x2, y2) { const p1 = this.worldToScreen(x1, y1), p2 = this.worldToScreen(x2, y2); this.lineStyle(color, 2.2); this.ctx.beginPath(); this.ctx.moveTo(p1.x, p1.y); this.ctx.lineTo(p2.x, p2.y); this.ctx.stroke(); }

    drawObject(obj) {
      if (obj.type === 'function') this.drawFunction(obj);
      else if (obj.type === 'parametric') this.drawParametric(obj);
      else if (obj.type === 'vector') this.drawVector(obj);
      else if (obj.type === 'point') this.drawPoint(obj);
      else if (obj.type === 'circle') this.drawCircle(obj);
      else if (obj.type === 'ellipse') this.drawEllipse(obj);
      else if (obj.type === 'line') this.drawLine(obj);
    }

    render() {
      const { w, h } = this.size;
      this.ctx.clearRect(0, 0, w, h);
      this.ctx.fillStyle = '#0d131b';
      this.ctx.fillRect(0, 0, w, h);
      this.drawGrid(); this.drawAxes();
      for (const obj of this.objects.items) if (obj.visible) this.drawObject(obj);
      this.drawBoxZoomOverlay();
      if (global.AppUI) global.AppUI.renderPreview(this);
      this.updateLegend();
      this.updateGraphTooltip();
    }

    drawBoxZoomOverlay() {
      if (!this.boxZoom) return;
      const c = this.ctx;
      const x = Math.min(this.boxZoom.startX, this.boxZoom.currentX);
      const y = Math.min(this.boxZoom.startY, this.boxZoom.currentY);
      const w = Math.abs(this.boxZoom.currentX - this.boxZoom.startX);
      const h = Math.abs(this.boxZoom.currentY - this.boxZoom.startY);
      c.save();
      c.fillStyle = 'rgba(90,200,250,.10)';
      c.strokeStyle = '#5ac8fa';
      c.setLineDash([6,4]);
      c.lineWidth = 1.5;
      c.fillRect(x,y,w,h); c.strokeRect(x,y,w,h);
      c.restore();
      const box=document.getElementById('zoomBox');
      if(box){box.hidden=true;}
    }

    updateLegend() {
      const el=document.getElementById('graphLegend');
      if(!el) return;
      el.innerHTML='';
      const items=this.objects.items.filter(o=>o.visible);
      if(!items.length){el.hidden=true;return;}
      el.hidden=false;
      for(const obj of items){
        const btn=document.createElement('button');
        btn.type='button'; btn.className='legend-item'; btn.dataset.id=String(obj.id);
        btn.setAttribute('aria-label',`Ocultar ${global.AppUI?.objectLabel?.(obj) || obj.type}`);
        btn.innerHTML=`<span class="legend-dot" style="background:${obj.color}" aria-hidden="true"></span><span>${this.escapeHtml(global.AppUI?.objectLabel?.(obj) || obj.type)}</span>`;
        btn.addEventListener('click',()=>{this.objects.toggle(obj.id);});
        el.appendChild(btn);
      }
    }

    updateGraphTooltip() {
      const el=document.getElementById('graphTooltip');
      if(!el) return;
      if(!this.pointerActive || !this.pointer){el.hidden=true;return;}
      let text=`x = ${this.formatCoord(this.pointer.x)} · y = ${this.formatCoord(this.pointer.y)}`;
      const fn=this.objects.items.find(o=>o.visible && o.type==='function');
      if(fn){try{const solver=this.getCompiled(fn.id,fn.data.expression,{x:0});const y=solver({x:this.pointer.x});if(Number.isFinite(y))text+=` · f(x) = ${this.formatCoord(y)}`;}catch{}}
      el.textContent=text; el.hidden=false;
    }

    formatCoord(v){return Number(v).toFixed(Math.abs(v)>=100 ? 1 : 3).replace(/\.0+$|(?<=\.[0-9]*?)0+$/,'');}
    escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

    exportPng() {
      this.render();
      const link = document.createElement('a');
      link.download = 'grafico.png';
      link.href = this.canvas.toDataURL('image/png');
      link.click();
    }

    exportSvg() {
      this.render();
      const { w, h } = this.size;
      const ox = w / 2 + this.offsetX, oy = h / 2 + this.offsetY;
      const parts = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`,
        `<rect width="100%" height="100%" fill="#0d131b"/>`,
        `<defs><marker id="graphArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 Z" fill="#9aa8b8"/></marker><marker id="vectorArrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L9,4.5 L0,9 Z" fill="context-stroke"/></marker></defs>`
      ];
      if (this.showGrid) {
        const rawPixels = Math.max(18, this.scale);
        const exponent = Math.floor(Math.log10(Math.max(rawPixels, 1)));
        const mantissa = rawPixels / Math.pow(10, exponent);
        const factor = mantissa >= 5 ? 5 : mantissa >= 2 ? 2 : 1;
        const worldStep = factor * Math.pow(10, exponent);
        const step = Math.max(18, worldStep * this.scale);
        parts.push(`<g stroke="#263240" stroke-width="1" opacity=".55">`);
        for (let x = ((ox % step) + step) % step; x < w; x += step) parts.push(`<line x1="${x.toFixed(2)}" y1="0" x2="${x.toFixed(2)}" y2="${h}"/>`);
        for (let y = ((oy % step) + step) % step; y < h; y += step) parts.push(`<line x1="0" y1="${y.toFixed(2)}" x2="${w}" y2="${y.toFixed(2)}"/>`);
        parts.push('</g>');
      }
      if (this.showAxes) parts.push(`<g stroke="#9aa8b8" stroke-width="1.5" fill="#9aa8b8"><line x1="0" y1="${oy}" x2="${w}" y2="${oy}" marker-end="url(#graphArrow)"/><line x1="${ox}" y1="${h}" x2="${ox}" y2="0" marker-end="url(#graphArrow)"/></g>`);
      for (const obj of this.objects.items) {
        if (!obj.visible) continue;
        const svg = this.objectToSvg(obj);
        if (svg) parts.push(svg);
      }
      parts.push('</svg>');
      const blob = new Blob([parts.join('')], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'grafico.svg'; link.href = url; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }

    objectToSvg(obj) {
      const { w, h } = this.size;
      const p = (x, y) => this.worldToScreen(x, y);
      const color = obj.color || '#5ac8fa';
      if (obj.type === 'point') { const q = p(obj.data.x, obj.data.y); return `<circle cx="${q.x.toFixed(2)}" cy="${q.y.toFixed(2)}" r="4" fill="${color}"/>`; }
      if (obj.type === 'vector') { const a = p(obj.data.x1, obj.data.y1), b = p(obj.data.x2, obj.data.y2); return `<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" stroke="${color}" stroke-width="2.5" marker-end="url(#vectorArrow)"/>`; }
      if (obj.type === 'circle') { const q = p(obj.data.cx, obj.data.cy); return `<circle cx="${q.x.toFixed(2)}" cy="${q.y.toFixed(2)}" r="${(obj.data.r * this.scale).toFixed(2)}" fill="none" stroke="${color}" stroke-width="2.2"/>`; }
      if (obj.type === 'ellipse') { const q = p(obj.data.cx, obj.data.cy); return `<ellipse cx="${q.x.toFixed(2)}" cy="${q.y.toFixed(2)}" rx="${(obj.data.a * this.scale).toFixed(2)}" ry="${(obj.data.b * this.scale).toFixed(2)}" fill="none" stroke="${color}" stroke-width="2.2"/>`; }
      if (obj.type === 'line') { const { a, b, c } = obj.data; if (Math.abs(b) > 1e-12) { const xmin = this.screenToWorld(0, 0).x - 2, xmax = this.screenToWorld(w, 0).x + 2; return this.svgLine(xmin, (-a*xmin-c)/b, xmax, (-a*xmax-c)/b, color); } if (Math.abs(a) > 1e-12) { const x=-c/a; return this.svgLine(x,this.screenToWorld(0,h).y-2,x,this.screenToWorld(0,0).y+2,color); } console.warn('[GraphEngine] Reta inválida para SVG:', obj); return ''; }
      if (obj.type === 'function' || obj.type === 'parametric') {
        try {
          const segments = []; let segment = [];
          const pushSegment = () => { if (segment.length > 1) segments.push(segment); segment = []; };
          if (obj.type === 'function') {
            const solver = this.getCompiled(obj.id,obj.data.expression,{x:0});
            for(let i=0;i<=900;i++){const x=this.screenToWorld((i/900)*w,0).x,y=solver({x});if(Number.isFinite(y)&&Math.abs(y)<1e7){const q=p(x,y);if(!segment.length || Math.abs(q.y-segment[segment.length-1].y)<h*1.25) segment.push(q);else {pushSegment();segment.push(q);}} else pushSegment();}
          } else {
            const sx=this.getCompiled(`${obj.id}:x`,obj.data.xExpr,{t:0}), sy=this.getCompiled(`${obj.id}:y`,obj.data.yExpr,{t:0});
            for(let i=0;i<=900;i++){const t=obj.data.tMin+(obj.data.tMax-obj.data.tMin)*i/900,x=sx({t}),y=sy({t});if(Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<1e7&&Math.abs(y)<1e7){const q=p(x,y);if(!segment.length || Math.hypot(q.x-segment[segment.length-1].x,q.y-segment[segment.length-1].y)<Math.max(w,h)){segment.push(q);}else {pushSegment();segment.push(q);}} else pushSegment();}
          }
          pushSegment();
          return segments.map(seg=>`<path d="${seg.map((q,i)=>`${i?'L':'M'}${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
        } catch (error) { console.warn('[GraphEngine] Falha ao exportar objeto:', obj, error); return ''; }
      }
      console.warn('[GraphEngine] Tipo de objeto não reconhecido para SVG:', obj.type, obj);
      return '';
    }

    svgLine(x1,y1,x2,y2,color){const a=this.worldToScreen(x1,y1),b=this.worldToScreen(x2,y2);return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="2.2"/>`;}
  }

  global.GraphEngine = GraphEngine;
})(window);
