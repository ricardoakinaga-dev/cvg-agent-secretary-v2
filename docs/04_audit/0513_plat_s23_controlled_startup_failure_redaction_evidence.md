# Evidência — PLAT-S23 Controlled Startup Failure Redaction

## Identificação

- task: `PLAT-S23-001_CONTROLLED_STARTUP_FAILURE_REDACTION`
- sprint: `PLAT-S23_CONTROLLED_STARTUP_FAILURE_REDACTION`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- registro: `2026-08-25T16:14:10-03:00`
- RED inicial: `2026-08-25T16:19:41-03:00`
- GREEN focado: `2026-08-25T16:21:58-03:00`
- crítica lead-only/RED adicional: `2026-08-25T16:32:01-03:00`
- correção/retest focado: `2026-08-25T16:32:19-03:00`
- fechamento controlado: `2026-08-25T16:40:41-03:00`
- ambiente: checkout local, Node.js 22, fixtures e valores fictícios

## Gap e escopo

`apps/api/src/main.ts` enviava o objeto bruto para `console.error` quando o
bootstrap falhava. O objeto poderia carregar stack, causa, URL de conexão,
credencial, token ou detalhe interno.

O lane criou `apps/api/src/startup-failure.ts` e integrou o catch do entrypoint
para emitir somente `{ event, code, message }` em uma linha JSON. A mensagem é
redigida para credenciais em URLs, pares `password/secret/token/apiKey`,
`Bearer`/`Basic`, PII coberta pela redaction existente, controles de log e
tamanho máximo de 512 caracteres. `ZodError`, valores desconhecidos e
`Error`-like com `message` não textual usam fallback genérico. `stack`, `cause`
e campos arbitrários não são serializados.

Ficaram fora do escopo logger distribuído, persistência, alerting, mudança de
exit code, ordem de bootstrap, preflight, tenant, identidade, provider/canal,
RAG, dado real, deploy e side effect.

## TDD e auditoria

1. RED inicial: `npx vitest run apps/api/src/startup-failure.test.ts
--no-file-parallelism --maxWorkers=2` falhou porque o módulo ainda não
   existia; nenhum PASS amplo foi inferido.
2. GREEN focado: a mesma suíte passou 7/7 após formatter e integração.
3. Crítica lead-only encontrou um `Error`-like com `message` numérico que
   fazia `message.replace` lançar; o teste negativo falhou conforme esperado.
4. GREEN corretivo adicionou validação `typeof message === "string"`; focused
   passou 8/8. Child agent independente não estava disponível por limite de
   capacidade/modelo; essa limitação não foi tratada como aprovação.

## Evidência executável

| Gate                    | Resultado                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run verify`        | PASS — format, typecheck, lint, build, 101 arquivos, 351 testes pass, 18 skips; audit 0 vulnerabilidades |
| `npm run test:coverage` | PASS — statements 85,42%; branches 80,84%; functions 85,16%; lines 86,33%                                |
| `npm run readiness`     | PASS — 1 arquivo, 4 testes                                                                               |
| `npm run test:e2e`      | PASS — 3/3 fluxos Playwright                                                                             |
| `npm run test:postgres` | PASS — 5 arquivos, 51 testes pass, 18 skips                                                              |
| `git diff --check`      | PASS                                                                                                     |
| startup smoke           | PASS controlado — processo encerrou com exit 1 e emitiu somente a linha JSON segura esperada             |

Smoke executado:

```text
NODE_ENV=production API_PERSISTENCE_MODE=memory OPENAI_API_KEY=replace_me npx tsx apps/api/src/main.ts
```

Saída observada:

```json
{
  "event": "api.startup_failed",
  "code": "startup_failed",
  "message": "A production provider secret must be configured"
}
```

## Revisão de segurança e limites

- não há `console.error(error)` no entrypoint;
- `process.exit(1)` e o fail-closed do bootstrap permanecem;
- o formatter não recebe request, body, tenant ou identidade;
- a saída não inclui stack/cause e é bounded;
- não houve chamada externa, persistência, provider, canal, RAG, dado real ou
  efeito sensível;
- a redaction local não substitui logging operacional, retenção/PII, DLP,
  secrets manager ou observabilidade distribuída de produção.

## Resultado

`PLAT-S23-001_CONTROLLED_STARTUP_FAILURE_REDACTION` =
`COMPLETED_CONTROLLED`. O release controlado permanece
`CONTROLLED_MVP_READY`; produção real permanece `NO-GO`/
`WAITING_HUMAN_APPROVAL` por IdP, tenant binding, infraestrutura, host
security, retenção/PII, providers/canais/RAG e ações sensíveis ainda não
aprovados.
