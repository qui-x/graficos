# Checklist manual de QA — Calculadora Gráfica (v100)

Isto complementa `tests/smoke-test.js`. O script automatizado cobre DOM/JS
(estado, classes, cálculos); o que só dá pra ver/sentir num navegador de
verdade fica aqui. Teste pelo menos em: Chrome Android, Safari iOS, e um
desktop qualquer, nas larguras indicadas.

Marque cada item com o dispositivo/navegador usado.

## 1. Barra de modos (topo, mobile — abaixo de 900px)

- [ ] A barra fica fixa no **topo**, abaixo do cabeçalho, em toda largura de mobile (não é mais um menu lateral)
- [ ] Todos os 7 modos mostram ícone + nome (Função, Paramétrica, Vetor, Geometria, Discos/Anéis, Curva 3D, Reta 3D)
- [ ] Em telas estreitas (< ~380px) nem todos os modos cabem — a barra rola horizontalmente arrastando o dedo
- [ ] Ao rolar, aparece um degradê suave na borda esquerda/direita indicando que há mais modos pra esse lado, e ele some ao chegar no início/fim
- [ ] Tocar num modo troca instantaneamente, sem esconder a barra
- [ ] O modo ativo fica destacado (sublinhado/cor de destaque)
- [ ] Ao selecionar um modo pelo histórico ou por "editar objeto", se o botão dele estiver fora da tela a barra rola sozinha até ele aparecer
- [ ] Testar em paisagem (celular deitado) — a barra continua utilizável, não corta os últimos modos
- [ ] Testar em aparelho com notch/ilha dinâmica — a barra respeita a área segura (não fica atrás do notch)

## 2. Bottom sheet de controles (mobile)

- [ ] Botão "Controles" no topo abre a folha subindo do fundo da tela
- [ ] A folha começa **abaixo** da barra de modos (não cobre nem é coberta por ela)
- [ ] Puxar a alça (traço horizontal no topo da folha) pra baixo faz a folha **acompanhar o dedo em tempo real** (não só reagir ao soltar)
- [ ] Soltar a alça arrastada **pouco** volta a folha pro lugar (com uma animação suave)
- [ ] Soltar a alça arrastada **bastante** (mais de ~1/4 da altura da folha) fecha a folha
- [ ] Tocar fora da folha (no fundo escurecido) fecha a folha
- [ ] O botão "X" no cabeçalho da folha fecha normalmente
- [ ] Tocar num campo de texto dentro da folha e abrir o teclado do celular: a folha se ajusta pra não ficar atrás do teclado, e o campo focado continua visível
- [ ] Com muitos campos (ex.: modo Geometria com elipse), a folha rola internamente e o cabeçalho + botão "Adicionar" continuam visíveis (sticky) durante a rolagem
- [ ] Testar nos 4 breakpoints: ~900-1024px (tablet), 600-899px, 380-599px, abaixo de 380px

## 3. Painel de controles (desktop — 1024px ou mais)

- [ ] Seta de recolher no cabeçalho do painel esconde o painel de controles
- [ ] **Com o painel escondido, o botão "Controles" aparece na barra de ferramentas do gráfico** (ao lado de Recentrar/Grade/Eixos) — este botão não existia antes; sem ele não havia como reabrir o painel
- [ ] Clicar nesse botão restaura o painel, e o botão volta a ficar escondido
- [ ] A seta de recolher a **barra de modos** (ícone no cabeçalho da barra lateral de modos) funciona independentemente do painel de controles

## 4. Fórmula de Discos/Anéis (modo Discos/Anéis)

- [ ] Abrir o modo "Discos/Anéis" e conferir o card de fórmula geral no topo do painel — deve mostrar uma fórmula legível, sem texto solto tipo "ight]" ou "ext{" no meio
- [ ] Preencher os campos (função externa, interna, limites) e conferir a prévia da fórmula ao vivo — mesma checagem de texto quebrado
- [ ] Se o app tiver acesso à internet (KaTeX via CDN), a fórmula deve aparecer tipografada; sem internet, aparece em texto simples — nos dois casos, sem lixo visual

## 5. Atalhos do PWA (instalar o app)

- [ ] Instalar o app na tela inicial (Chrome Android: menu → Instalar app / Safari iOS: Compartilhar → Adicionar à Tela de Início)
- [ ] Pressionar e segurar o ícone do app instalado (Android) — devem aparecer os atalhos "Função", "Vetor" e "Discos e Anéis"
- [ ] Tocar em cada atalho deve abrir o app **direto naquele modo** (antes desta correção, sempre abria no último modo usado, ignorando o atalho)
- [ ] Depois de atualizar os arquivos no servidor, forçar o app a buscar a nova versão (fechar e reabrir, ou aguardar a troca de service worker) e confirmar que as correções desta lista realmente chegaram no aparelho — o nome do cache mudou pra `calc-grafica-v100`, então um service worker antigo (`v99`) deve ser substituído automaticamente

## 6. Funcionalidade geral (todos os 7 modos)

Repetir para Função, Paramétrica, Vetor, Geometria (reta/círculo/elipse/ponto), Discos/Anéis, Curva 3D, Reta 3D:

- [ ] Adicionar um objeto válido → aparece no gráfico e na lista de objetos
- [ ] Tentar adicionar com campo vazio ou inválido → mensagem de erro clara, não trava
- [ ] Editar um objeto existente (lápis na lista) → carrega os dados certos nos campos certos
- [ ] Desfazer/Refazer após adicionar/editar/remover
- [ ] Remover um objeto e "Limpar tudo"
- [ ] Alternar visibilidade (olho) de um objeto

- [ ] Exportar PNG e SVG e abrir os arquivos gerados
- [ ] Exportar JSON, depois importar esse mesmo arquivo num app "zerado" (limpar tudo antes) e conferir que os objetos voltam
- [ ] Testar "Compartilhar" (ícone de compartilhamento) num navegador mobile compatível
- [ ] Recentrar, alternar Grade e Eixos
- [ ] Abrir "Configurar variáveis" e trocar quais letras são reconhecidas

## 7. Acessibilidade / teclado

- [ ] Navegar pela barra de modos só com o teclado (Tab até chegar nela, depois setas ← →) e confirmar que o foco e a seleção seguem corretamente
- [ ] Confirmar que um leitor de tela anuncia o modo ativo (aria-current) e as mensagens de toast/status (aria-live)
