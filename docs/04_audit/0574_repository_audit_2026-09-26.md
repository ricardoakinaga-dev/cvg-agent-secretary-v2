# 0574 — Auditoria técnica e de governança do repositório — 2026-09-26

## Escopo e critério

- **ID:** `AUD-20260926-REPO`.
- **Objeto:** arquitetura, código-fonte, qualidade, testes, CI/CD, deploy, segurança de dependências, observabilidade e documentação/governança na árvore local do `HEAD` `6655c50`, com notas de 0 a 100 por item analisado.
- **Baseline:** [auditoria 0573](0573_repository_audit_2026-09-25.md), [revisão 0571](0571_implementation_state_review_2026-09-23.md) e [auditoria 0569](0569_repository_audit_2026-09-23.md). Esta rodada **recalcula** as notas com medição própria, sem reaproveitar valores anteriores.
- **Método:** leitura das instruções CVG em [AGENTS](../07_agents/AGENTS.md) e das fontes canônicas; varredura estática de `apps/`, `packages/`, `scripts/`, `tests/` e `docs/`; execução dos gates locais sob Node `22.23.2`; inspeção de `certification/`, `.github/workflows/` e do estado do remote. Sem BUILD novo, sem dados reais, sem integração externa, sem sessão humana, sem commit, sem push e sem deploy.
- **Escala:** 90–100 forte e comprovado localmente; 75–89 bom com lacunas; 60–74 parcial; 40–59 frágil; 0–39 sem qualificação suficiente. As notas são julgamento técnico do escopo observado. Nenhuma média substitui um gate obrigatório.

## Verificações desta rodada

| Verificação                              | Resultado                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `typecheck`                              | PASS, exit 0.                                                                                       |
| `lint`                                   | PASS, exit 0, zero problemas.                                                                       |
| `format:check`                           | PASS.                                                                                               |
| `git diff --check`                       | PASS.                                                                                               |
| `docs:check` sob Node `22.23.2`          | PASS; zero links quebrados, JSONs válidos, estados/semântica/`nextAction` válidos.                  |
| `docs:check` sob Node `24` do ambiente   | FAIL esperado: `node_runtime_mismatch` — guard fail-closed confirmado ao vivo.                      |
| `build`                                  | PASS (`tsc` + Vite, 166 módulos, 404,79 kB JS).                                                     |
| `npm audit --audit-level=high`           | PASS, 0 vulnerabilidades.                                                                           |
| **Suíte completa** (`vitest run`)        | **PASS**: 306 arquivos, **2.659 testes pass / 0 falha / 192 skip**, 329 s.                          |
| `scripts/aud19-critical-coverage.mjs`    | **FAIL**, exit 1: `kernel 89,37%` e `approval 77,64%` contra o piso 95 de branches críticos.        |
| `promotion-check --requested PRODUCTION` | **FAIL**: `eligible:false`, `reason=current_certification_invalid`, 8 `external_gate_pending`.      |
| Estado do remote (`gh run list`)         | **VERMELHO**: 8 últimos runs `Verify`/`Security` em `failure`; último `Verify` verde em 2026-09-02. |
| Sincronização com o remote               | `main` está **66 commits à frente** de `origin/main`; último push em 2026-09-17.                    |

## Notas por item

### A — Engenharia de software (média **70**)

|   # | Item analisado                    | Nota / 100 | Base da avaliação                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --: | --------------------------------- | ---------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | Arquitetura e estrutura           |     **62** | Grafo de produção sem ciclos, camadas corretas (`persistence` → `agent-runtime`), ports reais e 14 ADRs; contra `server.ts` com 4.584 linhas e `buildServer()` de 3.268, 46% do código em 17 arquivos, 3 pacotes mortos, 12 dependências workspace não declaradas, 18 barrels `export *`, DTOs do web redeclarados e SPEC de arquitetura descrevendo 8 de 18 pacotes.                                                                                                        |
|   2 | Qualidade e higiene do código     |     **78** | Zero `any`, `@ts-ignore`, `eslint-disable`, `TODO`/`FIXME` e código comentado em ~74k LOC; `strict` com `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`; contra ESLint sem regras type-aware em código majoritariamente assíncrono, ~960 linhas de `try/catch` duplicando o `setErrorHandler` global, componente React de 2.235 linhas com 29 `useState`, `@tanstack/react-query` montado sem uso e `routes/*.ts` morto.                                           |
|   3 | Validação, auth e multi-tenancy   |     **85** | 537 parses zod; 44 de 45 rotas com guard; HMAC-SHA256 com `timingSafeEqual`, keyring rotativo e anti-replay; RLS via `set_config` com teste de 1.214 linhas; env e worker fail-closed com 16 bloqueios comprovados; SSRF, rate-limit e CSP/CORS. Contra `GET /health/metrics` sem autenticação e `apps/web` sem validação de nenhuma resposta.                                                                                                                               |
|   4 | Manutenibilidade e dívida técnica |     **55** | Razão teste:produto 1,51:1 e thresholds reais; contra **1 commit `refactor` em 110**, 18 arquivos de teste acima de 1.000 linhas (28.979 LOC), 7 cópias de `branches-b-20260925.test.ts` (6.705 LOC), 17.141 linhas de scripts `.mjs` fora do `typecheck`, 6+ símbolos duplicados (`TenantIdSchema` ×3, `ApprovalStatusSchema` ×2, effect-journal ×2), dois motores de política, 27,8% do código fora do denominador de coverage e `.gauntlet/state.json` de 6 MB rastreado. |

### B — Qualidade e verificação (média **68**)

|   # | Item analisado                                | Nota / 100 | Base da avaliação                                                                                                                                                                                                                                                                                                                                                                                                             |
| --: | --------------------------------------------- | ---------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   5 | Cobertura e volumes                           |     **74** | 325 arquivos e 111.184 LOC de teste, 10.131 asserções, coverage atual 93,02/90,20/91,36/93,51%. Contra piso contratual 90/85/90/90 vs gate aplicado 80/80/80/80 e 20.548 LOC (27,8%) excluídos, incluindo `apps/web` inteiro; `vitest.coverage-all.config.mts` nunca executado.                                                                                                                                               |
|   6 | Qualidade e organização dos testes            |     **77** | Zero asserções tautológicas, ~2,4% de matchers fracos, mocks em apenas 3 arquivos e meta-testes de governança (`architecture`, `docs-integrity`, `ci-workflow-contract`). Contra 6 arquivos acima de 1.500 LOC, 192 skips não auditados no CI e `tests/aud20-19-human-session-harness.test.mjs` (335 LOC, 14 testes) fora do `include` do Vitest, nunca executado.                                                            |
|   7 | E2E, segurança e arquitetura                  |     **66** | Playwright com servidor real, 3 browsers, 75 testes sem falha; 16 cenários de acessibilidade (axe, WCAG, zoom, forced-colors); o próprio workflow do CI é testado. Contra 25 cenários E2E para 73.858 LOC, `http-security.spec.ts` com 1 teste, ausência total de teste de contrato de API (sem OpenAPI) e ausência de golden do SQL de migração.                                                                             |
|   8 | Mutation, certificação e verificação contínua |     **58** | Certificação Phase 11 com 35/35 gates, log e SHA-256 por gate, critic independente e higiene de ambiente exemplar; manifesto de 26 mutantes com critério declarado. Contra: nenhum gate forte roda no CI, o gate de cobertura crítica **falha hoje** e lê um `coverage-summary.json` gitignored não reprodutível, o teste do gate é circular (fixtures) e o CI remoto está vermelho há 9 dias com 66 commits nunca validados. |

### C — Segurança, infraestrutura e operação (média **70**)

|   # | Item analisado                       | Nota / 100 | Base da avaliação                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --: | ------------------------------------ | ---------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   9 | CI/CD e automação de verificação     |     **74** | `verify.yml` com 15 passos (readiness, verify, postgres, e2e, evals, chaos, preflight negativo `--expect=REJECT`, SBOM) e `security.yml` com Gitleaks + CodeQL + supply-chain; 100% das actions pinadas por SHA, `permissions: contents: read`, `persist-credentials: false`, `npm ci --ignore-scripts`. Contra `certification:verify` e `promotion:check` fora do CI — o repositório fica verde com a certificação inválida —, barra de coverage aplicada de 80 ≠ 90 contratada, ausência de build de imagem e de Dependabot, e job serial no limite de 25 min. |
|  10 | Deploy e hardening de infraestrutura |     **66** | Dockerfile multi-stage de 5 estágios, non-root uid 10001, HEALTHCHECK/STOPSIGNAL em api e worker, `--omit=dev`, `.dockerignore` rigoroso, nginx `unprivileged` e bootstrap fail-closed. Contra orquestração inexistente, `deploy/nginx.web.conf` apontando para o host `secretary-api` ausente do repositório, nenhuma imagem construída em CI sem scan/assinatura/registry, base image por tag mutável e 33 `*.test.ts` fora de `__tests__` entrando na imagem.                                                                                                 |
|  11 | Dependências e segredos              |     **76** | Zero segredos reais, `.env` não versionado, Gitleaks ativo, `npm audit` limpo, SBOM CycloneDX com 374 componentes e hash SHA-512, licenças sem denied (AGPL/GPL bloqueados) e `env.ts` fail-closed. Contra 3 dependências mortas (`pino`, `drizzle-orm`, `dotenv`), ~8 workspaces com imports não declarados que nenhum gate detecta, `.env.example` sem as chaves mais sensíveis (`CVG_OPERATOR_IDENTITY_KEYRING`, `CVG_EXTERNAL_ATTESTATION_HMAC_KEY`, `CVG_IDENTITY_MODE`) e ausência de `SECURITY.md`/Dependabot.                                            |
|  12 | Observabilidade e operabilidade      |     **64** | Biblioteca de 3.073 LOC com redação de CPF/CNS, audit-ledger e alert-ledger hash-chained, adaptador OTel, correlationId em toda a cadeia, `/live` e `/ready` com 503, 8 runbooks e catálogo SLI/SLO aprovado; worker com 7 métricas reais. Contra API com `logger: false` e sem hook `onResponse` (sem access log), `runtimeCollector` injetado apenas em testes, OTel nunca instanciado em produção, **nenhuma regra de alerta avaliada em processo algum**, métricas de request voláteis e `/health/metrics` sem autenticação.                                 |

### D — Documentação e governança (média **52**)

|   # | Item analisado                           | Nota / 100 | Base da avaliação                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --: | ---------------------------------------- | ---------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  13 | Organização e volume da documentação     |     **52** | 3.117 arquivos e 50 MB em `docs/` (77,4% do repositório), convenção de numeração consistente e `docs/README.md` com catálogo de 39 comandos numericamente exato. Contra 22 backlogs, 12 roadmaps e 10 planos executivos, 64% dos docs sem link de entrada, duas constituições concorrentes (`07_agents/AGENTS.md` vs `CODEX_MASTER_INSTRUCTIONS.md`, este órfão) e ausência de README na raiz.                                                                                                     |
|  14 | Consistência de estado e rastreabilidade |     **45** | 225/225 links relativos de `99_runtime_state` existem e os recibos são hash-bound. Contra o "log invertido" quebrado — as entradas dos últimos 7 commits foram anexadas ao **fim** do arquivo e a mais recente está na linha 5103 de 5110 —, `AUD20-17` com status oposto em 8 documentos (incluindo dois blocos do mesmo commit no mesmo arquivo), três documentos de estado divergindo na ordem, `CURRENT.md` com 3 próximas ações diferentes e os masters `0300/0301/0302` congelados em 24/09. |
|  15 | Aderência ao pipeline e gates            |     **68** | 6/6 gates obrigatórios presentes com conteúdo real, `0190` com 14 aprovações hash-bound e zero rejeições, `NO_GO` de staging/produção em 100% das entradas e `docs:check` fail-closed. Contra gate mais recente de Discovery em `BLOCKED`, `01_prd/0090` sem nenhum link de entrada, estados não oficiais em uso (`DONE`, `PENDING`, `OPEN`) e constituição não atualizada há 21 dias.                                                                                                             |
|  16 | Utilidade prática vs burocracia          |     **42** | Sem a evidência a razão é saudável (0,85 bytes de doc por byte de código; 0,39 linhas de doc por LOC). Contra a evidência sozinha ser 5,72× todo o código-fonte, a tripla gravação obrigatória de cada evento (`99`+`20`+`30`, mais `CURRENT` e `0337`) que é a origem direta das contradições do item 14, 58 relatórios `05xx` em 21 dias e `99_runtime_state.md` com 414 KB nunca truncado.                                                                                                      |

### Consolidação

| Área                            |  Média |
| ------------------------------- | -----: |
| A — Engenharia de software      |     70 |
| B — Qualidade e verificação     |     68 |
| C — Segurança, infra e operação |     70 |
| D — Documentação e governança   |     52 |
| **Global (média dos 16 itens)** | **65** |

## Achados críticos

1. **`promotion:check` falha no `HEAD` corrente** com `reason=current_certification_invalid` (candidate tree stale, ponteiro divergente e scope drift), somado a 8 gates externos `NOT_VALIDATED`/`PENDING`. O CI **não executa** esse gate, então o repositório reporta verde com a certificação inválida.
2. **O gate de cobertura crítica falha hoje**: `critical_branch_coverage:kernel:89.37` e `critical_branch_coverage:approval:77.64` contra o piso 95, concentrados em `apps/worker/src/kernel-composition.ts` (66,14% de branches) e `packages/persistence/src/runtime-approval-store.ts` (33,80%). O gate lê um `coverage-summary.json` gitignored, não reprodutível, e seu teste unitário usa fixtures — é circular.
3. **CI remoto vermelho**: os 8 últimos runs de `Verify` e `Security` terminaram em `failure` desde 2026-09-17 (`Gitleaks` sem `.gitleaks.toml` gera 255 falsos positivos sobre hashes de evidência; o `Verify` falhava no passo de snapshot visual). **66 commits locais nunca foram validados por CI.**
4. **Divergência de barra de cobertura**: `aaa_quality_contract.md` §9.1 congela 90/90/90/85; `vitest.config.mts` aplica 80/80/80/80. O run atual já passaria na barra contratada — a dívida é de aplicação, não de resultado.
5. **Estado documental autocontraditório**: o "log invertido" de `99_runtime_state.md` está invertido na prática, e `AUD20-17` aparece simultaneamente como "aberta, sem aceite" e "aceite limitado, C06/C07 PASS".
6. **Observabilidade descolada do runtime**: biblioteca madura, mas a API roda sem logger, sem collector e sem avaliação de alertas.
7. **Sem caminho de deploy**: sem orquestração versionada, sem build de imagem em CI, sem registry, sem scan; `nginx.web.conf` aponta para um upstream inexistente no repositório.
8. **Teste órfão**: `tests/aud20-19-human-session-harness.test.mjs` (335 LOC, 14 testes de segurança) está fora do `include` do Vitest e nunca executou em CI nem na certificação.

## Prioridades

- **P0** — push dos 66 commits e criação de `.gitleaks.toml` com allowlist para hashes em `docs/**/evidence/**`, restaurando `Verify` e `Security`.
- **P0** — adicionar `certification:verify`, `promotion:check` e `scripts/aud19-critical-coverage.mjs` ao `verify.yml`, para que o CI passe a refletir os gates que a governança declara.
- **P1** — corrigir `kernel-composition.ts` e `runtime-approval-store.ts` (312 branches concentrados em 2 arquivos) e tornar o gate determinístico.
- **P1** — alinhar `vitest.config.mts` aos pisos 90/85/90/90 e remover `apps/web` da exclusão de coverage.
- **P1** — ligar a observabilidade da API (`logger`, `onResponse`, `runtimeCollector`) e colocar as regras de alerta em avaliação por processo.
- **P2** — quebrar `server.ts`, ativar ESLint type-aware, declarar as 12 dependências workspace ausentes, remover `pino`/`drizzle-orm`/`dotenv`, ativar o `.test.mjs` órfão e unificar o registro de estado.
- **P2** — fornecer orquestração versionada e pipeline de imagem (build, scan, assinatura, registry).

## Fronteiras desta rodada

- Somente leitura sobre o código de produto; nenhum arquivo de `apps/`, `packages/`, `scripts/`, `tests/` ou `certification/` foi alterado.
- Nenhum dado real, nenhuma integração externa, nenhuma sessão humana, nenhum commit, push ou deploy.
- As notas são julgamento técnico do escopo observado neste `HEAD` e não substituem nenhum gate obrigatório; staging e produção seguem `NO_GO`.

## Próximo passo

- Submeter os achados P0/P1 à decisão humana e registrar a admissão própria antes de qualquer BUILD; manter `AUD20-10` `READY_FOR_NEXT_STEP`, `AUD20-19` sem sessão autorizada e staging/produção `NO_GO`.
