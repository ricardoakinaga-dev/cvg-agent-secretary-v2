# Evidência — PLAT-S41 fronteira controlada de segurança da saída

## Identificação

- task: `PLAT-S41-001_CONTROLLED_OUTPUT_SAFETY_BOUNDARY`
- sprint: `PLAT-S41`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- fechamento: `2026-08-26T06:37:13-03:00`
- status: `COMPLETED_CONTROLLED`
- modo: `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`
- dados: somente fixtures e valores fictícios

## Discovery, RED e correção

A discovery confirmou que `approvedKnowledge.answer` e
`responseTemplates` eram enviados como `fallbackText` ao provider
determinístico e podiam chegar à completion/trace sem uma validação formal
de conteúdo pós-modelo. O RED inicial reproduziu esse comportamento com uma
fixture `controlled://`, antes de qualquer provider/canal real ou efeito.

Uma revisão independente read-only encontrou bypasses por dose numérica,
plural/inflexão, separadores e confusáveis Unicode, além de execução de
planning/approval/tools após uma saída rejeitada. Também apontou motivo de
handoff inconsistente, ausência de metadado bounded no trace e lacunas para
provider malformado e persistência direta. As regressões corretivas
reproduziram essas falhas antes do GREEN.

## Implementação auditada

- `enforceControlledOutput` trata a completion como `unknown`, exige modo e
  risco válidos, impõe limite de 4.000 caracteres, redige PII e falha fechado
  para output vazio, não textual, excessivo ou inseguro;
- detecção usa normalização NFKC/NFKD, remoção de controles/formatos e
  mapeamento de confusáveis comuns, cobrindo diagnóstico, prescrição,
  dose/medicação, tratamento, prontuário, pagamento e mutação de agenda;
- fallback é determinístico e kernel-owned; a recusa segura de medicamento
  permanece permitida, enquanto qualquer `rewritten` impede planning,
  resolução de approval e execução de tools;
- `policy.output.before`/`policy.output.after` carregam somente modo, motivo,
  decisão, redaction e tamanhos bounded; o texto rejeitado não é emitido;
- o handoff final tem precedência de `unsafe_output_rejected`, registra um
  único `handoff.requested` e sincroniza response/mode/state/trace;
- `TestRunTrace`, clones em memória/PostgreSQL, API e Control Center expõem
  apenas `outputPolicy` bounded. Os sinks validam novamente o response antes
  de persistir e removem campos extras não pertencentes ao contrato;
- o runtime API/PostgreSQL valida o trace antes de qualquer handoff, outbound,
  auditoria ou marcação de inbound concluído; provider nulo vira
  `invalid_output` com fallback seguro;
- provider permanece `fake/deterministic-v1`, com `externalCall: false`.

## Evidência executável final

- focused corretivo: 4 arquivos/36 testes PASS;
- focused de fechamento: 7 arquivos/76 testes PASS;
- regressão completa `npm test`: 123 arquivos PASS, 2 skipped; 483 testes
  PASS, 19 skipped;
- coverage: statements 85,08%; branches 80,29%; functions 85,39%; lines
  86,12%;
- readiness: 4/4 PASS;
- worker startup smoke:
  `{"event":"worker.startup_smoke_passed","code":"queue_adapter_missing"}`;
- PostgreSQL controlado: 8 arquivos/72 testes PASS, incluindo rejeição de
  trace inseguro antes de outbound e conclusão do inbound;
- E2E Playwright: 4/4 PASS;
- build: PASS, 70 módulos; bundle web 278,88 kB / gzip 81,99 kB;
- typecheck, lint, Prettier, `git diff --check`: PASS;
- `npm run audit:security`: 0 vulnerabilidades;
- nenhuma rede, provider/canal real, RAG, broker, outbox, egress, deploy,
  dado real ou side effect foi acionado; container scan não é declarado pois
  não há Dockerfile/imagem no escopo.

## Revisão e decisão

A revisão independente anterior encontrou P0/P1; todos os achados foram
convertidos em testes e corrigidos. A tentativa de confirmação assíncrona
final não retornou dentro do limite e foi encerrada, portanto não é contada
como aprovação. A decisão desta lane se apoia na correção dos achados,
inspeção estática local e nos gates executáveis acima; não há achado aberto
conhecido no escopo controlado.

`PLAT-S41-001 = COMPLETED_CONTROLLED`. O boundary de saída do MVP controlado
está fechado para o escopo definido. Isto não autoriza produção irrestrita,
piloto com dados reais, providers/canais reais ou ações sensíveis:
`PRODUCTION_REAL_DATA_READY = NO-GO` e permanece pendente de decisão humana,
infraestrutura e change control.
