# OrbisV

**Visualize · Explore · Descubra**  
**Matemática em qualquer dimensão**

OrbisV é um ambiente gráfico matemático responsivo para explorar funções, curvas paramétricas, vetores, geometria analítica e aplicações de cálculo com entrada visual em notação matemática.

## Ao abrir o programa

O OrbisV sempre inicia pelo menu **Projeto**, que funciona como a página inicial do aplicativo. A partir dele é possível continuar a sessão salva automaticamente, iniciar um novo gráfico, abrir ou salvar um projeto `.orbisv`, acessar a biblioteca de modelos, configurar acessibilidade e visualização, exportar resultados ou iniciar o tour guiado.

No primeiro acesso, o programa apresenta automaticamente um tour das principais áreas. O tour pode ser repetido a qualquer momento pelo menu Projeto.

## Modos matemáticos

- **Função:** representa funções de uma variável e oferece análise numérica, pontos notáveis e tabela CSV.
- **Paramétrica:** representa curvas definidas por `x(t)` e `y(t)` em um intervalo do parâmetro.
- **Vetor:** cria vetores a partir de origem e extremidade e apresenta módulo e direção.
- **Geometria:** cria pontos, retas, círculos, elipses e polígonos.
- **Discos/Anéis:** valida R ≥ r ≥ 0, calcula volumes de revolução e representa o perfil simétrico, o eixo, as seções transversais e os raios didáticos.
- **Curva 3D e Reta 3D:** utilizam o motor espacial com câmera orbital, zoom, inspeção e projeção tridimensional.
- **Discos/Anéis 3D:** pode representar sólidos de revolução com superfície externa, cavidade interna e seções.

## Editor matemático

Campos matemáticos abrem o Editor Matemático OrbisV. No mobile, o editor utiliza teclado próprio em formato de calculadora científica e não abre o teclado nativo por padrão.

A entrada aceita notação próxima à literatura matemática, incluindo multiplicação implícita, parênteses, potências, raízes, constantes e funções. Exemplos válidos incluem `2x`, `3(x+1)`, `2pi`, `sen(x)` e `tg(x)`.

O editor possui cursor visual, validação da expressão, desfazer/refazer próprio e navegação pelas posições de inserção. A representação visual utiliza MathML para frações, raízes e expoentes.

## Modelos matemáticos

A biblioteca de modelos pré-prontos pode ser aberta pelos formulários compatíveis ou pelo menu inicial. Os modelos são organizados por categoria e podem ser pesquisados. Ao usar um modelo, os dados são carregados no formulário para revisão antes de serem adicionados ao gráfico.

## Objetos e histórico

A aba **Objetos** permite:

- editar um objeto;
- mostrar ou ocultar;
- bloquear ou desbloquear;
- duplicar;
- alterar a ordem;
- selecionar múltiplos objetos;
- executar ações em lote;
- mostrar pontos notáveis quando aplicável;
- excluir objetos.

A aba **Histórico** registra as alterações da cena e oferece desfazer/refazer. O histórico do projeto é separado do histórico interno do Editor Matemático.

## Área gráfica

A barra flutuante do gráfico oferece recentralização, grade, eixos, ajuste dos objetos à tela e modo de inspeção. A área gráfica aceita pan e zoom e mostra coordenadas temporárias quando o recurso está habilitado.

## Projetos, importação e salvamento automático

A sessão atual é salva automaticamente no navegador. O formato `.orbisv` preserva objetos, visualização, histórico e modo matemático ativo.

A ferramenta **Importar projeto** aceita `.orbisv` e `.json`, mostra uma pré-visualização antes de aplicar o arquivo e oferece dois modos:

- **Substituir cena:** restaura o projeto completo, incluindo visualização e histórico;
- **Mesclar com a cena:** mantém o trabalho aberto e adiciona os objetos importados com novos identificadores.

A importação valida o formato, a versão, a quantidade e os tipos dos objetos antes de alterar a cena. Arquivos de até 16 MB podem ser selecionados ou arrastados para a área de importação. A versão 6.7 também valida os dados matemáticos de cada objeto antes de aplicar o projeto.

## Robustez da versão 6.7

A versão 6.7 amplia a tolerância a projetos complexos sem alterar a organização visual da interface. Entre as melhorias estão validação profunda dos objetos importados, recuperação automática de sessão por cópias anterior e de recuperação, autosave com modo compacto em caso de limite de armazenamento, isolamento de falhas por objeto durante a renderização, limites de segurança para expressões e canvases, amostragem adaptativa com tratamento de descontinuidades, detecção de raízes de multiplicidade par, integração numérica refinada, exportação CSV em lotes, cache offline mais defensivo e suporte efetivo à escala cartesiana proporcional ou independente.

O limite operacional de objetos foi ampliado para 240 por projeto. Operações em lote verificam capacidade antes de modificar a cena, evitando estados parcialmente aplicados. A importação continua recusando dados não finitos, geometrias inválidas, expressões que não compilam e identificadores duplicados.

## Exportação

A central de exportação permite definir um nome base e disponibiliza:

- **ORBISV:** projeto completo para continuar o trabalho depois;
- **PNG:** imagem do gráfico com resolução atual, 2× ou 3×;
- **SVG:** exportação vetorial para cenas 2D compatíveis; cenas 3D e objetos que dependem do canvas são preservados como imagem incorporada;
- **PDF:** relatório formatado com o gráfico e resumo dos objetos visíveis, usando a impressão do navegador para salvar em PDF;
- **CSV:** tabela das funções visíveis, com intervalo da janela atual ou personalizado, passo configurável, separador `;`, vírgula decimal e BOM para compatibilidade com Excel.

## Acessibilidade

A Central de Acessibilidade inclui tema claro e escuro, alto contraste, escala de texto, espaçamento entre letras, redução de movimento, leitura simplificada, simulações de visão de cores, diferenciação de curvas por traços e marcadores, descrição acessível do gráfico e navegação por teclado.

As simulações disponíveis são protanopia, deuteranopia, tritanopia e acromatopsia. A diferenciação de objetos não depende exclusivamente de cor.

## PWA

O OrbisV pode funcionar como aplicativo web instalável quando servido por HTTPS ou `localhost`. O projeto possui manifesto, Service Worker, ícones convencionais e `maskable`, cache do app shell e atualização versionada dos arquivos principais.

## Executar localmente

O projeto é estático. Um modo simples de executar é:

```bash
python -m http.server 8000
```

Depois, abra `http://localhost:8000` no navegador.


## Manual didático integrado

O OrbisV inclui um manual completo em `manual/index.html`. Ele pode ser aberto pelo botão **Manual** na barra superior ou pela opção **Manual didático** no menu Projeto. Por padrão, o guia abre em uma janela integrada ao próprio programa. Em telas grandes ele fica lado a lado com o gráfico e pode ser ampliado ou redimensionado; no mobile ocupa uma janela interna e se recolhe quando o usuário escolhe “Abrir no OrbisV”. Os botões do manual levam diretamente ao modo ou ferramenta correspondente.
