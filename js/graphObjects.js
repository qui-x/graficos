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

    addCurve3D(xExpr, yExpr, zExpr, tMin, tMax, color) {
      return this.add('curve3d', { xExpr, yExpr, zExpr, tMin, tMax }, color);
    }

    addLine3D(p1, p2, color) { return this.add('line3d', { p1: clone(p1), p2: clone(p2) }, color); }

    get visible() { return this.items.filter((o) => o.visible); }
  }

  global.GraphObjects = GraphObjects;
})(window);
