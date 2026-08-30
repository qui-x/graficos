(function (global) {
  'use strict';

  const FUNCTIONS = Object.freeze({
    sin: Math.sin, cos: Math.cos, tan: Math.tan,
    asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
    asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
    log: Math.log10, log2: Math.log2, log1p: Math.log1p || ((x) => Math.log(1 + x)),
    ln: Math.log, exp: Math.exp,
    ceil: Math.ceil, floor: Math.floor, round: Math.round,
    sign: Math.sign, cot: (x) => 1 / Math.tan(x), sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x)
  });

  const CONSTANTS = Object.freeze({ pi: Math.PI, e: Math.E, tau: Math.PI * 2, phi: (1 + Math.sqrt(5)) / 2 });
  const MAX_EXPRESSION_LENGTH = 400;

  const ERROR_MESSAGES = Object.freeze({
    EMPTY: 'Digite uma expressão matemática.',
    LONG: 'A expressão excede o limite de 400 caracteres.',
    CHAR: 'Caractere não permitido na expressão.',
    IDENTIFIER: (name) => `Identificador não permitido: ${name}.`,
    FUNCTION: (name) => `Função desconhecida ou não permitida: ${name}.`,
    EXPECT: (token) => `Era esperado ${token}.`,
    INVALID: 'A expressão não pôde ser interpretada.',
    OPERAND: 'Falta um número, variável, constante ou expressão entre parênteses.',
    PAREN_OPEN: 'Parêntese aberto sem fechamento.',
    PAREN_CLOSE: 'Parêntese de fechamento sem abertura correspondente.',
    NUMBER: 'Número inválido.',
    AST: 'Estrutura interna da expressão inválida.'
  });

  function normalize(expression) {
    return String(expression ?? '')
      .replace(/[−–—]/g, '-')
      .replace(/[×·]/g, '*').replace(/÷/g, '/')
      .replace(/π/g, 'pi').replace(/τ/g, 'tau').replace(/φ/g, 'phi')
      .replace(/[²]/g, '^2').replace(/[³]/g, '^3').replace(/[⁴]/g, '^4').replace(/[⁵]/g, '^5')
      .replace(/√\s*\(/g, 'sqrt(')
      .replace(/\^\{([0-9]+)\}/g, '^$1')
      .replace(/,/g, '.')
      .replace(/(\d(?:\.\d+)?)(?=(?!e[+-]?\d)[A-Za-z_])/g, '$1*')
      .replace(/\)\s*(?=[A-Za-z_(])/g, ')*')
      .trim();
  }

  class Parser {
    constructor(input, variables) {
      this.input = normalize(input);
      this.variables = variables || {};
      if (!this.input) throw new Error(ERROR_MESSAGES.EMPTY);
      if (this.input.length > MAX_EXPRESSION_LENGTH) throw new Error(ERROR_MESSAGES.LONG);
      this.tokens = this.tokenize();
      this.index = 0;
    }

    tokenize() {
      const out = [];
      let i = 0;
      while (i < this.input.length) {
        const ch = this.input[i];
        if (/\s/.test(ch)) { i++; continue; }
        if ('()+-*/%^!'.includes(ch)) { out.push({ type: ch, value: ch }); i++; continue; }
        const n = this.input.slice(i).match(/^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:e[+-]?[0-9]+)?/i);
        if (n) {
          const value = Number(n[0]);
          if (!Number.isFinite(value)) throw new Error(ERROR_MESSAGES.NUMBER);
          out.push({ type: 'number', value }); i += n[0].length; continue;
        }
        const id = this.input.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
        if (id) {
          const name = id[0].toLowerCase();
          const afterIdentifier = this.input.slice(i + id[0].length).trimStart();
          if (afterIdentifier.startsWith('(') && !(name in FUNCTIONS)) {
            throw new Error(ERROR_MESSAGES.FUNCTION(name));
          }
          if (!(name in CONSTANTS) && !(name in FUNCTIONS) && !(name in this.variables) && name !== 'mod') {
            throw new Error(ERROR_MESSAGES.IDENTIFIER(id[0]));
          }
          out.push({ type: 'identifier', value: name }); i += id[0].length; continue;
        }
        throw new Error(ERROR_MESSAGES.CHAR);
      }
      out.push({ type: 'eof', value: null });
      return out;
    }

    peek(type) { return this.tokens[this.index]?.type === type; }
    peekId(id) { return this.peek('identifier') && this.tokens[this.index].value === id; }
    eat(type) { if (!this.peek(type)) throw new Error(ERROR_MESSAGES.EXPECT(type)); return this.tokens[this.index++]; }

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
      let node = this.power();
      while (this.peek('*') || this.peek('/') || this.peek('%') || this.peekId('mod')) {
        let op;
        if (this.peekId('mod')) { this.index++; op = '%'; } else op = this.tokens[this.index++].type;
        node = { type: 'binary', op, left: node, right: this.power() };
      }
      return node;
    }

    power() {
      if (this.peek('+') || this.peek('-')) {
        const op = this.tokens[this.index++].type;
        return { type: 'unary', op, argument: this.power() };
      }
      let node = this.postfix();
      if (this.peek('^')) {
        this.index++;
        node = { type: 'binary', op: '^', left: node, right: this.power() };
      }
      return node;
    }

    postfix() {
      let node = this.primary();
      while (this.peek('!')) {
        this.index++;
        node = { type: 'factorial', argument: node };
      }
      return node;
    }

    primary() {
      if (this.peek('number')) return { type: 'number', value: this.tokens[this.index++].value };
      if (this.peek('identifier')) {
        const name = this.tokens[this.index++].value;
        if (this.peek('(')) {
          if (!(name in FUNCTIONS)) throw new Error(ERROR_MESSAGES.FUNCTION(name));
          this.index++;
          const arg = this.additive();
          if (!this.peek(')')) throw new Error(ERROR_MESSAGES.PAREN_OPEN);
          this.index++;
          return { type: 'call', name, argument: arg };
        }
        if (name in CONSTANTS) return { type: 'number', value: CONSTANTS[name] };
        if (name in this.variables) return { type: 'variable', name };
        throw new Error(ERROR_MESSAGES.IDENTIFIER(name));
      }
      if (this.peek('(')) {
        this.index++;
        const node = this.additive();
        if (!this.peek(')')) throw new Error(ERROR_MESSAGES.PAREN_OPEN);
        this.index++;
        return node;
      }
      if (this.peek(')')) throw new Error(ERROR_MESSAGES.PAREN_CLOSE);
      throw new Error(ERROR_MESSAGES.OPERAND);
    }
  }

  function factorial(value) {
    if (!Number.isInteger(value) || value < 0 || value > 170) return NaN;
    let result = 1;
    for (let i = 2; i <= value; i++) result *= i;
    return result;
  }

  function evaluate(node, variables) {
    switch (node.type) {
      case 'number': return node.value;
      case 'variable': return Number(variables[node.name]);
      case 'unary': { const value = evaluate(node.argument, variables); return node.op === '-' ? -value : value; }
      case 'factorial': return factorial(evaluate(node.argument, variables));
      case 'call': return FUNCTIONS[node.name](evaluate(node.argument, variables));
      case 'binary': {
        const a = evaluate(node.left, variables); const b = evaluate(node.right, variables);
        if (node.op === '+') return a + b;
        if (node.op === '-') return a - b;
        if (node.op === '*') return a * b;
        if (node.op === '/') return a / b;
        if (node.op === '%') return a % b;
        if (node.op === '^') return Math.pow(a, b);
        throw new Error(ERROR_MESSAGES.INVALID);
      }
      default: throw new Error(ERROR_MESSAGES.AST);
    }
  }

  function compile(expression, variables) {
    const parser = new Parser(expression, variables);
    const ast = parser.parse();
    return (runtimeVariables) => {
      const result = evaluate(ast, runtimeVariables || variables || {});
      return Number.isFinite(result) ? result : NaN;
    };
  }

  function evalExpr(expression, variables) {
    return compile(expression, variables)(variables || {});
  }

  global.MathEngine = Object.freeze({
    normalize,
    compile,
    evalExpr,
    functions: Object.freeze(Object.keys(FUNCTIONS)),
    constants: Object.freeze(Object.keys(CONSTANTS)),
    errors: ERROR_MESSAGES
  });
})(window);
