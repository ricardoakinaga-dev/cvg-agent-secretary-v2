# AUD19-13 — Dossiê de qualificação externa: provider, canal, IdP e RAG institucional

- Programa: `AUD19-REM`; task: `AUD19-13`; status: `BLOCKED`.
- Fonte: [auditoria 0566](../../0566_full_repository_gauntlet_audit_2026-09-19.md), [backlog 0332](../../../03_build/0332_aud20260919_backlog.md).
- Autoridade requerida: owner de integrações + responsável de segurança/dados + autorização explícita de ambiente e egress.
- Nenhum sistema real foi contatado; nenhuma fixture promove gate externo.

## 1. Escopo e gates

| Gate externo          | O que precisa ser provado                                                                 | Evidência esperada                                        |
| --------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `modelProvider`       | Provider autorizado responde com identidade/contrato, timeout, retry, rate limit e custo  | dossiê do owner + trace redigido + contrato versionado    |
| `channel`             | Canal autorizado entrega e recebe com webhook assinado, replay negado e handoff           | dossiê do owner + teste de assinatura/replay + logs        |
| `externalIdentity`    | IdP real emite tokens; issuer/audience/chave rotacionável; revogação e replay cross-host  | dossiê do IdP + prova de revogação + key ring versionado   |
| `institutionalRag`    | Fonte institucional aprovada, versionada, citável; ausência/revogação → handoff           | dossiê do curador + versão/hash do corpus + política       |

## 2. Pré-condições de entrada

1. Autorização escrita do owner com ambiente, janela, dados permitidos e classificação máxima.
2. Candidato congelado (`certification/current.json`) e digests de configuração calculados pelo mesmo processo do preflight.
3. Credenciais em cofre aprovado, nunca em arquivo, imagem ou log.
4. Contrato do adapter e política de egress aprovados (allowlist, orçamento, timeout).
5. Plano de revogação e rollback do adapter.

## 3. Schema de evidência exigido

Cada gate deve produzir um dossiê aderente a
`AUD19-13-15-external-evidence.schema.json` com:

- `gateId`, `environment` (`STAGING_REAL`/`PRODUCTION`), `owner`, `issuedAt`, `expiresAt`;
- `candidateDigest` e `configDigest` idênticos aos do preflight assinado;
- `evidenceRef` (ID do dossiê/registro externo) e `signature` (HMAC ou sign-off registrado);
- `allowedDataClassification`, `egress`, `revocationPlan`;
- resultados `PASS/FAIL` de positivo, negativo, timeout, retry, replay e revogação.

## 4. Comandos dry-run (sem contato externo)

```bash
npm run production:preflight -- --profile=PRODUCTION --expect=REJECT
node scripts/aud19-external-evidence-check.mjs --gate=modelProvider --attestation=<path> --expect=REJECT
```

O preflight negativo deve recusar; nenhum dos comandos acima concede readiness.

## 5. Registro de bloqueio

- Causa: ambiente externo e credenciais não autorizados; owners não designados.
- Impacto: `modelProvider`, `channel`, `externalIdentity` e `institutionalRag` permanecem `NOT_VALIDATED`; M6/G6 não fecha; produção `NO_GO`.
- Autoridade necessária: owner de integrações + segurança/dados + autorização de egress.
- Procedimento no ambiente autorizado: aplicar o schema, coletar dossiês assinados, executar os testes de contrato no candidato congelado e anexar ao pacote; qualquer falha mantém `NO_GO`.
