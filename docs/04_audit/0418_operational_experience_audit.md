# 0418 — Operational Experience Audit

## Usabilidade

Validar se operador consegue:

- localizar conversa;
- entender timeline;
- aprovar ou rejeitar request;
- assumir handoff;
- criar ou atualizar tarefa;
- investigar erro.

## Fluxo

O painel deve refletir o estado real do backend e nao permitir transicoes invalidas.

## Erros visiveis

Erros devem ser claros para operador, sem expor segredo ou detalhe sensivel.

## Inconsistencias a procurar

- Approval pendente que ja foi decidido.
- Task sem origem.
- Timeline incompleta.
- Safety event escondido.
- Botao de acao proibida.

## Status atual

Aguardando painel minimo.
