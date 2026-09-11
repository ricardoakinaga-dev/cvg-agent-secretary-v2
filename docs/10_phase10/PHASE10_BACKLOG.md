# PHASE 10 — BACKLOG

Fonte mecânica: `docs/10_phase10/PHASE10_BACKLOG.json`.
Nenhum item de backlog é um achado de certificação; findings P0/P1/P2 vivem em
`certification/findings.json`.

| ID      | Prioridade | Severidade | Owner                    | Status | Acceptance criteria                              |
| ------- | ---------- | ---------- | ------------------------ | ------ | ------------------------------------------------ |
| P10-B01 | HIGH       | P2         | SRE                      | OPEN   | Fechar gate PostgreSQL com 0 skip (inclui chaos) |
| P10-B02 | HIGH       | P2         | Platform Engineering     | OPEN   | Migrar runtime legado para o kernel governado    |
| P10-B03 | MEDIUM     | P2         | Platform Engineering     | OPEN   | Propagação OTel nativa com exporter              |
| P10-B04 | HIGH       | P2         | SRE                      | OPEN   | Medir RPO/RTO e restore completo                 |
| P10-B05 | HIGH       | P2         | Integrations Engineering | OPEN   | Validar provider/canal reais em homologação      |
| P10-B06 | MEDIUM     | P3         | QA Architecture          | OPEN   | Load 100k eventos contra PostgreSQL              |
| P10-B07 | MEDIUM     | P3         | Platform Engineering     | OPEN   | Persistir audit ledger e expor verificação       |
| P10-B08 | MEDIUM     | P3         | Product/Operations       | OPEN   | Registrar signoff humano no gate                 |
| P10-B09 | LOW        | P4         | Frontend                 | OPEN   | UI de dead letters/estado degradado              |
| P10-B10 | LOW        | P4         | Security Engineering     | OPEN   | Teste de rotação de segredo com janela de graça  |

## Regras

- Itens `blocker: true` mantêm a decisão no máximo em `CONDITIONAL_GO`.
- Reavaliar dependências a cada release; acceptance criteria são executáveis.
