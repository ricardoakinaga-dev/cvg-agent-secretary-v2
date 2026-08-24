# 0411 — SPEC Adherence Audit

## Objetivo

Validar se a implementacao respeitou a SPEC.

## Itens a validar

- Arquitetura `apps` e `packages`.
- Separacao entre runtime, workflows, tools, adapters, policy e UI.
- Contratos de aplicacao e API.
- Eventos assincronos.
- Persistencia e integridade.
- Permissoes e auditoria.
- Observabilidade.

## Desvios criticos

- Workflow chamando adapter diretamente.
- Frontend executando tool diretamente.
- Policy ausente em acao sensivel.
- Tool call sem auditoria.
- Dados externos virando pre-requisito do modo solo.

## Classificacao

```txt
STATUS ATUAL: NAO EXECUTADO
MOTIVO: implementacao ainda nao existe
```
