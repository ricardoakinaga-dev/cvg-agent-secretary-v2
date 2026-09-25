# Discovery proposta AUD20-08-FU5 — IMP50-22 drift semântico

## Registro

- ID: DISCOVERY-AUD20-08-FU5-IMP50-22
- Versão: 2
- Responsável pela proposta: executor local; autoridade da fonte de status de
  subfatia ainda não designada
- Atualização: 2026-09-24
- Janela de evidência: artefatos do repositório de 2026-09-23 a 2026-09-24
- Tier proposto: T2_FEATURE; risco operacional MEDIUM

## Estado

- task proposta: AUD20-08-FU5 / IMP50-22
- task-mãe: AUD20-08 permanece COMPLETED; esta proposta não reabre o pai
- fase: DISCOVERY
- disposição local: DRAFT; nenhum gate DISCOVERY_READY foi registrado
- execução permitida nesta etapa: leitura e documentação local
- PRD, SPEC, checker, teste de produto e BUILD: não admitidos
- dados reais, integração externa, staging e produção: NO_GO

## Problema observado

QP-05 da [revisão 0571](../04_audit/0571_implementation_state_review_2026-09-23.md)
registra um caso histórico de **drift de status**: fontes então consideradas
vivas descreviam query-parser como proposta/BUILD pendente, AUD20-10 como
aguardando aprovação e nenhuma fatia local aceita, apesar das aprovações e do
PASS_LOCAL registrados posteriormente. O achado não identifica um par
reproduzível de valores de próxima ação; esta Discovery não afirma que tal
drift foi observado.

A reconciliação manual posterior está registrada como NQP-06 em
[0343](../03_build/0343_post_query_backlog_20260923.md). Portanto, o problema
atual é a ausência de uma proteção automática demonstrada contra a recorrência
do drift de status; não há mismatch corrente alegado nesta proposta.

O fluxo observado é:

1. Executor/revisor consulta a fonte operacional 0337, CURRENT, estado
   machine-readable e matriz AUD20.
2. A disposição de subfatias aparece em backlogs candidatos e registros
   datados, que podem ficar defasados em relação às decisões posteriores.
3. A reconciliação é feita manualmente; o checker atual cobre parte do
   contrato AUD20-08, mas não prova que resumos de subfatia foram atualizados
   nem que não foram confundidos com o status da task-mãe.

O helper scripts/lib/docs-state-check.mjs e testes associados já existem no
worktree, e a auditoria limitada IMP50-41 usou esse helper para validar o
negativo de Phase 10. O helper atual tem SHA-256
05e5e145fee7df849d7b26f6e8e6c20e8edb19aed784e90afcbc40d1283559dd, igual ao
hash registrado naquele relatório. O arquivo não rastreado e as alterações
locais de docs-check/testes são observações do worktree, não admissão para
IMP50-22; não foram alterados ou executados nesta rodada.

## Baseline e resultado desejado

- Baseline observada: um caso de drift de status relatado por QP-05, depois
  corrigido documentalmente em NQP-06. A frequência além desse caso é
  desconhecida; a fonte não oferece contagem histórica.
- Resultado: prevenir recorrência detectando, antes de docs:check passar,
  divergência nos campos e âncoras correntes aprovados para 0337 e para uma
  fonte declarada de status de subfatia.
- Guardrails: nenhuma fonte histórica será reescrita; 0341 e qualquer registro
  datado não serão tratados como estado vivo sem regra explícita; um status
  local como PASS_LOCAL nunca conclui a task-mãe.
- Alvo/Janela: sem meta numérica definida; medir no PRD/SPEC o conjunto fechado
  de divergências cobertas por fixtures.

## Claims, evidência e confiança

| Tipo       | Estado da evidência | Confiança | Claim e fonte                                                                                                                                                         |
| ---------- | ------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FACT       | CONFIRMED           | HIGH      | QP-05 documenta divergência de status entre fontes correntes e registros de aprovação/PASS_LOCAL; [0571](../04_audit/0571_implementation_state_review_2026-09-23.md). |
| FACT       | CONFIRMED           | HIGH      | A PRD 0028 define current_state.json como autoridade, projection checks e histórico append-only; [PRD 0028](../01_prd/0028_aud20_08_state_node_reconciliation.md).    |
| FACT       | CONFIRMED           | HIGH      | O registro IMP50-50 de 2026-09-23 é um snapshot anterior às decisões posteriores; [IMP50 status](../04_audit/evidence/PLAN50-20260923/imp50-status-20260923.md).      |
| ASSUMPTION | PROPOSED            | MEDIUM    | Âncoras explícitas e uma relação pai/subfatia declarada podem detectar o caso conhecido sem ler prosa histórica; validar com fixtures no PRD/SPEC.                    |

## Atores e impacto

| Papel                      | Resultado necessário                                                     | Impacto/autoridade                                                                   | Evidência/confiança                          |
| -------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------- |
| Executor e revisor         | Retomar a task corrente e compreender o estado limitado de uma subfatia. | Uma projeção stale pode induzir a retomada da task errada ou aceite global indevido. | Impacto potencial inferido do fluxo; MEDIUM. |
| Mantenedor de documentação | Atualizar projeções vivas sem editar snapshots históricos.               | Papel necessário ao fluxo; autoridade de subfatia ainda não designada.               | Papel inferido; LOW.                         |
| Auditor                    | Reproduzir a relação entre autoridade, matriz, resumo e evidência.       | Precisa distinguir estado oficial, plano candidato e histórico.                      | Necessidade descrita em 0028; HIGH.          |

## Evidência de entrada

- [IMP50-22 em 0341](../03_build/0341_plan50_backlog_20260923.md) define
  negativos para resumo versus seção e matriz versus índice.
- [NQP-07 em 0572](../04_audit/0572_next_improvement_round_2026-09-23.md) cita
  status canônico, resumos 0337/0341 e status de subfatia.
- [NQP-07 em 0343](../03_build/0343_post_query_backlog_20260923.md) pede
  comparação de status/próxima ação e proteção contra leitura de histórico
  como atual.
- A PRD 0028 e a
  [Discovery 0017](0017_aud20_08_state_node_reconciliation.md) fornecem o
  contrato base. A trilha D de [0342](../03_build/0342_post_query_roadmap_20260923.md)
  permite preparação paralela com gates próprios.
- O registro [IMP50 live disposition de 2026-09-23](../04_audit/evidence/PLAN50-20260923/imp50-status-20260923.md)
  foi materializado antes de decisões posteriores, inclusive o PASS_LOCAL do
  query-parser e a aprovação/admissão da emenda request-context v2. Ele é
  evidência de uma fotografia datada, não uma autoridade atual para esses
  estados.

Não há usuário final, dado clínico, integração ou ação externa neste escopo.

## Questões de escopo para PRD/SPEC

1. **Autoridade e projeções:** reutilizar a hierarquia da PRD 0028, explicitando
   a função do current_state.json, da matriz, de CURRENT e do cabeçalho/seção
   corrente de 0337. Qualquer diferença entre a PRD aprovada, 0302 e os
   resumos vivos precisa ser resolvida antes da SPEC.
2. **0341 e snapshot IMP50:** manter 0341 como baseline de planejamento.
   O arquivo IMP50 de 2026-09-23 é fotografia imutável e está defasado. Ambos
   podem declarar escopo/ID, mas não são fonte do estado vivo; definir como a
   versão vigente de cada fotografia será identificada sem reescrever história.
3. **Subfatias:** não há fonte atual autorizada e versionada identificada para
   seus status. Alternativas: (A) excluir status de subfatia do checker e
   validar somente o estado oficial da task; (B) criar um registro
   machine-readable de subfatias, ligado ao current_state e contendo ID, pai,
   status local e evidência; (C) tratar o IMP50 snapshot datado como atual,
   opção rejeitada por ser stale. A decisão entre A e B é material e continua
   aberta; recomendar B se o requisito de NQP-07 para subfatias for mantido.
4. **Âncoras correntes:** selecionar seções delimitadas para leitura em 0337 e
   runtime state. Histórico, decisões anteriores e execution log ficam fora da
   extração de estado atual, salvo vínculo explícito por schema.
5. **Diagnósticos:** definir falhas estáveis para status divergente, próxima
   ação divergente, task duplicada/ausente, subfatia órfã e origem ambígua.
6. **Próxima ação:** NQP-07 pede validação deste campo, mas QP-05 não
   documenta uma divergência observada. Mantê-lo no escopo somente se o PRD
   fornecer fixtures de divergência desejada e esclarecer que é prevenção
   prospectiva, não um defeito já reproduzido.

## Cenários mínimos para a PRD/SPEC

1. Estado canônico, matriz e resumo corrente concordam; checker passa.
2. Resumo corrente de 0337 diverge em status; checker falha com campo/fonte.
   Uma fixture análoga pode divergir em próxima ação como caso prospectivo,
   sem alegar que QP-05 observou esse erro.
3. Um snapshot de planejamento datado difere do estado corrente; checker não
   o trata como erro corrente.
4. AUD20-08 permanece COMPLETED enquanto um follow-up proposto existe; nenhum
   status do follow-up altera o pai.
5. Query-parser PASS_LOCAL coexiste com request-context não aceito; checker
   não promove a task-mãe.
6. Registro histórico contém ação antiga; checker não o lê como ação atual.
7. Uma subfatia sem fonte declarada produz diagnóstico de ausência/ambiguidade
   ou fica fora da verificação, conforme decisão A/B; nunca é inferida de texto.

## Hipótese e falsificação

Hipótese: os contratos já aprovados em AUD20-08, mais âncoras atuais explícitas
e uma relação declarada pai/subfatia, bastam para detectar os casos de drift
sem interpretar prosa histórica.

Falsificar se a regra depender de inferência livre em Markdown, se um snapshot
de planejamento válido provocar falha, se um PASS_LOCAL encerrar
automaticamente a task-mãe, ou se a árvore coerente não tiver uma
representação única verificável. O gate de Discovery continua bloqueado até
decidir se status de subfatia entra no produto e qual registro o autoriza.

## Restrições e dependências

| ID     | Restrição/dependência                                                                                                           | Fonte                                      | Evidência | Consequência                                     |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------- | ------------------------------------------------ |
| CON-01 | Reutilizar a autoridade e as projeções definidas pela PRD 0028; qualquer contradição com 0302 deve ser resolvida antes da SPEC. | PRD 0028 / 0302                            | CONFIRMED | Não inventar segunda autoridade silenciosamente. |
| CON-02 | 0341 e IMP50 status de 2026-09-23 são fotografias, não registros vivos após decisões posteriores.                               | Cabeçalhos e conteúdo dos arquivos datados | CONFIRMED | Não compará-los como se fossem estado corrente.  |
| CON-03 | NQP-07 exige considerar status de subfatia, mas a fonte atual não é autoritativa nem atual.                                     | 0341 / 0343 / imp50-status                 | CONFIRMED | Escolha A/B pendente antes de PRD.               |
| CON-04 | Qualquer checker segue gates próprios e não reabre AUD20-08.                                                                    | Roadmap 0342                               | CONFIRMED | Nenhum código/teste/BUILD nesta Discovery.       |

## Guardrails

- Não alterar status oficial, 0337 histórico, 0341 baseline ou registros
  append-only para fazer o checker passar.
- Não editar ou executar o candidato local já presente nesta etapa de Discovery.
- Não adicionar Node pins, validação de certification pointer, validação de
  schema ou outras regras já tratadas por AUD20-08/IMP50-41.
- Não tornar a verificação obrigatória em docs:check antes da SPEC aprovada e
  de BUILD explicitamente admitido.
- Não criar novos campos de estado por inferência; qualquer schema de
  subfatias precisa de PRD/SPEC próprios e decisão sobre sua autoridade.
- Nenhuma mudança de produto, efeito externo ou promoção de release.

## Alternativas

- **Checker de software:** comparar fontes correntes selecionadas e, se a
  alternativa B for aprovada, um registro explícito de subfatias. Vantagem:
  regressão detectável; custo: autoridade e schema adicionais precisam de
  SPEC e owner.
- **Processo documental:** manter atualização manual de 0337/CURRENT e exigir
  revisão explícita após cada mudança de estado. Vantagem: sem novo schema;
  custo: não impede recorrência automaticamente.
- **Adiar enforcement:** preservar o parent AUD20-08 e a reconciliação NQP-06,
  manter NQP-07 como proposta até definir autoridade. Evita falsos positivos,
  mas mantém risco de drift manual.

## Critérios propostos para o gate Discovery

- documentar a ocorrência histórica QP-05 e seu limite de evidência; não
  alegar reprodução corrente sem fontes/valores correspondentes;
- identificar a autoridade e distinguir projeções vivas de snapshots;
- definir a relação entre task-mãe e subfatia sem promoção implícita;
- delimitar conteúdo e exclusões, incluindo 0341 e logs históricos;
- produzir cenários sintéticos positivos e negativos para a PRD/SPEC;
- manter execução local, read-only e determinística;
- obter crítica independente vinculada aos hashes atuais antes de registrar
  DISCOVERY_READY.

## Recomendação e saída

- Decisão: continuar Discovery, sem avançar a PRD ainda.
- Racional: QP-05 comprova um incidente histórico de drift de status que NQP-06
  corrigiu manualmente; as fontes e o resultado necessário estão identificados,
  mas a autoridade para estado de subfatia pode alterar o escopo.
- Condições: decidir A/B acima; obter crítica independente sobre esta versão e
  hashes das fontes; só então revisar 0090.
- Risco residual: MEDIUM — o erro pode induzir execução em snapshot stale ou
  aceitação indevida de subfatia; a frequência e uma autoridade viva não estão
  medidas.
- Gate: DISCOVERY_READY ainda não solicitado nem concedido.
- Próxima ação: obter decisão sobre a autoridade/escopo de status de subfatia;
  depois solicitar crítica fresh-context dos bytes revisados.
