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
- **Discos/Anéis:** calcula numericamente volumes de revolução e representa o perfil 2D.
- **Curva 3D e Reta 3D:** possuem formulários e notação preparados; o motor espacial ainda está reservado para a etapa de implementação 3D.

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

## Projetos e salvamento automático

A sessão atual é salva automaticamente no navegador. Um arquivo `.orbisv` preserva objetos, visualização, histórico e modo matemático ativo, permitindo continuar o trabalho em outra execução do aplicativo.

## Exportação

O menu de exportação disponibiliza:

- PNG;
- SVG;
- PDF por impressão do navegador;
- CSV para tabelas de funções visíveis.

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

## Testes

Com Node.js instalado:

```bash
npm test
```

A suíte verifica o motor matemático 2D, objetos, notação, catálogo de modelos, interface, PWA, acessibilidade, cache e principais contratos de interação.
