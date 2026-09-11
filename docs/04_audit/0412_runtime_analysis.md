# 0412 — Runtime Analysis

## Parecer vigente — AUD-DOC-001 — 2026-09-05T00:54:31-03:00

Runtime: Executor publicado e Test Lab compartilham pipeline determinística. 537 testes e 4 E2E PASS; AUD-F01 reproduz scheduling/low sem handoff diante de sangue em mensagem composta.

Fonte atual: [relatório integral](0539_documentation_implementation_review.md), [inventário](0540_documentation_review_inventory.json) e [evidências](0541_documentation_review_evidence.json). Auditoria solicitada concluída; correções futuras ainda abertas.

## Registro histórico anterior a esta auditoria

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
