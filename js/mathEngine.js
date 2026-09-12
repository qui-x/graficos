(function (global) {
  'use strict';

  const FUNCTIONS = Object.freeze({
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
    log: Math.log10, log2: Math.log2, ln: Math.log, exp: Math.exp,
    ceil: Math.ceil, floor: Math.floor, round: Math.round, sign: Math.sign,
    cot: (x) => 1 / Math.tan(x), sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x)
  });

  const CONSTANTS = Object.freeze({ pi: Math.PI, e: Math.E, tau: Math.PI * 2, phi: (1 + Math.sqrt(5)) / 2 });
  const ALIASES = Object.freeze({
    sen: 'sin', seno: 'sin', tg: 'tan', tang: 'tan', tangente: 'tan',
    arcsen: 'asin', arccos: 'acos', arctg: 'atan', raiz: 'sqrt',
    módulo: 'abs', modulo: 'abs'
  });
  const DISPLAY_NAMES = Object.freeze({ sin: 'sen', cos: 'cos', tan: 'tg', asin: 'arcsen', acos: 'arccos', atan: 'arctg', ln: 'ln', log: 'log' });
  const MAX_EXPRESSION_LENGTH = 500;

  const ERROR_MESSAGES = Object.freeze({
    EMPTY: 'Digite uma expressão matemática.',
    LONG: 'A expressão excede o limite permitido.',
    CHAR: 'Há um símbolo que o OrbisV ainda não reconhece.',
    IDENTIFIER: (name) => `Identificador não reconhecido: ${name}.`,
    FUNCTION: (name) => `Função não reconhecida: ${name}.`,
    INVALID: 'A expressão não pôde ser interpretada.',
    OPERAND: 'Falta um número, variável ou expressão.',
    PAREN_OPEN: 'Há um parêntese aberto sem fechamento.',
    PAREN_CLOSE: 'Há um parêntese de fechamento sem abertura.',
    NUMBER: 'Número inválido.'
  });

  function normalize(expression) {
    let s = String(expression ?? '')
      .replace(/[−–—]/g, '-')
      .replace(/[×·⋅]/g, '*')
      .replace(/÷/g, '/')
      .replace(/π/g, 'pi').replace(/τ/g, 'tau').replace(/φ/g, 'phi')
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4').replace(/⁵/g, '^5')
      .replace(/√\s*\(/g, 'sqrt(')
      .replace(/√\s*([A-Za-z0-9_.]+)/g, 'sqrt($1)')
      .replace(/\^\{([^}]+)\}/g, '^($1)')
      .replace(/,/g, '.')
      .trim();
    s = s.replace(/[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_]*/g, (raw) => {
      const lower = raw.toLowerCase();
      return ALIASES[lower] || lower;
    });
    return s;
  }

  function rawTokenize(input, variables) {
    const out = [];
    let i = 0;
    while (i < input.length) {
      const ch = input[i];
      if (/\s/.test(ch)) { i += 1; continue; }
      if ('()+-*/%^!'.includes(ch)) { out.push({ type: ch, value: ch }); i += 1; continue; }
      const n = input.slice(i).match(/^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:e[+-]?[0-9]+)?/i);
      if (n) {
        const value = Number(n[0]);
        if (!Number.isFinite(value)) throw new Error(ERROR_MESSAGES.NUMBER);
        out.push({ type: 'number', value, raw: n[0] }); i += n[0].length; continue;
      }
      const id = input.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (id) {
        const name = id[0].toLowerCase();
        if (!(name in CONSTANTS) && !(name in FUNCTIONS) && !(name in variables) && name !== 'mod') {
          throw new Error(ERROR_MESSAGES.IDENTIFIER(id[0]));
        }
        out.push({ type: 'identifier', value: name }); i += id[0].length; continue;
      }
      throw new Error(ERROR_MESSAGES.CHAR);
    }
    return out;
  }

  function isValueEnd(token) {
    return token && (token.type === 'number' || token.type === ')' || token.type === '!' || (token.type === 'identifier' && !(token.value in FUNCTIONS)));
  }
  function isValueStart(token) {
    return token && (token.type === 'number' || token.type === '(' || token.type === 'identifier');
  }
  function addImplicitMultiplication(tokens) {
    const out = [];
    for (let i = 0; i < tokens.length; i += 1) {
      const cur = tokens[i];
      const next = tokens[i + 1];
      out.push(cur);
      if (!next || !isValueEnd(cur) || !isValueStart(next)) continue;
      if (cur.type === 'identifier' && cur.value in FUNCTIONS && next.type === '(') continue;
      out.push({ type: '*', value: '*', implicit: true });
    }
    return out;
  }

  class Parser {
    constructor(expression, variables) {
      this.input = normalize(expression);
      this.variables = variables || {};
      if (!this.input) throw new Error(ERROR_MESSAGES.EMPTY);
      if (this.input.length > MAX_EXPRESSION_LENGTH) throw new Error(ERROR_MESSAGES.LONG);
      this.tokens = addImplicitMultiplication(rawTokenize(this.input, this.variables));
      this.tokens.push({ type: 'eof', value: null });
      this.index = 0;
    }
    peek(type) { return this.tokens[this.index]?.type === type; }
    peekId(id) { return this.peek('identifier') && this.tokens[this.index].value === id; }
    eat(type) { if (!this.peek(type)) throw new Error(ERROR_MESSAGES.INVALID); return this.tokens[this.index++]; }
    parse() {
      const node = this.additive();
      if (!this.peek('eof')) {
        if (this.peek(')')) throw new Error(ERROR_MESSAGES.PAREN_CLOSE);
        throw new Error(ERROR_MESSAGES.INVALID);
      }
      return node;
    }
    additive() {
      let node = this.multiplicative();
      while (this.peek('+') || this.peek('-')) {
        const op = this.tokens[this.index++].type;
        node = { type: 'binary', op, left: node, right: this.multiplicative() };
      }
      return node;
    }
    multiplicative() {
      let node = this.unary();
      while (this.peek('*') || this.peek('/') || this.peek('%') || this.peekId('mod')) {
        let op;
        const token = this.tokens[this.index];
        if (this.peekId('mod')) { this.index += 1; op = '%'; }
        else { this.index += 1; op = token.type; }
        node = { type: 'binary', op, left: node, right: this.unary(), implicit: Boolean(token.implicit) };
      }
      return node;
    }
    unary() {
      if (this.peek('+') || this.peek('-')) {
        const op = this.tokens[this.index++].type;
        return { type: 'unary', op, argument: this.unary() };
      }
      return this.power();
    }
    power() {
      let node = this.postfix();
      if (this.peek('^')) {
        this.index += 1;
        node = { type: 'binary', op: '^', left: node, right: this.unary() };
      }
      return node;
    }
    postfix() {
      let node = this.primary();
      while (this.peek('!')) { this.index += 1; node = { type: 'factorial', argument: node }; }
      return node;
    }
    primary() {
      if (this.peek('number')) return { type: 'number', value: this.tokens[this.index++].value };
      if (this.peek('identifier')) {
        const name = this.tokens[this.index++].value;
        if (this.peek('(')) {
          if (!(name in FUNCTIONS)) throw new Error(ERROR_MESSAGES.FUNCTION(name));
          this.index += 1;
          const arg = this.additive();
          if (!this.peek(')')) throw new Error(ERROR_MESSAGES.PAREN_OPEN);
          this.index += 1;
          return { type: 'call', name, argument: arg };
        }
        if (name in CONSTANTS) return { type: 'constant', name, value: CONSTANTS[name] };
        if (name in this.variables) return { type: 'variable', name };
        throw new Error(ERROR_MESSAGES.IDENTIFIER(name));
      }
      if (this.peek('(')) {
        this.index += 1;
        const node = this.additive();
        if (!this.peek(')')) throw new Error(ERROR_MESSAGES.PAREN_OPEN);
        this.index += 1;
        return { type: 'group', value: node };
      }
      if (this.peek(')')) throw new Error(ERROR_MESSAGES.PAREN_CLOSE);
      throw new Error(ERROR_MESSAGES.OPERAND);
    }
  }

  function factorial(value) {
    if (!Number.isInteger(value) || value < 0 || value > 170) return NaN;
    let result = 1; for (let i = 2; i <= value; i += 1) result *= i; return result;
  }

  function evaluate(node, variables) {
    switch (node.type) {
      case 'number': return node.value;
      case 'constant': return node.value;
      case 'variable': return Number(variables[node.name]);
      case 'group': return evaluate(node.value, variables);
      case 'unary': { const v = evaluate(node.argument, variables); return node.op === '-' ? -v : v; }
      case 'factorial': return factorial(evaluate(node.argument, variables));
      case 'call': return FUNCTIONS[node.name](evaluate(node.argument, variables));
      case 'binary': {
        const a = evaluate(node.left, variables); const b = evaluate(node.right, variables);
        if (node.op === '+') return a + b; if (node.op === '-') return a - b; if (node.op === '*') return a * b;
        if (node.op === '/') return a / b; if (node.op === '%') return a % b; if (node.op === '^') return Math.pow(a, b);
        return NaN;
      }
      default: return NaN;
    }
  }

  function parse(expression, variables = {}) { return new Parser(expression, variables).parse(); }
  function compile(expression, variables = {}) {
    const ast = parse(expression, variables);
    return (runtimeVariables = variables) => {
      const value = evaluate(ast, runtimeVariables || {});
      return Number.isFinite(value) ? value : NaN;
    };
  }
  function evalExpr(expression, variables = {}) { return compile(expression, variables)(variables); }

  function escapeXml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])); }
  function mathMLNode(node) {
    if (node.type === 'number') return `<mn>${escapeXml(Number(node.value).toString().replace('.', ','))}</mn>`;
    if (node.type === 'constant') {
      if (node.name === 'pi') return '<mi>π</mi>'; if (node.name === 'tau') return '<mi>τ</mi>'; if (node.name === 'phi') return '<mi>φ</mi>'; return '<mi>e</mi>';
    }
    if (node.type === 'variable') return `<mi>${escapeXml(node.name)}</mi>`;
    if (node.type === 'group') return `<mrow><mo>(</mo>${mathMLNode(node.value)}<mo>)</mo></mrow>`;
    if (node.type === 'unary') return `<mrow><mo>${node.op === '-' ? '−' : '+'}</mo>${mathMLNode(node.argument)}</mrow>`;
    if (node.type === 'factorial') return `<mrow>${mathMLNode(node.argument)}<mo>!</mo></mrow>`;
    if (node.type === 'call') {
      if (node.name === 'sqrt') return `<msqrt>${mathMLNode(node.argument)}</msqrt>`;
      if (node.name === 'abs') return `<mrow><mo>|</mo>${mathMLNode(node.argument)}<mo>|</mo></mrow>`;
      if (node.name === 'exp') return `<msup><mi>e</mi><mrow>${mathMLNode(node.argument)}</mrow></msup>`;
      const label = DISPLAY_NAMES[node.name] || node.name;
      return `<mrow><mi mathvariant="normal">${escapeXml(label)}</mi><mo>(</mo>${mathMLNode(node.argument)}<mo>)</mo></mrow>`;
    }
    if (node.type === 'binary') {
      if (node.op === '/') return `<mfrac><mrow>${mathMLNode(node.left)}</mrow><mrow>${mathMLNode(node.right)}</mrow></mfrac>`;
      if (node.op === '^') return `<msup><mrow>${mathMLNode(node.left)}</mrow><mrow>${mathMLNode(node.right)}</mrow></msup>`;
      let op;
      if (node.op === '*') {
        const bothNumbers = node.left?.type === 'number' && node.right?.type === 'number';
        op = (node.implicit || !bothNumbers) ? '&#x2062;' : '×';
      } else op = node.op === '-' ? '−' : node.op === '%' ? 'mod' : node.op;
      return `<mrow>${mathMLNode(node.left)}<mo>${op}</mo>${mathMLNode(node.right)}</mrow>`;
    }
    return '<mtext>?</mtext>';
  }
  function toMathML(expression, variables = {}) {
    const ast = parse(expression, variables);
    return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="inline"><mrow>${mathMLNode(ast)}</mrow></math>`;
  }

  function toAccessibleText(expression) {
    return normalize(expression)
      .replace(/\bpi\b/g, 'pi').replace(/\btau\b/g, 'tau').replace(/\bphi\b/g, 'phi')
      .replace(/\*/g, ' vezes ').replace(/\//g, ' dividido por ').replace(/\^/g, ' elevado a ');
  }

  function derivative(expression, x, variables = {}) {
    const fn = compile(expression, Object.assign({}, variables, { x: 0 }));
    const h = Math.max(1e-6, Math.abs(x) * 1e-5);
    return (fn(Object.assign({}, variables, { x: x + h })) - fn(Object.assign({}, variables, { x: x - h }))) / (2 * h);
  }
  function integral(expression, a, b, variables = {}, segments = 600) {
    const fn = compile(expression, Object.assign({}, variables, { x: 0 }));
    let n = Math.max(20, Math.floor(segments)); if (n % 2) n += 1;
    const h = (b - a) / n; let sum = 0;
    for (let i = 0; i <= n; i += 1) {
      const x = a + i * h; const y = fn(Object.assign({}, variables, { x })); if (!Number.isFinite(y)) return NaN;
      sum += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * y;
    }
    return sum * h / 3;
  }
  function roots(expression, a, b, variables = {}, samples = 480) {
    const fn = compile(expression, Object.assign({}, variables, { x: 0 }));
    const out = []; const span = b - a; let px = a; let py = fn(Object.assign({}, variables, { x: px }));
    const push = (x) => { if (Number.isFinite(x) && !out.some((v) => Math.abs(v - x) < Math.max(1e-5, Math.abs(span) * 1e-5))) out.push(x); };
    for (let i = 1; i <= samples; i += 1) {
      const x = a + span * i / samples; const y = fn(Object.assign({}, variables, { x }));
      if (Number.isFinite(y) && Math.abs(y) < 1e-7) push(x);
      if (Number.isFinite(py) && Number.isFinite(y) && py * y < 0) {
        let lo = px, hi = x, flo = py;
        for (let k = 0; k < 42; k += 1) { const mid = (lo + hi) / 2; const fm = fn(Object.assign({}, variables, { x: mid })); if (!Number.isFinite(fm)) break; if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; } }
        push((lo + hi) / 2);
      }
      px = x; py = y;
    }
    return out.sort((x, y) => x - y);
  }
  function extrema(expression, a, b, variables = {}, samples = 320) {
    const fn = compile(expression, Object.assign({}, variables, { x: 0 }));
    const out = []; const step = (b - a) / samples;
    let prevX = a, prevY = fn(Object.assign({}, variables, { x: a }));
    let curX = a + step, curY = fn(Object.assign({}, variables, { x: curX }));
    for (let i = 2; i <= samples; i += 1) {
      const nextX = a + i * step, nextY = fn(Object.assign({}, variables, { x: nextX }));
      if ([prevY, curY, nextY].every(Number.isFinite)) {
        if (curY <= prevY && curY < nextY) out.push({ x: curX, y: curY, kind: 'mínimo' });
        if (curY >= prevY && curY > nextY) out.push({ x: curX, y: curY, kind: 'máximo' });
      }
      prevX = curX; prevY = curY; curX = nextX; curY = nextY;
    }
    return out.slice(0, 20);
  }
  function formatNumber(value, decimals = 4) {
    if (!Number.isFinite(value)) return '—';
    if (Math.abs(value) < Math.pow(10, -decimals)) value = 0;
    return Number(value.toFixed(decimals)).toLocaleString('pt-BR', { maximumFractionDigits: decimals });
  }

  global.MathEngine = Object.freeze({ normalize, parse, compile, evalExpr, toMathML, toAccessibleText, derivative, integral, roots, extrema, formatNumber, functions: Object.keys(FUNCTIONS), constants: Object.keys(CONSTANTS), errors: ERROR_MESSAGES });
})(window);
