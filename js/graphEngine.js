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
      this.last = this.getDefaultVariables();
      this.pointer = null;
      this.showGrid = true;
      this.showAxes = true;
      this.framePending = false;
      this.pointerActive = false;
      this.activePointers = new Map();
      this.pinchDistance = null;
      this.rotationX = 0.62;
      this.rotationY = 0.78;
      this.projectionScale = 1;
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
      this.rotationX = 0.62;
      this.rotationY = 0.78;
      this.projectionScale = 1;
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
        const has3D = this.has3DObjects();
        if (has3D && !e.shiftKey) {
          this.rotationY += (e.clientX - this.last.x) * 0.008;
          this.rotationX += (e.clientY - this.last.y) * 0.008;
          this.rotationX = Math.max(-Math.PI * 0.48, Math.min(Math.PI * 0.48, this.rotationX));
        } else {
          this.offsetX += e.clientX - this.last.x;
          this.offsetY += e.clientY - this.last.y;
        }
        this.last = { x: e.clientX, y: e.clientY };
        this.requestRender();
      });
      const stop = (e) => { this.activePointers.delete(e.pointerId); this.pinchDistance = null; this.dragging = false; this.pointerActive = false; };
      this.canvas.addEventListener('pointerup', stop);
      this.canvas.addEventListener('pointercancel', stop);
      this.canvas.addEventListener('pointerleave', () => { this.pointerActive = false; this.pointer = null; global.AppUI?.updateCoordinates(null); });
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

    lineStyle(color, width = 2) { this.ctx.strokeStyle = color; this.ctx.lineWidth = width; this.ctx.lineCap = 'round'; this.ctx.lineJoin = 'round'; }

    drawGrid() {
      if (!this.showGrid) return;
      const { w, h } = this.size;
      const c = this.ctx;
      const lightTheme = document.documentElement.classList.contains('theme-light');
      const ox = w / 2 + this.offsetX;
      const oy = h / 2 + this.offsetY;
      const targetPixels = 60;
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
      c.strokeStyle = lightTheme ? 'rgba(0,0,0,.10)' : 'rgba(255,255,255,.18)';
      for (let i = firstX; i <= lastX; i++) { const x = ox + i * step; c.beginPath(); c.moveTo(Math.round(x)+.5,0); c.lineTo(Math.round(x)+.5,h); c.stroke(); }
      for (let j = firstY; j <= lastY; j++) { const y = oy + j * step; c.beginPath(); c.moveTo(0,Math.round(y)+.5); c.lineTo(w,Math.round(y)+.5); c.stroke(); }
      const majorPx = majorStep * this.scale;
      const majorFirstX = Math.floor((0 - ox) / majorPx);
      const majorLastX = Math.ceil((w - ox) / majorPx);
      const majorFirstY = Math.floor((0 - oy) / majorPx);
      const majorLastY = Math.ceil((h - oy) / majorPx);
      c.lineWidth = 1.5;
      c.strokeStyle = lightTheme ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.30)';
      for (let i = majorFirstX; i <= majorLastX; i++) { const x = ox + i * majorPx; c.beginPath(); c.moveTo(Math.round(x)+.5,0); c.lineTo(Math.round(x)+.5,h); c.stroke(); }
      for (let j = majorFirstY; j <= majorLastY; j++) { const y = oy + j * majorPx; c.beginPath(); c.moveTo(0,Math.round(y)+.5); c.lineTo(w,Math.round(y)+.5); c.stroke(); }
      c.fillStyle = lightTheme ? 'rgba(0,0,0,.70)' : 'rgba(255,255,255,.78)';
      c.font = '12px system-ui'; c.textBaseline = 'middle';
      if (oy > 0 && oy < h) { c.textAlign='center'; for(let i=firstX;i<=lastX;i++){ const sx=ox+i*step; const value=i*worldStep; if(Math.abs(value)<1e-12||sx<8||sx>w-18) continue; c.fillText(this.formatGridLabel(value),sx,Math.min(h-8,oy+15)); } }
      if (ox > 24 && ox < w-24) { c.textAlign='right'; for(let j=firstY;j<=lastY;j++){ const sy=oy+j*step; const value=-j*worldStep; if(Math.abs(value)<1e-12||sy<8||sy>h-8) continue; c.fillText(this.formatGridLabel(value),ox-8,sy); } }
      if (ox>=0&&ox<=w&&oy>=0&&oy<=h) { c.font='bold 12px system-ui'; c.fillStyle=lightTheme?'rgba(0,0,0,.90)':'rgba(255,255,255,.92)'; c.textAlign='right'; c.textBaseline='top'; c.fillText('0',ox-6,oy+5); }
      c.restore();
    }

    formatGridLabel(value) { return Math.abs(value) >= 1000 ? value.toExponential(1) : Number(value.toFixed(2)).toString(); }

    drawAxes() {
      if (!this.showAxes) return;
      const { w, h } = this.size; const c=this.ctx; const ox=w/2+this.offsetX; const oy=h/2+this.offsetY;
      const lightTheme=document.documentElement.classList.contains('theme-light');
      const axisColor=lightTheme?'#17202b':'#f1f5f9';
      c.save(); c.strokeStyle=axisColor; c.fillStyle=axisColor; c.lineWidth=2.5; c.lineCap='round';
      const tickStep=Math.max(this.scale,1e-9);
      if(oy>=0&&oy<=h){ c.beginPath();c.moveTo(0,oy);c.lineTo(w-14,oy);c.stroke(); c.beginPath();c.moveTo(w-14,oy-7);c.lineTo(w,oy);c.lineTo(w-14,oy+7);c.fill(); for(let i=Math.ceil((0-ox)/tickStep);i<=Math.floor((w-ox)/tickStep);i++){const x=ox+i*tickStep;if(x<0||x>w)continue;c.beginPath();c.moveTo(x,oy-5);c.lineTo(x,oy+5);c.stroke();} }
      if(ox>=0&&ox<=w){ c.beginPath();c.moveTo(ox,h);c.lineTo(ox,14);c.stroke(); c.beginPath();c.moveTo(ox-7,14);c.lineTo(ox,0);c.lineTo(ox+7,14);c.fill(); for(let i=Math.ceil((0-oy)/tickStep);i<=Math.floor((h-oy)/tickStep);i++){const y=oy+i*tickStep;if(y<0||y>h)continue;c.beginPath();c.moveTo(ox-5,y);c.lineTo(ox+5,y);c.stroke();} }
      c.font='bold 16px system-ui'; c.textAlign='left'; c.textBaseline='middle'; if(oy>=14&&oy<=h-14)c.fillText('x',w-28,oy-13); if(ox>=14&&ox<=w-14){c.textBaseline='top';c.fillText('y',Math.min(w-16,ox+10),8);} c.restore();
    }

    has3DObjects() {
      return this.objects.items.some((o) => ['surface', 'solid', 'curve3d', 'line3d'].includes(o.type) || (o.type === 'vector' && this.vectorIs3D(o)));
    }

    vectorIs3D(obj) {
      const d = obj?.data || {};
      if (d.is3D === true) return true;
      if (d.is3D === false) return false;
      if (Array.isArray(d.p1) && Array.isArray(d.p2)) return d.p1.length >= 3 || d.p2.length >= 3;
      return Object.prototype.hasOwnProperty.call(d, 'z1') || Object.prototype.hasOwnProperty.call(d, 'z2');
    }

    getVector3DPoints(obj) {
      const d = obj?.data || {};
      if (Array.isArray(d.p1) && Array.isArray(d.p2)) {
        return [[Number(d.p1[0]) || 0, Number(d.p1[1]) || 0, Number(d.p1[2]) || 0], [Number(d.p2[0]) || 0, Number(d.p2[1]) || 0, Number(d.p2[2]) || 0]];
      }
      return [[Number(d.x1) || 0, Number(d.y1) || 0, Number(d.z1) || 0], [Number(d.x2) || 0, Number(d.y2) || 0, Number(d.z2) || 0]];
    }

    project3D(x, y, z) {
      const cy = Math.cos(this.rotationY), sy = Math.sin(this.rotationY);
      const rx = x * cy + z * sy;
      const rz = -x * sy + z * cy;
      const cx = Math.cos(this.rotationX), sx = Math.sin(this.rotationX);
      const ry = y * cx - rz * sx;
      const { w, h } = this.size;
      const scale = this.scale * this.projectionScale;
      return { x: w / 2 + this.offsetX + rx * scale, y: h / 2 + this.offsetY - ry * scale, depth: rz };
    }

    draw3DAxes() {
      const c = this.ctx;
      const axisLen = 4.5;
      const O = this.project3D(0,0,0);
      const X = this.project3D(axisLen,0,0);
      const Y = this.project3D(0,axisLen,0);
      const Z = this.project3D(0,0,axisLen);
      c.save(); c.lineCap='round'; c.lineWidth=2;
      const axes=[[X,'#ff6b6b','x'],[Y,'#63d391','y'],[Z,'#5ac8fa','z']];
      for (const [p,color,label] of axes) {
        c.strokeStyle=color; c.fillStyle=color; c.beginPath(); c.moveTo(O.x,O.y); c.lineTo(p.x,p.y); c.stroke();
        const ang=Math.atan2(p.y-O.y,p.x-O.x), len=8;
        c.beginPath(); c.moveTo(p.x,p.y); c.lineTo(p.x-len*Math.cos(ang-Math.PI/6),p.y-len*Math.sin(ang-Math.PI/6)); c.lineTo(p.x-len*Math.cos(ang+Math.PI/6),p.y-len*Math.sin(ang+Math.PI/6)); c.closePath(); c.fill();
        c.font='bold 13px system-ui'; c.fillText(label,p.x+6,p.y-6);
      }
      c.fillStyle='rgba(255,255,255,.16)';
      // Malha no plano XY para dar referência espacial mesmo quando o vetor
      // está predominantemente orientado no eixo Z.
      const range=4, step=1;
      for(let i=-range;i<=range;i+=step){
        const a=this.project3D(i,0,-range), b=this.project3D(i,0,range); c.strokeStyle='rgba(90,200,250,.09)'; c.lineWidth=1; c.beginPath(); c.moveTo(a.x,a.y); c.lineTo(b.x,b.y); c.stroke();
        const aa=this.project3D(-range,0,i), bb=this.project3D(range,0,i); c.beginPath(); c.moveTo(aa.x,aa.y); c.lineTo(bb.x,bb.y); c.stroke();
      }
      c.restore();
    }

    drawSolid(obj) {
      const d = obj.data || {};
      let sf, sg;
      try {
        sf = this.getCompiled(`${obj.id}:outer`, d.outerExpression, this.getDefaultVariables());
        sg = this.getCompiled(`${obj.id}:inner`, d.innerExpression || '0', this.getDefaultVariables());
      } catch { return; }

      const a = Number(d.a), b = Number(d.b), k = Number(d.axisY) || 0;
      if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return;

      const c = this.ctx;
      const slices = Math.max(26, Math.min(64, Math.round((this.size.w / 900) * 36)));
      const rings = 28;
      const vars = this.getDefaultVariables();
      const profile = [];

      for (let i = 0; i <= slices; i++) {
        const x = a + (b - a) * i / slices;
        const f = sf({ ...vars, x });
        const g = sg({ ...vars, x });
        if (!Number.isFinite(f) || !Number.isFinite(g) || Math.max(Math.abs(f), Math.abs(g)) > 1e5) {
          profile.push(null);
          continue;
        }
        const rf = Math.abs(f - k);
        const rg = Math.abs(g - k);
        const R = Math.max(rf, rg);
        const r = Math.min(rf, rg);
        profile.push({ x, R, r });
      }

      const outer = [];
      const inner = [];
      const frontCaps = [];

      for (let i = 0; i < profile.length - 1; i++) {
        const p0 = profile[i], p1 = profile[i + 1];
        if (!p0 || !p1) continue;
        for (let j = 0; j < rings; j++) {
          const j2 = (j + 1) % rings;
          const t0 = 2 * Math.PI * j / rings;
          const t1 = 2 * Math.PI * j2 / rings;
          const q0 = this.project3D(p0.x, p0.R * Math.cos(t0), p0.R * Math.sin(t0));
          const q1 = this.project3D(p1.x, p1.R * Math.cos(t0), p1.R * Math.sin(t0));
          const q2 = this.project3D(p1.x, p1.R * Math.cos(t1), p1.R * Math.sin(t1));
          const q3 = this.project3D(p0.x, p0.R * Math.cos(t1), p0.R * Math.sin(t1));
          outer.push({ pts: [q0,q1,q2,q3], depth: (q0.depth+q1.depth+q2.depth+q3.depth)/4 });
          if (p0.r > 1e-8 || p1.r > 1e-8) {
            const r0 = this.project3D(p0.x, p0.r * Math.cos(t0), p0.r * Math.sin(t0));
            const r1 = this.project3D(p1.x, p1.r * Math.cos(t0), p1.r * Math.sin(t0));
            const r2 = this.project3D(p1.x, p1.r * Math.cos(t1), p1.r * Math.sin(t1));
            const r3 = this.project3D(p0.x, p0.r * Math.cos(t1), p0.r * Math.sin(t1));
            inner.push({ pts: [r0,r1,r2,r3], depth: (r0.depth+r1.depth+r2.depth+r3.depth)/4 });
          }
        }
      }

      const drawFaces = (faces, fillAlpha, strokeAlpha) => {
        faces.sort((u,v) => v.depth - u.depth);
        for (const face of faces) {
          const pts = face.pts;
          c.beginPath();
          c.moveTo(pts[0].x, pts[0].y);
          for (let q = 1; q < pts.length; q++) c.lineTo(pts[q].x, pts[q].y);
          c.closePath();
          c.fillStyle = `${obj.color}${fillAlpha}`;
          c.fill();
          c.strokeStyle = `${obj.color}${strokeAlpha}`;
          c.lineWidth = 0.8;
          c.stroke();
        }
      };

      c.save();
      drawFaces(outer, '28', '8a');
      drawFaces(inner, '12', '58');

      // Bordas externas e internas: deixam a geometria do sólido claramente definida.
      const drawRim = (radiusKey, alpha) => {
        for (let j = 0; j < rings; j++) {
          const th = 2 * Math.PI * j / rings;
          let started = false;
          c.beginPath();
          for (let i = 0; i <= slices; i++) {
            const p = profile[i];
            if (!p) { started = false; continue; }
            const radius = p[radiusKey];
            const q = this.project3D(p.x, radius * Math.cos(th), radius * Math.sin(th));
            if (!started) { c.moveTo(q.x,q.y); started = true; } else c.lineTo(q.x,q.y);
          }
          c.strokeStyle = `${obj.color}${alpha}`;
          c.lineWidth = 1.1;
          c.stroke();
        }
      };
      drawRim('R','c8');
      drawRim('r','72');

      // Anéis/discos de referência em algumas seções, para deixar explícito o método de Cálculo II.
      const sliceIndices = [0.2, 0.42, 0.66, 0.84].map(t => Math.round(t * slices));
      c.strokeStyle = `${obj.color}b0`;
      c.lineWidth = 1.15;
      for (const idx of sliceIndices) {
        const p = profile[Math.max(0, Math.min(slices, idx))];
        if (!p) continue;
        const ptsOuter = [];
        const ptsInner = [];
        for (let j = 0; j <= rings; j++) {
          const th = 2*Math.PI*j/rings;
          ptsOuter.push(this.project3D(p.x, p.R*Math.cos(th), p.R*Math.sin(th)));
          ptsInner.push(this.project3D(p.x, p.r*Math.cos(th), p.r*Math.sin(th)));
        }
        c.beginPath();
        ptsOuter.forEach((q,j)=>{ if(!j)c.moveTo(q.x,q.y); else c.lineTo(q.x,q.y); });
        c.stroke();
        if (p.r > 1e-8) {
          c.beginPath();
          ptsInner.forEach((q,j)=>{ if(!j)c.moveTo(q.x,q.y); else c.lineTo(q.x,q.y); });
          c.strokeStyle = `${obj.color}70`;
          c.stroke();
        }
      }

      // Capas nas extremidades a e b: disco quando r=0, arruela quando r>0.
      for (const idx of [0, slices]) {
        const p = profile[idx];
        if (!p) continue;
        const drawCap = (radius, fillAlpha, strokeAlpha) => {
          const pts=[];
          for(let j=0;j<=rings;j++){const th=2*Math.PI*j/rings;pts.push(this.project3D(p.x,radius*Math.cos(th),radius*Math.sin(th)));}
          c.beginPath(); pts.forEach((q,j)=>{if(!j)c.moveTo(q.x,q.y);else c.lineTo(q.x,q.y);}); c.closePath();
          c.fillStyle=`${obj.color}${fillAlpha}`; c.fill();
          c.strokeStyle=`${obj.color}${strokeAlpha}`; c.stroke();
        };
        drawCap(p.R,'20','70');
        if(p.r>1e-8) drawCap(p.r,'10','55');
      }

      c.restore();
    }

    drawSurface(obj) {
      let solver; try { solver=this.getCompiled(obj.id,obj.data.expression,this.getDefaultVariables()); } catch { return; }
      const steps=20, range=Math.max(1, Number(obj.data.range)||5), points=[];
      for(let i=0;i<=steps;i++){
        const row=[]; const x=-range+(2*range)*i/steps;
        for(let j=0;j<=steps;j++){ const y=-range+(2*range)*j/steps, z=solver({x,y}); row.push(Number.isFinite(z)&&Math.abs(z)<1e5?this.project3D(x,y,z):null); }
        points.push(row);
      }
      const c=this.ctx; c.save(); c.lineWidth=1;
      for(let i=0;i<steps;i++) for(let j=0;j<steps;j++){
        const a=points[i][j],b=points[i+1][j],d=points[i][j+1],e=points[i+1][j+1]; if(!a||!b||!d||!e) continue;
        c.fillStyle=obj.color+'18'; c.strokeStyle=obj.color+'88'; c.beginPath(); c.moveTo(a.x,a.y); c.lineTo(b.x,b.y); c.lineTo(e.x,e.y); c.lineTo(d.x,d.y); c.closePath(); c.fill(); c.stroke();
      } c.restore();
    }

    drawCurve3D(obj) {
      let sx,sy,sz; try { sx=this.getCompiled(`${obj.id}:x`,obj.data.xExpr,this.getDefaultVariables()); sy=this.getCompiled(`${obj.id}:y`,obj.data.yExpr,this.getDefaultVariables()); sz=this.getCompiled(`${obj.id}:z`,obj.data.zExpr,this.getDefaultVariables()); } catch { return; }
      const c=this.ctx; c.save(); c.strokeStyle=obj.color; c.lineWidth=2.4; c.lineCap='round'; c.beginPath(); let started=false;
      for(let i=0;i<=700;i++){ const t=obj.data.tMin+(obj.data.tMax-obj.data.tMin)*i/700; const x=sx({t}),y=sy({t}),z=sz({t}); if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z)||Math.max(Math.abs(x),Math.abs(y),Math.abs(z))>1e5){started=false;continue;} const p=this.project3D(x,y,z); if(!started){c.moveTo(p.x,p.y);started=true;} else c.lineTo(p.x,p.y); } c.stroke(); c.restore();
    }

    drawLine3D(obj) {
      const p1=this.project3D(...obj.data.p1), p2=this.project3D(...obj.data.p2);
      const c=this.ctx; c.save(); c.strokeStyle=obj.color; c.fillStyle=obj.color; c.lineWidth=2.5; c.beginPath(); c.moveTo(p1.x,p1.y); c.lineTo(p2.x,p2.y); c.stroke();
      const ang=Math.atan2(p2.y-p1.y,p2.x-p1.x), len=12; c.beginPath(); c.moveTo(p2.x,p2.y); c.lineTo(p2.x-len*Math.cos(ang-Math.PI/6),p2.y-len*Math.sin(ang-Math.PI/6)); c.lineTo(p2.x-len*Math.cos(ang+Math.PI/6),p2.y-len*Math.sin(ang+Math.PI/6)); c.closePath(); c.fill(); c.restore();
    }

    getDefaultVariables() {
      const vars = {};
      const names = MathEngine.defaultVariables || ['x','y','z','t'];
      for (const name of names) vars[name] = 0;
      return vars;
    }

    getVars() { const names = window.MathEngine?.defaultVariables || ['x','y','z','t']; return Object.fromEntries(names.map((name)=>[name,0])); }
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
      const variable = obj.data.variable === 'y' ? 'y' : 'x';
      try { solver = this.getCompiled(obj.id, obj.data.expression, this.getDefaultVariables()); } catch { return; }
      const { w, h } = this.size;
      this.lineStyle(obj.color, 2.2); this.ctx.beginPath();
      let started = false; let prev = null;
      const steps = Math.min(1800, Math.max(500, Math.floor((variable==='x'?w:h) * 1.15)));
      for (let i = 0; i <= steps; i++) {
        const p0 = this.screenToWorld(variable==='x' ? (i / steps) * w : 0, variable==='y' ? (i / steps) * h : 0);
        const independent = variable==='x' ? p0.x : p0.y;
        const value = solver({ ...this.getDefaultVariables(), [variable]: independent });
        if (!Number.isFinite(value) || Math.abs(value) > 1e7) { started = false; prev = null; continue; }
        const point = variable==='x' ? this.worldToScreen(independent, value) : this.worldToScreen(value, independent);
        if (!started || (prev !== null && Math.abs((variable==='x'?point.y:point.x) - prev) > (variable==='x'?h:w) * 1.25)) this.ctx.moveTo(point.x, point.y); else this.ctx.lineTo(point.x, point.y);
        started = true; prev = variable==='x' ? point.y : point.x;
      }
      this.ctx.stroke();
    }

    drawParametric(obj) {
      let sx, sy;
      try { sx = this.getCompiled(`${obj.id}:x`, obj.data.xExpr, this.getDefaultVariables()); sy = this.getCompiled(`${obj.id}:y`, obj.data.yExpr, this.getDefaultVariables()); } catch { return; }
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
      const c = this.ctx;
      const arrow = obj.data?.arrow !== false;
      let a, b;
      const is3D = this.vectorIs3D(obj);
      if (is3D) {
        const [p1, p2] = this.getVector3DPoints(obj);
        // O vetor 3D sempre é projetado pelos três eixos. Não descarte z=0:
        // a presença estrutural de z/flag 3D é suficiente para usar a projeção.
        a = this.project3D(p1[0], p1[1], p1[2]);
        b = this.project3D(p2[0], p2[1], p2[2]);
      } else {
        const d = obj.data || {};
        const x1 = Number.isFinite(Number(d.x1)) ? Number(d.x1) : Number(d.p1?.[0] ?? 0);
        const y1 = Number.isFinite(Number(d.y1)) ? Number(d.y1) : Number(d.p1?.[1] ?? 0);
        const x2 = Number.isFinite(Number(d.x2)) ? Number(d.x2) : Number(d.p2?.[0] ?? 0);
        const y2 = Number.isFinite(Number(d.y2)) ? Number(d.y2) : Number(d.p2?.[1] ?? 0);
        a = this.worldToScreen(x1, y1);
        b = this.worldToScreen(x2, y2);
      }
      if (![a.x, a.y, b.x, b.y].every(Number.isFinite)) return;
      this.lineStyle(obj.color, is3D ? 3 : 2.5);
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      if (!arrow) return;
      const dx = b.x - a.x, dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      if (length < 1e-6) return;
      const ang = Math.atan2(dy, dx), len = 12;
      c.fillStyle = obj.color; c.beginPath();
      c.moveTo(b.x, b.y);
      c.lineTo(b.x - len * Math.cos(ang - Math.PI / 6), b.y - len * Math.sin(ang - Math.PI / 6));
      c.lineTo(b.x - len * Math.cos(ang + Math.PI / 6), b.y - len * Math.sin(ang + Math.PI / 6));
      c.closePath(); c.fill();
    }

    drawPoint(obj) { const p = this.worldToScreen(obj.data.x, obj.data.y); this.ctx.fillStyle = obj.color; this.ctx.beginPath(); this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); this.ctx.fill(); }

    drawCircle(obj) { this.drawPolar(obj.color, (t) => [obj.data.cx + obj.data.r * Math.cos(t), obj.data.cy + obj.data.r * Math.sin(t)]); }
    drawEllipse(obj) { this.drawPolar(obj.color, (t) => [obj.data.cx + obj.data.a * Math.cos(t), obj.data.cy + obj.data.b * Math.sin(t)]); }
    drawPolar(color, fn) { this.lineStyle(color, 2.2); this.ctx.beginPath(); for (let i = 0; i <= 240; i++) { const t = i / 240 * Math.PI * 2; const [x, y] = fn(t); const p = this.worldToScreen(x, y); if (i === 0) this.ctx.moveTo(p.x, p.y); else this.ctx.lineTo(p.x, p.y); } this.ctx.stroke(); }

    drawLine(obj) {
      const { a = 0, b = 0, c = 0 } = obj.data || {};
      const eps = 1e-12;
      if (Math.abs(a) < eps && Math.abs(b) < eps) return;

      const left = this.screenToWorld(0, 0).x;
      const right = this.screenToWorld(this.size.w, 0).x;
      const top = this.screenToWorld(0, 0).y;
      const bottom = this.screenToWorld(0, this.size.h).y;
      const points = [];

      const add = (x, y) => {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        if (x < Math.min(left, right) - 1e-9 || x > Math.max(left, right) + 1e-9) return;
        if (y < Math.min(bottom, top) - 1e-9 || y > Math.max(bottom, top) + 1e-9) return;
        if (!points.some((p) => Math.abs(p[0] - x) < 1e-10 && Math.abs(p[1] - y) < 1e-10)) points.push([x, y]);
      };

      // Interseções com as bordas verticais.
      if (Math.abs(b) > eps) {
        add(left, (-a * left - c) / b);
        add(right, (-a * right - c) / b);
      }
      // Interseções com as bordas horizontais.
      if (Math.abs(a) > eps) {
        add((-b * top - c) / a, top);
        add((-b * bottom - c) / a, bottom);
      }

      if (points.length < 2) return;
      // Escolhe as duas interseções mais afastadas para garantir a reta atravessando o viewport.
      let p1 = points[0], p2 = points[1], maxDist = -1;
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          const dx = points[i][0] - points[j][0];
          const dy = points[i][1] - points[j][1];
          const d = dx * dx + dy * dy;
          if (d > maxDist) { maxDist = d; p1 = points[i]; p2 = points[j]; }
        }
      }
      this.strokeSegment(obj.color, p1[0], p1[1], p2[0], p2[1]);
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
      else if (obj.type === 'surface') this.drawSurface(obj);
      else if (obj.type === 'solid') this.drawSolid(obj);
      else if (obj.type === 'curve3d') this.drawCurve3D(obj);
      else if (obj.type === 'line3d') this.drawLine3D(obj);
    }

    render() {
      const { w, h } = this.size;
      this.ctx.clearRect(0, 0, w, h);
      this.ctx.fillStyle = '#0d131b';
      this.ctx.fillRect(0, 0, w, h);
      this.drawGrid(); this.drawAxes();
      if (this.has3DObjects()) this.draw3DAxes();
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
      if (obj.type === 'vector') {
        if (this.vectorIs3D(obj)) {
          const [p1,p2] = this.getVector3DPoints(obj), a = this.project3D(...p1), b = this.project3D(...p2);
          const marker = obj.data?.arrow === false ? '' : ' marker-end="url(#vectorArrow)"';
          return `<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" stroke="${color}" stroke-width="2.5"${marker}/>`;
        }
        const d = obj.data || {};
        const x1 = Number.isFinite(Number(d.x1)) ? Number(d.x1) : Number(d.p1?.[0] ?? 0);
        const y1 = Number.isFinite(Number(d.y1)) ? Number(d.y1) : Number(d.p1?.[1] ?? 0);
        const x2 = Number.isFinite(Number(d.x2)) ? Number(d.x2) : Number(d.p2?.[0] ?? 0);
        const y2 = Number.isFinite(Number(d.y2)) ? Number(d.y2) : Number(d.p2?.[1] ?? 0);
        const a = p(x1, y1), b = p(x2, y2); const marker = d.arrow === false ? '' : ' marker-end="url(#vectorArrow)"';
        return `<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" stroke="${color}" stroke-width="2.5"${marker}/>`;
      }
      if (obj.type === 'circle') { const q = p(obj.data.cx, obj.data.cy); return `<circle cx="${q.x.toFixed(2)}" cy="${q.y.toFixed(2)}" r="${(obj.data.r * this.scale).toFixed(2)}" fill="none" stroke="${color}" stroke-width="2.2"/>`; }
      if (obj.type === 'ellipse') { const q = p(obj.data.cx, obj.data.cy); return `<ellipse cx="${q.x.toFixed(2)}" cy="${q.y.toFixed(2)}" rx="${(obj.data.a * this.scale).toFixed(2)}" ry="${(obj.data.b * this.scale).toFixed(2)}" fill="none" stroke="${color}" stroke-width="2.2"/>`; }
      if (obj.type === 'line') { const { a, b, c } = obj.data; if (Math.abs(b) > 1e-12) { const xmin = this.screenToWorld(0, 0).x - 2, xmax = this.screenToWorld(w, 0).x + 2; return this.svgLine(xmin, (-a*xmin-c)/b, xmax, (-a*xmax-c)/b, color); } if (Math.abs(a) > 1e-12) { const x=-c/a; return this.svgLine(x,this.screenToWorld(0,h).y-2,x,this.screenToWorld(0,0).y+2,color); } console.warn('[GraphEngine] Reta inválida para SVG:', obj); return ''; }
      if (obj.type === 'function' || obj.type === 'parametric') {
        try {
          const segments = []; let segment = [];
          const pushSegment = () => { if (segment.length > 1) segments.push(segment); segment = []; };
          if (obj.type === 'function') {
            const solver = this.getCompiled(obj.id,obj.data.expression,this.getDefaultVariables());
            for(let i=0;i<=900;i++){const x=this.screenToWorld((i/900)*w,0).x,y=solver({x});if(Number.isFinite(y)&&Math.abs(y)<1e7){const q=p(x,y);if(!segment.length || Math.abs(q.y-segment[segment.length-1].y)<h*1.25) segment.push(q);else {pushSegment();segment.push(q);}} else pushSegment();}
          } else {
            const sx=this.getCompiled(`${obj.id}:x`,obj.data.xExpr,this.getDefaultVariables()), sy=this.getCompiled(`${obj.id}:y`,obj.data.yExpr,this.getDefaultVariables());
            for(let i=0;i<=900;i++){const t=obj.data.tMin+(obj.data.tMax-obj.data.tMin)*i/900,x=sx({t}),y=sy({t});if(Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<1e7&&Math.abs(y)<1e7){const q=p(x,y);if(!segment.length || Math.hypot(q.x-segment[segment.length-1].x,q.y-segment[segment.length-1].y)<Math.max(w,h)){segment.push(q);}else {pushSegment();segment.push(q);}} else pushSegment();}
          }
          pushSegment();
          return segments.map(seg=>`<path d="${seg.map((q,i)=>`${i?'L':'M'}${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
        } catch (error) { console.warn('[GraphEngine] Falha ao exportar objeto:', obj, error); return ''; }
      }
      if (obj.type === 'line3d') { const a=this.project3D(...obj.data.p1), b=this.project3D(...obj.data.p2); return `<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" stroke="${color}" stroke-width="2.5" marker-end="url(#vectorArrow)"/>`; }
      if (obj.type === 'curve3d') { try { const sx=this.getCompiled(`${obj.id}:x`,obj.data.xExpr,this.getDefaultVariables()), sy=this.getCompiled(`${obj.id}:y`,obj.data.yExpr,this.getDefaultVariables()), sz=this.getCompiled(`${obj.id}:z`,obj.data.zExpr,this.getDefaultVariables()); let d='',started=false; for(let i=0;i<=700;i++){ const t=obj.data.tMin+(obj.data.tMax-obj.data.tMin)*i/700,x=sx({t}),y=sy({t}),z=sz({t}); if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z)){started=false;continue;} const q=this.project3D(x,y,z); d+=`${started?'L':'M'}${q.x.toFixed(2)},${q.y.toFixed(2)} `; started=true;} return `<path d="${d.trim()}" fill="none" stroke="${color}" stroke-width="2.2"/>`; } catch(e){console.warn('[GraphEngine] Falha ao exportar curva 3D:',e);return '';}}
      if (obj.type === 'solid') { try { const d=obj.data||{}, sf=this.getCompiled(`${obj.id}:outer`,d.outerExpression,this.getDefaultVariables()), sg=this.getCompiled(`${obj.id}:inner`,d.innerExpression||'0',this.getDefaultVariables()), a=Number(d.a),b=Number(d.b),k=Number(d.axisY)||0; let out='<g fill="none" stroke="'+color+'" stroke-opacity=".55" stroke-width="1">', paths=''; const slices=24,rings=18; for(let j=0;j<rings;j++){let dd='';const th=2*Math.PI*j/rings;for(let i=0;i<=slices;i++){const x=a+(b-a)*i/slices,f=sf({...this.getDefaultVariables(),x}),g=sg({...this.getDefaultVariables(),x});if(!Number.isFinite(f)||!Number.isFinite(g))continue;const R=Math.max(Math.abs(f-k),Math.abs(g-k)),q=this.project3D(x,R*Math.cos(th),R*Math.sin(th));dd+=`${dd?'L':'M'}${q.x.toFixed(2)},${q.y.toFixed(2)} `;}if(dd)paths+=`<path d="${dd.trim()}"/>`;}for(let i=0;i<=slices;i++){const x=a+(b-a)*i/slices,f=sf({...this.getDefaultVariables(),x}),g=sg({...this.getDefaultVariables(),x});if(!Number.isFinite(f)||!Number.isFinite(g))continue;const R=Math.max(Math.abs(f-k),Math.abs(g-k));for(let j=0;j<rings;j+=2){const th=2*Math.PI*j/rings,q=this.project3D(x,R*Math.cos(th),R*Math.sin(th)),u=this.project3D(x,0,0);paths+=`<line x1="${u.x.toFixed(2)}" y1="${u.y.toFixed(2)}" x2="${q.x.toFixed(2)}" y2="${q.y.toFixed(2)}"/>`;}}return out+paths+'</g>'; } catch(e){console.warn('[GraphEngine] Falha ao exportar sólido de revolução:',e);return ''; } }
      if (obj.type === 'surface') { try { const solver=this.getCompiled(obj.id,obj.data.expression,this.getDefaultVariables()), steps=20, range=Math.max(1,Number(obj.data.range)||5); let out='<g fill="none" stroke="'+color+'" stroke-opacity=".45" stroke-width="1">'; for(let i=0;i<=steps;i++){let d='';for(let j=0;j<=steps;j++){const x=-range+2*range*i/steps,y=-range+2*range*j/steps,z=solver({x,y});if(!Number.isFinite(z)){if(d){out+=`<path d="${d}"/>`;d='';}continue;}const q=this.project3D(x,y,z);d+=`${d?'L':'M'}${q.x.toFixed(2)},${q.y.toFixed(2)} `;}if(d)out+=`<path d="${d.trim()}"/>`;}for(let j=0;j<=steps;j++){let d='';for(let i=0;i<=steps;i++){const x=-range+2*range*i/steps,y=-range+2*range*j/steps,z=solver({x,y});if(!Number.isFinite(z)){if(d){out+=`<path d="${d}"/>`;d='';}continue;}const q=this.project3D(x,y,z);d+=`${d?'L':'M'}${q.x.toFixed(2)},${q.y.toFixed(2)} `;}if(d)out+=`<path d="${d.trim()}"/>`;}return out+'</g>'; } catch(e){console.warn('[GraphEngine] Falha ao exportar superfície 3D:',e);return '';}}
      console.warn('[GraphEngine] Tipo de objeto não reconhecido para SVG:', obj.type, obj);
      return '';
    }

    svgLine(x1,y1,x2,y2,color){const a=this.worldToScreen(x1,y1),b=this.worldToScreen(x2,y2);return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="2.2"/>`;}
  }

  global.GraphEngine = GraphEngine;
})(window);
