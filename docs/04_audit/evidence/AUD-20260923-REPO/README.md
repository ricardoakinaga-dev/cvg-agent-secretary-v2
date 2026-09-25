# Evidência local — AUD-20260923-REPO

Os logs em `raw/` preservam stdout/stderr da rodada com fixtures sintéticas. `HEAD` inicial: `25434811334f5cec92ee0741079302271b82b7cb`. Os comandos de produto usaram Node `22.23.2`, exceto o primeiro `docs:check`, que mediu a falha do shell padrão em Node `24.20.0`. O banco de teste foi um contêiner `postgres:16-alpine` descartável, sem volume e com porta local aleatória; `TEST_DATABASE_URL` apontou apenas para esse contêiner. Ele foi removido após `test:postgres`.

| Log | Comando / observação | Exit |
| --- | --- | -: |
| `raw/cvg-audit-docs.log` | `npm run docs:check` no Node 24: `node_runtime_mismatch` | 1 |
| `raw/cvg-audit-docs22.log` | `npm run docs:check` no Node 22: 810 links, 609 JSONs | 0 |
| `raw/cvg-audit-docs-after.log` | `npm run docs:check` após a auditoria: 817 links, 609 JSONs | 0 |
| `raw/cvg-audit-typecheck.log` | `npm run typecheck` | 0 |
| `raw/cvg-audit-lint.log` | `npm run lint` | 0 |
| `raw/cvg-audit-focused.log` | Vitest focado: 3 arquivos, 16 testes | 0 |
| `raw/cvg-audit-format22.log` | `npm run format:check` | 0 |
| `raw/cvg-audit-format-after.log` | `npm run format:check` após a auditoria | 0 |
| `raw/cvg-audit-unit22.log` | `npm test`: 287 arquivos/2.235 testes PASS; 12 arquivos/192 testes SKIP | 0 |
| `raw/cvg-audit-postgres22.log` | `npm run test:postgres`: 30 arquivos/354 testes PASS | 0 |
| `raw/cvg-audit-audit22.log` | `npm audit --audit-level=high`: 0 vulnerabilidades reportadas | 0 |
| `raw/cvg-audit-build22.log` | `npm run build` | 0 |
| `raw/cvg-audit-licenses22.log` | `npm run licenses:check`: 374 pacotes, 0 negados | 0 |
| `raw/cvg-audit-startup22.log` | `npm run test:worker:startup` | 0 |
| `raw/cvg-audit-cert22.log` | `npm run certification:verify:phase11`: candidato e pacote stale | 1 |
| `raw/cvg-audit-promotion22.log` | `npm run promotion:check`: `eligible=false`, oito gates pendentes | 1 |
| `raw/cvg-audit-preflight22.log` | `npm run production:preflight -- --expect=REJECT`: rejeição insegura esperada | 0 |

Exit `1` nos verificadores de certificação e promoção é a rejeição correta; não foi tratado como PASS de release. O teste negativo de preflight retorna exit `0` somente porque a configuração foi rejeitada.
