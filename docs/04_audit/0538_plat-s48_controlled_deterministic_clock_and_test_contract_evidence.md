# Evidência — PLAT-S48 baseline determinístico e contrato semântico de testes

## Identificação

- sprint: `PLAT-S48_CONTROLLED_BASELINE_DETERMINISM`
- tasks: `PLAT-S48-001_CONTROLLED_DETERMINISTIC_APPROVAL_CLOCK`,
  `PLAT-S48-002_CONTROLLED_SEMANTIC_TIMELINE_ASSERTION`
- status: `COMPLETED_CONTROLLED`
- fase: `AUDIT`
- timestamp de fechamento: `2026-09-02T07:32:00-03:00`
- base do checkout: `HEAD == origin/main == 146c068`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- dados: somente fixtures e valores fictícios

## Discovery e RED

O baseline inicial reproduziu duas falhas reais no checkout atual:

- `npm test`: 129 arquivos; 125 pass, 2 failed e 2 skipped; 553 testes; 532
  pass, 2 failed e 19 skipped;
- a approval válida do gateway retornava `blocked/approval_required` porque a
  autoridade usava `2026-09-01T10:00:00.000Z` injetado e o gateway consultava
  `Date.now()` do processo;
- `app.test.tsx` lançava ambiguidade para `Mensagem via API`, presente tanto no
  preview da conversa quanto na timeline selecionada.

Após a escrita dos contratos de teste, o RED focado manteve a falha esperada
do gateway (1 arquivo/1 teste) e a aplicação passou 1 arquivo/15 testes. Não
houve provider, canal, RAG, rede, dado real ou side effect.

## Implementação e GREEN

- `CapabilityGatewayOptions` recebeu `now?: () => Date`, com default para o
  relógio real;
- `hasValidApproval` obtém uma leitura temporal, rejeita clock inválido ou
  não-finito e mantém a autoridade durável como árbitro final de status,
  expiração, binding, hash, revogação e consumo único;
- os testes usam literalmente a mesma função de clock na autoridade e no
  gateway;
- os casos adversariais provam que clock inválido, clock que lança e
  expiração local não alcançam `verifyAndConsume`, não chamam handler e não
  alteram a approval `issued`;
- a asserção web usa `within(screen.getByLabelText('Timeline selecionada'))`,
  preservando preview e timeline na UI sem alterar componente de produção.

GREEN corretivo: 3 arquivos/25 testes focados passaram, incluindo approval
authority, gateway e aplicação web. O gateway não usa mais `Date.now()`.

## Gates finais executáveis

| Gate                          | Resultado                                                                  |
| ----------------------------- | -------------------------------------------------------------------------- |
| `npm run verify`              | `PASS`; format, typecheck, lint, build, testes, coverage e audit           |
| `npm test`                    | `127` arquivos pass, `2` skipped; `537` testes pass, `19` skipped          |
| `npm run test:coverage`       | statements `84.87%`; branches `80.12%`; functions `84.98%`; lines `85.98%` |
| `npm run readiness`           | `PASS`; 1 arquivo, 4 testes                                                |
| `npm run test:worker:startup` | `PASS`; `queue_adapter_missing` controlado                                 |
| PostgreSQL controlado         | `PASS`; 8 arquivos, 72 testes                                              |
| `npm run test:e2e`            | `PASS`; 4/4 fluxos Playwright                                              |
| `npm run build`               | `PASS`; 158 módulos transformados                                          |
| `npm run audit:security`      | `PASS`; 0 vulnerabilidades                                                 |
| `git diff --check`            | `PASS`                                                                     |

Os gates foram executados na árvore final; o `verify` agregado terminou após a
rodada corretiva, e PostgreSQL/E2E/readiness/worker foram repetidos depois
dela.

## Auditoria independente

Uma crítica independente read-only foi executada sem editar arquivos. A
primeira revisão encontrou P2 de literalidade do clock e de evidência negativa;
ambos foram corrigidos com a mesma função, spies de `verifyAndConsume`, estado
`issued`, expiração local e clock que lança. A revisão final confirmou a
evidência presente, o tracking/plano/tasks fechados e nenhum achado
P0/P1/P2/P3, retornando `PASS_CONTROLLED`.

O resultado independente não é usado para reivindicar que o agente executou os
gates do lead; os números acima são evidência do runner principal. A tentativa
de papéis especializados permaneceu indisponível por quota/modelo e não foi
tratada como aprovação.

## Limites e veredito

- nenhuma migration, mudança de schema, contrato HTTP ou comportamento de API
  externa;
- a única superfície de código adicional é uma opção TypeScript interna não
  configurável por input externo;
- nenhum provider/canal real, RAG, rede, deploy, segredo, dado real, agenda,
  ação clínica/financeira/prontuário ou side effect foi ativado;
- `CONTROLLED_MVP_READY`: `PASS` para esta lane controlada;
- `PRODUCTION_REAL_DATA_READY`: `NO-GO` / `WAITING_HUMAN_APPROVAL`.
