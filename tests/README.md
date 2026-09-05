# Base de testes — Calculadora Gráfica

Duas peças, propósitos diferentes:

| Arquivo | O que cobre | Quando rodar |
|---|---|---|
| `smoke-test.js` | DOM/JS: referências quebradas, troca de modo, hash do PWA, bottom sheet (estado, arrasto), motor de matemática, CRUD de objetos, import/export | A cada mudança no código — leva ~1 segundo |
| `CHECKLIST-MANUAL.md` | Visual, gestos de toque reais, responsividade, PWA instalado | Antes de publicar uma versão nova |

## Rodando a suíte automatizada

Precisa de [Node.js](https://nodejs.org) instalado (qualquer versão razoavelmente
recente). O `jsdom` é usado só para os testes simularem um navegador — o app
em si **não depende dele** pra funcionar normalmente.

```bash
cd tests
npm install jsdom --no-save
node smoke-test.js
```

Saída esperada (resumo no final):

```
Resultado: 132 passaram, 0 falharam (de 132)
```

Se algo mudar no HTML/CSS/JS e um teste passar a falhar, a mensagem de erro
diz exatamente o que quebrou — normalmente é um id renomeado no HTML sem
atualizar o JS (ou vice-versa), que é a categoria de bug mais comum nesse
projeto até agora.

### O que a suíte NÃO cobre (de propósito)

`jsdom` não renderiza layout de verdade (não sabe calcular onde cada elemento
fica na tela, nem tamanhos reais) e não simula toque/gestos de um dispositivo
real. Então ela não pega:
- se a barra de modos está visualmente no topo ou não
- se o bottom sheet parece bom, se a animação é suave
- comportamento em dispositivos com notch, teclado virtual real, etc.
- o fluxo de instalação do PWA

Isso é papel do `CHECKLIST-MANUAL.md`.

## Adicionando um teste novo

`smoke-test.js` é um script Node simples, sem framework de teste — só as
funções `check(condição, descrição)` e `checkThrows`/`checkNoThrow`. Para
adicionar um caso, ache a seção certa (ou crie uma nova com
`section('...')`) e chame `check(...)`. Não precisa de mais nada instalado.
