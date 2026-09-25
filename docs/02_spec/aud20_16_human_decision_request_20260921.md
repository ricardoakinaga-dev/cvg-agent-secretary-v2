# AUD20-16 — pedido de decisão humana sobre lifecycle e capacidade

## Estado

- task: `AUD20-16`
- status: `APPROVED`
- execução: `CONTROLLED_LOCAL`
- efeito: nenhum; este documento não altera schema, retenção, archive,
  partitioning, replay ou produção.
- SPEC relacionada: `docs/02_spec/aud20_16_tombstone_lifecycle_capacity_20260921.md`

## O que já está aprovado

O registro D05-3/4 mantém: TTL inbound ativo de 30 dias, retenção de
journal/deduplicação descrita como 30 dias e `UNCERTAIN` sem expiração automática
([decision packet](prod20260913_decision_packet.md#d05-34--approved-opcao-a--20260913t170013688z)).

## Ambiguidade que impedia o gate

O texto D05-3/4 não diz expressamente se os 30 dias de journal/deduplicação são
o horizonte pós-TTL da identidade tombstonada. Também registra que o nome/cargo
formal da autoridade não foi informado e que a revisão será feita “com
D04/operação”, sem um owner nem um gatilho operacional mensurável. A crítica
independente classificou: horizonte `AMBIGUOUS`; owner `BLOCKED`; trigger
`BLOCKED` ([parecer](../04_audit/evidence/AUD20/AUD20-16-d05-interpretation-review-v1.md)).

## Decisões necessárias

Responder explicitamente aos três campos abaixo. Valores exemplificativos não
são defaults nem aprovação implícita.

1. **Horizonte pós-tombstone:** confirmar expressamente “30 dias corridos após
   o TTL ativo” ou informar outro número positivo de dias, retenção durável sem
   expiração, ou rejeição/necessidade de esclarecimento. Indicar se o valor se
   aplica a todos os tenants e ao replay inbound.
2. **Owner formal:** informar pessoa, papel ou equipe responsável por capacidade,
   retenção e decisão de roll-forward; um grupo genérico sem autoridade não
   basta.
3. **Review trigger:** informar condição mensurável, janela/cadência, autoridade
   que revisa e ação esperada. Os gatilhos listados na SPEC (crescimento acima de
   80% da previsão, tabela/índice acima de 70% da reserva, p95 acima do SLO,
   mudança de horizonte/contrato/classificação ou falha de recovery) são apenas
   propostas para escolha.

## Registro para preenchimento

```text
decision_id: AUD20-16-LIFECYCLE
status: APPROVED
post_tombstone_horizon: 30
horizon_unit_and_scope: dias corridos após o TTL ativo; todos os tenants; replay inbound
formal_owner_and_role: Ricardo — Engineering Owner
review_trigger_condition: crescimento diário acima de 80% da previsão por duas janelas; tabela ou índice acima de 70% da capacidade local reservada; p95 de retenção ou replay acima do SLO documentado; mudança de horizonte, contrato de canal ou classificação de key; falha de recovery, archive ou consulta fail-closed
review_window_or_cadence: mensal e imediatamente após qualquer gatilho
review_authority_and_action: Ricardo — Engineering Owner; aprovar ou rejeitar somente roll-forward de capacidade
valid_until: 2026-12-31T23:59:59-03:00
authority_name_and_role: Ricardo — Engineering Owner
decided_at: 2026-09-22T01:09:10Z
reference_artifact_and_sha256: docs/04_audit/evidence/AUD20/AUD20-16-human-decision-20260922.json / d9d6a0345614b4310c3ce9a8b3ea336b4030b7589c16bf56a2f7662fcd29e840
environment_and_effect_scope: controlled local / synthetic only
constraints_and_revocation: UNCERTAIN never expires automatically; no destructive purge
```

## Confirmação

Ricardo confirmou integralmente este registro na sessão ativa. A decisão cria a
policy version `AUD20-16-LIFECYCLE-v1`, não autoriza purge destrutivo e expira
em `2026-12-31T23:59:59-03:00`. Expiração, mudança material de política ou
revogação reabrem o gate.

## O que a resposta libera

A resposta explícita foi recebida. O agente deve atualizar a SPEC, a matriz e o
receipt candidate-bound, validar C01/C02 e só então iniciar o BUILD local
necessário para C04–C06. A resposta não libera staging, produção, dados reais,
integrações externas ou ações sensíveis.
