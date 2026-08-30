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
      this.boxZoom = { active: false, startX: 0, startY: 0, x: 0, y: 0 };
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
        this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (this.activePointers.size === 2) {
          const points = [...this.activePointers.values()];
          this.pinchDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
          this.dragging = false;
          return;
        }
        const rect = this.canvas.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;
        if (e.shiftKey) {
          this.boxZoom = { active: true, startX: localX, startY: localY, x: localX, y: localY };
          global.AppUI?.showZoomBox?.(this.boxZoom);
          this.dragging = false;
          this.pointerActive = true;
          this.canvas.setPointerCapture(e.pointerId);
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
        if (px < 0 || py < 0 || px > rect.width || py > rect.height || !Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
          this.pointer = null;
          global.AppUI?.updateCoordinates(null);
          return;
        }
        this.pointer = this.screenToWorld(px, py);
        global.AppUI?.updateCoordinates(this.pointer);
        global.AppUI?.updateGraphTooltip?.(this.pointer, px, py);
        if (this.boxZoom.active) {
          this.boxZoom.x = px; this.boxZoom.y = py;
          global.AppUI?.showZoomBox?.(this.boxZoom);
          return;
        }
        if (this.activePointers.size >= 2) {
          const points = [...this.activePointers.values()];
          const nextDistance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
          if (this.pinchDistance && nextDistance > 0) {
            const centerX = (points[0].x + points[1].x) / 2 - rect.left;
            const centerY = (points[0].y + points[1].y) / 2 - rect.top;
            const before = this.screenToWorld(centerX, centerY);
            this.scale = Math.max(5, Math.min(300, this.scale * (nextDistance / this.pinchDistance)));
            const after = this.screenToWorld(centerX, centerY);
            this.offsetX += (after.x - before.x) * this.scale;
            this.offsetY -= (after.y - before.y) * this.scale;
            this.pinchDistance = nextDistance;
            this.requestRender();
          }
          return;
        }
        if (!this.dragging) return;
        this.offsetX += e.clientX - this.last.x;
        this.offsetY += e.clientY - this.last.y;
        this.last = { x: e.clientX, y: e.clientY };
        this.requestRender();
      });
      const stop = (e) => { this.activePointers.delete(e.pointerId); this.pinchDistance = null; this.dragging = false; this.pointerActive = false; if (this.boxZoom.active) { this.applyBoxZoom(); } };
      this.canvas.addEventListener('pointerup', stop);
      this.canvas.addEventListener('pointercancel', stop);
      this.canvas.addEventListener('pointerleave', () => { this.pointerActive = false; this.pointer = null; global.AppUI?.updateCoordinates(null); global.AppUI?.updateGraphTooltip?.(null); });
      this.canvas.addEventListener('dblclick', (e) => { const r=this.canvas.getBoundingClientRect(); const px=e.clientX-r.left, py=e.clientY-r.top; const before=this.screenToWorld(px,py); this.scale=Math.max(5,Math.min(300,this.scale*1.6)); const after=this.screenToWorld(px,py); this.offsetX+=(after.x-before.x)*this.scale; this.offsetY-=(after.y-before.y)*this.scale; this.invalidateCache('zoom'); this.requestRender(); });
      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const r = this.canvas.getBoundingClientRect();
        const localX = e.clientX - r.left;
        const localY = e.clientY - r.top;
        const before = this.screenToWorld(localX, localY);
        const factor = Math.exp(-e.deltaY * 0.0015);
        this.scale = Math.max(5, Math.min(300, this.scale * factor));
        const after = this.screenToWorld(localX, localY);
        this.offsetX += (after.x - before.x) * this.scale;
        this.offsetY -= (after.y - before.y) * this.scale;
        this.invalidateCache('zoom');
        this.requestRender();
      }, { passive: false });
    }

    applyBoxZoom(){if(!this.boxZoom.active)return;const {startX,startY,x,y}=this.boxZoom;this.boxZoom.active=false;global.AppUI?.showZoomBox?.(this.boxZoom);const left=Math.min(startX,x),right=Math.max(startX,x),top=Math.min(startY,y),bottom=Math.max(startY,y);if(right-left<12||bottom-top<12)return;const {w,h}=this.size;const worldTL=this.screenToWorld(left,top),worldBR=this.screenToWorld(right,bottom);const worldW=Math.max(1e-9,worldBR.x-worldTL.x),worldH=Math.max(1e-9,worldTL.y-worldBR.y);const targetScale=Math.min((w-20)/worldW,(h-20)/worldH);this.scale=Math.max(5,Math.min(300,targetScale));const centerX=(worldTL.x+worldBR.x)/2,centerY=(worldTL.y+worldBR.y)/2;this.offsetX=w/2-centerX*this.scale;this.offsetY=-(h/2-centerY*this.scale);this.invalidateCache('zoom');this.requestRender();}

    lineStyle(color, width = 2) { this.ctx.strokeStyle = color; this.ctx.lineWidth = width; this.ctx.lineCap = 'round'; this.ctx.lineJoin = 'round'; }

    drawGrid() {
      if (!this.showGrid) return;
      const { w, h } = this.size;
      const c = this.ctx;
      const lightTheme = document.documentElement.classList.contains('theme-light');
      const ox = w / 2 + this.offsetX;
      const oy = h / 2 + this.offsetY;

      // Mantém a grade em uma densidade legível (~8–12 divisões por eixo).
      const targetPixels = 90;
      const rawWorldStep = targetPixels / Math.max(this.scale, 1e-9);
      const exponent = Math.floor(Math.log10(Math.max(rawWorldStep, 1e-12)));
      const normalized = rawWorldStep / Math.pow(10, exponent);
      const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
      const worldStep = factor * Math.pow(10, exponent);
      const step = Math.max(28, worldStep * this.scale);

      const majorEvery = worldStep >= 5 ? 2 : 5;
      const majorStep = worldStep * majorEvery;
      const firstX = Math.floor((0 - ox) / step);
      const lastX = Math.ceil((w - ox) / step);
      const firstY = Math.floor((0 - oy) / step);
      const lastY = Math.ceil((h - oy) / step);

      c.save();
      c.lineWidth = 1;
      c.strokeStyle = 'rgba(86, 150, 190, .22)';
      for (let i = firstX; i <= lastX; i += 1) {
        const x = ox + i * step;
        if (x < -1 || x > w + 1) continue;
        c.beginPath(); c.moveTo(Math.round(x) + 0.5, 0); c.lineTo(Math.round(x) + 0.5, h); c.stroke();
      }
      for (let i = firstY; i <= lastY; i += 1) {
        const y = oy + i * step;
        if (y < -1 || y > h + 1) continue;
        c.beginPath(); c.moveTo(0, Math.round(y) + 0.5); c.lineTo(w, Math.round(y) + 0.5); c.stroke();
      }

      // Linhas principais a cada 5/10 unidades visualmente, com maior contraste.
      c.strokeStyle = 'rgba(105, 171, 208, .34)';
      c.lineWidth = 1.25;
      for (let valueIndex = Math.floor((0 - ox) / (majorStep * this.scale)); valueIndex <= Math.ceil((w - ox) / (majorStep * this.scale)); valueIndex += 1) {
        const x = ox + valueIndex * majorStep * this.scale;
        if (x < -1 || x > w + 1) continue;
        c.beginPath(); c.moveTo(Math.round(x) + 0.5, 0); c.lineTo(Math.round(x) + 0.5, h); c.stroke();
      }
      for (let valueIndex = Math.floor((0 - oy) / (majorStep * this.scale)); valueIndex <= Math.ceil((h - oy) / (majorStep * this.scale)); valueIndex += 1) {
        const y = oy + valueIndex * majorStep * this.scale;
        if (y < -1 || y > h + 1) continue;
        c.beginPath(); c.moveTo(0, Math.round(y) + 0.5); c.lineTo(w, Math.round(y) + 0.5); c.stroke();
      }

      // Numeração somente quando o eixo correspondente está visível.
      c.fillStyle = lightTheme ? 'rgba(31, 41, 51, .82)' : 'rgba(232, 243, 251, .82)';
      c.font = '12px system-ui, sans-serif';
      c.textBaseline = 'middle';

      if (oy > 0 && oy < h) {
        for (let i = firstX; i <= lastX; i += 1) {
          if (Math.abs(i * worldStep) < 1e-12) continue;
          const sx = ox + i * step;
          if (sx < 4 || sx > w - 26) continue;
          c.textAlign = 'center';
          c.fillText(this.formatGridLabel(i * worldStep), sx, oy + 15);
        }
      }
      if (ox > 28 && ox < w - 8) {
        for (let i = firstY; i <= lastY; i += 1) {
          if (Math.abs(i * worldStep) < 1e-12) continue;
          const sy = oy + i * step;
          if (sy < 9 || sy > h - 9) continue;
          c.textAlign = 'right';
          c.fillText(this.formatGridLabel(-i * worldStep), ox - 8, sy);
        }
      }

      // Origem claramente identificada.
      if (ox >= 0 && ox <= w && oy >= 0 && oy <= h) {
        c.textAlign = 'right';
        c.textBaseline = 'top';
        c.font = 'bold 12px system-ui, sans-serif';
        c.fillStyle = lightTheme ? 'rgba(31, 41, 51, .95)' : 'rgba(245, 250, 255, .95)';
        c.fillText('0', ox - 6, oy + 5);
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
      const axisColor = lightTheme ? '#1f2933' : '#eef6fb';

      c.save();
      c.strokeStyle = axisColor;
      c.fillStyle = axisColor;
      c.lineWidth = 2.2;
      c.lineCap = 'round';

      if (oy >= 0 && oy <= h) {
        c.beginPath(); c.moveTo(0, oy); c.lineTo(Math.max(0, w - 12), oy); c.stroke();
        c.beginPath();
        c.moveTo(w - 15, oy - 6); c.lineTo(w - 2, oy); c.lineTo(w - 15, oy + 6);
        c.closePath(); c.fill();
      }
      if (ox >= 0 && ox <= w) {
        c.beginPath(); c.moveTo(ox, h); c.lineTo(ox, 12); c.stroke();
        c.beginPath();
        c.moveTo(ox - 6, 15); c.lineTo(ox, 2); c.lineTo(ox + 6, 15);
        c.closePath(); c.fill();
      }

      c.font = '700 15px system-ui, sans-serif';
      c.textAlign = 'left'; c.textBaseline = 'middle';
      if (oy >= 12 && oy <= h - 12) c.fillText('x', Math.max(6, w - 28), oy - 12);
      if (ox >= 12 && ox <= w - 12) { c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText('y', ox + 10, 8); }
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
      global.AppUI?.setBusy?.(false);
      this.ctx.clearRect(0, 0, w, h);
      this.ctx.fillStyle = '#0d131b';
      this.ctx.fillRect(0, 0, w, h);
      this.drawGrid(); this.drawAxes();
      for (const obj of this.objects.items) if (obj.visible) this.drawObject(obj);
      if (global.AppUI) global.AppUI.renderPreview(this);
    }

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
        const targetPixels = 90;
        const rawWorldStep = targetPixels / Math.max(this.scale, 1e-9);
        const exponent = Math.floor(Math.log10(Math.max(rawWorldStep, 1e-12)));
        const normalized = rawWorldStep / Math.pow(10, exponent);
        const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
        const worldStep = factor * Math.pow(10, exponent);
        const step = Math.max(28, worldStep * this.scale);
        const majorEvery = worldStep >= 5 ? 2 : 5;
        const majorStep = worldStep * majorEvery;
        parts.push(`<g stroke="#568fb5" stroke-width="1" opacity=".42">`);
        const firstX = Math.floor((0 - ox) / step), lastX = Math.ceil((w - ox) / step);
        const firstY = Math.floor((0 - oy) / step), lastY = Math.ceil((h - oy) / step);
        for (let i = firstX; i <= lastX; i += 1) { const x = ox + i * step; if (x >= -1 && x <= w + 1) parts.push(`<line x1="${x.toFixed(2)}" y1="0" x2="${x.toFixed(2)}" y2="${h}"/>`); }
        for (let i = firstY; i <= lastY; i += 1) { const y = oy + i * step; if (y >= -1 && y <= h + 1) parts.push(`<line x1="0" y1="${y.toFixed(2)}" x2="${w}" y2="${y.toFixed(2)}"/>`); }
        parts.push('</g>');
        parts.push(`<g stroke="#69abd0" stroke-width="1.25" opacity=".56">`);
        const firstMajorX = Math.floor((0 - ox) / (majorStep * this.scale)), lastMajorX = Math.ceil((w - ox) / (majorStep * this.scale));
        const firstMajorY = Math.floor((0 - oy) / (majorStep * this.scale)), lastMajorY = Math.ceil((h - oy) / (majorStep * this.scale));
        for (let i = firstMajorX; i <= lastMajorX; i += 1) { const x = ox + i * majorStep * this.scale; if (x >= -1 && x <= w + 1) parts.push(`<line x1="${x.toFixed(2)}" y1="0" x2="${x.toFixed(2)}" y2="${h}"/>`); }
        for (let i = firstMajorY; i <= lastMajorY; i += 1) { const y = oy + i * majorStep * this.scale; if (y >= -1 && y <= h + 1) parts.push(`<line x1="0" y1="${y.toFixed(2)}" x2="${w}" y2="${y.toFixed(2)}"/>`); }
        parts.push('</g>');
      }
      if (this.showAxes) {
        parts.push(`<g stroke="#eef6fb" stroke-width="2.2" fill="#eef6fb" stroke-linecap="round"><line x1="0" y1="${oy}" x2="${Math.max(0, w-12)}" y2="${oy}"/><path d="M${w-15},${oy-6} L${w-2},${oy} L${w-15},${oy+6} Z"/><line x1="${ox}" y1="${h}" x2="${ox}" y2="12"/><path d="M${ox-6},15 L${ox},2 L${ox+6},15 Z"/><text x="${Math.max(6,w-28)}" y="${Math.max(12,oy-12)}" fill="#eef6fb" stroke="none" font-family="system-ui,sans-serif" font-size="15" font-weight="700">x</text><text x="${ox+10}" y="20" fill="#eef6fb" stroke="none" font-family="system-ui,sans-serif" font-size="15" font-weight="700">y</text></g>`);
      }
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
