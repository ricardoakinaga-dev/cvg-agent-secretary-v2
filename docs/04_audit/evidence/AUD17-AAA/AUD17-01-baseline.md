# AUD17-01 — baseline observado e reconciliação

**Data:** 2026-09-17
**Ambiente:** Node `22.23.2`; repositório local; dados sintéticos; sem egress,
provider, canal, IdP, RAG, deploy ou efeito externo.
**HEAD observado:** `c8e514dbfcf689968eb606ab94119c850ecc80a6`
**Branch:** `main`
**Candidato histórico:** `c8e514d`
**Bar AUD17:** [`quality-bar-v1.json`](quality-bar-v1.json)

## Estado Git

O worktree já continha alterações do usuário antes desta task:

- modificados: `docs/03_build/0300_build_engineer_master.md`,
  `0301_roadmap.md`, `0302_backlog_master.md`, `docs/20_master_execution_log.md`,
  `docs/30_backlog_master.md` e `docs/99_runtime_state.md`;
- não rastreados: `docs/03_build/0328_aud20260917_executive_plan.md`,
  `0329_aud20260917_roadmap.md`, `0330_aud20260917_backlog.md` e
  `docs/04_audit/0565_recent_implementations_audit_2026-09-17.md`;
- não houve reversão, limpeza, reset ou descarte.

## Negativos reproduzidos

| Comando | Exit | Resultado observado |
| --- | ---: | --- |
| `npm run certification:verify` | `1` | `FAIL`; `candidate_tree_stale`, dirty/untracked state, candidate ID/hash/file drift e recalculações incompatíveis. |
| `npm run evidence:verify:phase11` | `1` | `FAIL` pelo mesmo drift; o pacote histórico não certifica os bytes atuais. |
| `npm run promotion:check` | `1` | `eligible=false`, `noProductionEffect=true`; provider, channel, external identity, institutional RAG, RPO/RTO, pilot, rollback e human signoff pendentes. |

O resultado negativo é intencional e permanece válido até um candidato final
ser congelado e selado. O certificado anterior não foi promovido nem alterado.

## Hashes de controle no intake

Os snapshots foram calculados antes desta task para os documentos exigidos e
estão vinculados na barra. O fingerprint read-only inicial foi salvo fora do
repositório em `/tmp/aud17-baseline-fingerprint.json`; seu digest foi
`93ca9af551aa4ddcc3740498ca3cb418a293df54a78fe88603403d527a8f0549`.

Depois do registro do contrato, da barra, da evidência e da matriz, um segundo
fingerprint de controle foi salvo em
`/tmp/aud17-current-baseline-fingerprint.json`; seu digest foi
`f374301e9dbd975dedfb209dcab3e7dcfb8254b8d73ddb6276ce7801670b9386`.
Ele ainda representa uma árvore documental não selada e não substitui o
candidato histórico.

## Reexecução final do baseline de AUD17-01

Após todos os artefatos de descoberta de AUD17-01/02 estarem presentes, os
comandos foram reexecutados sob Node `22.23.2`:

| Comando | Exit | Resultado observado |
| --- | ---: | --- |
| `npm run certification:verify` | `1` | `FAIL`; `candidate_tree_stale`, dirty/untracked state, candidate ID/hash/file drift e recalculações incompatíveis. |
| `npm run evidence:verify:phase11` | `1` | `FAIL` pelo mesmo drift candidate-bound. |
| `npm run promotion:check` | `1` | `eligible=false`, `noProductionEffect=true`; oito gates externos/humanos continuam pendentes. |

Esses exits são o negativo esperado para a árvore atual. A matriz de
requisitos foi então criada em
[`AUD17-02-requirements-matrix.json`](AUD17-02-requirements-matrix.json), sem
alterar o certificado anterior.

## Reconciliação

- `certification/current.json` continua apontando para `certification/phase11`;
- `certification/phase11/phase11-result.json` continua sendo o resultado do
  candidato selado, elegível no máximo para `STAGING` controlado;
- o estado atual é um novo candidato documental stale, não uma extensão
  certificada de `c8e514d`;
- `AUD17-01` fecha a reconciliação documental do baseline; `AUD17-02` está em
  execução com matriz requisito→prova própria;
- AUD17-13, AUD17-14 e AUD17-15 continuam `BLOCKED_EXTERNAL`/dependentes de
  autoridade humana.

## Limitações

Este relatório prova o negativo de integridade e a separação do candidato; não
prova correções de runtime, PostgreSQL, console, integrações, RPO/RTO, piloto,
rollback ou produção. Essas provas permanecem tarefas posteriores e serão
consideradas `NOT_RUN`/`BLOCKED_EXTERNAL` até execução válida.
