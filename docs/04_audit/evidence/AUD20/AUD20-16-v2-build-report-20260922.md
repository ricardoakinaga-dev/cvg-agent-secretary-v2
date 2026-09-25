# AUD20-16 v2 — lifecycle e capacidade — 2026-09-22

## Estado

- task: `AUD20-16`
- fase: `AUDIT`
- execução: `CONTROLLED_LOCAL`
- policy version: `AUD20-16-LIFECYCLE-v1`
- horizonte pós-tombstone: 30 dias corridos
- owner: Ricardo — Engineering Owner
- validade da decisão: `2026-12-31T23:59:59-03:00`
- staging/produção: `NO_GO`

## Decisão e desenho mínimo

A decisão humana está registrada em
`AUD20-16-human-decision-20260922.json` (SHA-256
`d9d6a0345614b4310c3ce9a8b3ea336b4030b7589c16bf56a2f7662fcd29e840`).
O desenho mantém retenção direta: não há archive nem partitioning porque as
medições sintéticas não justificam essa complexidade. A identidade única
`(tenant_id, key)`, o digest e os timestamps permanecem duráveis; somente a
referência opaca `resource_id` é minimizada após 30 dias do tombstone.

A migration aditiva `0029_inbound_tombstone_lifecycle.sql` torna
`resource_id` anulável apenas para tombstones maduros, grava versão da política
e timestamp de minimização e mantém constraint de shape. Seu SHA-256 é
`f722dcddc98e8ba6b054c8542ebdf8b98005ed053bbca4d11231052af39365a9`.

## Comportamento verificado

- operação manual, tenant-scoped, sem scheduler ou efeito em import;
- valida policy version; owner/ref/início/validade são constantes vinculadas à
  decisão e a janela é revalidada em cada batch pelo relógio PostgreSQL;
- lotes ordenados com `FOR UPDATE SKIP LOCKED`, limites e timeouts;
- legal hold impede minimização e mudanças concorrentes de hold usam o mesmo
  advisory lock tenant/target da minimização;
- cada lote grava ledger atômico com owner, approval ref, policy version e
  contagem minimizada;
- interrupção por `maxBatches=1` e restart convergem 2+3 registros;
- tombstone recente não é minimizado prematuramente;
- reader e writer preparados antes da migration continuam executáveis após a
  migration, inclusive com `resource_id = NULL` no reader;
- replay tardio após minimização falha com unique violation `23505`;
- aprovação expirada falha antes de abrir a operação;
- indisponibilidade do banco não possui fallback permissivo: a operação e o
  lookup de identidade propagam erro e não recriam trabalho.

## Capacidade

O fixture sintético foi refeito com horizonte aprovado de 30 dias e safety
factor 1,25. O modelo offline projetou p95 de `318720`, `10828800` e
`269721600` bytes para small/medium/operational-limit. Em PostgreSQL local
descartável 16.15, as medições usaram 1.000/5.000/20.000 linhas; totais foram
499.712/2.990.080/15.212.544 bytes e sweeps 0,487/0,834/4,144 ms. O schema
sintético foi removido no `finally`.

## Evidência fresca

| Gate | Resultado |
| --- | --- |
| focused PostgreSQL lifecycle | PASS — 1 arquivo, 13 testes |
| focused capacity model | PASS — 1 arquivo, 5 testes |
| capacity offline/PostgreSQL | PASS — política v1, 30 dias, 3 volumes sintéticos |
| regressão completa final | PASS — 285 arquivos, 2.198 testes, 192 skips condicionais (inclui 13 testes PostgreSQL condicionais executados separadamente) |
| typecheck/lint | PASS após a remediação da crítica |
| diff check | PASS |

A crítica v3 rejeitou o primeiro candidato v2; seus cinco achados foram
remediados. A crítica v4 aprovou C01–C06 sem bloqueio técnico remanescente. Os
checks finais typecheck/lint/format/docs/diff e a regressão completa passaram;
o binding v2 verificável fecha C07. Este relatório não autoriza
staging, produção, purge, archive, partitioning nem uso de dados reais.
