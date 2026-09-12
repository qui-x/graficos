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

  const CONSTANTS = Object.freeze({ pi: Math.PI, e: Math.E, tau: Math.PI * 2, phi: (1 + Math.sqrt(5)) / 2, inf: Infinity });
  const CALCULUS_FUNCTIONS = new Set(['diff','partial','integral','limit','sum','prod']);
  const CALLABLE_NAMES = (name) => (name in FUNCTIONS) || CALCULUS_FUNCTIONS.has(name);
  const ALIASES = Object.freeze({
    sen: 'sin', seno: 'sin', tg: 'tan', tang: 'tan', tangente: 'tan',
    arcsen: 'asin', arccos: 'acos', arctg: 'atan', raiz: 'sqrt',
    módulo: 'abs', modulo: 'abs'
  });
  const DISPLAY_NAMES = Object.freeze({ sin: 'sen', cos: 'cos', tan: 'tg', asin: 'arcsen', acos: 'arccos', atan: 'arctg', ln: 'ln', log: 'log' });
  const MAX_EXPRESSION_LENGTH = 500;
  const STANDARD_IDENTIFIER_DEFAULT = 1;
  const GREEK_SYMBOLS = Object.freeze({
    'α':'alpha','β':'beta','γ':'gamma','δ':'delta','ε':'epsilon','ζ':'zeta','η':'eta','θ':'theta','ι':'iota','κ':'kappa','λ':'lambda','μ':'mu','ν':'nu','ξ':'xi','ο':'omicron','ρ':'rho','σ':'sigma','ς':'sigma','υ':'upsilon','ω':'omega'
  });
  const GREEK_IDENTIFIERS = new Set(Object.values(GREEK_SYMBOLS));
  const STANDARD_IDENTIFIER_RE = /^[a-z](?:_[0-9]+|[0-9]+)?$/;

  function isStandardIdentifier(name) {
    const id = String(name || '').toLowerCase();
    return STANDARD_IDENTIFIER_RE.test(id) || GREEK_IDENTIFIERS.has(id);
  }

  function identifierNames(expression) {
    const normalized = normalize(expression);
    const names = normalized.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    return [...new Set(names.map((name) => name.toLowerCase()).filter((name) => !(name in CONSTANTS) && !(name in FUNCTIONS) && !CALCULUS_FUNCTIONS.has(name) && name !== 'mod' && isStandardIdentifier(name)))];
  }

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
      .replace(/∞/g, 'inf')
      .replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/≠/g, '!=')
      .replace(/π/g, 'pi').replace(/τ/g, 'tau').replace(/φ/g, 'phi')
      .replace(/[αβγδεζηθικλμνξορσςυω]/g, (ch) => GREEK_SYMBOLS[ch] || ch)
      .replace(/²/g, '^2').replace(/³/g, '^3').replace(/⁴/g, '^4').replace(/⁵/g, '^5')
      .replace(/([A-Za-z])₀/g, '$1_0').replace(/([A-Za-z])₁/g, '$1_1').replace(/([A-Za-z])₂/g, '$1_2').replace(/([A-Za-z])₃/g, '$1_3')
      .replace(/([A-Za-z])₄/g, '$1_4').replace(/([A-Za-z])₅/g, '$1_5').replace(/([A-Za-z])₆/g, '$1_6').replace(/([A-Za-z])₇/g, '$1_7').replace(/([A-Za-z])₈/g, '$1_8').replace(/([A-Za-z])₉/g, '$1_9')
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
      const cmp = input.slice(i).match(/^(?:<=|>=|!=)/);
      if (cmp) { out.push({ type: cmp[0], value: cmp[0] }); i += cmp[0].length; continue; }
      if ('()+-*/%^!;<>='.includes(ch)) { out.push({ type: ch, value: ch }); i += 1; continue; }
      const n = input.slice(i).match(/^(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:e[+-]?[0-9]+)?/i);
      if (n) {
        const value = Number(n[0]);
        if (!Number.isFinite(value)) throw new Error(ERROR_MESSAGES.NUMBER);
        out.push({ type: 'number', value, raw: n[0] }); i += n[0].length; continue;
      }
      const id = input.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (id) {
        const rawName = id[0];
        const name = rawName.toLowerCase();
        const known = (name in CONSTANTS) || CALLABLE_NAMES(name) || (name in variables) || name === 'mod' || isStandardIdentifier(name);
        if (known) {
          out.push({ type: 'identifier', value: name }); i += rawName.length; continue;
        }
        // Na notação matemática, justaposições como xy, nt e abc significam produto
        // entre identificadores de uma letra, desde que não formem função/constante reservada.
        if (/^[A-Za-z]{2,}$/.test(rawName)) {
          const letters = rawName.toLowerCase().split('');
          if (letters.every((letter) => isStandardIdentifier(letter) || letter in variables)) {
            letters.forEach((letter) => out.push({ type: 'identifier', value: letter }));
            i += rawName.length; continue;
          }
        }
        throw new Error(ERROR_MESSAGES.IDENTIFIER(rawName));
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
      if (cur.type === 'identifier' && CALLABLE_NAMES(cur.value) && next.type === '(') continue;
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
      const node = this.comparison();
      if (!this.peek('eof')) {
        if (this.peek(')')) throw new Error(ERROR_MESSAGES.PAREN_CLOSE);
        throw new Error(ERROR_MESSAGES.INVALID);
      }
      return node;
    }
    comparison() {
      let node = this.additive();
      while (this.peek('<') || this.peek('>') || this.peek('<=') || this.peek('>=') || this.peek('!=') || this.peek('=')) {
        const op = this.tokens[this.index++].type;
        node = { type: 'binary', op, left: node, right: this.additive() };
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
          if (!CALLABLE_NAMES(name)) throw new Error(ERROR_MESSAGES.FUNCTION(name));
          this.index += 1;
          if (CALCULUS_FUNCTIONS.has(name)) {
            const args=[];
            if (!this.peek(')')) {
              args.push(this.comparison());
              while (this.peek(';')) { this.index += 1; args.push(this.comparison()); }
            }
            if (!this.peek(')')) throw new Error(ERROR_MESSAGES.PAREN_OPEN);
            this.index += 1;
            const expected={diff:2,partial:2,integral:4,limit:3,sum:4,prod:4}[name];
            if(args.length!==expected) throw new Error(`${name} requer ${expected} argumentos.`);
            if(args[1]?.type!=='variable') throw new Error('A variável da operação de cálculo precisa ser um identificador simples.');
            return { type:'calculus', op:name, args };
          }
          const arg = this.comparison();
          if (!this.peek(')')) throw new Error(ERROR_MESSAGES.PAREN_OPEN);
          this.index += 1;
          return { type: 'call', name, argument: arg };
        }
        if (name in CONSTANTS) return { type: 'constant', name, value: CONSTANTS[name] };
        if (name in this.variables || isStandardIdentifier(name)) return { type: 'variable', name };
        throw new Error(ERROR_MESSAGES.IDENTIFIER(name));
      }
      if (this.peek('(')) {
        this.index += 1;
        const node = this.comparison();
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

  function withVariable(variables, name, value) { return Object.assign({}, variables || {}, { [name]: value }); }
  function derivativeNode(exprNode, variableName, variables) {
    const x=Number(Object.prototype.hasOwnProperty.call(variables||{},variableName)?variables[variableName]:STANDARD_IDENTIFIER_DEFAULT);
    if(!Number.isFinite(x)) return NaN;
    const h=Math.max(1e-6,Math.abs(x)*1e-5);
    const fm=evaluate(exprNode,withVariable(variables,variableName,x-h));
    const fp=evaluate(exprNode,withVariable(variables,variableName,x+h));
    if(Number.isFinite(fm)&&Number.isFinite(fp)) return (fp-fm)/(2*h);
    const f0=evaluate(exprNode,withVariable(variables,variableName,x));
    if(Number.isFinite(f0)&&Number.isFinite(fp)) return (fp-f0)/h;
    if(Number.isFinite(fm)&&Number.isFinite(f0)) return (f0-fm)/h;
    return NaN;
  }
  function simpsonNode(exprNode,variableName,a,b,variables,segments=720){
    if(!Number.isFinite(a)||!Number.isFinite(b)||a===b)return a===b?0:NaN;
    let n=Math.max(40,Math.floor(segments));if(n%2)n+=1;const h=(b-a)/n;let acc=0;
    for(let i=0;i<=n;i++){const x=a+i*h,y=evaluate(exprNode,withVariable(variables,variableName,x));if(!Number.isFinite(y))return NaN;acc+=(i===0||i===n?1:i%2?4:2)*y;}
    return acc*h/3;
  }
  function integralNode(exprNode,variableName,a,b,variables){
    if(Number.isFinite(a)&&Number.isFinite(b))return simpsonNode(exprNode,variableName,a,b,variables);
    const eps=1e-5,n=1000;
    if(a===-Infinity&&b===Infinity){
      const transformed={type:'internal-transform',fn:(t)=>{const u=Math.PI*(t-.5),x=Math.tan(u),jac=Math.PI/(Math.cos(u)**2);return evaluate(exprNode,withVariable(variables,variableName,x))*jac;}};
      return simpsonTransform(transformed.fn,eps,1-eps,n);
    }
    if(Number.isFinite(a)&&b===Infinity){const fn=(t)=>{const x=a+t/(1-t),jac=1/((1-t)*(1-t));return evaluate(exprNode,withVariable(variables,variableName,x))*jac;};return simpsonTransform(fn,0,1-eps,n);}
    if(a===-Infinity&&Number.isFinite(b)){const fn=(t)=>{const x=b-t/(1-t),jac=1/((1-t)*(1-t));return evaluate(exprNode,withVariable(variables,variableName,x))*jac;};return simpsonTransform(fn,0,1-eps,n);}
    return NaN;
  }
  function simpsonTransform(fn,a,b,segments){let n=Math.max(40,Math.floor(segments));if(n%2)n+=1;const h=(b-a)/n;let acc=0;for(let i=0;i<=n;i++){const y=fn(a+i*h);if(!Number.isFinite(y))return NaN;acc+=(i===0||i===n?1:i%2?4:2)*y;}return acc*h/3;}
  function limitNode(exprNode,variableName,point,variables){
    if(point===Infinity||point===-Infinity){const sign=point<0?-1:1;let prev=NaN,last=NaN,stable=0;for(let k=2;k<=9;k++){last=evaluate(exprNode,withVariable(variables,variableName,sign*Math.pow(10,k)));if(Number.isFinite(last)&&Number.isFinite(prev)&&Math.abs(last-prev)<=1e-7*Math.max(1,Math.abs(last)))stable+=1;else stable=0;if(stable>=2)return last;prev=last;}return last;}
    if(!Number.isFinite(point))return NaN;let last=NaN,prev=NaN,stable=0;
    for(let k=2;k<=10;k++){const h=Math.max(1e-12,Math.pow(10,-k)*Math.max(1,Math.abs(point)));const l=evaluate(exprNode,withVariable(variables,variableName,point-h)),r=evaluate(exprNode,withVariable(variables,variableName,point+h));if(Number.isFinite(l)&&Number.isFinite(r)){last=(l+r)/2;const twoSidedClose=Math.abs(l-r)<=1e-6*Math.max(1,Math.abs(last));const stabilized=Number.isFinite(prev)&&Math.abs(last-prev)<=1e-8*Math.max(1,Math.abs(last));stable=(twoSidedClose&&stabilized)?stable+1:0;if(stable>=2)return last;prev=last;}}
    return last;
  }
  function finiteSeriesNode(exprNode,variableName,a,b,variables,product=false){const lo=Math.ceil(a),hi=Math.floor(b);if(!Number.isFinite(lo)||!Number.isFinite(hi)||hi<lo||hi-lo>10000)return NaN;let out=product?1:0;for(let i=lo;i<=hi;i++){const v=evaluate(exprNode,withVariable(variables,variableName,i));if(!Number.isFinite(v))return NaN;out=product?out*v:out+v;}return out;}
  function evaluateCalculus(node,variables){
    const [expr,varNode,aNode,bNode]=node.args,variableName=varNode.name;
    if(node.op==='diff'||node.op==='partial')return derivativeNode(expr,variableName,variables);
    if(node.op==='integral'){const a=evaluate(aNode,variables),b=evaluate(bNode,variables);return integralNode(expr,variableName,a,b,variables);}
    if(node.op==='limit'){const point=evaluate(aNode,variables);return limitNode(expr,variableName,point,variables);}
    if(node.op==='sum'||node.op==='prod'){const a=evaluate(aNode,variables),b=evaluate(bNode,variables);return finiteSeriesNode(expr,variableName,a,b,variables,node.op==='prod');}
    return NaN;
  }

  function evaluate(node, variables) {
    switch (node.type) {
      case 'number': return node.value;
      case 'constant': return node.value;
      case 'variable': {
        if (variables && Object.prototype.hasOwnProperty.call(variables, node.name)) return Number(variables[node.name]);
        return isStandardIdentifier(node.name) ? STANDARD_IDENTIFIER_DEFAULT : NaN;
      }
      case 'group': return evaluate(node.value, variables);
      case 'unary': { const v = evaluate(node.argument, variables); return node.op === '-' ? -v : v; }
      case 'factorial': return factorial(evaluate(node.argument, variables));
      case 'call': return FUNCTIONS[node.name](evaluate(node.argument, variables));
      case 'calculus': return evaluateCalculus(node, variables);
      case 'binary': {
        const a = evaluate(node.left, variables); const b = evaluate(node.right, variables);
        if (node.op === '+') return a + b; if (node.op === '-') return a - b; if (node.op === '*') return a * b;
        if (node.op === '/') return a / b; if (node.op === '%') return a % b; if (node.op === '^') return Math.pow(a, b);
        if (node.op === '<') return a < b ? 1 : 0; if (node.op === '>') return a > b ? 1 : 0; if (node.op === '<=') return a <= b ? 1 : 0; if (node.op === '>=') return a >= b ? 1 : 0; if (node.op === '!=') return a !== b ? 1 : 0; if (node.op === '=') return a === b ? 1 : 0;
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
      if (node.name === 'pi') return '<mi>π</mi>'; if (node.name === 'tau') return '<mi>τ</mi>'; if (node.name === 'phi') return '<mi>φ</mi>'; if(node.name==='inf')return '<mo>∞</mo>'; return '<mi>e</mi>';
    }
    if (node.type === 'variable') {
      const greekDisplay = {alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',zeta:'ζ',eta:'η',theta:'θ',iota:'ι',kappa:'κ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',omicron:'ο',rho:'ρ',sigma:'σ',upsilon:'υ',omega:'ω'};
      const sub = node.name.match(/^([a-z])_(\d+)$/) || node.name.match(/^([a-z])(\d+)$/);
      if (sub) return `<msub><mi>${escapeXml(sub[1])}</mi><mn>${escapeXml(sub[2])}</mn></msub>`;
      return `<mi>${escapeXml(greekDisplay[node.name] || node.name)}</mi>`;
    }
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
    if (node.type === 'calculus') {
      const [expr,varNode,a,b]=node.args,v=mathMLNode(varNode);
      if(node.op==='diff')return `<mrow><mfrac><mi>d</mi><mrow><mi>d</mi>${v}</mrow></mfrac><mrow>${mathMLNode(expr)}</mrow></mrow>`;
      if(node.op==='partial')return `<mrow><mfrac><mo>∂</mo><mrow><mo>∂</mo>${v}</mrow></mfrac><mrow>${mathMLNode(expr)}</mrow></mrow>`;
      if(node.op==='integral')return `<mrow><msubsup><mo>∫</mo><mrow>${mathMLNode(a)}</mrow><mrow>${mathMLNode(b)}</mrow></msubsup><mrow>${mathMLNode(expr)}</mrow><mi>d</mi>${v}</mrow>`;
      if(node.op==='limit')return `<mrow><munder><mi mathvariant="normal">lim</mi><mrow>${v}<mo>→</mo>${mathMLNode(a)}</mrow></munder><mrow>${mathMLNode(expr)}</mrow></mrow>`;
      if(node.op==='sum'||node.op==='prod'){const symbol=node.op==='sum'?'∑':'∏';return `<mrow><munderover><mo>${symbol}</mo><mrow>${v}<mo>=</mo>${mathMLNode(a)}</mrow><mrow>${mathMLNode(b)}</mrow></munderover><mrow>${mathMLNode(expr)}</mrow></mrow>`;}
    }
    if (node.type === 'binary') {
      if (node.op === '/') return `<mfrac><mrow>${mathMLNode(node.left)}</mrow><mrow>${mathMLNode(node.right)}</mrow></mfrac>`;
      if (node.op === '^') return `<msup><mrow>${mathMLNode(node.left)}</mrow><mrow>${mathMLNode(node.right)}</mrow></msup>`;
      let op;
      if (node.op === '*') {
        const bothNumbers = node.left?.type === 'number' && node.right?.type === 'number';
        op = (node.implicit || !bothNumbers) ? '&#x2062;' : '×';
      } else { const cmpMap={'<=':'≤','>=':'≥','!=':'≠','=':'='}; op = node.op === '-' ? '−' : node.op === '%' ? 'mod' : (cmpMap[node.op]||node.op); }
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
      .replace(/\bdiff\b/g,' derivada ').replace(/\bpartial\b/g,' derivada parcial ').replace(/\bintegral\b/g,' integral ').replace(/\blimit\b/g,' limite ').replace(/\bsum\b/g,' somatório ').replace(/\bprod\b/g,' produtório ').replace(/\binf\b/g,' infinito ').replace(/\*/g, ' vezes ').replace(/\//g, ' dividido por ').replace(/\^/g, ' elevado a ');
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

  global.MathEngine = Object.freeze({ normalize, parse, compile, evalExpr, toMathML, toAccessibleText, derivative, integral, roots, extrema, formatNumber, identifierNames, isStandardIdentifier, standardIdentifierDefault: STANDARD_IDENTIFIER_DEFAULT, functions: Object.keys(FUNCTIONS), calculusFunctions:[...CALCULUS_FUNCTIONS], constants: Object.keys(CONSTANTS), errors: ERROR_MESSAGES });
})(window);
