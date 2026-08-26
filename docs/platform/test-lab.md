# Test Lab

## Objetivo

O Test Lab executa casos fictícios contra uma `AgentVersion` sem provider,
canal, fila ou side effect externo. Cada caso contém mensagem, histórico
bounded e expectativas de policy, resposta e handoff.

## Artefatos

- `TestLabCase`: entrada e expectativas strict/bounded;
- `TestSuiteRecord`: coleção versionada por tenant/agente/versão;
- `TestSuiteRunRecord`: resultado de uma variante `A` ou `B`;
- `TestRunTrace`: evidência redigida por execução;
- evaluator: compara decisões, response mode, handoff e ferramentas.

Suites podem ser clonadas, avaliadas e comparadas A/B; cada clone é novo
snapshot. Histórico e limites de listagem são bounded.

## Segurança

`approvedKnowledge` só aceita source `controlled://`, versão e resposta
limitadas, objeto strict e binding correspondente. O executor valida antes de
resolver knowledge/model/tools. Tool planning vem do registry compilado e o
gateway continua sendo a autoridade.

## Preflight crítico

`runCriticalSafetyPreflight` roda cases fixos de medication, confirmação,
cancelamento, reagendamento e envio externo. O resultado é resumido e
redigido; qualquer falha ou `externalCall` impede publish/rollback.

## Evidência

Traces são persistidos por tenant quando solicitado, com cópia defensiva e
redaction. O Test Lab não prova disponibilidade de provider, canal, RAG ou
operação clínica; prova apenas invariantes do runtime controlado.
