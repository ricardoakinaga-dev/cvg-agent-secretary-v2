# AUD19-15 — Dossiê de auditoria final e decisão de release

- Programa: `AUD19-REM`; task: `AUD19-15`; status: `BLOCKED`.
- Estado permitido quando apto: `WAITING_HUMAN_APPROVAL` (somente após AUD19-12..14 completos e dossiê apto).
- Autoridade requerida: autoridade humana de release com registro hash-bound.
- Este dossiê não concede `RELEASE_READY`, deploy ou produção.

## 1. Critérios de elegibilidade (todos obrigatórios)

1. `AUD19-12` concluída com pacote candidate-bound verificado (current/evidence) e zero P0/P1 local.
2. Oito gates externos/humanos com evidência assinada, válida e vinculada ao candidato/config: provider, canal, identidade externa, RAG institucional, RPO/RTO, piloto, rollback e sign-off humano.
3. Evals `>=97%`, required skips = 0, mutantes críticos 100% detectados e pisos de cobertura do contrato vigentes no denominador acordado.
4. Promotion check de produção elegível apenas com todos os gates; caso contrário `NO_GO` explícito.
5. Revisão independente fresca contra os critérios, sem score compensatório.

## 2. Pacote de decisão

- Contrato/barra congelados e hashes; `certification/current.json` e pacote `certification/phase11/`.
- Matriz de findings (P0/P1/P2), risco residual, exceções pendentes e limitações.
- Matriz requisito→evidência (`docs/04_audit/evidence/AUD19/AUD19-requirements-matrix.json`).
- Dossiês externos AUD19-13/14 assinados e dentro da validade.
- Runbooks de incidente/rollback/restore exercitados.

## 3. Schema de registro da decisão

`AUD19-13-15-external-evidence.schema.json` + registro humano contendo:
`candidateDigest`, `configDigest`, `decision` (`RELEASE_READY`/`NO_GO`),
`authority`, `decidedAt`, `validity`, `scope`, `conditions`, `signature`.
Deploy permanece ação separada e não coberta por este registro.

## 4. Comandos de verificação (dry-run)

```bash
npm run certification:verify
npm run evidence:verify:phase11
npm run promotion:check
node scripts/aud19-external-evidence-check.mjs --gate=human_signoff --attestation=<path> --expect=REJECT
```

## 5. Registro de bloqueio atual

- Causa: AUD19-12 não concluída (P1 local aberto em branches de módulos críticos; crítico independente em `FAIL`) e oito gates externos/humanos sem validação.
- Impacto: `AUD19-15` permanece `BLOCKED`; não pode ir para `WAITING_HUMAN_APPROVAL`; produção `NO_GO`.
- Autoridade necessária: owner técnico para fechar o P1 local + proprietários externos; depois autoridade humana de release.
- Próxima ação única: fechar o P1 de cobertura de branches dos módulos críticos no kernel (ou registrar decisão técnica com autoridade, sem baixar o piso), reexecutar AUD19-12 com crítico fresco e então retomar este dossiê.
