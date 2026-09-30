# Organização interna — OrbisV 9

O programa é estático e independente de backend. A interface do Caderno é separada do núcleo matemático, da organização curricular e dos dados de investigação.

| Camada | Arquivos | Responsabilidade |
|---|---|---|
| Catálogo | `js/catalog.js`, `js/labs/extend-catalog.js` | Cinco áreas, grupos, metadados e associação de laboratórios. |
| Matemática | `js/mathEngine.js`, `js/labs/kernel.js`, módulos de cada área | Parser, validação matemática e cálculos. |
| Anos iniciais | `js/labs/school.js` | Oito explorações com domínios limitados e representações. |
| Execução isolada | `js/labs/worker-source.js`, `scripts/build-worker.py` | Cálculos em Web Worker local, com tempo limite. |
| Representações | `js/labs/representations.js`, `js/labs/workbench.js` | Gráficos, diagramas, comparação de referências e resultados. |
| Entradas | `js/labs/math-fields.js`, `js/ui.js` | Campos formatados, componentes de matrizes/vetores e teclado matemático. |
| Currículo | `js/curriculum.js` | Vínculos editoriais BNCC, recortes, filtros e extensão. |
| Perguntas | `js/inquiry-catalog.js` | Pergunta de cada laboratório e propostas de investigação. |
| Investigação | `js/inquiry.js` | Rascunhos, ensaios, comparação, roteiros, validação e registro. |
| Navegação/Caderno | `js/platform.js` | Rotas, notas, importação, exportação e restauração de cenas. |
| Identidade visual | `css/investigation.css`, `css/view-controls.css` | Sistema de papel, organização em páginas, responsividade, temas e controles contextuais. |
| Offline | `sw.js` | Cache versionado dos recursos essenciais. |

## Contratos

Cada módulo registra seus campos e sua função de cálculo em LabKit. O resultado usa métricas, tabelas e/ou séries gráficas. A montagem das bancadas consulta esse registro; não há um formulário manual independente por página.

Uma investigação pertence a um laboratório e contém até oito ensaios. Cada ensaio guarda entradas e métricas; a cena ou o resultado completo pode ser vinculado à anotação final. O roteiro inclui pergunta, objetivo, protocolo, desafio, critérios e identificação opcional do público. Toda importação passa por validação de formato, tamanho e campos.

A BNCC não altera a função de cálculo. O mapeamento curricular pode ser revisado em `curriculum.js` sem reescrever os simuladores. Conteúdos sem vínculo direto recebem classificação de extensão; não se inventam códigos para preencher lacunas.

## Persistência e compatibilidade

- `orbisvPlatformV1`: Caderno e contexto do editor; o formato de exportação continua em versão 1 com `inquiry` opcional por anotação.
- `orbisvWorkbenchV1`: entradas das bancadas por identificador.
- `orbisvInquiryV1`: rascunhos, roteiros locais e último laboratório.
- Chaves anteriores do editor e de acessibilidade foram conservadas.

Falhas de leitura do Caderno/investigações tentam preservar o conteúdo bruto em uma chave de recuperação. Erros de armazenamento devem levar à exportação; armazenamento local não é backup externo.

## Acrescentar um laboratório

1. Registrar campos, limites e cálculo no módulo de área apropriado.
2. Fornecer gráfico/diagrama útil e validar casos de fronteira.
3. Definir esquemas de campos compostos quando necessários.
4. Acrescentar pergunta em `inquiry-catalog.js`.
5. Avaliar o vínculo curricular pelo escopo real; registrar apoio parcial ou extensão.
6. Regenerar o worker e atualizar o cache offline quando houver novos arquivos.
7. Testar cálculo, edição, investigação, registro, restauração e tela estreita.

Os dados matemáticos e a apresentação ficam separados das perguntas pedagógicas. O professor personaliza os roteiros sem editar o código e sem alterar a matemática executada.

## Adaptação dos modelos gráficos

O editor conserva o motor de cena e o esquema de objetos. A apresentação usa uma faixa horizontal de modos e uma divisão entre gráfico e painel de trabalho, com Registro integrado como quarta aba. O gerenciador de abas controla a visibilidade da investigação; não há painel flutuante sobreposto no computador. No celular, o painel mantém três alturas e o gráfico se ajusta à área visível nas alturas intermediária e recolhida.

A biblioteca `models.js` continua definindo os modelos. `ui.js` apresenta suas expressões em MathML, acrescenta perguntas de exploração e carrega os dados no formulário para revisão. `graphEngine.js` usa as superfícies e contrastes do Caderno nos temas claro e escuro. As operações matemáticas e o editor de digitação permanecem independentes dessas mudanças visuais.

### Controles visuais por módulo

O editor não trata todos os controles como uma barra genérica. `ui.js` monta o bloco **Módulo ativo** de acordo com a construção selecionada e encaminha a ação para o mecanismo que a utiliza:

- Função e curva paramétrica: plano XY, ajuste, grade e inspeção.
- Vetor: plano XY, ajuste, eixos e leitura dos componentes.
- Geometria: plano XY, ajuste, grade e alinhamento.
- Discos e anéis: perfil 2D ou sólido 3D, com eixo X ou Y.
- Curva 3D e reta 3D: órbita e planos XY, XZ e YZ.

`view-controls.js` fornece a câmera, o centro editável, zoom, passos de deslocamento e referências dos eixos. `graphEngine.js` executa as alterações na cena nativa; `plot-view.js` usa o mesmo vocabulário nas representações das bancadas. Assim, a ação aparece junto do módulo que a opera, mas continua compartilhando persistência, teclado matemático, acessibilidade e exportação.

Execute `node scripts/build-catalog.cjs` após mudar o catálogo ou os vínculos para atualizar a tabela CSV e o catálogo em Markdown.
