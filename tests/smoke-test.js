#!/usr/bin/env node
'use strict';

/**
 * Base de testes gerais de funcionalidades — Calculadora Gráfica
 * ----------------------------------------------------------------
 * Carrega o app de verdade (index.html + css/js reais) dentro de um DOM
 * headless (jsdom) e roda verificações automáticas de:
 *   - integridade de referências DOM (todo id que o JS espera existe no HTML)
 *   - troca de modos / roteamento por hash do PWA
 *   - abrir/fechar/arrastar o bottom sheet de controles (mobile e desktop)
 *   - o motor de matemática (casos válidos e inválidos)
 *   - CRUD de objetos do gráfico (undo/redo/limite/import-export)
 *
 * Não substitui teste manual em navegador de verdade (layout, animação,
 * gestos de toque reais, PWA/instalação) — isso fica no checklist manual
 * (tests/CHECKLIST-MANUAL.md). Isto aqui é a rede de segurança que roda em
 * segundos, sem precisar abrir um navegador, toda vez que algo mudar.
 *
 * Como rodar:
 *   cd tests && npm install jsdom --no-save && node smoke-test.js
 * (o jsdom só existe para RODAR os testes; o app em si não depende dele)
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = ['js/mathEngine.js', 'js/graphObjects.js', 'js/graphEngine.js', 'js/ui.js', 'js/main.js'];

let passed = 0;
let failed = 0;
const failMessages = [];
let currentSection = '';

function section(title) {
  currentSection = title;
  console.log(`\n\x1b[1m== ${title} ==\x1b[0m`);
}

function check(condition, description) {
  if (condition) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${description}`);
  } else {
    failed++;
    const msg = `[${currentSection}] ${description}`;
    failMessages.push(msg);
    console.log(`  \x1b[31m✗ ${description}\x1b[0m`);
  }
}

function checkThrows(fn, description) {
  try {
    fn();
    check(false, description);
  } catch (_) {
    check(true, description);
  }
}

function checkNoThrow(fn, description) {
  try {
    fn();
    check(true, description);
  } catch (error) {
    check(false, `${description} (lançou: ${error.message})`);
  }
}

/**
 * Monta uma instância nova do app dentro de um jsdom, com todos os stubs de
 * Web APIs que o jsdom não implementa nativamente (canvas 2D, ResizeObserver,
 * requestAnimationFrame, URL.createObjectURL...). Cada chamada cria um DOM
 * isolado — necessário porque hash da URL e largura da janela só são lidos
 * na inicialização.
 */
function loadApp({ hash = '', innerWidth = 1280, innerHeight = 800 } = {}) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const url = `http://localhost/${hash ? '#' + hash : ''}`;
  const dom = new JSDOM(html, { url, pretendToBeVisual: true, runScripts: 'outside-only' });
  const { window } = dom;

  Object.defineProperty(window, 'innerWidth', { value: innerWidth, configurable: true, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: innerHeight, configurable: true, writable: true });

  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
  if (window.URL) { window.URL.createObjectURL = () => 'blob:stub'; window.URL.revokeObjectURL = () => {}; }

  const fakeCtx = {
    save() {}, restore() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {},
    fill() {}, stroke() {}, fillRect() {}, clearRect() {}, fillText() {}, setTransform() {},
    fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: '', lineJoin: '', font: '', textAlign: '', textBaseline: ''
  };
  window.HTMLCanvasElement.prototype.getContext = () => fakeCtx;
  window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,stub';
  window.HTMLCanvasElement.prototype.toBlob = (cb) => cb && cb(null);

  let bootError = null;
  try {
    for (const rel of SCRIPTS) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      window.eval(src);
    }
  } catch (error) {
    bootError = error;
  }

  return { window, document: window.document, bootError, AppUI: window.AppUI, MathEngine: window.MathEngine, GraphObjects: window.GraphObjects };
}

function setViewportWidth(window, width) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true, writable: true });
}

// ===========================================================================
section('1. Inicialização do app (bootstrap)');
// ===========================================================================
const { window, document, bootError, AppUI, MathEngine } = loadApp();
check(!bootError, `app carrega e inicializa sem lançar exceção${bootError ? ' — ' + bootError.stack : ''}`);
check(typeof AppUI === 'object', 'window.AppUI está definido');
check(typeof MathEngine === 'object', 'window.MathEngine está definido');
check(typeof window.GraphObjects === 'function', 'window.GraphObjects está definido');
check(typeof window.GraphEngine === 'function', 'window.GraphEngine está definido');

if (bootError) {
  console.log('\n\x1b[31mErro fatal na inicialização — abortando o restante da suíte.\x1b[0m');
  console.log(bootError.stack);
  process.exit(1);
}

// ===========================================================================
section('2. Integridade de referências DOM (this.$)');
// ===========================================================================
// Esta é exatamente a checagem que teria pego o bug do "showControlsBtn":
// todo elemento cacheado em AppUI.$ precisa existir de verdade no HTML.
const dollarKeys = Object.keys(AppUI.$ || {});
check(dollarKeys.length > 30, `AppUI.$ tem um número razoável de referências cacheadas (${dollarKeys.length})`);
const orphaned = dollarKeys.filter((key) => {
  const el = AppUI.$[key];
  return el === null || el === undefined;
});
check(orphaned.length === 0, `nenhuma referência órfã em AppUI.$ (sem elemento correspondente no HTML)${orphaned.length ? ': ' + orphaned.join(', ') : ''}`);

// IDs duplicados no HTML são um bug silencioso clássico (getElementById pega só o primeiro)
const idAttrs = [...document.querySelectorAll('[id]')].map((el) => el.id);
const idCounts = idAttrs.reduce((m, id) => (m[id] = (m[id] || 0) + 1, m), {});
const dupes = Object.entries(idCounts).filter(([, n]) => n > 1).map(([id]) => id);
check(dupes.length === 0, `nenhum id duplicado no documento${dupes.length ? ': ' + dupes.join(', ') : ''}`);

// ===========================================================================
section('3. Troca de modos (barra de modos no topo)');
// ===========================================================================
const modes = ['function', 'parametric', 'vector', 'geometry', 'surface', 'curve3d', 'line3d'];
for (const mode of modes) {
  checkNoThrow(() => AppUI.setTab(mode, false), `setTab('${mode}') não lança exceção`);
  const panel = document.querySelector(`.tab-panel[data-panel="${mode}"]`);
  check(panel && !panel.hidden && panel.classList.contains('active'), `painel de "${mode}" fica visível/ativo após setTab`);
  const btn = document.querySelector(`.mode-btn[data-mode="${mode}"]`);
  check(btn && btn.classList.contains('active') && btn.getAttribute('aria-current') === 'true', `botão de modo "${mode}" marcado como ativo/aria-current`);
  const others = modes.filter((m) => m !== mode);
  const othersHidden = others.every((m) => {
    const p = document.querySelector(`.tab-panel[data-panel="${m}"]`);
    return !p || p.hidden || !p.classList.contains('active');
  });
  check(othersHidden, `apenas o painel de "${mode}" fica ativo (os outros ${others.length} ficam ocultos)`);
}
check(AppUI.activeTab === 'line3d', 'AppUI.activeTab reflete o último modo selecionado');

// ===========================================================================
section('4. Atalhos do PWA / roteamento por hash da URL');
// ===========================================================================
for (const hash of ['function', 'vector', 'surface', 'geometry', 'curve3d', 'line3d', 'parametric']) {
  const app = loadApp({ hash });
  check(!app.bootError, `#${hash}: app inicializa sem erro`);
  check(app.AppUI.activeTab === hash, `#${hash}: abre direto no modo correspondente (activeTab === '${hash}')`);
}
{
  const app = loadApp({ hash: 'modo-que-nao-existe' });
  check(app.AppUI.activeTab === 'function', 'hash inválido/desconhecido cai de volta no modo padrão ("function"), sem travar');
}
{
  const app = loadApp({ hash: '' });
  check(app.AppUI.activeTab === 'function', 'sem hash na URL, abre no modo padrão ("function")');
}

// ===========================================================================
section('5. Fórmula LaTeX de Discos/Anéis (bug de escape \\r / \\t)');
// ===========================================================================
AppUI.setTab('surface', false);
AppUI.updatePreviews();
const solidHTML = document.getElementById('solidFormulaDisplay')?.innerHTML || '';
check(!/\x0d|\x09/.test(solidHTML), 'card estático de fórmula (solidFormulaDisplay) não contém caracteres de controle CR/TAB corrompidos');
check(!/\bight\]/.test(solidHTML) && !/\bext\{/.test(solidHTML), 'card estático não mostra o texto quebrado "ight]"/"ext{" (símbolo de \\right / \\text corrompido)');
check(/\]\s*dx/i.test(solidHTML) || /katex/i.test(solidHTML), 'card estático fecha o colchete antes de "dx" (o fallback remove \\left/\\right de propósito — antes do fix sobrava "ight]" solto ali)');

// preview ao vivo (updateSolidPreview) — simula digitar nos campos do modo Discos/Anéis
if (AppUI.$.surfaceExpr) AppUI.$.surfaceExpr.value = 'x^2';
if (AppUI.$.surfaceInnerExpr) AppUI.$.surfaceInnerExpr.value = '0';
if (AppUI.$.surfaceAMin) AppUI.$.surfaceAMin.value = '0';
if (AppUI.$.surfaceBMax) AppUI.$.surfaceBMax.value = '2';
checkNoThrow(() => AppUI.updateSolidPreview && AppUI.updateSolidPreview(), 'updateSolidPreview() roda sem lançar exceção com campos preenchidos');
const livePreviewHTML = document.getElementById('surfacePreview')?.innerHTML || '';
check(!/\x0d|\x09/.test(livePreviewHTML), 'preview ao vivo (surfacePreview) também livre de CR/TAB corrompidos');
check(!/\bight\]/.test(livePreviewHTML) && !/\bext\{/.test(livePreviewHTML), 'preview ao vivo não mostra "ight]"/"ext{" quebrados');
check(/rota/i.test(livePreviewHTML) || /katex/i.test(livePreviewHTML), 'preview ao vivo preserva o texto "eixo de rotação" (ou renderiza via KaTeX)');

// ===========================================================================
section('6. Bottom sheet de controles — mobile (< 900px)');
// ===========================================================================
setViewportWidth(window, 390);
AppUI.closeSidebar(false);
check(!AppUI.$.controls.classList.contains('open'), 'estado inicial: painel de controles fechado');
AppUI.openSidebar(false);
check(AppUI.$.controls.classList.contains('open'), 'openSidebar() no mobile abre o bottom sheet (.open)');
check(!AppUI.$.backdrop.classList.contains('hidden'), 'openSidebar() no mobile mostra o backdrop');
AppUI.closeSidebar(false);
check(!AppUI.$.controls.classList.contains('open'), 'closeSidebar() no mobile fecha o bottom sheet');
check(AppUI.$.backdrop.classList.contains('hidden'), 'closeSidebar() no mobile esconde o backdrop de novo');

checkNoThrow(() => AppUI.toggleControlsSidebar(), 'toggleControlsSidebar() não lança exceção no mobile');

// clique no backdrop deve fechar o sheet (sem depender de closeModesMobile, removida)
AppUI.openSidebar(false);
AppUI.$.backdrop.dispatchEvent(new window.Event('click', { bubbles: true }));
check(!AppUI.$.controls.classList.contains('open'), 'clicar no backdrop fecha o bottom sheet');

// ===========================================================================
section('7. Painel de controles — desktop (>= 900px) e botão "Mostrar controles"');
// ===========================================================================
setViewportWidth(window, 1280);
AppUI.openSidebar(false);
check(!AppUI.$.workspace.classList.contains('controls-collapsed'), 'estado inicial no desktop: painel expandido');
check(AppUI.$.showControls.classList.contains('hidden'), 'botão "Mostrar controles" fica escondido enquanto o painel está expandido');
AppUI.closeSidebar(false);
check(AppUI.$.workspace.classList.contains('controls-collapsed'), 'closeSidebar() no desktop recolhe o painel (controls-collapsed)');
check(!AppUI.$.showControls.classList.contains('hidden'), 'botão "Mostrar controles" aparece quando o painel está recolhido (bug do elemento ausente corrigido)');
check(AppUI.$.showControls.inert === false, 'botão "Mostrar controles" fica focável/clicável (inert=false) quando visível');
AppUI.$.showControls.dispatchEvent(new window.Event('click', { bubbles: true }));
check(!AppUI.$.workspace.classList.contains('controls-collapsed'), 'clicar em "Mostrar controles" restaura o painel — antes disso não havia como voltar');
check(AppUI.$.showControls.classList.contains('hidden'), 'botão "Mostrar controles" volta a ficar escondido depois de restaurar o painel');

// ===========================================================================
section('8. Arrastar a alça do bottom sheet (sheet-handle)');
// ===========================================================================
setViewportWidth(window, 390);
AppUI.openSidebar(false);
const handle = document.querySelector('.sheet-handle');
check(!!handle, 'a alça de arrastar (.sheet-handle) existe no DOM');
// jsdom não faz layout de verdade (getBoundingClientRect sempre retorna 0),
// então simulamos uma altura de painel realista pra o limiar de arrasto
// (proporcional à altura) fazer sentido, igual aconteceria num navegador real.
Object.defineProperty(AppUI.$.controls, 'getBoundingClientRect', {
  value: () => ({ height: 500, top: 0, left: 0, right: 300, bottom: 500, width: 300, x: 0, y: 0 }),
  configurable: true
});

function drag(el, sequence) {
  for (const [type, clientY] of sequence) {
    const ev = new window.Event(type, { bubbles: true });
    ev.clientY = clientY;
    ev.pointerId = 1;
    el.dispatchEvent(ev);
  }
}

// arrasto curto (abaixo do limiar): não deve fechar
drag(handle, [['pointerdown', 100], ['pointermove', 110], ['pointerup', 112]]);
check(AppUI.$.controls.classList.contains('open'), 'arrasto curto (12px) não fecha o bottom sheet');
check(!AppUI.$.controls.classList.contains('dragging'), 'classe "dragging" é removida ao soltar');
check(AppUI.$.controls.style.getPropertyValue('--sheet-drag-y') === '0px' || AppUI.$.controls.style.getPropertyValue('--sheet-drag-y') === '', '--sheet-drag-y volta a 0 depois de soltar um arrasto curto');

// arrasto durante o gesto: a folha deve acompanhar o dedo em tempo real
drag(handle, [['pointerdown', 100], ['pointermove', 160]]);
check(AppUI.$.controls.classList.contains('dragging'), 'classe "dragging" é aplicada durante o arrasto');
check(AppUI.$.controls.style.getPropertyValue('--sheet-drag-y') === '60px', 'a folha acompanha o dedo em tempo real (--sheet-drag-y = distância arrastada)');
drag(handle, [['pointerup', 160]]);

// arrasto longo (acima do limiar): deve fechar
drag(handle, [['pointerdown', 100], ['pointermove', 250], ['pointerup', 260]]);
check(!AppUI.$.controls.classList.contains('open'), 'arrasto longo (160px) fecha o bottom sheet');

// pointercancel não deve fechar nem deixar "dragging" preso
AppUI.openSidebar(false);
drag(handle, [['pointerdown', 100], ['pointermove', 250]]);
handle.dispatchEvent(new window.Event('pointercancel', { bubbles: true }));
check(AppUI.$.controls.classList.contains('open'), 'pointercancel não fecha o sheet');
check(!AppUI.$.controls.classList.contains('dragging'), 'pointercancel limpa a classe "dragging" (não fica arrastado pela metade)');

// ===========================================================================
section('9. Indicador de rolagem da barra de modos');
// ===========================================================================
checkNoThrow(() => AppUI.initModeScrollFade(), 'initModeScrollFade() não lança exceção');
const nav = document.querySelector('.mode-nav');
if (nav) {
  Object.defineProperty(nav, 'scrollWidth', { value: 900, configurable: true });
  Object.defineProperty(nav, 'clientWidth', { value: 390, configurable: true });
  Object.defineProperty(nav, 'scrollLeft', { value: 50, configurable: true, writable: true });
  nav.dispatchEvent(new window.Event('scroll'));
  check(AppUI.$.modeSidebar.classList.contains('can-scroll-start'), 'fade da esquerda aparece quando já rolou pra frente (scrollLeft > 0)');
  check(AppUI.$.modeSidebar.classList.contains('can-scroll-end'), 'fade da direita aparece quando ainda há modos escondidos à direita');
  Object.defineProperty(nav, 'scrollLeft', { value: 510, configurable: true, writable: true });
  nav.dispatchEvent(new window.Event('scroll'));
  check(!AppUI.$.modeSidebar.classList.contains('can-scroll-end'), 'fade da direita some ao chegar no fim do scroll');
}

// ===========================================================================
section('10. Código morto do antigo drawer de modos (não deve voltar a existir)');
// ===========================================================================
check(typeof AppUI.openModesMobile === 'undefined', 'openModesMobile foi removida (drawer lateral obsoleto)');
check(typeof AppUI.closeModesMobile === 'undefined', 'closeModesMobile foi removida');
check(typeof AppUI.toggleSidebar === 'undefined', 'toggleSidebar (com o bug de desktop) foi removida');
check(typeof AppUI.setInitialPanelState === 'undefined', 'setInitialPanelState (nunca chamada) foi removida');

// ===========================================================================
section('11. Motor de matemática (MathEngine) — casos válidos');
// ===========================================================================
const validCases = [
  ['2 + 2', {}, 4],
  ['2^10', {}, 1024],
  ['sqrt(16)', {}, 4],
  ['sin(0)', {}, 0],
  ['x^2', { x: 3 }, 9],
  ['2*x', { x: 5 }, 10],
  ['3*(4+1)', {}, 15],
  ['2²', {}, 4],                   // expoente unicode ²
  ['√(9)', {}, 3],                 // símbolo de raiz unicode
  ['pi', {}, Math.PI],
  ['1,5 + 1,5', {}, 3],            // vírgula decimal (pt-BR)
  ['sen(0)', {}, 0],               // sinônimo em português
  ['-2^2', {}, -4],                // precedência: unário depois de potência
];
for (const [expr, vars, expected] of validCases) {
  checkNoThrow(() => {
    const result = MathEngine.evalExpr(expr, vars);
    if (Math.abs(result - expected) > 1e-9) throw new Error(`esperado ${expected}, obteve ${result}`);
  }, `"${expr}" avalia para ${expected}`);
}

section('12. Motor de matemática (MathEngine) — casos inválidos (devem dar erro tratado)');
const invalidCases = ['', '2 +', '(1+2', '1+2)', 'foo(1)', 'x & y', '2..3', 'variavelnaoexiste'];
for (const expr of invalidCases) {
  checkThrows(() => MathEngine.evalExpr(expr, {}), `"${expr || '(vazio)'}" lança erro tratado (não trava o app)`);
}
checkNoThrow(() => {
  const r = MathEngine.evalExpr('1/0', {});
  if (Number.isFinite(r)) throw new Error('deveria ser não-finito');
}, '"1/0" retorna não-finito em vez de lançar (é tratado como ponto sem imagem no gráfico)');

// ACHADO (não alterado): este motor de matemática exige "*" explícito.
// "2x", "3(4+1)", "2sin(0)" etc. NÃO são interpretados como multiplicação
// implícita — isso é uma característica do parser atual, não um bug que eu
// tenha introduzido ou corrigido. Deixo isso documentado aqui como teste de
// regressão do comportamento ATUAL; ver observações no resumo final.
for (const expr of ['2x', '3(4+1)', '2 x', '2sin(0)']) {
  checkThrows(() => MathEngine.evalExpr(expr, { x: 5 }), `[comportamento atual] "${expr}" exige "*" explícito — multiplicação implícita não é suportada`);
}

// ===========================================================================
section('13. Objetos do gráfico (GraphObjects) — CRUD, undo/redo, limite');
// ===========================================================================
const objs = AppUI.objects;
objs.clear();
check(objs.items.length === 0, 'clear() zera a lista de objetos');
const o1 = objs.add('function', { expression: 'x^2', variable: 'x' });
check(objs.items.length === 1, 'add() adiciona um objeto');
objs.add('function', { expression: 'x^3', variable: 'x' });
check(objs.items.length === 2, 'add() acumula um segundo objeto');
check(objs.undo() === true, 'undo() desfaz a última adição');
check(objs.items.length === 1, 'undo() volta a lista para o estado anterior');
check(objs.redo() === true, 'redo() refaz a adição desfeita');
check(objs.items.length === 2, 'redo() restaura o objeto');
objs.remove(o1.id);
check(objs.items.length === 1 && !objs.items.find((o) => o.id === o1.id), 'remove(id) tira o objeto certo da lista');
objs.toggle(objs.items[0].id);
check(objs.items[0].visible === false, 'toggle(id) alterna a visibilidade');
checkThrows(() => { for (let i = 0; i < 60; i++) objs.add('function', { expression: `${i}` }); }, 'add() lança erro ao ultrapassar o limite de itens (maxItems)');

// snapshot / restore (base do import/export JSON)
objs.clear();
objs.add('vector', { p1: [0, 0], p2: [3, 4] });
const snap = objs.snapshot();
objs.clear();
check(objs.items.length === 0, 'clear() antes do restore deixa a lista vazia');
objs.restore(snap);
check(objs.items.length === 1 && objs.items[0].type === 'vector', 'restore(snapshot) recupera os objetos salvos (round-trip)');

// ===========================================================================
section('14. Fluxo ponta-a-ponta: preencher a função e clicar em "Adicionar"');
// ===========================================================================
AppUI.setTab('function', false);
objs.clear();
if (AppUI.$.functionExpr) AppUI.$.functionExpr.value = 'x^2 - 1';
const addFnBtn = document.getElementById('panelAddBtn');
if (addFnBtn) {
  checkNoThrow(() => addFnBtn.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true })), 'clique no botão de adicionar (modo Função) não lança exceção');
  check(objs.items.length === 1 && objs.items[0].type === 'function', 'objeto de função é criado a partir do campo preenchido pela UI');
} else {
  check(false, 'não encontrei o botão de adicionar do modo Função pra testar o fluxo ponta-a-ponta (ver ids em index.html)');
}

// ===========================================================================
section('15. Exportar/Importar JSON (via handleJsonFile, fluxo real do botão)');
// ===========================================================================
objs.clear();
objs.add('function', { expression: 'x', variable: 'x' });
const payload = { format: 'calculadora-grafica', version: 1, objects: objs.snapshot(), view: {} };
const fakeFile = { text: async () => JSON.stringify(payload) };
objs.clear();
if (typeof AppUI.handleJsonFile === 'function') {
  AppUI.handleJsonFile(fakeFile).then(() => {
    check(objs.items.length === 1 && objs.items[0].type === 'function', 'handleJsonFile() importa e restaura os objetos do JSON');
    finish();
  }).catch((error) => { check(false, `handleJsonFile() não deveria lançar: ${error.message}`); finish(); });
} else {
  check(false, 'AppUI.handleJsonFile não existe');
  finish();
}

function finish() {
  console.log(`\n\x1b[1m${'='.repeat(60)}\x1b[0m`);
  console.log(`\x1b[1mResultado: ${passed} passaram, ${failed} falharam (de ${passed + failed})\x1b[0m`);
  if (failed) {
    console.log('\nFalhas:');
    failMessages.forEach((m) => console.log(`  - ${m}`));
  }
  console.log(`${'='.repeat(60)}`);
  process.exit(failed ? 1 : 0);
}
