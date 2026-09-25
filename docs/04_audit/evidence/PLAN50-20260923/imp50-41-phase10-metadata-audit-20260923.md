# IMP50-41 — auditoria de evidência Phase 10 — 2026-09-23T07:32:46Z

## Escopo e conclusão

Reconciliação documental `AUD20-08-FU4`: verificar se o aceite original de
AUD20-08 para AC05/C05/C06 satisfaz o critério IMP50-41 de impedir que
metadados/findings Phase 10 sejam lidos como gate corrente. A correspondência
direta entre critério, implementação e negativo existente foi confirmada em
revisão independente; IMP50-41 está aceito neste escopo limitado.

Nenhum código, teste ou artefato de certificação foi alterado. `AUD20-08`
permanece `COMPLETED`; IMP50-41 é aceito por evidência existente e verificação
focal, sem BUILD de produto ou extensão da autorização original.

## Mapeamento de aceite

| Requisito IMP50-41 | Evidência atual | Resultado |
| --- | --- | --- |
| Dependência: ponteiro corrente definido | `certification/current.json` aponta Phase 11 e define `historicalPhase10.doesNotQualifyCurrent=true`; `current_state.json` aponta `certification/phase11` e lista `certification/findings.json` como histórico | Coberto |
| Preservar metadado/evidência sem promovê-lo | `certification/findings.json` permanece no caminho Phase 10; o hash `5be5b7ea915da5e39748843b4bbe2c77e751e888818f037f9c5a9b00b48fbcf8` também consta do manifesto arquivado `certification/logs/historical/2026-09-11-phase10/manifest.json` (2.384 bytes) | Coberto; hash confere com o arquivo e os manifests de certificação |
| Consumer não confunde histórico com gate corrente | `docs-state-check.mjs` exige namespace corrente `certification/phase11`, exige o histórico declarado e rejeita o arquivo Phase 10 como artefato corrente | Implementado |
| Negativo relevante | Teste “rejects historical Phase 10 findings as the current namespace” espera `historical_findings_selected_as_current` quando `findings.json` é apontado como corrente | PASS focal |
| Revisão e limite | Build report AUD20-08 e matriz C01–C07 marcam C05 PASS; crítica independente v3 aprovou C01–C07 no candidato `3e419a17701f82d3cbcd19804ac9139df1db3e017cfc209411d00ac7aa57ed79` | Evidência histórica candidata; não é hash de release/workspace atual |

Os pontos acima derivam da SPEC aprovada de AUD20-08: PRD FR05/AC05 declara
Phase 10 histórico e impede fallback; SPEC seção 4 preserva `findings.json` e
requer negativo contra seleção corrente. A aceitação de IMP50-41 reutiliza esse
escopo exato, sem ampliar a política para toda a árvore de evidências (tema
separado do FU3/IMP50-49).

## Verificação focal fresca

- Node: `v22.23.2`; Vitest `v4.1.11`.
- Comando: `npm test -- tests/docs-integrity.test.js -t "rejects historical Phase 10 findings as the current namespace"`.
- Resultado: 1 arquivo passou; 1 teste passou; 11 foram omitidos pelo filtro de
  nome (não são falhas).
- SHA-256 dos oito arquivos de escopo foi capturado antes e depois do teste; os
  valores coincidiram exatamente. Isso prova ausência de mutação nesses bytes
  durante a execução, não congela nem qualifica o workspace como candidato.

| Arquivo | SHA-256 atual verificado antes/depois |
| --- | --- |
| `docs/02_spec/aud20_08_state_node_reconciliation_20260922.md` | `1c2088ff8e093554804386bb3e8deec06a78784e41bab3439314bdae6cd55ee9` |
| `docs/03_build/tracking/current_state.json` | `bc3d303c43eb149cadc73f0be4e2025d22bf474927efef1b6ffde896e3e1cfda` |
| `certification/current.json` | `28e8f3947bacc3a55927f6d3619a11ae76cb5492c9f3146163bdacdcb731eadf` |
| `certification/findings.json` | `5be5b7ea915da5e39748843b4bbe2c77e751e888818f037f9c5a9b00b48fbcf8` |
| `scripts/lib/docs-state-check.mjs` | `05e5e145fee7df849d7b26f6e8e6c20e8edb19aed784e90afcbc40d1283559dd` |
| `tests/docs-integrity.test.js` | `8c8fa72e88ea5dcc4eeab9976ebd3484f6bff243ffaf10bdb80b5df6d0da69e0` |
| `docs/04_audit/evidence/AUD20/AUD20-08-v1-criteria-matrix.json` | `3fbff01928f058421bc3bd15915952bd4e842ad08013f691772639a2438cf443` |
| `docs/04_audit/evidence/AUD20/AUD20-08-independent-critic-v3.md` | `289796aec1b553eedb3f461bb45768c5dfb83c7696570fbd4f3d0365d053ff6a` |

## Gate e próximo passo

O parent SPEC e BUILD aprovados cobrem este critério exato; o FU4 não altera
SPEC, não reabre AUD20-08 e não solicita BUILD. A revisão independente
[confirmou o mapeamento](imp50-41-independent-review-20260923.md) e limitou
explicitamente seu alcance: o hash da crítica v3 identifica somente o candidato
histórico revisado. A execução focal fresca sustenta o negativo neste
workspace, sem qualificar o workspace como candidato.

Resultado: IMP50-41 aceito somente como critério documental/evidência da
proteção Phase 10. Nenhum produto foi promovido; staging/produção `NO_GO`. A
ação crítica única do programa continua revisão/aprovação de `AUD20-17` /
`IMP50-40`.
