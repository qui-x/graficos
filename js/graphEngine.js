(function (global) {
  'use strict';

  const STORAGE_KEY = 'graphCalcSessionV2';
  let nextId = 1;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  class GraphObjects {
    constructor(onChange) {
      this.items = [];
      this.onChange = onChange || function () {};
      this.undoStack = [];
      this.redoStack = [];
      this.maxItems = 50;
    }

    snapshot() { return clone(this.items); }

    restore(snapshot, notify = true) {
      this.items = clone(snapshot || []);
      nextId = this.items.reduce((m, item) => Math.max(m, Number(item.id) || 0), 0) + 1;
      if (notify) this.onChange();
    }

    commit(previous, action = 'alteração') {
      this.undoStack.push({ items: previous, action });
      if (this.undoStack.length > 100) this.undoStack.shift();
      this.redoStack = [];
      this.onChange();
    }

    add(type, data, color) {
      if (this.items.length >= this.maxItems) throw new Error(`Limite de ${this.maxItems} objetos atingido.`);
      const previous = this.snapshot();
      const obj = { id: nextId++, type, color: color || '#5ac8fa', visible: true, data: clone(data) };
      this.items.push(obj);
      this.commit(previous, 'adicionar objeto');
      return obj;
    }

    remove(id) {
      const previous = this.snapshot();
      const before = this.items.length;
      this.items = this.items.filter((o) => o.id !== id);
      if (this.items.length !== before) this.commit(previous, 'excluir objeto');
    }

    toggle(id) {
      const previous = this.snapshot();
      const item = this.items.find((o) => o.id === id);
      if (!item) return;
      item.visible = !item.visible;
      this.commit(previous, 'alterar visibilidade');
    }

    update(id, data) {
      const previous = this.snapshot();
      const item = this.items.find((o) => o.id === id);
      if (!item) return;
      item.data = clone(data);
      this.commit(previous, 'editar objeto');
    }

    clear() {
      if (!this.items.length) return;
      const previous = this.snapshot();
      this.items = [];
      this.commit(previous, 'limpar objetos');
    }


    clearForMode() {
      if (!this.items.length) return false;
      this.items = [];
      this.undoStack = [];
      this.redoStack = [];
      this.onChange();
      return true;
    }
    undo() {
      const entry = this.undoStack.pop();
      if (!entry) return false;
      this.redoStack.push({ items: this.snapshot(), action: entry.action });
      this.restore(entry.items);
      return true;
    }

    redo() {
      const entry = this.redoStack.pop();
      if (!entry) return false;
      this.undoStack.push({ items: this.snapshot(), action: entry.action });
      this.restore(entry.items);
      return true;
    }

    save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, items: this.items }));
    }

    load() {
      try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        if (raw?.version === 2 && Array.isArray(raw.items)) this.restore(raw.items, false);
      } catch { /* sessão corrompida é ignorada */ }
    }

    addSurface(expression, color) { return this.add('surface', { expression }, color); }

    addSolidOfRevolution(data, color) { return this.add('solid', { ...clone(data) }, color); }

    addCurve3D(xExpr, yExpr, zExpr, tMin, tMax, color) {
      return this.add('curve3d', { xExpr, yExpr, zExpr, tMin, tMax }, color);
    }

    addLine3D(p1, p2, color) { return this.add('line3d', { p1: clone(p1), p2: clone(p2) }, color); }

    addVector(p1, p2, color, options = {}) {
      const { arrow = true, is3D = false } = options;
      const a = clone(p1);
      const b = clone(p2);
      if (!is3D) {
        a.length = Math.min(2, a.length);
        b.length = Math.min(2, b.length);
      }
      const finalIs3D = Boolean(is3D || a.length >= 3 || b.length >= 3);
      const finalP1 = finalIs3D ? [Number(a[0]) || 0, Number(a[1]) || 0, Number(a[2]) || 0] : [Number(a[0]) || 0, Number(a[1]) || 0];
      const finalP2 = finalIs3D ? [Number(b[0]) || 0, Number(b[1]) || 0, Number(b[2]) || 0] : [Number(b[0]) || 0, Number(b[1]) || 0];
      return this.add('vector', {
        p1: finalP1,
        p2: finalP2,
        arrow: arrow !== false,
        is3D: finalIs3D,
        x1: finalP1[0], y1: finalP1[1], z1: finalIs3D ? finalP1[2] : 0,
        x2: finalP2[0], y2: finalP2[1], z2: finalIs3D ? finalP2[2] : 0
      }, color);
    }

    addVector3D(p1, p2, color, arrow = true) {
      return this.addVector(p1, p2, color, { arrow, is3D: true });
    }

    addSegment3D(p1, p2, color) {
      return this.addVector(p1, p2, color, { arrow: false, is3D: true });
    }

    get visible() { return this.items.filter((o) => o.visible); }
  }

  global.GraphObjects = GraphObjects;
})(window);
