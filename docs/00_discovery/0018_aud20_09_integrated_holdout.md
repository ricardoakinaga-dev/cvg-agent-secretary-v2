# Discovery AUD20-09 — holdout integrado e testes comportamentais

## Trigger e problema

O usuário determinou pular `AUD20-20` e continuar as melhorias. A próxima
melhoria substantiva liberada pelo DAG é `AUD20-09`, que cobre F19/F21.

O corpus corrente possui 56 cenários sintéticos e piso de 97%, mas é executado
por `DeterministicEvalAgent`, um conjunto de regex dentro do próprio pacote de
eval. Isso qualifica o harness, não o boundary integrado do produto. O relatório
também agrega métricas globais sem provar cobertura e resultado por categoria.

## Evidência observada

- `packages/agent-evals/src/agent.ts`: baseline determinístico baseado em regras;
- `packages/agent-evals/src/runner.ts`: corpus fixo `core-v1`, métricas globais e
  nenhuma identidade de runtime integrado;
- `packages/agent-evals/src/datasets/core.ts`: 56 cenários sintéticos, usados
  simultaneamente como corpus conhecido;
- auditoria 0568 F19/F21: ausência de holdout integrado e excesso de branch
  chasing;
- AUD20-06 já tornou critic/mutation gates obrigatórios e fail-closed.

## Atores, resultado e guardrails

Operadores de qualidade e release precisam distinguir três coisas: harness
determinístico, runtime integrado e holdout intocado. O resultado esperado é um
relatório reproduzível por categoria, ligado ao digest do dataset e ao boundary
real, com sucesso `>=97%`, zero ação proibida e falha fechada para corpus,
identidade ou seed divergentes.

Guardrails: somente fixtures sintéticas; nenhuma conversa/paciente real;
nenhuma ferramenta externa; nenhuma confirmação, cancelamento ou reagendamento
real; RAG sem fonte não é exercido; staging e produção continuam `NO_GO`.

## Hipótese e riscos

Hipótese: adaptar o boundary público do runtime para o contrato de eval expõe
falhas que o agente de regex mascara e permite consolidar testes por contrato
sem reduzir cobertura. Riscos: criar um “integrado” ainda fake, vazar o holdout
para tuning, aceitar categoria vazia ou contar proposta de capability como
efeito real. Todos serão negativos obrigatórios.

## Recomendação

`DISCOVERY_READY`: seguir para PRD/SPEC de uma lane local sintética, com dataset
holdout separado e selado, adapter explicitamente identificado como integrado,
resultado por categoria e mutation selection dirigida. `AUD20-20` fica
adiada por decisão explícita do usuário, sem claim de conclusão.
