# AUD20-05 — relatório de BUILD/AUDIT v1

- observado em: `2026-09-22T02:53:00Z`
- execução: `CONTROLLED_LOCAL`
- ambiente: Node `22.23.2` e PostgreSQL local descartável
- dados: exclusivamente fixtures sintéticas
- staging: `NO_GO`
- produção: `NO_GO`
- release eligible: `false`

## Resultado

O runtime de produção agora exige explicitamente
`CVG_OPERATOR_REPLAY_STORE=postgres`, constrói um guard de replay ligado ao
key-ring ativo e falha antes de bind quando qualquer parte não existe. O
`PostgresOperatorReplayStore.assertReady()` observa a role efetiva, tabela,
schema, ownership, memberships e grants; aceita somente `USAGE` e CRUD
necessários e rejeita superuser, bypass RLS, ownership, `CREATE`, `TRUNCATE`,
`TRIGGER` e `REFERENCES`.

O digest de configuração da attestation externa passou a incluir a seleção do
store de replay e os bytes observados do key-ring. Evidências e mensagens de
erro não registram DSN, senha ou material de chave.

## RED/GREEN

- RED: readiness aceitava uma role insegura e produção avançava sem exigir o
  adapter PostgreSQL; os dois testes falharam antes da implementação.
- GREEN focado final: `20/20` no adapter PostgreSQL, incluindo `CREATE` direto
  no banco; o conjunto de boundary/startup/preflight também passou.
- PostgreSQL completo: `30` arquivos e `342/342` testes passaram.
- regressão completa final: `285` arquivos e `2.213/2.213` testes passaram; `192`
  skips condicionais.
- cobertura: statements `90,83%`, branches `86,87%`, functions `89,16%` e
  lines `91,42%`.
- typecheck, lint, format, docs-check (`792` links / `585` JSONs), arquitetura e
  `git diff --check`: `PASS`.

## Provas de contrato

- role PostgreSQL real e mínima, distinta do owner, recebeu somente schema
  `USAGE` e `SELECT/INSERT/UPDATE/DELETE` na tabela de replay;
- duas pools independentes disputaram o mesmo `(issuer, jti)` e exatamente uma
  venceu;
- indisponibilidade e grants/postura inválidos rejeitam readiness/claim sem
  fallback para memória;
- API valida configuração, store e guard antes de retornar a aplicação para
  `listen`; o worker mantém o preflight compartilhado antes do primeiro claim;
- attestation externa continua validando bytes, SHA-256, HMAC, validade,
  ambiente, owner, candidato e digest de configuração.

## Rollback e limites

Rollback é somente por roll-forward/configuração controlada. Em produção,
desabilitar ou trocar o adapter por memória impede startup; não há purge,
`DROP`, deploy ou alteração destrutiva. Nenhum dado ou segredo real, egress,
integração externa, commit, push, staging ou produção foi usado.
