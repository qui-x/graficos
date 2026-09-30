# OrbisV 9.1.0 — Caderno de investigação

Projeto completo em HTML, CSS e JavaScript. Inclui 101 laboratórios: 89 bancadas de cálculo, entre elas oito novas explorações escolares, e 12 ambientes do editor gráfico. As cinco áreas permanecem livres: Fundamentos da Matemática, Geometria Analítica, Álgebra Vetorial, Cálculo I e Cálculo II.

## Abrir

1. Extraia todo o ZIP, preservando as pastas.
2. Abra `index.html` em um navegador atualizado. O processamento matemático e as bibliotecas estão incluídos; a abertura por arquivo local foi testada em Chromium.
3. Para instalar como aplicativo web ou servir a uma rede, hospede a pasta em HTTPS ou use um servidor local. Exemplo com Python instalado: `python -m http.server 8000`; abra `http://localhost:8000`.

O service worker prepara o uso offline após a primeira carga completa sob uma origem compatível. Não é necessário executar npm para usar o programa. Um executável de Windows não integra este pacote; os arquivos estão disponíveis para seu processo de empacotamento.

## O que mudou

- Identidade de Caderno de investigação: papel, títulos com serifa, símbolo V original e acentos ciano/magenta; temas claro e escuro.
- Botões e ações padronizados: menu Cena por finalidade, seleção de modos em lista, exportações em linhas e diálogos com o mesmo acabamento visual.
- Editores gráficos integrados ao Caderno: faixa de modos, painel com Entrada/Objetos/Histórico/Registro, cenas 2D/3D e biblioteca Pontos de partida.
- Abertura com índice das cinco áreas e retorno à última investigação.
- Perguntas próprias nos 101 laboratórios; previsão, captura de ensaios, comparação, conclusão, novo problema e autoavaliação.
- Roteiros docentes editáveis e importação/exportação em JSON.
- Caderno com registros estruturados, cenas/resultados vinculados e devolutivas do professor.
- Consulta curricular por ano, tema e código BNCC, com indicação de apoio parcial e extensão universitária separada.
- Oito novas explorações: coleções, valor posicional, repartição, sequências, malha, tabelas e colunas, acaso e percurso.
- Preservação do teclado e das caixas matemáticas: 278 campos das bancadas com representação formatada.
- Ações antigas reaproveitadas no Menu Cena, com importação, mesclagem, exportação, preferências e menus contextuais padronizados.
- Controles visuais distribuídos por módulo: plano XY e inspeção em funções, componentes em vetores, alinhamento em geometria, perfil/sólido em discos e anéis e vistas XY/XZ/YZ nas construções espaciais.
- Câmera refinada com zoom, enquadramento, centro X/Y/Z editável pelo teclado matemático, eixos individuais, grade por plano, projeção ortogonal/perspectiva e gestos de dois dedos.

## Usar em aula

Acesse **Professor**, escolha o laboratório e personalize o roteiro. O estudante registra uma previsão, calcula, captura ensaios e escreve uma conclusão baseada em evidências. O treino numérico continua disponível antes da revelação do resultado. Os menus são livres, sem níveis ou bloqueios por desempenho.

O editor gráfico mantém ferramentas, desfazer, câmeras, exportação e cenas. Use **Investigar** na barra superior para abrir seu painel de registro.

## Dados locais

Anotações, rascunhos, preferências e entradas são salvos no navegador. Use **Exportar** no Caderno e **Exportar roteiro** para conservar cópias externas. O programa não envia trabalhos automaticamente e não possui servidor, login, gestão remota de turma ou sincronização.

Os Cadernos da versão anterior continuam aceitos. Os dados anteriores usam as mesmas chaves de armazenamento quando a origem do programa é mantida. A migração acrescenta campos opcionais às anotações, preservando os textos e resultados existentes.

## Documentação

- `manual/investigacao.html`: guia de uso da nova interface, legível no navegador.
- `docs/GUIA_PEDAGOGICO.md`: mediação, prática, evidências e propostas de aula.
- `docs/CURRICULO_E_LIMITES.md`: abrangência e limites curriculares.
- `docs/MAPEAMENTO_BNCC.csv`: relação dos 101 laboratórios com códigos, recortes e referência oficial.
- `docs/CATALOGO_COMPLETO.md`: conteúdos e perguntas de investigação.
- `docs/IDENTIDADE_VISUAL.md`: regras de botões, menus, diálogos e temas.
- `docs/ARQUITETURA.md`: organização interna e manutenção.
- `VALIDACAO.md`: verificações e limites dos testes.

O manual antigo do editor gráfico foi preservado em `manual/index.html`, como referência complementar das ferramentas gráficas.

## Desenvolvimento e testes

Requer Node para os testes, Python para regenerar o worker e Playwright para os testes de navegador. Instale as dependências de desenvolvimento com `npm install` e o navegador com `npx playwright install chromium`.

```sh
npm test
npm run test:visuals
npm run test:curriculum
npm run test:browser
npm run test:fields
npm run test:inquiry
npm run test:graphics
npm run test:actions
npm run test:controls
python scripts/build-worker.py
```

A variável opcional `ORBISV_CHROMIUM` permite indicar o executável do Chromium. O worker já vem gerado para o uso normal.

## Alcance curricular

A associação à BNCC indica **apoio parcial**, com recorte explícito. Não afirma cobertura integral da Educação Básica nem domínio automático de habilidades. A extensão universitária, especialmente Cálculo I e II, é organizada por temas próprios. A distribuição de conteúdos do Ensino Médio por série e as adaptações locais cabem à rede e à escola.
