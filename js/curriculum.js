/* Mapeamento editorial do OrbisV. Os códigos não significam cobertura integral. */
(function(g){'use strict';
const source='https://basenacionalcomum.mec.gov.br/images/BNCC_EI_EF_110518_versaofinal_site.pdf';
const rows={};
function link(ids,unit,codes,scope,page){for(const id of ids.split(' '))rows[id]={unit,codes:codes.split(' ').filter(Boolean),scope,page,relation:'apoio parcial'};}
link('fund-contagem','Números','EF01MA02 EF01MA03 EF01MA04 EF02MA03','Coleções de até 100 objetos; comparar e justificar contagens. Contextos concretos são propostos pelo professor.',279);
link('fund-decimal','Números','EF01MA07 EF02MA01 EF02MA04 EF03MA02 EF04MA02 EF05MA01 EF06MA02','Composição de naturais de até seis ordens. Para cada ano, o professor restringe a quantidade de ordens; não inclui outros sistemas de numeração.',291);
link('fund-agrupamentos','Números','EF02MA07 EF02MA08 EF03MA07 EF03MA08 EF04MA04 EF04MA06 EF04MA07','Distribuição visual de até 100 objetos, grupos iguais e resto. Usar quantidades compatíveis com o ano e formular problemas.',287);
link('fund-padroes','Álgebra','EF01MA10 EF02MA09 EF02MA10 EF03MA10 EF04MA11','Sequências numéricas com diferença constante. Padrões figurais e fluxogramas exigem atividade complementar.',287);
link('fund-malha','Grandezas e medidas','EF04MA21','Retângulos em malha unitária; comparar área e perímetro. Outras formas e metades de quadradinhos exigem construções complementares.',293);
link('fund-pesquisa','Probabilidade e estatística','EF02MA22 EF04MA27 EF04MA28 EM13MAT406','Tabelas e colunas para três categorias. O professor orienta coleta, categorias, amostragem e interpretação; não há tabelas de dupla entrada.',293);
link('fund-chances','Probabilidade e estatística','EF04MA26 EM13MAT511','Sorteios com reposição em duas categorias: comparar chance e frequência. Não cobre espaços contínuos ou eventos dependentes.',541);
link('fund-percurso','Geometria','EF02MA12 EF03MA12 EF06MA16','Trajeto no plano com eixos fixos; nos anos iniciais usar deslocamentos e referências espaciais com mediação docente.',287);
link('fund-expressoes','Números','EF06MA03 EF06MA11 EF07MA04 EF08MA01 EF08MA02','Verificação de cálculos, potências e radicais reais. Planejar estimativas e estratégias pessoais antes da resposta.',301);
link('fund-fracoes','Números','EF04MA09 EF05MA03 EF05MA04 EF05MA05 EF06MA07 EF06MA08 EF06MA10 EF07MA11 EF07MA12','Frações exatas, operações e reta numérica. Construir significados de parte/todo com situações e materiais adicionais.',295);
link('fund-divisibilidade','Números','EF06MA05 EF06MA06 EF07MA01','Examinar divisores e fatores. Solicitar estratégias e argumentos antes de usar o algoritmo de MDC/MMC.',301);
link('fund-proporcoes','Números e Álgebra','EF05MA06 EF05MA12 EF06MA13 EF07MA02 EF07MA17 EF08MA04 EF08MA12 EF08MA13 EF09MA08','Comparar proporções diretas, inversas e percentuais; os algoritmos do laboratório não substituem estratégias pessoais e contextos.',313);
link('fund-unidades','Grandezas e medidas','EM13MAT103','Conversões nas grandezas disponíveis; textos científicos, armazenamento digital e outras unidades demandam complementação.',533);
link('fund-algebra','Álgebra','EF07MA16 EF09MA09','Verificar equivalência, produtos e fatoração; pedir justificativas das transformações e das restrições do domínio.',317);
link('fund-equacoes','Álgebra','EF07MA18 EF08MA09 EF09MA09','Explorar soluções de equações; modelagem de problemas e justificativa dos procedimentos são realizadas no Caderno.',317);
link('fund-inequacoes','Números e Álgebra','EM13MAT302','Apoio à análise de modelos quadráticos e regiões de sinal, como aprofundamento associado; a habilidade não exige este módulo completo.',536);
link('fund-composicao fund-funcoes fund-modelos','Números e Álgebra','EF09MA06 EM13MAT302 EM13MAT401 EM13MAT402 EM13MAT501 EM13MAT502','Expressões, tabelas ou gráficos para investigar funções. Composição geral é aprofundamento, sem código específico atribuído.',539);
link('fund-exponenciais','Números e Álgebra','EM13MAT304 EM13MAT305 EM13MAT403','Investigar crescimento, logaritmos e domínios; contextualização e modelagem dependem do roteiro.',539);
link('fund-progressoes','Números e Álgebra','EF07MA15 EM13MAT507 EM13MAT508','Comparar termos e somas de PA/PG; explicitar a relação com funções em domínio discreto.',541);
link('fund-trigonometria','Geometria e Medidas','EM13MAT306','Círculo trigonométrico e variação angular. Para a habilidade, construir também um modelo de fenômeno periódico.',537);
link('fund-triangulos','Geometria','EF06MA19 EF09MA14','Medidas e classificação por lados/ângulos; verificar casos retângulos. Não substitui demonstrações de relações métricas.',319);
link('fund-medidas-planas','Grandezas e medidas','EM13MAT201 EM13MAT307 EM13MAT506','Medidas e variações de figuras disponíveis. A investigação de variação requer registrar vários ensaios e relacionar as grandezas.',537);
link('fund-solidos','Geometria e Medidas','EF09MA17 EF09MA19 EM13MAT309 EM13MAT504','Volumes, áreas e vistas dos sólidos disponíveis. Planificações, Cavalieri e demonstrações exigem complementação.',537);
link('fund-combinatoria','Probabilidade e estatística','EM13MAT310 EM13MAT311','Contagens e modelo binomial. Outros espaços amostrais, eventos dependentes e diagramas de árvore precisam de atividades próprias.',537);
link('fund-estatistica','Probabilidade e estatística','EF07MA35 EF09MA23 EM13MAT202 EM13MAT316 EM13MAT406','Resumo e frequências de uma amostra; pesquisa, crítica da amostragem e comunicação devem compor o roteiro.',537);
link('fund-juros','Números e Álgebra','EM13MAT303','Comparar juros simples e compostos e justificar decisões dentro das hipóteses do modelo.',536);
link('geo-distancias','Geometria','EF09MA16','Distância e ponto médio: solicitar construção e argumentação antes da conferência automática; casos no espaço são extensão.',319);
link('geo-retas-medidas','Geometria','EF08MA07','Retas no plano e suas relações; problemas com duas incógnitas podem usar a construção gráfica.',313);
link('geo-poligonos geo-plano','Geometria','EF06MA16 EF09MA16','Coordenadas, segmentos e polígonos. Conectar desenho e medidas por meio de conjecturas e registros.',319);
link('alg-sistemas','Números e Álgebra','EF08MA08 EM13MAT301','Sistemas e interpretação de soluções; no 8º ano restringir a duas incógnitas. Sistemas de ordem maior são extensão.',536);
link('alg-transformacoes','Geometria e Medidas','EM13MAT105','Transformações no plano; restringir a isometrias ou homotetias para a habilidade. Transformações gerais e 3D são extensão.',533);
link('alg-minimos-quadrados','Números e Álgebra','EM13MAT510','Ajuste e interpretação de tendência linear. A técnica matricial é aprofundamento, não exigência da habilidade.',541);
const extensionTopics={fundamentos:'Ampliação dos fundamentos',geometria:'Geometria analítica avançada','algebra-vetorial':'Álgebra linear e vetorial','calculo-1':'Cálculo diferencial e integral','calculo-2':'Integração, séries e várias variáveis'};
function info(id){const lab=g.OrbisCatalog.labs[id],r=rows[id];if(r)return {...r,id,stage:r.codes.some(c=>c.startsWith('EF'))?'EF':'EM'};return {id,codes:[],unit:extensionTopics[lab?.areaId]||'Aprofundamento',stage:'EXT',relation:'extensão',page:null,scope:'Conteúdo de aprofundamento ou graduação, sem correspondência direta atribuída às habilidades da BNCC. A escolha de pré-requisitos e da sequência cabe ao professor.'};}
function stages(id){const c=info(id);return c.codes.length?[...new Set(c.codes.map(x=>x.startsWith('EF')?'EF'+x.slice(2,4):'EM'))]:['EXT'];}
function all(){return Object.keys(g.OrbisCatalog.labs).map(info);}
function matches(id,{stage='',unit='',query=''}={}){const lab=g.OrbisCatalog.labs[id],c=info(id),norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();return (!stage||stages(id).includes(stage))&&(!unit||c.unit===unit)&&norm([lab.title,lab.group,c.unit,...c.codes].join(' ')).includes(norm(query));}
g.OrbisCurriculum={source,consulted:'2026-09-27',info,all,stages,matches,rows,notice:'Mapa de apoio parcial elaborado para o OrbisV. Uma ferramenta não comprova aprendizagem nem cobre toda a habilidade. A BNCC orienta a Educação Básica; a extensão universitária é apresentada separadamente. No Ensino Médio, a distribuição por série é definida pela rede ou escola.'};
})(window);
