# 0025 — PRD R4: contratos externos e operação sintética

Data: 2026-09-05. Programa: `REM-0539`. Onda: R4. Estado: `PRD_VALIDATED_CONTROLLED`.

## Requisitos

- **RF-R4-01** — Aceitar identidade assinada com segredo ativo e anterior dentro de janela limitada; rejeitar token expirado, replay e tenant divergente.
- **RF-R4-02** — Adapter de modelo informa timeout, consumo estimado e `externalCall`; output que tenta ferramenta/permissão ou contém segredo é bloqueado.
- **RF-R4-03** — Entrega mock deduplica por tenant/idempotency, registra resultado e não envia após takeover.
- **RF-R4-04** — Fonte institucional tem versão, estado ativo/revogado e resposta com referência; sem fonte aprovada resulta em handoff.
- **RF-R4-05** — Métricas agregadas não carregam payload pessoal; alerta e purge são ensaiáveis.
- **RF-R4-06** — Snapshot/restore valida digest, tenant e versão do formato; rollback não apaga trilha de auditoria.

## Aceites e não objetivos

Aceite exige testes de timeout, falha, replay, rotação, revogação, redaction, retenção e restore. A implementação não cria exactly-once externo, não concede permissão por saída de modelo e não declara disponibilidade de fornecedor. Dados reais, IdP externo, canal real, RAG real e deploy seguem fora.
