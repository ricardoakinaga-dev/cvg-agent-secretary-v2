# AUD20-17-FU1 — crítica final independente do BUILD query-parser

- rodada: `2026-09-23`;
- escopo: crítica fresh-context da SPEC aprovada e dos bytes finais do slice
  query-parser, testes, arquitetura, recibos de verificação e ensaio de
  rollback;
- candidato: manifesto
  [candidate-final-audit.sha256](AUD20-17-query-raw-20260923/candidate-final-audit.sha256);
- veredito: **PASS** para a fatia query-parser e os AC01–AC06 da PRD 0033.

## Resultado

O revisor verificou o ownership dos sete parsers, a ausência de alteração dos
handlers/contratos, as mensagens HTTP exatas e os envelopes cobertos, os limites
e dependências arquiteturais, e os caps do candidato:

| Arquivo/medida | Resultado | Cap |
| --- | ---: | ---: |
| `server.ts` | 4.622 linhas | 4.708 |
| `request-context.ts` | 258 linhas | 450 |
| `request-query.ts` | 138 linhas | 160 |
| Total | 5.018 linhas | 5.050 |

Os hashes de todos os arquivos do manifesto e dos recibos foram conferidos no
início e no fim da revisão; não houve alteração entre as verificações. A
crítica v1 condicional foi respondida com assertions adicionais de envelope e
limites diretos dos parsers. A crítica de evidência v2 também foi respondida
com recibos estáticos e o ensaio de rollback isolado.

## Limites

O rollback recebeu `PASS_ISOLATED` numa cópia temporária: não foi aplicado ao
worktree compartilhado. PostgreSQL não foi configurado; 12 arquivos/192 testes
foram ignorados nas suítes registradas. Nenhum dado real, serviço externo,
staging ou produção foi usado. Este parecer aceita localmente somente o slice
query-parser; não fecha `AUD20-17`, não altera o estado previamente não aceito
da fatia request-context e não é aprovação de release.

