# 0568 — Auditoria profunda do repositório — 2026-09-21

## Registro, escopo e veredicto

- **Audit ID:** `AUD-20260921-REPO`.
- **Objetivo:** auditar documentação, implementação, testes, segurança, dados,
  operação e prontidão de release do repositório inteiro, com notas de `0–100`,
  ranking de impacto/prioridade e inventário enumerado de problemas.
- **Baseline observado:** branch `main`, `HEAD`
  `25434811334f5cec92ee0741079302271b82b7cb`, árvore deliberadamente dirty
  (`24` caminhos rastreados alterados e `20` entradas untracked antes deste
  relatório), task canônica `AUD20-04` em `IN_PROGRESS`.
- **Ambiente:** local controlado, Node `v22.23.2`, PostgreSQL descartável, dados
  exclusivamente sintéticos; nenhuma integração real, deploy, produção ou ação
  clínica, financeira, de prontuário ou agenda foi executada.
- **Método:** inspeção estática de documentação/código/configuração, comparação
  entre contratos e estado corrente, execução fresca de gates locais e testes
  negativos dos verificadores de release.
- **Veredicto:** **maturidade técnica local `72/100`**; **prontidão de produção
  `20/100`**; gate atual **`NO_GO`**. A funcionalidade local é forte, mas a
  cadeia de evidência/certificação não representa os bytes correntes, e faltam
  provas operacionais e externas obrigatórias.

Escala usada: `90–100` excelente/comprovado; `80–89` forte; `70–79` adequado
com gaps relevantes; `60–69` frágil; `40–59` incompleto; `<40` não qualificado.
Uma média não compensa um required gate falho.

## Notas por área

|   # | Área analisada                           |   Nota | Avaliação resumida                                                                                                |
| --: | ---------------------------------------- | -----: | ----------------------------------------------------------------------------------------------------------------- |
|   1 | Governança e gates                       | **70** | Pipeline e bloqueios estão explícitos, mas o controle corrente diverge entre fontes e o selo não fecha.           |
|   2 | Documentação e rastreabilidade           | **64** | Volume e detalhamento fortes; há drift semântico, duplicação histórica e checker superficial.                     |
|   3 | Arquitetura e boundaries                 | **76** | Teste arquitetural `5/5` e boundaries razoáveis; hotspots muito grandes reduzem evolutividade.                    |
|   4 | Backend/API                              | **86** | Tipagem, contratos, fail-closed e testes amplos; faltam provas de ambiente representativo.                        |
|   5 | Orquestração/agentes                     | **84** | Lineage, fencing, replay e recovery estão bem exercitados; holdout integrado e selo final seguem abertos.         |
|   6 | Persistência, retenção e migrações       | **70** | PostgreSQL e rollback passam, mas o sweep novo não é realmente batelado e a migration tem risco de lock.          |
|   7 | Segurança e privacidade                  | **78** | Defaults seguros, isolamento e `npm audit` limpo; attestation/grants reais e scans candidate-bound faltam.        |
|   8 | Safety, approval e handoff               | **92** | Ações sensíveis são bloqueadas/encaminhadas e negativos passam; ambiente real não foi autorizado.                 |
|   9 | Testes e QA                              | **89** | Suites extensas, E2E multi-browser e PostgreSQL sem skip no recorte fresco; há branch chasing e prova stale.      |
|  10 | Confiabilidade e recovery                | **79** | Replay, lease, rollback e chaos são fortes localmente; restore físico e RPO/RTO não foram medidos.                |
|  11 | Observabilidade                          | **58** | Instrumentação existe, porém collector, sink, SLO, owner e alert delivery não formam uma operação fechada.        |
|  12 | UX e acessibilidade                      | **90** | `75/75` E2E em Chromium/Firefox/WebKit, axe, teclado, zoom e forced colors; falta validação humana/screen reader. |
|  13 | RAG e integrações externas               | **40** | Bloqueadas corretamente, mas provider, canal, IdP e corpus institucional continuam não qualificados.              |
|  14 | Supply chain                             | **61** | Lockfile, licença/SBOM e workflow existem; imagens/tags e evidência não estão vinculadas ao candidato corrente.   |
|  15 | Operação e release                       | **45** | Preflight falha fechado, porém staging-like, promoção e certificação corrente falham.                             |
|  16 | Manutenibilidade                         | **66** | Organização modular existe, mas arquivos de 2–5 mil linhas e testes gigantes concentram risco.                    |
|  17 | Developer experience e reprodutibilidade | **72** | Scripts são numerosos e úteis; runtime local, receipts e pinning exato de Node divergem.                          |
|  18 | Prontidão de produção                    | **20** | Nenhum gate externo/humano ou restore físico está comprovado; decisão obrigatória é `NO_GO`.                      |

**Média simples das 17 áreas técnicas:** `71,8`, arredondada para **`72/100`**.
A prontidão de produção é apresentada separadamente porque funciona como gate
binário e não como média compensatória.

## Evidência fresca executada

### Passou

- `typecheck`, `lint`, `format:check`, `build`, `docs:check`, `git diff --check`.
- Arquitetura: `5/5`; readiness: `4/4`; evals: `24/24`; worker startup smoke:
  `PASS`; chaos: `18` passes e `2` casos PostgreSQL condicionais não executados.
- Unitária local: `282` arquivos, `2.178` testes passados e `183` skips
  condicionais por ausência de `TEST_DATABASE_URL` nesse comando.
- Matriz PostgreSQL separada: `30` arquivos, `332` testes, `0` skips.
- Retenção/replay/rollback PostgreSQL: `2` arquivos, `31` testes, `0` falhas.
- E2E: `75/75` em Chromium, Firefox e WebKit.
- `npm audit --audit-level high`: `0` vulnerabilidades nas `395` dependências
  observadas; varredura estática por nomes/padrões não encontrou segredo ou
  chave privada versionada.

### Falhou ou rejeitou corretamente

- `AUD20-04-binding-verifier.mjs`: **FAIL**, com `8` artefatos brutos diferentes
  do receipt declarado.
- `certification:verify:phase11`: **FAIL** por commit/tree/candidate/file hashes
  stale em relação ao worktree corrente.
- `evidence:verify:phase11` e crítico `phase11-2-evidence-check --critic`:
  **FAIL** por binding/fingerprint/digests divergentes.
- `promotion:check`: `eligible=false`; os `8` gates externos/humanos continuam
  não satisfeitos.
- `production:preflight --expect=REJECT`: o comando passou porque a configuração
  insegura foi rejeitada; o status interno foi `FAIL` com `32` blockers e zero
  side effect.

## Ranking de problemas por impacto e prioridade

Prioridades: `P0` corrigir antes de fechar a task/gate indicado; `P1` antes de
staging candidate; `P2` antes de escala/produção; `P3` melhoria programável.

### Impacto alto

1. **F01 — P0 — receipt/binding de AUD20-04 inválido.** O receipt foi emitido
   antes de oito logs terminarem de ser escritos. O verificador ao vivo rejeita
   `retention-replay`, matriz/full PostgreSQL, coverage, kernel hardening,
   architecture, build e docs-check. O JSON armazenado que diz `match=true` é
   stale. **Correção:** congelar os outputs, gerar receipt por último, executar o
   verificador em processo separado e anexar revisão fresca.
2. **F02 — P0 — certificação oficial aponta outro candidato.**
   `certification/current.json` aponta commit `fa78f92...`, enquanto o HEAD é
   `2543481...` e a árvore possui mudanças AUD20-03/04. Todos os verificadores
   correntes falham. **Correção:** só reseal após freeze e árvore/candidato
   definidos; nunca promover o pacote histórico.
3. **F03 — P0 — imagens, SBOM e attestations não pertencem ao mesmo run dos
   bytes correntes.** Não há rebuild/inspeção candidate-bound de API/worker/web
   após as mudanças atuais. **Correção:** executar AUD20-07 e AUD20-12 no mesmo
   candidato congelado, incluindo image digest, SBOM, migration/policy digest e
   inspeção non-root.
4. **F04 — P0 da task AUD20-04 — critério “batch” não foi atendido.** O sweep
   faz `SELECT ... FOR UPDATE` sem `LIMIT` e depois um `UPDATE` por linha dentro
   da transação. Em volume, isso cria consumo e locks não limitados; o teste usa
   uma única linha elegível e `batchHash` não prova batelamento. **Correção:**
   especificar tamanho/ordem/checkpoint, usar lotes limitados e testar múltiplos
   lotes, concorrência, restart e backpressure.
5. **F05 — P0 de release — provider, canal, identidade externa e RAG
   institucional não validados.** Os bloqueios estão corretos, mas nenhuma prova
   local substitui qualificação autorizada. **Correção:** completar AUD20-13 com
   owners, ambiente, allowlists, credential refs e corpus institucional.
6. **F06 — P0 de release — RPO/RTO físico, rollback, piloto e sign-off humano
   ausentes.** Restore atual é sintético/in-memory e o load test não representa
   infraestrutura de produção. **Correção:** AUD20-14/15 com metas aprovadas,
   ensaio isolado, tempos medidos e decisão humana hash-bound.
7. **F07 — P1 — attestation e readiness de replay não observam integralmente
   recursos reais.** Valores declarados de ambiente e existência do store não
   provam bytes de secret/keyring/config nem grants CRUD efetivos.
   **Correção:** AUD20-05, derivando digests dos recursos lidos e probes de
   privilégio fail-closed.
8. **F08 — P1 — crítico independente e mutation sentinel não são gates
   obrigatórios do certificador geral.** Evidência stale ou mutante sobrevivente
   pode existir fora da decisão agregada. **Correção:** AUD20-06, subgates
   candidate-bound e `--fail-on-gaps` obrigatório.
9. **F09 — P1 — não existe composição staging-like reproduzível do mesmo
   build.** API, worker e PostgreSQL são testados em recortes, mas não há harness
   conjunto com readiness/drain/restart/replay. **Correção:** AUD20-11.
10. **F10 — P1 — observabilidade não fecha o ciclo operacional.** Collector e
    sinais existem, mas não há prova de wiring completo, `approval_latency_ms`,
    sink, dashboard, alert delivery, owner e SLO aprovados. **Correção:**
    AUD20-10 e exercício sintético com timestamps.

### Impacto médio

11. **F11 — P1 — migration `0027` tem risco de lock operacional.** `ALTER TABLE
... ADD CONSTRAINT` valida imediatamente e `CREATE INDEX` não é concorrente;
    não há `lock_timeout`, `statement_timeout`, sizing ou rehearsal sobre tabela
    grande. **Correção:** plano de rollout compatível com a versão de PostgreSQL,
    constraint `NOT VALID` + validação posterior quando aplicável, índice
    online e ensaio de lock.
12. **F12 — P1 — lifecycle dos tombstones é indefinido.** A solução preserva
    dedupe, mas cresce indefinidamente e não define particionamento, arquivamento,
    capacidade ou política de compactação. **Correção:** PRD/SPEC explícita para
    retenção mínima durável versus custo/capacidade.
13. **F13 — P2 — minimização do tombstone é parcial.** A PK original e
    `resource_id` permanecem; o digest adicional não substitui o identificador
    retido. **Correção:** classificar sensibilidade, justificar permanência ou
    migrar para identidade realmente opaca sem quebrar dedupe.
14. **F14 — P2 — semântica de auditoria de retenção é enganosa.** A ação segue
    `delete` e a quantidade tombstonada é publicada como `deletedCount`, embora
    nenhuma linha seja apagada. **Correção:** introduzir ação/contador de
    tombstone ou tornar a semântica inequívoca e versionada.
15. **F15 — P1 — matriz AUD20 está semanticamente stale.** Ela declara
    `nextTask=AUD20-03` e `AUD20-03=IN_PROGRESS`, enquanto CURRENT/backlog marcam
    AUD20-03 concluída e AUD20-04 corrente. **Correção:** atualizar a matriz e
    validar transições cruzadas.
16. **F16 — P1 — `docs:check` não detecta drift estruturado.** O checker passou
    mesmo com F15, porque não reconcilia JSON/tabelas/next action/candidate entre
    fontes. **Correção:** AUD20-08 com invariantes semânticos e testes negativos.
17. **F17 — P2 — masters contêm snapshots duplicados e ações históricas sem
    separação forte.** Estado/log/backlog acumulam blocos correntes e cópias
    antigas, elevando o risco de parser ou operador usar a seção errada.
    **Correção:** índice canônico machine-readable e arquivos históricos
    imutáveis separados.
18. **F18 — P1 — runtime Node não é reprodutível ponta a ponta.** O shell padrão
    é Node `v24.20.0`, o target é `>=22 <23`, o receipt AUD20-04 registra Node 24
    e o log bruto registra `v22.23.2`; CI/Docker usam tags móveis de major.
    **Correção:** pin exato (`.nvmrc`/`.node-version`, CI e imagem digest) e
    receipt derivado do processo que executou cada gate.
19. **F19 — P1 — holdout integrado por categoria ainda não existe.** Os evals
    `56/56` e o contrato de piso são bons, mas dependem do agente determinístico
    e não provam o boundary integrado. **Correção:** AUD20-09 com dataset holdout,
    resultados por categoria e safety zero.
20. **F20 — P2 — hotspots excessivos.** Há módulos de `4.958`, `3.452`, `3.438`
    e `2.912` linhas, além de componentes de plataforma acima de `2.000` linhas.
    Caps evitam crescimento, mas não reduzem acoplamento/custo de revisão.
    **Correção:** decomposição incremental por responsabilidades e ownership.
21. **F21 — P2 — branch chasing e suites gigantes.** Arquivos de teste chegam a
    aproximadamente `2.800` linhas, com muitos doubles/casts e hardening focado
    em cobertura. **Correção:** mutation testing dirigido e testes por contrato,
    removendo redundância sem reduzir a barra.
22. **F22 — P2 — `33` testes colocados fora de `__tests__` entram no build
    context/imagem.** `.dockerignore` exclui `**/__tests__`, mas não
    `*.test.ts(x)` recursivo. **Correção:** excluir globs recursivos e inspecionar
    o conteúdo final das imagens.
23. **F23 — P2 — imagens base usam tags mutáveis, não digests.**
    `node:22-bookworm-slim` e `nginxinc/nginx-unprivileged:1.27-alpine` podem
    mudar entre builds. **Correção:** pin por digest com processo de atualização.
24. **F24 — P2 — healthcheck do worker ignora a configuração.** A imagem define
    `CVG_WORKER_READINESS_FILE`, mas o `HEALTHCHECK` lê sempre
    `/tmp/cvg-worker-ready`. **Correção:** healthcheck usar a variável de modo
    seguro e ter regressão com path alternativo.
25. **F25 — P1 — scans e inventário não estão ligados ao candidato corrente.**
    O workflow possui gitleaks/CodeQL/license/SBOM, mas não há execução hospedada
    ou pacote local candidate-bound para esta árvore dirty. **Correção:** rodar
    no candidato congelado e incorporar resultados/digests ao certifier.
26. **F26 — P2 — `certification/findings.json` é metadado Phase 10 stale.** O
    arquivo registra riscos aceitos e notas altas (observabilidade `90`, produção
    `55`) que não representam o estado canônico `NO_GO`. **Correção:** mover para
    histórico ou adicionar schema/ponteiro que impeça consumo como corrente.
27. **F27 — P2 — relatórios de chaos/load podem induzir leitura excessiva.** O
    chaos agregado aparece `PASS` com dois casos PostgreSQL skipped, e o load
    test de `10k` eventos é in-memory. **Correção:** tornar perfil/skip visíveis
    no verdict e adicionar teste representativo sem alegar benchmark produtivo.
28. **F28 — P2 — validação manual de acessibilidade não foi feita.** A cobertura
    automatizada é excelente, mas não inclui leitor de tela real, navegação por
    usuário e matriz de SO/dispositivo. **Correção:** sessão humana documentada
    antes de release externo.

### Impacto baixo

29. **F29 — P3 — runtime de produção executa TypeScript via `tsx`.** É uma
    escolha documentada e testada, mas aumenta dependências e superfície em
    relação a artefato JS compilado/minimalista. **Correção:** avaliar build
    compilado quando houver benefício operacional mensurável.
30. **F30 — P3 — comentários/metadados de schema estão desatualizados ou
    redundantes.** A descrição histórica de idempotency ainda sugere identidade
    externa raw, embora o código derive chave hash, e há checks de coluna legado
    duplicados. **Correção:** limpeza documental/mecânica sem mudar contrato.

## Ordem recomendada de resolução

1. **Fechar corretamente AUD20-04:** corrigir F04, F11–F14; rerodar PostgreSQL
   e gates; somente depois gerar logs, receipts e binding (F01); obter crítica
   fresca. Não marcar a task concluída com o receipt atual.
2. **Reconciliar o control plane:** F15–F18 e F26; fazer o checker rejeitar o
   drift antes de avançar o DAG.
3. **Fechar confiança/security/QA:** F07, F08, F19 e F25.
4. **Produzir candidato staging-like único:** F03, F09, F22–F24; mesmo build,
   imagens, SBOM, migrations, restart/replay e teardown.
5. **Completar operação:** F10, F12, F20, F21, F27–F30.
6. **Somente com autorização e ambiente:** F05 e F06. Depois, auditoria final
   independente de F02 e decisão humana separada de deploy.

## Pontos fortes confirmados

- Defaults e preflight falham fechado; produção não é liberada por média.
- Approval/handoff e proibições de ações sensíveis estão bem codificados.
- A suíte local é incomumente abrangente: unit, PostgreSQL, E2E multi-browser,
  chaos, evals, arquitetura, acessibilidade, replay e rollback.
- A correção funcional de tombstone bloqueia replay tardio nos testes frescos e
  o rollback transacional funciona; o problema é escala/semântica/evidência,
  não a ausência do comportamento básico.
- O verificador rejeitar o pacote stale é um controle positivo: o problema está
  no processo que produz/ordena a evidência, não em aceitar silenciosamente a
  divergência.

## Limitações e risco residual

- Auditoria executada sobre worktree dirty e em evolução; resultados funcionais
  são válidos para os bytes observados, mas não constituem selo reproduzível.
- Não houve scan hospedado de CodeQL/gitleaks, build Docker fresco, teste de
  performance/soak representativo, restore físico, integração real ou revisão
  humana de acessibilidade.
- A varredura não afirma ausência absoluta de defeitos; registra todos os
  problemas encontrados no escopo e nos métodos acima.

## Decisão e próxima ação única

- **Gate:** `AUDIT_FAILED_FOR_RELEASE`; execução local pode continuar apenas no
  perfil controlado; staging real e produção permanecem `NO_GO`.
- **Próxima ação:** retornar AUD20-04 para BUILD controlado, implementar e testar
  batelamento limitado/concorrente e o rollout seguro da migration; então gerar
  toda a evidência após o último write e repetir o binding verifier em processo
  separado.
