# Identidade e ações — OrbisV 9

O Caderno de investigação é o eixo visual de toda a aplicação. A abertura, as bancadas, o editor gráfico, os menus e as janelas de trabalho usam papel, linhas finas, títulos com serifa, textos de interface legíveis e acentos ciano/magenta. O símbolo V original é preservado.

## Vocabulário de controles

| Papel | Apresentação | Exemplos |
|---|---|---|
| Ação principal | Fundo de tinta, texto na cor do papel, contorno de 4 px | Calcular, salvar, registrar investigação |
| Ação secundária | Papel com borda fina | Importar roteiro, conferir referência, cancelar |
| Navegação | Texto, indicação de seleção por linha | Índice, abas, etapas do registro, modos |
| Escolha de ferramenta ou formato | Linha com título e descrição curta | Modos gráficos, ações da cena, exportações |
| Ação destrutiva | Rótulo e borda de atenção | Excluir, confirmar substituição |
| Ferramenta compacta | Ícone com nome acessível e contorno comum | Grade, eixos, recentrar, desfazer |
| Entrada matemática | Campo com notação; diálogo e teclado próprios | Expressões, vetores, matrizes, listas |

Contornos de 4 px significam o raio dos cantos, não a espessura da borda. As bordas comuns têm 1 px. A altura de referência é 42 px no computador e 44 px no celular; ferramentas compactas e teclas têm dimensões próprias para caber no espaço disponível.

Foco de teclado tem contorno de 2 px. Controles desabilitados reduzem a opacidade e não executam ações. A seleção usa cor e linha, sem depender apenas de cor. O alto contraste conserva suas variáveis específicas.

## Organização das ações

O menu **Cena** substitui a antiga apresentação de projeto. Seu contexto mostra nome, quantidade de objetos e salvamento local. Três grupos organizam os comandos: guardar e recuperar; construir e visualizar; preferências e apoio. As operações e os formatos de arquivo permanecem compatíveis.

**Formas de construir** apresenta os sete modos em linhas, com uma descrição curta e o modo ativo indicado. **Pontos de partida** mantém modelos compatíveis, fórmulas e perguntas. Preparar um modelo preenche a entrada para revisão, sem inserir o objeto automaticamente.

A importação separa seleção do arquivo, prévia e escolha entre substituição e mesclagem. A exportação apresenta formatos em linhas, com nome, finalidade e configurações de saída. Confirmações de substituição/exclusão permanecem explícitas.

Os controles de aparência, leitura, cores e gráfico usam os mesmos campos e espaçamentos. O menu de cada objeto e a ajuda guiada compartilham as superfícies e o vocabulário do restante da interface.

## Implementação

- `css/investigation.css`: composição de páginas, bancadas e laboratório gráfico.
- `css/actions.css`: vocabulário comum de botões, entradas, menus, diálogos e estados.
- `js/ui.js`: operações do editor, seleção de modos e comandos de cena; métodos matemáticos preservados.
- `js/platform.js`: áreas, rotas e integração com o Caderno.
- `js/inquiry.js`: previsão, ensaios, comparação, conclusão e roteiros.

Os estilos estruturais anteriores permanecem como base técnica dos componentes. O acabamento final é centralizado nos dois arquivos do Caderno; novos controles devem usar as classes existentes, sem introduzir gradientes ou formatos particulares.

Não se alteram a organização das teclas nem a representação das expressões para obter a identidade visual. Estados claros, escuros e de alto contraste devem ser verificados no componente em uso, incluindo foco, seleção, erro e desabilitação.
