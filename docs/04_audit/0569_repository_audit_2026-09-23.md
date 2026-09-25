# 0569 — Auditoria do repositório — 2026-09-23

## Escopo e critério

- **ID:** `AUD-20260923-REPO`.
- **Objeto:** documentação canônica, aplicação, persistência, segurança, testes, operação e cadeia de release na árvore local de `main`, `HEAD` `25434811334f5cec92ee0741079302271b82b7cb`.
- **Baseline:** antes desta documentação de auditoria, 64 arquivos rastreados modificados e 131 entradas não rastreadas; o pacote de certificação apontava para `fa78f92e8dd0dd3ec77a754f7eab2dfae89e15a6`.
- **Método:** leitura das instruções CVG, índice corrente, gates Discovery/PRD/SPEC, PRD/SPEC mestres, backlog, relatório 0568 e evidências recentes; inspeção de código, migrações e CI; execução de checks locais em Node `22.23.2` e PostgreSQL descartável com fixtures sintéticas.
- **Escala:** 90–100 forte e comprovado localmente; 75–89 bom com lacunas; 60–74 parcial; 40–59 frágil; 0–39 sem qualificação suficiente. As notas são julgamento técnico do escopo observado. Nenhuma média substitui um gate obrigatório.

O inventário inicial continha 2.803 arquivos em `docs/`; a leitura foi orientada pelas fontes canônicas e pelos artefatos das tasks atuais. Não houve leitura linha a linha de cada evidência histórica, operação em staging, dado real, integração externa, sessão humana ou deploy.

## Notas

|   # | Item analisado                              | Nota / 100 | Base da avaliação                                                                                                                                |
| --: | ------------------------------------------- | ---------: | ------------------------------------------------------------------------------------------------------------------------------------------------ |
|   1 | Governança e gates                          |     **76** | Pipeline e bloqueios explícitos; release rejeita corretamente o candidato atual.                                                                 |
|   2 | Documentação e rastreabilidade              |     **69** | `docs:check` final passou em 817 links e 609 JSONs, mas masters e status individuais do backlog ainda divergem do índice corrente.               |
|   3 | Arquitetura e limites de módulo             |     **77** | Pacotes e fronteiras definidos; arquivos centrais grandes concentram responsabilidades.                                                          |
|   4 | Backend e API                               |     **85** | Tipagem, lint, build e testes de boundary passaram; falta composição de staging representativa.                                                  |
|   5 | Orquestração e agentes                      |     **86** | Suite PostgreSQL e testes de lineage/recovery passaram; qualificação externa e selo corrente seguem abertos.                                     |
|   6 | Persistência, retenção e migrações          |     **82** | 30 arquivos/354 testes PostgreSQL passaram em banco descartável, incluindo migrações e retenção; rollout e restore físico não foram exercitados. |
|   7 | Segurança e privacidade                     |     **81** | Políticas fail-closed, CI com Gitleaks/CodeQL e `npm audit` sem vulnerabilidades observadas; identidade real e atestação externa faltam.         |
|   8 | Safety, approval e handoff                  |     **91** | Policy e approval têm contratos, negativos e trilha; ações sensíveis permanecem bloqueadas no escopo controlado.                                 |
|   9 | Testes e QA                                 |     **88** | Testes focados e PostgreSQL passaram; a suíte unitária completa desta rodada está registrada na seção de verificações.                           |
|  10 | Confiabilidade e recuperação                |     **82** | Leases, replay, worker e ensaios locais cobertos; RPO/RTO e restore físico seguem sem evidência.                                                 |
|  11 | Observabilidade operacional                 |     **58** | Instrumentação e logs existem, mas collector, entrega de alertas, SLO e owner operacional não estão fechados.                                    |
|  12 | UX e acessibilidade                         |     **80** | Evidência histórica de E2E multibrowser; a sessão humana de acessibilidade está `PENDING`.                                                       |
|  13 | RAG e integrações externas                  |     **38** | Ausência de fonte institucional e integrações reais qualificadas; o produto mantém handoff/bloqueio.                                             |
|  14 | Supply chain                                |     **67** | Licenças de 374 pacotes checadas, 0 negadas; imagens, SBOM e atestações não estão vinculadas ao candidato corrente.                              |
|  15 | Operação e release                          |     **47** | Preflight rejeita configuração insegura, mas a certificação e a promoção do candidato falham.                                                    |
|  16 | Manutenibilidade                            |     **65** | Organização modular com hotspots de 4.958, 3.452 e 3.438 linhas em arquivos críticos.                                                            |
|  17 | Experiência de desenvolvimento e reprodução |     **78** | Scripts e pin exato de Node 22.23.2; o shell padrão usa Node 24 e faz `docs:check` falhar.                                                       |
|  18 | Prontidão para produção                     |     **20** | Oito gates externos/humanos pendentes, certificação stale, nenhuma prova de staging real ou restore físico.                                      |

**Maturidade técnica local:** `74/100`, média arredondada dos itens 1–17. **Prontidão de produção:** `20/100`, apresentada à parte por ser gate; **veredito: `NO_GO` para staging real e produção**.

## Verificações desta rodada

| Verificação                                           | Resultado                                                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `docs:check` com Node 22.23.2                         | PASS final; 817 links, 609 JSONs e estado semântico válidos.                                                  |
| `docs:check` no Node 24 do shell padrão               | FAIL esperado: `node_runtime_mismatch`.                                                                       |
| Typecheck, lint, Prettier, build e worker startup     | PASS.                                                                                                         |
| Testes focados de arquitetura, qualificação e holdout | 3 arquivos, 16 testes PASS.                                                                                   |
| `test:postgres` em contêiner descartável próprio      | 30 arquivos, 354 testes PASS; contêiner removido.                                                             |
| `npm audit --audit-level=high`                        | PASS; 0 vulnerabilidades reportadas pelo npm no momento da consulta.                                          |
| `licenses:check`                                      | PASS; 374 pacotes, 0 negados, 0 não classificados.                                                            |
| `certification:verify:phase11`                        | FAIL: commit, candidato, árvore, arquivos e artefatos de critic/mutation não correspondem ao pacote corrente. |
| `promotion:check`                                     | FAIL/`eligible=false`; oito gates externos/humanos pendentes.                                                 |
| `production:preflight -- --expect=REJECT`             | PASS como teste negativo: configuração insuficiente rejeitada.                                                |
| `npm test` com Node 22.23.2                           | 287 arquivos e 2.235 testes PASS; 12 arquivos e 192 testes em skip condicional.                               |

As falhas de certificação e promoção são comportamento seguro do gate, não aprovação de release. Os comandos foram executados sem credenciais ou dados reais; o PostgreSQL foi isolado dos outros contêineres presentes na máquina.

Os resultados e stdout/stderr estão preservados no [pacote de evidência desta auditoria](evidence/AUD-20260923-REPO/README.md).

## Achados prioritários

1. **A23-01 — P0 release — certificação fora do candidato.** `certification/current.json` aponta `fa78f92e…`, enquanto o `HEAD` é `2543481…` e a árvore contém alterações. O verifier rejeitou o pacote por fingerprint, critic, mutation e hashes. **Rota:** `AUD20-07/12`; reconstruir e revalidar somente após congelar o candidato.
2. **A23-02 — P0 release — qualificação externa/humana ausente.** `promotion:check` listou provider, canal, identidade, RAG institucional, RPO/RTO, piloto, rollback e sign-off pendentes. **Rota:** `AUD20-13..15`; manter `NO_GO`.
3. **A23-03 — P1 operação — observabilidade sem ciclo operacional fechado.** A SPEC de `AUD20-10` está preparada, mas a task foi adiada. Logs locais não provam collector, alerta entregue, SLO ou owner. **Rota:** `AUD20-10/11` antes de staging representativo.
4. **A23-04 — P1 governança — drift em documentos executivos.** `docs/CURRENT.md` coloca `AUD20-19` em `WAITING_HUMAN_APPROVAL`, enquanto `docs/03_build/0300_build_engineer_master.md` ainda aponta `AUD20-08` como próxima task; o resumo de `0337` declara `AUD20-05/16` concluídas, mas suas seções de task dizem `IN_PROGRESS` e `WAITING_HUMAN_APPROVAL`. O checker valida o estado canônico, porém não estes trechos históricos sem rótulo. **Rota:** reconciliar ponteiros e rotular checkpoints antigos em `AUD20-08`/governança documental.
5. **A23-05 — P1 release — supply chain do candidato incompleta.** O workflow de segurança e o inventário de licenças existem, mas as imagens, o SBOM e as atestações vigentes não correspondem ao candidato atual. **Rota:** `AUD20-18/07/12`.
6. **A23-06 — P2 experiência humana — acessibilidade pendente.** `AUD20-19` registrou `PASS_LOCAL` para o tooling, mas o relatório `human_a11y` permanece `PENDING`; evidência automatizada não substitui sessão humana. **Rota:** decisão/execução humana específica, com consentimento e revisão.
7. **A23-07 — P2 sustentabilidade — hotspots.** `apps/api/src/server.ts` tem 4.958 linhas, `packages/agent-runtime/src/orchestration.ts` 3.452 e `packages/persistence/src/postgres.ts` 3.438. **Rota:** `AUD20-17` quando retomada, preservando contratos e regressão.

## Decisão e limite

O sistema demonstra boa capacidade **local e sintética**, com PostgreSQL, build e controles de segurança exercitados. A evidência não autoriza afirmar operação hospitalar real, disponibilidade, capacidade de produção ou aprovação clínica/financeira. A task de produto permanece `AUD20-19` em `WAITING_HUMAN_APPROVAL`; `AUD20-10/17/20` foram adiadas conforme o estado corrente. A próxima ação operacional registrada é obter autorização específica para a sessão humana de acessibilidade de `AUD20-19`, mantendo staging real e produção bloqueados.

Nesta rodada não foram reexecutados E2E multibrowser, coverage, build de imagens nem restore físico; as referências a essas áreas usam código inspecionado ou evidência histórica identificada acima. Não houve revisão independente nova deste relatório.
