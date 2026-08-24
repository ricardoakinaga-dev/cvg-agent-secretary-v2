# ADR-0002 — AgentVersion imutável após publicação

## Decisão

`PUBLISHED` é snapshot imutável. Editar config ou fazer rollback sempre cria uma nova versão e um registro de publicação.

## Motivo

Trace, auditoria e reprodução de Test Lab precisam apontar para uma configuração que não muda durante uma conversa.

## Consequência

O armazenamento precisa usar cópias defensivas, version sequence por agent/tenant e constraints que impeçam update de conteúdo publicado.
