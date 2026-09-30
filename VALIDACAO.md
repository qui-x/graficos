# Verificação da entrega — OrbisV 9.1.0

Data: 28/09/2026.

| Bateria | Aprovados | Cobertura |
|---|---:|---|
| Matemática | 152/152 | Bancadas de fundamentos, geometria, vetores, Cálculo I/II, casos-limite e entradas inválidas |
| Representações e esquemas | 110/110 | Diagramas, tabelas, unidades, sólidos, regiões, frações e visualizações dos módulos |
| Currículo e investigação | 15/15 | 101 laboratórios, catálogo de perguntas, filtros BNCC, escopo e validação de roteiros |
| Interface geral | 107/107 | Catálogo, Caderno, persistência, exportações, cenas, temas, offline e abertura local |
| Editor matemático | 108/108 | Campos, teclado, matrizes, listas, lógica, variáveis, cenas gráficas e mobile |
| Investigação no Caderno | 16/16 | Previsão, dois ensaios, comparação, conclusão, feedback, exportação e restauração |
| Editor gráfico adaptado | 19/19 | 12 cenas, 2D/3D, Registro integrado, modelos, temas, layout de duas páginas e mobile |
| Ações e identidade visual | 14/14 | Menu Cena, importação, mesclagem, exportação, preferências, menus de objeto, manual e teclado |
| Controles contextuais X/Y/Z | 19/19 | Vistas XY/XZ/YZ, câmera, centro editável, zoom, eixos individuais, gestos, persistência, distribuição por módulo, bancada 2D/3D e telas estreitas |
| **Total anterior** | **541/541** | **Baterias da versão 9.0.0 preservadas e aprovadas** |
| **Total com controles** | **560/560** | **Todas as verificações automatizadas aprovadas** |

A interface foi executada em Chromium 153 com Playwright 1.63.0. Foram verificadas telas de 1440 × 1000, 740 × 420, 390 × 844 e 320 × 568, nos temas claro, escuro e alto contraste. Não foram registrados erros JavaScript não tratados nas baterias de interface.

A revisão visual inclui capturas reais do índice, laboratório 2D, cena 3D, Caderno de investigação, menu Cena, exportação, acessibilidade, modelos e uso móvel. As capturas acompanham `tests/`.

Os comandos estão no `README.md`; as baterias adicionais de identidade e controles executam `npm run test:actions` e `npm run test:controls`. Os relatórios JSON e scripts permanecem no pacote para auditoria local.

## Limites

Os testes não demonstram correção para toda expressão possível. Gráficos e contornos amostrados podem omitir singularidades, regiões estreitas ou pontos isolados. Um resultado experimental não constitui prova geral. O programa preserva hipóteses e recortes de cada laboratório para que o professor complemente a atividade.

O modo móvel foi verificado por emulação de viewport em navegador de desktop. Firefox, Safari e empacotadores Electron não foram certificados. O armazenamento é local e deve ser exportado para backup ou transferência.
