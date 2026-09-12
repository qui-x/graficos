(function (global) {
  'use strict';

  const STORAGE_CURRENT = 'orbisvSessionV1';
  const STORAGE_PREVIOUS = 'orbisvSessionPreviousV1';
  const STORAGE_RECOVERY = 'orbisvSessionRecoveryV1';
  const LEGACY_KEY = 'graphCalcSessionV2';
  let nextId = 1;

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function nowIso() { return new Date().toISOString(); }

  class GraphObjects {
    constructor(onChange) {
      this.items = [];
      this.onChange = onChange || function () {};
      this.undoStack = [];
      this.redoStack = [];
      this.events = [];
      this.maxItems = 80;
      this.maxUndo = 120;
      this.maxEvents = 180;
    }

    snapshot() { return clone(this.items); }
    restore(snapshot, notify = true) {
      this.items = clone(snapshot || []).map((item) => ({ visible: true, locked: false, ...item }));
      nextId = this.items.reduce((m, item) => Math.max(m, Number(item.id) || 0), 0) + 1;
      if (notify) this.notify({ action: 'restaurar estado', kind: 'restore' });
    }
    notify(meta) { this.onChange(meta || { action: 'alteração', kind: 'change' }); }
    recordEvent(action, detail = '', kind = 'change') {
      this.events.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, action, detail, kind, at: nowIso() });
      if (this.events.length > this.maxEvents) this.events.length = this.maxEvents;
    }
    commit(previous, action, detail = '', kind = 'change') {
      this.undoStack.push({ items: previous, action, detail });
      if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
      this.redoStack = [];
      this.recordEvent(action, detail, kind);
      this.notify({ action, detail, kind });
    }
    getById(id) { return this.items.find((o) => o.id === Number(id)); }

    add(type, data, color, extras = {}) {
      if (this.items.length >= this.maxItems) throw new Error(`Limite de ${this.maxItems} objetos atingido.`);
      const previous = this.snapshot();
      const obj = { id: nextId++, type, color: color || '#46e6ff', visible: true, locked: false, name: '', data: clone(data), ...clone(extras) };
      this.items.push(obj);
      this.commit(previous, 'Objeto adicionado', this.describe(obj), 'add');
      return obj;
    }
    update(id, data, extras = null) {
      const item = this.getById(id); if (!item) return false; if (item.locked) return false;
      const previous = this.snapshot();
      item.data = clone(data);
      if (extras) Object.assign(item, clone(extras));
      this.commit(previous, 'Objeto editado', this.describe(item), 'edit');
      return true;
    }
    remove(id, force = false) {
      const item = this.getById(id); if (!item) return false; if (item.locked && !force) return false;
      const previous = this.snapshot();
      this.items = this.items.filter((o) => o.id !== item.id);
      this.commit(previous, 'Objeto excluído', this.describe(item), 'delete');
      return true;
    }
    toggle(id) {
      const item = this.getById(id); if (!item) return false;
      const previous = this.snapshot(); item.visible = !item.visible;
      this.commit(previous, item.visible ? 'Objeto exibido' : 'Objeto ocultado', this.describe(item), 'visibility');
      return true;
    }
    setLocked(id, locked) {
      const item = this.getById(id); if (!item) return false;
      const previous = this.snapshot(); item.locked = locked === undefined ? !item.locked : Boolean(locked);
      this.commit(previous, item.locked ? 'Objeto bloqueado' : 'Objeto desbloqueado', this.describe(item), 'lock');
      return true;
    }
    duplicate(id, colorOverride = null) {
      const item = this.getById(id); if (!item) return null;
      const previous = this.snapshot();
      const copy = clone(item); copy.id = nextId++; copy.locked = false; copy.name = item.name ? `${item.name} cópia` : ''; if (colorOverride) copy.color = String(colorOverride);
      if (copy.data && Number.isFinite(copy.data.x)) copy.data.x += 0.4;
      if (copy.data && Number.isFinite(copy.data.y)) copy.data.y += 0.4;
      this.items.push(copy);
      this.commit(previous, 'Objeto duplicado', this.describe(copy), 'duplicate');
      return copy;
    }
    reorder(id, direction) {
      const index = this.items.findIndex((o) => o.id === Number(id)); if (index < 0) return false;
      const target = direction === 'up' ? index + 1 : direction === 'down' ? index - 1 : Number(direction);
      if (!Number.isInteger(target) || target < 0 || target >= this.items.length || target === index) return false;
      const previous = this.snapshot();
      const [item] = this.items.splice(index, 1); this.items.splice(target, 0, item);
      this.commit(previous, 'Ordem dos objetos alterada', this.describe(item), 'reorder');
      return true;
    }
    batch(ids, operation) {
      const set = new Set((ids || []).map(Number)); if (!set.size) return false;
      const previous = this.snapshot(); let changed = false; let detail = `${set.size} objeto(s)`;
      if (operation === 'hide') { this.items.forEach((o) => { if (set.has(o.id) && o.visible) { o.visible = false; changed = true; } }); }
      if (operation === 'show') { this.items.forEach((o) => { if (set.has(o.id) && !o.visible) { o.visible = true; changed = true; } }); }
      if (operation === 'delete') { const before = this.items.length; this.items = this.items.filter((o) => !set.has(o.id) || o.locked); changed = this.items.length !== before; }
      if (operation === 'duplicate') {
        const copies = this.items.filter((o) => set.has(o.id)).map((o) => ({ ...clone(o), id: nextId++, locked: false }));
        if (copies.length) { this.items.push(...copies); changed = true; detail = `${copies.length} objeto(s)`; }
      }
      if (!changed) return false;
      const labels = { hide: 'Objetos ocultados', show: 'Objetos exibidos', delete: 'Objetos excluídos', duplicate: 'Objetos duplicados' };
      this.commit(previous, labels[operation] || 'Objetos alterados', detail, 'batch'); return true;
    }
    clear(force = false) {
      if (!this.items.length) return false;
      const previous = this.snapshot();
      if (force) this.items = []; else this.items = this.items.filter((o) => o.locked);
      if (this.items.length === previous.length) return false;
      this.commit(previous, 'Cena limpa', `${previous.length - this.items.length} objeto(s) removido(s)`, 'clear'); return true;
    }
    undo() {
      const entry = this.undoStack.pop(); if (!entry) return false;
      this.redoStack.push({ items: this.snapshot(), action: entry.action, detail: entry.detail });
      this.restore(entry.items, false);
      this.recordEvent(`Desfazer: ${entry.action}`, entry.detail, 'undo');
      this.notify({ action: `Desfazer: ${entry.action}`, detail: entry.detail, kind: 'undo' }); return true;
    }
    redo() {
      const entry = this.redoStack.pop(); if (!entry) return false;
      this.undoStack.push({ items: this.snapshot(), action: entry.action, detail: entry.detail });
      this.restore(entry.items, false);
      this.recordEvent(`Refazer: ${entry.action}`, entry.detail, 'redo');
      this.notify({ action: `Refazer: ${entry.action}`, detail: entry.detail, kind: 'redo' }); return true;
    }
    describe(obj) {
      if (!obj) return '';
      if (obj.type === 'function') return `f(x) = ${obj.data.expression}`;
      if (obj.type === 'parametric') return `x(t) = ${obj.data.xExpr}; y(t) = ${obj.data.yExpr}`;
      if (obj.type === 'vector') return `(${obj.data.x1}, ${obj.data.y1}) → (${obj.data.x2}, ${obj.data.y2})`;
      if (obj.type === 'point') return `P = (${obj.data.x}, ${obj.data.y})`;
      if (obj.type === 'circle') return `Círculo r = ${obj.data.r}`;
      if (obj.type === 'ellipse') return `Elipse a = ${obj.data.a}, b = ${obj.data.b}`;
      if (obj.type === 'line') return `${obj.data.a}x + ${obj.data.b}y + ${obj.data.c} = 0`;
      if (obj.type === 'curve3d') return `r(t) = (${obj.data.xExpr}, ${obj.data.yExpr}, ${obj.data.zExpr})`;
      if (obj.type === 'line3d') return obj.data.method === 'twoPoints' ? `Reta 3D por dois pontos` : `Reta 3D com direção (${obj.data.a}, ${obj.data.b}, ${obj.data.c})`;
      return obj.type;
    }
    serialize() {
      return { format: 'orbisv-session', version: 1, savedAt: nowIso(), items: clone(this.items), undoStack: clone(this.undoStack.slice(-40)), redoStack: clone(this.redoStack.slice(-40)), events: clone(this.events) };
    }
    save() {
      try {
        const current = localStorage.getItem(STORAGE_CURRENT);
        if (current) localStorage.setItem(STORAGE_PREVIOUS, current);
        const payload = JSON.stringify(this.serialize());
        localStorage.setItem(STORAGE_CURRENT, payload);
        const recoveryRaw = localStorage.getItem(STORAGE_RECOVERY);
        let shouldWriteRecovery = !recoveryRaw;
        if (recoveryRaw) { try { const r = JSON.parse(recoveryRaw); shouldWriteRecovery = Date.now() - new Date(r.savedAt || 0).getTime() > 5 * 60 * 1000; } catch { shouldWriteRecovery = true; } }
        if (shouldWriteRecovery) localStorage.setItem(STORAGE_RECOVERY, payload);
        return true;
      } catch { return false; }
    }
    loadPayload(raw) {
      if (!raw || !Array.isArray(raw.items)) return false;
      this.restore(raw.items, false);
      this.undoStack = Array.isArray(raw.undoStack) ? clone(raw.undoStack) : [];
      this.redoStack = Array.isArray(raw.redoStack) ? clone(raw.redoStack) : [];
      this.events = Array.isArray(raw.events) ? clone(raw.events) : [];
      return true;
    }
    load() {
      try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_CURRENT) || 'null');
        if (raw && this.loadPayload(raw)) return true;
        const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
        if (legacy?.version === 2 && Array.isArray(legacy.items)) { this.restore(legacy.items, false); this.recordEvent('Sessão anterior migrada', 'Dados importados da Calculadora Gráfica', 'migration'); this.save(); return true; }
      } catch { return false; }
      return false;
    }
    recoveryCandidate() {
      try { const raw = JSON.parse(localStorage.getItem(STORAGE_RECOVERY) || 'null'); return raw && Array.isArray(raw.items) ? raw : null; } catch { return null; }
    }
    importProject(project) {
      if (!project || project.format !== 'orbisv-project' || !Array.isArray(project.scene?.objects)) throw new Error('Arquivo OrbisV inválido ou incompatível.');
      const previous = this.snapshot(); this.items = clone(project.scene.objects); nextId = this.items.reduce((m, o) => Math.max(m, Number(o.id) || 0), 0) + 1;
      this.undoStack.push({ items: previous, action: 'abrir projeto', detail: project.name || '' }); this.redoStack = [];
      this.recordEvent('Projeto aberto', project.name || 'Projeto OrbisV', 'project'); this.notify({ action: 'Projeto aberto', detail: project.name || '', kind: 'project' });
    }
    get visible() { return this.items.filter((o) => o.visible); }
  }

  global.GraphObjects = GraphObjects;
})(window);
