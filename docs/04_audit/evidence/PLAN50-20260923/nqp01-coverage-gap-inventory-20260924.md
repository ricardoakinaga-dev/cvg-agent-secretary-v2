# NQP-01 — inventário read-only da lacuna de functions — 2026-09-24

## Resultado e limites

Este inventário mapeia a lacuna observada para `NQP-01` / `IMP50-36` no
candidato integrado AUD20-17, sem rodar testes, iniciar PostgreSQL, editar
código ou alterar denominadores. Os números abaixo são `OBSERVED` nesse
candidato; os alvos de teste são candidatos, não ganhos projetados.

O run integrado registrou 2.256 testes `PASS`, 192 skips condicionais a
PostgreSQL e zero falhas em 301 arquivos. A cobertura foi statements 90,84%,
branches 87,00%, functions 89,27% (2.107/2.360) e lines 91,43%. No denominador
inalterado, o piso functions ≥90% equivale a 2.124 funções exercitadas, ou 17 a
mais que as 2.107 atuais. Os 192 skips não contam como `PASS`; o gate PostgreSQL
não foi executado.

O resumo por arquivo e a tabela de cobertura do módulo estão disponíveis; não
foi encontrado `coverage-final.json` com localizações completas de funções
faltantes. Os vínculos entre módulos e testes PostgreSQL foram reconstruídos
pela inspeção das suítes e guards condicionais, sem executar os casos.

## Maiores alvos candidatos

| Módulo | Funções cobertas | Casos condicionais relacionados | Comportamentos relevantes | Limite |
| --- | ---: | ---: | --- | --- |
| `apps/worker/src/postgres-role-preflight.ts` | 0/10 | 12 em `postgres-role-preflight.test.ts` | rejeitar superuser/BYPASSRLS/roles herdados, ownership de tabela, grants excessivos ou ausentes e políticas RLS permissivas; sucesso com role mínima e limpeza do contexto de tenant | depende de PostgreSQL descartável; superfície de segurança |
| `packages/persistence/src/runtime-approval-store.ts` | 7/62 | 14 em `runtime-approval-store-postgres.test.ts` | decisão atômica e continuação/outbox/audit, rollback, reserva concorrente, fencing, expiração, incerteza, restart e isolamento por tenant | depende de PostgreSQL; parte das invariantes já tem testes unitários |
| `apps/worker/src/kernel-composition.ts` | 29/50 | 29 em `kernel-composition-branch-hardening.test.ts` | recuperação, divergência de lineage persistida, replay incerto, continuação de approval durável, ausência de efeito duplicado, negação terminal e falha na cadeia de auditoria | depende de PostgreSQL; módulo crítico de kernel |
| `packages/persistence/src/retention.ts` | 22/56 | 13 em `retention-postgres.test.ts` | hold e separação por tenant, idempotência, tombstones, batches limitados, rollback por timeout e convergência após restart | depende de PostgreSQL e sobrepõe o trabalho AUD20-04 |
| `apps/api/src/server/bootstrap-persistence.ts` | 8/28 | casos em suítes API condicionais; a atribuição individual não foi quantificada | falha ao construir repositório, ordem de migration/startup, rotas fail-closed e mutação atômica/replayable de journey/audit | depende de banco; precisa de mapeamento de casos no futuro SPEC |

Há também lacunas fora da lista crítica congelada: `packages/observability/src/collector.ts`
tem 36/46 funções; `apps/api/src/orchestration-observability.ts`, 12/21; há
wrappers pequenos sem execução em `agent-core` e helpers de eval. Portanto, os
17 casos de distância aritmética não são atribuíveis somente aos módulos
críticos.

O módulo `apps/api/src/server/request-context.ts` está em 69/75 branches
(92%). A tabela de cobertura aponta como ramo não executado a guarda de
produção que rejeita uma identidade não vinculada em
`requirePlatformScope`; essa associação foi derivada da leitura da linha 300 e
dos testes atuais, sem relatório de localização dos ramos. O piso 95% aplicado
a request-context aparece no critério C06 da fatia AUD20-17, enquanto o mapa
congelado `aud19-critical-coverage.json` enumera kernel, approval, policy,
journal, canal e RLS, sem request-context. Este inventário não decide essa
diferença nem inclui o déficit de branches no escopo NQP-01.

## Denominador e proveniência

- A barra AAA §9.1 exige functions ≥90% e proíbe reduzir limiar ou excluir
  arquivos para produzir `PASS`.
- O mapa `aud19-critical-coverage.json` exige que a medição ocorra com
  PostgreSQL descartável disponível; adaptadores explicitamente excluídos do
  denominador devem ser cobertos pelo gate PostgreSQL separado, com zero
  required skips.
- O resultado atual foi executado com `TEST_DATABASE_URL=''`; ele demonstra a
  lacuna unitária integrada, mas não a qualificação final no ambiente
  contratado.
- AAA-34 é histórico (base `512bc11e80fbf7c7b8baf6263aacc811ff829309`, Node
  24.20.0, execuções por pacote/filtros). Não há diretório/manifesto AAA-36
  disponível na árvore examinada. Esses dados históricos ajudam a localizar
  testes, mas não substituem o baseline atual.
- Há uma divergência de proveniência a reconciliar: o BUILD report declara que
  o manifesto candidato v2 tem SHA-256
  `11f061f452c2b51ce7202240e9b2b6c67729bbcb41d9439b1d1c3fb12155231d`; o
  SHA-256 observado agora no arquivo é
  `6b86eb90a9275f3563c1c9f9deadd5477f7c114fe5228768313706512447fdba`. O resumo
  de cobertura mantém hash
  `94abe96ed88109b890c4d30d5ef387cb002fbf30e170fc622560f166df23802b`, igual
  ao arquivo de evidência vinculado no manifesto corrente. Esta divergência
  não altera os números reproduzidos do JSON, mas impede tratar o digest citado
  no BUILD report como hash atual do manifesto.

## Evidência consultada

- [`AUD20-17-request-context-v2-integrated-coverage-summary-20260924.json`](../AUD20/AUD20-17-request-context-v2-integrated-coverage-summary-20260924.json) — SHA-256 `94abe96ed88109b890c4d30d5ef387cb002fbf30e170fc622560f166df23802b`.
- [`AUD20-17-request-context-v2-integrated-full-test-round1-20260924.log`](../AUD20/AUD20-17-request-context-v2-integrated-full-test-round1-20260924.log) — SHA-256 `6ef5d73e663fceb88a95b2f3ce9acad7c427cc1a569b410be56aac6fb0b66e98`.
- [`AUD20-17-request-context-v2-build-candidate-manifest-20260924.json`](../AUD20/AUD20-17-request-context-v2-build-candidate-manifest-20260924.json) — current SHA-256 `6b86eb90a9275f3563c1c9f9deadd5477f7c114fe5228768313706512447fdba`.
- [`AUD20-17-request-context-v2-build-report-20260924.md`](../AUD20/AUD20-17-request-context-v2-build-report-20260924.md) and [`AUD20-17-request-context-v2-independent-critic-20260924.md`](../AUD20/AUD20-17-request-context-v2-independent-critic-20260924.md) — C06 `FAIL`, C07 `FAIL`; request-context remains unaccepted.
- [`aud20-critical coverage denominator`](../../../03_build/tracking/aud19-critical-coverage.json) and [`AAA quality contract §9.1`](../../../02_spec/aaa_quality_contract.md#91-metas-numricas-congeladas-v2).
- `coverage/coverage-summary.json` — SHA-256 igual ao resumo JSON vinculado acima; apenas leitura nesta análise.

No teste, banco, mutation, serviço externo ou escrita em código foi executado
para produzir este inventário. A análise não autoriza NQP-01, não fecha C06/C07
e não libera PostgreSQL, staging ou produção.
