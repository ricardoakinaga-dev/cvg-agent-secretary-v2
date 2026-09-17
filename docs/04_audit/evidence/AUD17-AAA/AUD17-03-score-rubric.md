# AUD17-03 — rubric de pontuação reproduzível

**Status:** VERIFIED_LOCAL
**Ambiente:** Node `22.23.2`; fixtures sintéticas; sem egress e sem efeito externo.

## Prova executada

| Comando | Resultado |
| --- | --- |
| `npx vitest run tests/phase11-score-rubric.test.js` | PASS; pesos explícitos, fixture completo `100/PASS`, fixture sem evidência abaixo de 99 e produção `0/BLOCKED`, P1 penalizado e PostgreSQL ausente reduzindo Reliability. |
| `node scripts/phase11-2-redteam.mjs --suite=all` | PASS; 15/15 contraprovas, incluindo falso score 100, `NOT_EXECUTED`, candidato dirty, escalada de perfil e integridade de invariantes. |
| `node scripts/phase11-self-test.mjs` | PASS; 9/9 negativos do cálculo/promoção. |

## Contrato observado

`scripts/lib/phase11-rules.mjs` separa o veredito binário de gate da pontuação ponderada `weighted-executable-evidence-v1`. Cada domínio usa fatores de gate/invariante, qualidade de evidência e estado de sucesso; gates `PASS` sem log/evidência não são equivalentes a prova reproduzível. Achados locais abertos aplicam penalidade, e `Production Readiness` permanece zero sem prova externa e signoff humano.

## Limitações

Esta tarefa prova o cálculo e seus negativos no escopo local. Ela não concede qualificação externa, `RELEASE_READY` ou produção.
