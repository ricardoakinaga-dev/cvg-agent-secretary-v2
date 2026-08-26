# Human Takeover

## State machine atual

```text
BOT_ACTIVE --request_handoff--> HANDOFF_REQUESTED
HANDOFF_REQUESTED --accept_handoff--> HUMAN_ACTIVE
HUMAN_ACTIVE --resolve_handoff--> RESOLVED
RESOLVED --release_to_bot--> BOT_ACTIVE
```

As transições são implementadas por `transitionHumanTakeover` e rejeitam
combinações não permitidas. `canBotRespond` só retorna true em `BOT_ACTIVE`.

## Silêncio do bot

Antes de executar o runtime inbound, a sessão é carregada e seu estado é
verificado novamente. Em `HUMAN_ACTIVE` o bot retorna estado pausado e não chama
provider, tool ou dispatcher. A persistência PostgreSQL mantém a transição
tenant-scoped e transacional.

## Retorno

O retorno ao bot é evento explícito (`release_to_bot`), não timeout implícito.
Uma nova mensagem segue a policy e o version pinning da sessão. O MVP não
despacha handoff para canal real nem assume controle humano real.

## Dados e auditoria

Sessão, conversation e audit ficam no escopo do tenant; payloads e textos são
redigidos. Identidade de operador e permissões devem vir de boundary confiável.
