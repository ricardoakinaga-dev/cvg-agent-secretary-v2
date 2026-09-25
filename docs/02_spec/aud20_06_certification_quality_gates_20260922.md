# SPEC AUD20-06 — integração fail-closed de critic e mutation

## Estado e gate

- task: `AUD20-06`
- fase: `AUDIT`
- status: `COMPLETED`
- dependência: `AUD20-05 COMPLETED_LOCAL`
- implementação: concluída em escopo local controlado
- staging/produção: `NO_GO`

## Desenho atual

- `scripts/phase11-certify.mjs` já executa `independent_critic`, mas não executa
  mutation sentinel como gate.
- `scripts/lib/phase11-rules.mjs` inclui `independent_critic` na lista requerida,
  mas não `mutation_sentinel`.
- `scripts/phase11-verify.mjs` valida topologia, artifacts e decisão agregada,
  mas não rederiva um report de mutation obrigatório.
- `scripts/mutation-sentinel.mjs` já oferece `--fail-on-gaps`; sua biblioteca
  usa sandbox descartável e reporta `not_detected/not_applicable` como gap.
- `scripts/lib/critic-evidence.mjs` já valida schema, independência, binding,
  fingerprint e digests do crítico.

## Mudança proposta

1. Adicionar `mutation_sentinel` a `PHASE11_2_REQUIRED_GATES`.
2. Executá-lo no runner com `--fail-on-gaps` e output canônico em
   `certification/phase11/mutation-report.json`.
3. Materializar também o resultado estruturado do crítico em
   `certification/phase11/critic-report.json`, separado do input independente,
   contendo candidate binding, status e checks rederivados.
4. Incluir ambos os reports em `requiredPackageFiles`, report targets,
   manifesto, evidence graph e requisitos aplicáveis.
5. No certifier e verifier, reabrir reports e exigir schema, candidate/commit/
   tree, status PASS, contagens fechadas, catálogo/digest esperado, ausência de
   gaps e coerência com exit code/log hash.
6. Preservar o report independente como input fora do output gerado; o runner
   apenas valida e copia um resumo verificável, sem fabricar autoria.

## Contratos

### Mutation report

- `schemaVersion`, `kind`, `generatedAt`, `candidate`, `manifest` e
  `manifestSha256`;
- `status=PASS` somente com `total>0`, `detected=total`, `notDetected=0`,
  `notApplicable=0`;
- cada resultado contém ID, target, focused tests e resultado observado;
- o report é inválido se o catálogo ou qualquer target mudou após a execução.

### Critic gate report

- referência e SHA-256 do input independente;
- candidate ID, commit, tree hash e fingerprint corrente;
- identidade/independência e checks rederivados;
- `status=PASS` somente se o input e seus artifacts permanecem íntegros.

## Failure-first e negativos

- input crítico ausente, malformed, stale, de outro candidato ou adulterado;
- fingerprint before/after diferente ou candidato alterado após review;
- mutation sem `--fail-on-gaps`, report ausente/malformed ou catálogo trocado;
- mutante `not_detected`, `not_applicable`, target stale ou total zero;
- subprocesso com exit code não zero, timeout ou signal mascarado;
- log/report/gate/manifest com hashes ou candidate binding divergentes;
- remoção de qualquer gate da lista requerida.

Todos resultam em `FAIL`, impedem `PHASE11_FORMAL_CLOSURE` e não são
convertidos em warning, skip ou condição permissiva.

## Superfície permitida

- `scripts/phase11-certify.mjs`
- `scripts/phase11-verify.mjs`
- `scripts/lib/phase11-rules.mjs`
- `scripts/lib/critic-evidence.mjs`
- `scripts/lib/mutation-sentinel.mjs`
- `scripts/mutation-sentinel.mjs`
- testes Phase 11, critic e mutation diretamente relacionados
- evidência própria de `AUD20-06` e controles operacionais

Não alterar produto clínico, API de negócio, migrations, dados ou integrações.

## Estratégia RED/GREEN

1. RED: provar que o gate requerido não contém mutation e que o verifier não
   rejeita pacote sem seu report.
2. GREEN: integrar o menor contrato estruturado e rederivação compartilhada.
3. Negativos unitários: outro candidato, stale/tampered, gap, not applicable,
   report ausente, total zero, exit code mascarado e alteração pós-review.
4. Integração controlada: executar catálogo sintético reduzido em sandbox e
   validar seal/verify sem reescrever relatórios históricos.
5. Regressão: focused, typecheck, lint, format, docs, full e coverage.

## Rollback e compatibilidade

Mudança aditiva no schema v2 de certificação. Rollback é revert do runner e da
lista requerida; reports históricos permanecem imutáveis. Enquanto versões
misturadas existirem, ausência do novo gate falha fechado — não há downgrade
silencioso nem aceitação do pacote antigo como corrente.

## Critérios técnicos

- C01: critic e mutation constam na lista canônica e na decisão agregada.
- C02: ambos são ligados ao candidato exato e freshness é rederivada.
- C03: mutation executa obrigatoriamente com fail-on-gaps e catálogo íntegro.
- C04: negatives de ausência, stale, tamper, survivor e exit masking falham.
- C05: artifacts entram no manifesto/evidence graph e o verifier os reabre.
- C06: rollback preserva fail-closed e histórico.
- C07: pacote final tem receipts, crítica fresca e `releaseEligible=false`.

## Gate de entrada no BUILD

`IMPLEMENTATION_READY`: o usuário confirmou em `2026-09-22` o avanço para o
próximo passo, interpretado estritamente como BUILD local controlado desta
SPEC. Não autoriza commit, push, deploy, staging, produção, dados reais ou
integrações.
