# Contribuição

1. Mantenha o projeto como aplicação estática e evite dependências desnecessárias.
2. Não use `eval`, `new Function` ou execução dinâmica de JavaScript para avaliar expressões.
3. Toda nova operação matemática deve passar pelo `MathEngine` e receber testes.
4. Alterações de estado gráfico devem passar por `GraphObjects`, permitindo desfazer/refazer e persistência.
5. Preserve acessibilidade: controles focáveis, `aria-label`/`aria-live` quando necessário e suporte ao teclado.
6. Execute `npm test` antes de enviar alterações.
