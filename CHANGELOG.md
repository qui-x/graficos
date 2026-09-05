# Changelog — Calculadora Gráfica

## v100

Pedido: auditoria geral de funcionalidades + correções para o app funcionar
corretamente com bottom sheet nos controles e barra de modos fixa no topo
(mobile). Ver `tests/README.md` para a base de testes que acompanha esta
versão.

### Corrigido

- **Painel de controles não tinha volta no desktop.** O botão que deveria
  reaparecer para restaurar o painel depois de recolhido (`showControlsBtn`)
  era referenciado no JS mas nunca existiu no HTML — na prática, quem
  recolhia o painel no desktop ficava sem controles até recarregar a
  página (ou passar por mobile e voltar). Adicionado o botão na barra de
  ferramentas do gráfico, ao lado de Recentrar/Grade/Eixos.
- **Fórmula de Discos/Anéis corrompida.** Duas strings LaTeX tinham `\right`
  e `\text` escritos com uma barra invertida só (`\right`/`\text` em vez de
  `\\right`/`\\text`); como `\r` e `\t` são sequências de escape do
  JavaScript (retorno de carro e tab), o texto virava lixo no meio da
  fórmula (tanto no card estático quanto na prévia ao vivo do modo
  Discos/Anéis). Corrigido nos dois lugares.
- **Atalhos do PWA não funcionavam.** O `manifest.webmanifest` define
  atalhos (pressionar e segurar o ícone do app) para abrir direto em
  "Função", "Vetor" ou "Discos e Anéis" via `#function`/`#vector`/`#surface`
  na URL, mas o app nunca lia `location.hash` — sempre abria no último modo
  usado. Adicionado `applyHashMode()`, chamado na inicialização.
- **Gesto de arrastar o bottom sheet não tinha feedback visual.** A alça de
  arrastar só comparava a posição no toque inicial e final; a folha não
  acompanhava o dedo durante o gesto. Reescrito para seguir o dedo em tempo
  real (`--sheet-drag-y` + classe `.dragging`) e decidir fechar ou voltar
  suavemente com base na distância arrastada (proporcional à altura da
  folha, com teto de 120px).

### Removido (código morto)

Da época em que a barra de modos era um menu-gaveta lateral em vez de uma
barra fixa no topo — hoje eram só funções vestigiais, sem efeito visual
nenhum (a v98 já sobrescrevia tudo via `!important`), mas com potencial de
confundir manutenção futura:
- `openModesMobile()`, `closeModesMobile()` e `updateModeMobileButton()` (JS)
- `toggleSidebar()` (JS) — nunca era chamada, e ainda tinha um bug interno
  (usava as duas funções acima de forma assimétrica: expandir funcionava,
  recolher não)
- `setInitialPanelState()` (JS) — função inteira nunca chamada em lugar
  nenhum
- Bloco `.mode-sidebar`/`.mode-nav`/`.mode-btn` como gaveta lateral (CSS,
  regra `≤899px`) — as duas propriedades que ainda estavam em uso
  (`touch-action` da alça e o `overflow` do texto do botão) foram
  incorporadas na regra atual antes de remover o bloco antigo

### Adicionado

- Degradê nas bordas da barra de modos (aparece só do lado em que ainda há
  modos escondidos pela rolagem horizontal) — sinaliza que dá pra arrastar
  quando os 7 modos não cabem na largura da tela.
- `tests/smoke-test.js` — suíte automatizada (Node + jsdom) com 132
  verificações: integridade de referências DOM, troca de modo, hash do PWA,
  bottom sheet (estado e arrasto), motor de matemática, CRUD de objetos,
  import/export JSON.
- `tests/CHECKLIST-MANUAL.md` — checklist para o que só dá pra testar num
  navegador/aparelho de verdade (gestos, layout, PWA instalado).

### Observado, não alterado

- **Multiplicação implícita não é suportada** pelo motor de matemática
  (`2x`, `3(4+1)`, `2sen(0)` dão erro de sintaxe — só funciona com `*`
  explícito: `2*x`, `3*(4+1)`). Não mexi nisso porque é uma mudança de
  gramática do parser (bem mais arriscada que os itens acima) e não fazia
  parte do pedido original. Documentado como teste de comportamento atual
  na suíte automatizada, caso queira endereçar depois.
- O restante do bloco CSS antigo (`≤899px`, anterior à v98) que trata de
  `.topbar`, `.graph-toolbar`, `.controls-panel` etc. não foi tocado — a
  v98 também sobrescreve essas partes, mas não fiz a mesma auditoria linha
  a linha que fiz para `.mode-sidebar`. Funciona hoje; se quiser, dá pra
  fazer a mesma limpeza depois.

### Versionamento

`VERSAO.txt` → 100, `sw.js` (`CACHE_NAME`) → `calc-grafica-v100`, para o
service worker buscar os arquivos corrigidos em vez de continuar servindo a
v99 do cache.
