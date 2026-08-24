# ADR-0003 — Segredos somente por referência

## Decisão

Model provider config armazena `secretRef` validado; valor secreto vive em environment/secret manager. UI, prompt, audit e Test Lab nunca recebem o valor.

## Motivo

Configuração de agente é editável e auditável; misturar credenciais nela produziria vazamento e dificultaria rotação.

## Consequência

Provider real não faz parte do MVP controlado. Um adapter fake/determinístico valida o contrato até existir decisão humana e infraestrutura de segredo.
