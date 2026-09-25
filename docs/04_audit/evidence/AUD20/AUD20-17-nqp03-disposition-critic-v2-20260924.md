# AUD20-17 / IMP50-40 — crítica fresh-context da disposição NQP-03 v2 — 2026-09-24

## Veredito

**`REJECT` para consistência documental**, sem rejeitar novamente a SPEC ou o
BUILD já aprovados. O reviewer fresh-context confirmou C01–C05 `PASS` e C06/C07
`FAIL`, mas encontrou uma entrada de 04:42Z no execution log sem marcador
histórico explícito. Ela dizia que branches de request-context em 92% estavam
abaixo do piso crítico e que `AUD20-17` permanecia `IN_PROGRESS`, em conflito
com a interpretação e status correntes. A correção foi registrar essa entrada
como histórica, apontar para a errata e preservar a decisão Q1 atual.

Esta é uma disposição da documentação, **não é aceite C07 da candidata**.

## Achados confirmados

- O estado corrente foi alinhado como `WAITING_HUMAN_APPROVAL` entre runtime,
  `CURRENT` e status ativo de 0337. O motivo é a decisão humana Q1 de
  aplicabilidade do piso de 95%; request-context continua aberta e não aceita.
- C01–C05 `PASS`; C06/C07 `FAIL`. Métricas integradas ficam `REPORT_ONLY`:
  BUILD report cita o manifesto `11f061…`, enquanto o manifesto disponível tem
  SHA-256 `6b86eb90a9275f3563c1c9f9deadd5477f7c114fe5228768313706512447fdba` e
  não contém o inventário completo das 301 fontes do run integrado. O baseline
  “sem redução”, PostgreSQL e mutation selecionada seguem `NOT_RUN`; 192 skips
  não satisfazem gates requeridos.
- O valor de branches 92% é observado. O registry congelado não lista
  `request-context.ts`; portanto, a aplicabilidade do piso de 95% segue sem
  adjudicação. Q1, isoladamente, não aceita C06/C07, não libera Q2/AUD20-10 e
  não autoriza execução adicional.
- IMP50-49 conserva os 141 vínculos sem adjudicação, v1 como baseline e v2
  como suplemento.

## Hashes dos documentos na revisão rejeitada

| Documento | SHA-256 revisado |
| --- | --- |
| `docs/CURRENT.md` | `082ed4eb30ffb2969a883a91c3818eb25b75d8f9196dd6e3ac8caedf05804f0e` |
| `docs/03_build/0337_aud20260921_backlog.md` | `bf6a6328b5eb6184f88e826bcab086b5b40618a795121ecb02027376e912d7c3` |
| `docs/20_master_execution_log.md` | `8025252efe3cb1e3c613699467032d7a10cc9802a59a5d7735432dda207557fb` |
| `docs/99_runtime_state.md` | `3a5b03607c50a1c82c1c6da2c3c9ef094de9988612f3df7ac0675e52dd5e2ff0` |
| `docs/30_backlog_master.md` | `d9e371629940cfe58f0a5223b04a87c45d75b0ca84cf9596255955186f8db495` |
| `docs/04_audit/evidence/AUD20/AUD20-17-request-context-branch-floor-erratum-20260924.md` | `ea0fd48e161552bbb2f5a45ed518b2eae3e7002cc66819f2c34752b80b0dcdb0` |

## Evidência consultada

- BUILD report: `0ebebf1c12032597a7733d935c7a08bc19aba4687c420223496499a58ae742a9`.
- Crítica independente da candidata: `293a02f1411c35ff811d67dd2b4bac25bd14581b26887ea285de259514fe165d`.
- Reconciliação: `a7869131debf4f4c618672a1fbf27de38377ea002af3ba1b5d7ab3d3b3eb67c4`.
- Crítica da reconciliação: `84bbc37c9d2e88c55b4b647de8af494e4b1e8897c02b9f4e72830ffe6f37dd5a`.
- Registry de coverage: `c16dbffdf9ecc7d058e6d073e81d7215be4b634f1af2ad5061f4fd447138b24b`.
- Contrato AAA v2: `aec324018513c43a3e949663e41769f2d59180c6812d7430bd5980fb4a357097`.
- Recibo de aprovação/admissão: `a474bd2357377a70f50be372e7b1990103350ca3db9e393402a97a1378c89ec9`.

O reviewer identificou corretamente o caminho canônico da validação SPEC como
`docs/02_spec/0190_spec_validation.md`; não existe cópia em `docs/03_build/`.
Sua revisão foi somente leitura; não houve edição, teste, BUILD, PostgreSQL ou
mutation.
