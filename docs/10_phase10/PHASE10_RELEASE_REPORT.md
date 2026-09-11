# PHASE 10 — RELEASE REPORT

## Artefatos de release candidato

| Campo            | Valor                                                                       |
| ---------------- | --------------------------------------------------------------------------- |
| commit base      | `0d48cc80ca9b5f359255547c8482b3aae1f93ad7` (worktree com mudanças Phase 10) |
| SBOM             | `certification/sbom.cyclonedx.json` (CycloneDX 1.5, 369 componentes)        |
| Licenças         | `certification/license-report.json` (0 negadas, 18 sem metadado)            |
| Migration smoke  | `npm run test:postgres` (NOT_EXECUTED neste ambiente; CI cobre)             |
| Build            | `npm run build` PASS (typecheck + bundle web)                               |
| Política/versões | `policy-engine-v1`, prompts hash-verificados                                |
| Container        | `Dockerfile` multi-stage, non-root, healthcheck `/live`                     |

## Gates de release (`npm run certify`)

16 gates registrados em `certification/phase10-result.json`. Resultado:
15 PASS + 1 NOT_EXECUTED (PostgreSQL) → `CONDITIONAL_GO` / `AAA_CONTROLLED`.

## Supply chain

- `verify.yml`: checkout/setup-node pinados por commit SHA, evals, chaos,
  licenças e SBOM adicionados ao fluxo.
- `security.yml`: CodeQL, gitleaks e SBOM/licenças com ações pinadas por SHA.
- `npm audit --audit-level=high`: PASS.
- Dependências novas justificadas: OTel API/SDK (observabilidade),
  `pg` (já existente) para o chaos PostgreSQL.

## Compatibilidade

- Mudanças são aditivas; nenhuma API pública existente foi removida.
- `buildServer` agora também responde `/live` e `/ready`; `/health` permanece.
- Novos scripts npm são aditivos; `test:postgres` ganhou o teste de chaos PG.

## Limites

- Sem deploy, container digest ou assinatura de imagem neste ambiente.
- A versão final deve ser reconstruída e assinada em CI a partir do commit
  autorizado, com signoff humano e gates externos validados.
