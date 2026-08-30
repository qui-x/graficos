# Calculadora Gráfica Independente

Aplicativo web estático para álgebra e geometria analítica, com foco em entrada matemática, múltiplos objetos e visualização interativa.

## Recursos atuais

- Funções `y = f(x)` e curvas paramétricas `x(t), y(t)`.
- Vetores no plano com norma, produto escalar e produto vetorial 2D.
- Retas, círculos, elipses e pontos.
- Múltiplos objetos com visibilidade, edição e exclusão.
- Desfazer/refazer (`Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`).
- Persistência da sessão no `localStorage`.
- Histórico de expressões com recuperação do objeto completo quando disponível.
- Parser matemático seguro, sem execução dinâmica de JavaScript.
- Funções adicionais: `log2`, `log1p`, `sign` e constantes `tau` e `phi`.
- Mensagens de erro orientativas em português.
- Preview matemático com KaTeX.
- Validação visual dos campos de expressão.
- Zoom, pan, coordenadas e zoom por gesto de pinça em dispositivos de toque.
- Exportação para PNG e SVG.
- Grade e eixos com escala adaptativa.
- Interface responsiva e controles recolhíveis.
- Acessibilidade por teclado, `aria-label`, `aria-describedby` e `aria-live`.
- Grade cartesiana com linhas principais, numeração, origem destacada e setas nos eixos.
- Legenda clicável, tooltip com coordenadas/valor de função e zoom por seleção com Shift.
- Pan/zoom por teclado no canvas e duplo clique para zoom.
- Layout mobile empilhado com controles recolhíveis e botão flutuante.
- Salvar sessão manualmente, além do salvamento automático.

## Estrutura

```text
graph-calculator/
├── index.html
├── css/style.css
├── js/mathEngine.js
├── js/graphObjects.js
├── js/graphEngine.js
├── js/ui.js
├── js/main.js
├── tests/mathEngine.test.js
├── tests/graphObjects.test.js
├── tests/smoke.test.js
├── package.json
├── README.md
└── CONTRIBUTING.md
```

## Executar

Abra `index.html` em um navegador moderno ou publique a pasta em um servidor estático.

O KaTeX é carregado via CDN. O motor de cálculo, objetos e gráficos são implementados localmente.

## Testes

```bash
npm test
```

Os testes atuais cobrem o parser matemático, gerenciamento de objetos, persistência e verificações estáticas de segurança.

## Observação sobre a entrada matemática

A interface atual mantém o campo textual com preview KaTeX porque isso preserva compatibilidade com o parser seguro existente. Uma migração futura para MathQuill/MathLive pode ser feita como camada de edição, mantendo o mesmo `MathEngine` por trás.
