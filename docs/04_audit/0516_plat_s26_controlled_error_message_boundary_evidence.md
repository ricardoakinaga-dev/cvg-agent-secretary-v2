# Evidência — PLAT-S26 boundary controlado de mensagens de erro do Prompt Profile

- projeto: `cvg-agent-secretary-v2`
- sprint: `PLAT-S26_CONTROLLED_PROMPT_PROFILE_ERROR_MESSAGE_BOUNDARY`
- task: `PLAT-S26-001_CONTROLLED_PROMPT_PROFILE_ERROR_MESSAGE_BOUNDARY`
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- registro: `2026-08-25T17:57:45-03:00`
- RED: `2026-08-25T18:01:30-03:00`
- GREEN focado: `2026-08-25T18:02:37-03:00`
- correção de regressão: `2026-08-25T18:03:50-03:00`
- gates externos: `2026-08-25T18:11:31-03:00`
- fechamento controlado: `2026-08-25T18:12:10-03:00`
- ambiente: fixtures controladas, `NODE_ENV=test`, sem dados reais

## Gap e escopo

A descoberta reproduziu que `assertPromptProfileIntegrity` e
`assertPromptProfileClone` interpolavam chaves/IDs de `responseTemplates` e
`promptBlocks` em `DomainError.message`. O clone API devolvia, por exemplo,
`token=fixture-secret<script>` dentro da resposta de erro.

O lane substituiu somente essas mensagens externas dinâmicas por mensagens
constantes. Código/status HTTP, envelope, correlation ID, validação,
imutabilidade de versão e ausência de side effect permanecem inalterados.

## TDD e revisão

- RED: suíte nova `apps/api/src/prompt-profile-error-boundary.test.ts` falhou
  4/4 antes do BUILD, confirmando os três echoes unitários e o echo no API.
- GREEN: a mesma suíte passou 1 arquivo/4 testes após a alteração mínima em
  `packages/platform/src/prompt-profile.ts`.
- regressão: `packages/platform/src/__tests__/prompt-profile.test.ts`,
  `apps/api/src/__tests__/platform-control-plane.test.ts` e a suíte S26
  passaram 3 arquivos/21 testes após atualizar a expectativa histórica.
- crítica: revisão independente física indisponível; verificação lead-only
  explícita. A inspeção confirmou ausência de interpolação de chave/ID nas
  mensagens externas do módulo.

## Gates executáveis

| Gate                           | Resultado                                                                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| focused S26                    | PASS — 1 arquivo/4 testes                                                                        |
| regressão próxima              | PASS — 3 arquivos/21 testes                                                                      |
| `npm run verify`               | PASS — 104 arquivos/371 testes pass/18 skips; typecheck, lint, build, coverage e audit incluídos |
| coverage                       | PASS — statements 85,41%; branches 80,77%; functions 85,24%; lines 86,42%                        |
| `npm run readiness`            | PASS — 1 arquivo/4 testes                                                                        |
| `npm run test:e2e`             | PASS — 3 testes                                                                                  |
| `npm run test:postgres`        | PASS — 5 arquivos/51 testes pass/18 skips                                                        |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilidades                                                                        |
| `git diff --check`             | PASS                                                                                             |

## Controles verificados

- chave de response template inválida retorna mensagem constante sem o valor
  recebido;
- ID duplicado de prompt block retorna mensagem constante sem o ID;
- remoção de block protegido retorna mensagem constante sem o ID protegido;
- clone inválido mantém HTTP 400/`validation_failed`, não reflete o sentinel e
  não cria uma segunda versão;
- S25 request-target, Secretary e os boundaries controlados anteriores seguem
  verdes pela suíte completa e gates externos.

`PLAT-S26-001_CONTROLLED_PROMPT_PROFILE_ERROR_MESSAGE_BOUNDARY` =
`COMPLETED_CONTROLLED`. O release controlado permanece pronto; produção real
continua `NO-GO`/`WAITING_HUMAN_APPROVAL`. Não houve provider, canal, RAG, dado
real, deploy, ação clínica/financeira/prontuário ou side effect.
