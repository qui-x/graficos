# OrbisV — identidade oficial + teclado mobile calculadora

**Visualize · Explore · Descubra**  
**Matemática em qualquer dimensão**

Esta versão consolida a nova arquitetura visual e funcional do OrbisV para o primeiro teste em navegador. O foco desta entrega é validar a experiência de uso, a edição matemática, o gerenciamento da cena e a responsividade antes de fechar o motor 3D e as rotinas simbólicas avançadas.

## O que já está integrado

- Identidade OrbisV baseada diretamente na arte aprovada: `assets/orbisv-brand-master.png` preserva o arquivo mestre, `orbisv-wordmark-official.png` é o recorte oficial para cabeçalho e `orbisv-v-symbol.png` é o V parabólico usado como símbolo representativo, favicon e ícone do app.
- Layout adaptativo: mobile com navegação inferior e bottom sheet, landscape/tablet com painel à direita e desktop com barra de modos recolhível.
- Modos: Função, Paramétrica, Vetor, Geometria, Discos/Anéis, Curva 3D e Reta 3D.
- Funções, curvas paramétricas, vetores, pontos, retas, círculos, elipses e polígonos desenháveis no plano.
- Discos/Anéis com cálculo numérico de volume e perfil 2D para eixos x ou y.
- Curva 3D e Reta 3D já possuem interface preparada; o motor 3D será fechado depois do primeiro teste.
- Editor Matemático OrbisV em modal próprio, sem abrir o teclado nativo no mobile por padrão.
- Teclado mobile reorganizado como calculadora científica: bloco superior de funções matemáticas e teclado numérico principal em grade 4×5, com AC, parênteses, operadores, DEL e tecla `=` para confirmar.
- Notação matemática visual em MathML: frações, raízes, expoentes, multiplicação implícita e funções em convenção PT-BR.
- Entrada compatível com `2x`, `3(x+1)`, `2pi`, `sen(x)`, `tg(x)`, raízes e potências.
- Objetos: editar ao tocar, mostrar/ocultar, bloquear, duplicar, ordenar, seleção múltipla e ações em lote.
- Histórico real de ações com desfazer/refazer.
- Autosave local com versões atual, anterior e de recuperação; migração da sessão antiga quando disponível.
- Arquivo de projeto `.orbisv` com cena, câmera, histórico e modo atual.
- Exportações PNG, SVG, CSV e impressão/PDF.
- Ferramentas do gráfico: recentrar, grade, eixos, ajustar à tela e modo Inspecionar.
- Pontos notáveis numéricos para funções e análise inicial.
- Central de acessibilidade: tema, alto contraste, escala de fonte, espaçamento, redução de movimento, leitura simplificada, simulação de visão de cores, padrões de linha, marcadores, descrição do gráfico e navegação por teclado.
- Sem dependências CDN para a interface ou a renderização matemática principal.
- Sem `eval` e sem `new Function` no parser matemático.

## Escopo deliberadamente reservado para o ciclo após o primeiro teste

O layout e os formulários 3D estão prontos, mas o motor de renderização espacial, a câmera 3D final, as rotinas simbólicas completas e o cursor matemático estrutural avançado serão definidos após o feedback deste primeiro teste. Isso evita cristalizar decisões de motor antes de validar a nova experiência de uso.

## Executar

O projeto é estático. Para teste local, prefira um servidor HTTP simples:

```bash
python -m http.server 8000
```

Depois abra `http://localhost:8000` no navegador. Também pode ser publicado diretamente em hospedagem estática ou GitHub Pages.

## Testes

Com Node.js instalado:

```bash
npm test
```

Os testes verificam o parser, gerenciamento de objetos, notação matemática, estrutura da interface, ausência de execução dinâmica insegura e os principais contratos da nova arquitetura.

## Revisão PWA e acessibilidade de cores — V3

Esta entrega inclui uma auditoria específica de PWA e acessibilidade visual. O projeto agora possui `sw.js`, registro de Service Worker, manifest com `id`/`scope`, ícones `maskable`, Apple Touch Icon 180×180 e cache offline do app shell.

Os temas claro, escuro e alto contraste passaram a possuir paletas próprias também para superfícies, destaques, estados de erro/aviso e teclado matemático. As cores do gráfico são adaptadas ao tema ativo.

As simulações de protanopia, deuteranopia, tritanopia e acromatopsia deixaram de usar simples `hue-rotate()`/`saturate()` e passaram a utilizar matrizes SVG específicas. Padrões de linha e marcadores geométricos oferecem diferenciação adicional sem depender somente de cor.

Consulte `AUDITORIA_PWA_ACESSIBILIDADE.md` para os detalhes e as cores adotadas.

## Correção V4.1 — coerência do PWA

A versão 4.1 corrige mistura de arquivos entre releases causada pelo cache do Service Worker. CSS e JavaScript críticos agora usam URLs versionadas e estratégia network-first, o Service Worker usa `updateViaCache: none`, o cache foi incrementado e há recarga única quando um novo controlador assume. Isso evita carregar um `ui.js` antigo junto do `index.html` novo.

## V4.2 — identificadores matemáticos automáticos
- O editor reconhece automaticamente identificadores matemáticos usuais sem exigir configuração manual de "variáveis ativas".
- Letras latinas simples (`a`–`z`), formas indexadas como `x1`/`x_1` e letras gregas comuns são aceitas como parâmetros.
- Justaposições da literatura, como `xy`, `nt` e `ab`, são interpretadas como multiplicação implícita.
- `π`, `e`, `τ` e `φ` continuam reservadas como constantes; nomes de funções continuam reservados.
- Parâmetros livres recebem valor inicial automático `1` para que a expressão continue calculável até a futura interface de parâmetros/sliders.
