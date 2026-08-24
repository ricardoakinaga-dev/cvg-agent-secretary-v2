# 0412 — Runtime Analysis

## Estabilidade

Validar se API, worker, banco, policy e adapters permanecem disponiveis durante fluxos principais.

## Latencia

Medir:

- tempo ate persistir mensagem;
- tempo ate classificar intencao;
- tempo de tool calls;
- tempo ate approval aparecer no painel.

## Falhas

Testar:

- canal indisponivel;
- adapter externo falhando;
- policy indisponivel;
- tool retornando erro;
- mensagem duplicada.

## Recovery

O sistema deve recuperar execucao sem perder mensagem, sessao, tool call ou evento auditavel.

## Consistencia de estado

Verificar se conversation, session, approval e task nao entram em estado impossivel.

## Status atual

Runtime analysis aguardando sistema funcional.
