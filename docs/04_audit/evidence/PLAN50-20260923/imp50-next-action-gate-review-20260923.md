# PLAN50 — revalidação read-only de gates R8 — 2026-09-23T07:07:02Z

## Resultado

`AUD20-17` / `IMP50-40` continua sendo a próxima ação única: revisão humana do
adendo da SPEC para a extração local de request context. A SPEC está
`DRAFT_PENDING_HUMAN_REVIEW`; a reativação para trabalho local não a aprova e
nenhum BUILD foi admitido. O pacote já está pronto para revisão em
[AUD20-17 — adendo da primeira fatia](../../../02_spec/aud20_17_hotspot_decomposition_20260922.md#adendo-proposto--imp50-40--primeira-fatia)
e no [pacote de revisão da reativação](../AUD20/AUD20-reactivation-review-20260923.md).

O adendo delimita uma extração única para
`apps/api/src/server/request-context.ts`, lista os helpers e testes de contrato,
define dependências injetadas e default deny, limita os arquivos alteráveis,
preserva os contratos HTTP e estabelece negativos, caps, critérios de redução e
rollback. Não inclui orchestration, persistence, runtime, web, alteração de
schema ou mudança pública.

## Avaliação de alternativas R8

A inspeção independente confirmou que a aprovação original de `AUD20-08` não
admite automaticamente follow-ups novos; o pai permanece `COMPLETED`.

- `IMP50-41`: classificação Phase 10 já distingue o pointer corrente, mas o
  follow-up não está registrado; não alterar findings ou índices antes disso.
- `IMP50-43`: requer follow-up e depende de `IMP50-21`; não editar navegação
  agora.
- `IMP50-49`: depende de política de história e SPEC/follow-up aprovado; não
  alterar checker ou índice.
- `IMP50-45`: qualquer deduplicação continua condicionada à revisão de
  `AUD20-17` e a uma baseline registrada.
- `IMP50-50`: concluído em `AUD20-08-FU2`, somente documental; não cria
  autorização para outros itens.
- `IMP50-42` / `AUD20-08-FU1`: a proposta separada tem boundary local POSIX/NVM,
  usa somente Node `22.23.2` já instalado, e define interface, critérios,
  negativos e rollback. O relatório anterior registra crítica independente
  `APPROVE` com dois P2 incorporados à SPEC; isso não é aprovação humana. O
  estado permanece `DRAFT_PENDING_HUMAN_REVIEW`, o pai `AUD20-08` segue completo
  e a proposta não admite BUILD. Ela não altera a ordem crítica `IMP50-40`
  primeiro. Consulte a [preparação específica](imp50-42-spec-preparation-20260923.md)
  e a [SPEC draft](../../../02_spec/aud20_08_imp50_42_node22_launcher_20260923.md).

Portanto, não foi identificada atividade R8 que possa substituir ou anteceder
a revisão de `IMP50-40` sem violar a ordem registrada. O registro por item
continua em [imp50-status](imp50-status-20260923.md).

Para tornar a decisão humana concreta, a fatia de request context foi
preregistrada como proposta na seção `AUD20-17` do
[backlog operacional](../../../03_build/0337_aud20260921_backlog.md). A
proposta permanece `WAITING_HUMAN_APPROVAL`: nenhuma autorização de BUILD foi
inferida.

## Divergência documental preservada

O trecho corrente de 2026-09-23 em [0300](../../../03_build/0300_build_engineer_master.md)
ainda diz que `AUD20-10/17/20` continuam adiadas, enquanto `CURRENT`, 0337 e
0190 registram sua reativação para trabalho local. A reconciliação de masters
pertence ao candidato `IMP50-21`; seu follow-up não foi admitido. Portanto, o
master foi preservado sem correção nesta rodada.

## Limites desta rodada

- Trabalho executado: inspeção documental read-only e revisão independente de
  escopo/gates.
- Validação desta atualização documental sob Node `v22.23.2`: `docs:check`
  PASS (938 links, 612 JSONs), `format:check` PASS e `git diff --check` PASS.
  A primeira invocação de `docs:check` usou o Node padrão `v24.20.0` e falhou
  somente por mismatch de runtime; a repetição no Node fixado passou.
- Nenhum código, teste de produto, SPEC, status de task, integração ou dado foi
  alterado ou exercitado. O backlog registra apenas a proposta não admitida.
  Nenhum BUILD, ação clínica/financeira/agendamento,
  commit, push, deploy, staging ou produção foi iniciado.
- HEAD observado: `25434811334f5cec92ee0741079302271b82b7cb`; worktree dirty
  preservado. Nenhum candidato de produto foi congelado; não há hash de
  candidato a reportar.
- Gauntlet isolado `PLAN50-20260923`: `ACTIVE`, `DECOMPOSE`, `0 rounds`,
  freshness `STALE`; progresso reflete que 40 está preregistrada como proposta,
  mas não admitida. `validate --check-drift` retorna `valid=true`; o digest
  `aece44fe3070f6e38aebc316a3791744dd094233ef2c78c708dc1e23f67000ba`
  identifica somente o snapshot isolado. Essa validação não qualifica os bytes
  atuais do workspace nem um candidato de produto.
- Estado PLAN50: `1/50` aceito somente em escopo documental, `0` BUILDs de
  produto; os demais permanecem sujeitos às tasks-mãe, dependências e gates.
- P0–P7 e os gates de release não mudam. Staging e produção seguem `NO_GO`.

## Próxima ação

Revisar e aprovar a SPEC `AUD20-17`/`IMP50-40` e autorizar explicitamente seu
BUILD local controlado. Registrar a decisão em `0190_spec_validation.md` e
converter a proposta preregistrada em fatia admitida antes de alterar código.
`IMP50-42` permanece uma revisão R8 separada e posterior.
