# REM-0539 — dossiê final R6 de revalidação controlada

Data: 2026-09-05
Status: `CONDITIONAL_PASS_CONTROLLED_NO_GO_EXTERNAL`
Evidência principal: [`0550_rem0539_r6_revalidation_evidence.json`](0550_rem0539_r6_revalidation_evidence.json)

## Parecer executivo

O BUILD local do programa foi revalidado depois dos achados da crítica R5. A rodada fechou os pontos técnicos dentro do limite controlado: há composição positiva e explícita do consumer do worker, sanitização centralizada antes do outbox, boundary PostgreSQL sem query exposta ao efeito, e uma shell web mais acessível, navegável e responsiva.

O passe é deliberadamente limitado a fixtures sintéticas e processos locais. Não é aprovação de produção, piloto, SLA externo, certificação de acessibilidade, integração com broker/provider/canal, uso de identidade real ou ingestão de fonte institucional. A decisão operacional permanece `NO-GO`.

## Resultado por onda

| Onda | Resultado atual                    | Limite que permanece                                                          |
| ---- | ---------------------------------- | ----------------------------------------------------------------------------- |
| R1   | `COMPLETED_CONTROLLED`             | Decisões sensíveis continuam exigindo approval/handoff.                       |
| R2   | `COMPLETED_CONTROLLED_REVALIDATED` | A composição real PostgreSQL/broker/provider permanece gate externo.          |
| R3   | `COMPLETED_CONTROLLED`             | Drafts não são cadastro definitivo nem consulta real confirmada.              |
| R4   | `COMPLETED_CONTROLLED`             | Identidade, provider, canal e fonte institucional reais não estão conectados. |
| R5   | `NO_GO_CONTROLLED`                 | Faltam gates externos/humanos e RPO/RTO aprovados.                            |
| R6   | `CONDITIONAL_PASS_CONTROLLED`      | Revalidação pós-correções; não altera o `NO-GO` externo.                      |

## Correções incorporadas

- `apps/worker/src/controlled-worker.ts` define uma composição fechada para os tipos de evento permitidos, com drain bounded, lease/takeover e efeitos injetados.
- `apps/worker/src/main.ts` e `scripts/worker-controlled-smoke.mjs` demonstram somente o caminho `controlled-memory`, com evento sintético e `externalEffects=false`.
- `packages/shared/src/audit-governance.ts`, `packages/persistence/src/outbox.ts` e `packages/persistence/src/postgres.ts` centralizam a sanitização e evitam carregar payload sensível para a persistência.
- `apps/web/src/App.tsx`, `apps/web/src/styles.css` e `tests/e2e/visual-shell.spec.ts` reforçam landmarks, skip link, foco, estados, navegação, tamanhos de controle e breakpoints exercitados.

## Verificação

- `npm test`: 150 arquivos passaram, 3 foram omitidos; 638 testes passaram, 23 foram omitidos.
- `npm run test:postgres`: 7 arquivos passaram, 2 foram omitidos; 54 testes passaram, 22 foram omitidos. A execução final não recebeu `TEST_DATABASE_URL`; portanto, os casos dependentes de PostgreSQL foram omitidos e não contam como prova de banco real nesta rodada.
- `npm run test:worker:startup`: falha segura sem configuração e caminho positivo controlado passaram; o smoke processou um evento sintético.
- `CVG_WEB_PORT=4175 npm run test:e2e`: 6/6 passaram em serviços locais sintéticos.
- Matriz visual: 375/768/1440 sem overflow horizontal, foco visível e controles com tamanho mínimo exercitados; admin narrow também passou.
- Typecheck, lint, build, readiness, format, audit de dependências e `git diff --check`: `PASS`.

## Gates bloqueadores

Antes de qualquer piloto ou produção ainda são obrigatórios: RF-011; identidade externa; provider; canal e destinatários aprovados; proprietário de fonte institucional; signoff humano; metas RPO/RTO; ensaio operacional autorizado; e revisão formal de acessibilidade. Nenhuma ação clínica, financeira, de prontuário definitivo, confirmação/cancelamento/reagendamento real ou resposta RAG sem fonte aprovada foi executada.

## Próximo passo autorizado

Registrar as decisões e aprovações externas/humanas nos documentos próprios. Depois, repetir REM-27–29 com perfil, metas, responsáveis e ambiente autorizados. Até lá, manter produção e piloto real bloqueados.
