# Pedido de crítica independente R2 — BUILD local AUD20-19-FU1/IMP50-18 — 2026-09-25

Status deste documento: **PEDIDO**, não parecer e não aprovação. Nada aqui autoriza aceite, sessão humana, staging ou produção.

## 1. Objeto da revisão solicitada

Crítica independente fresh-context (R2) dos bytes finais do BUILD local controlado do harness, executado sob admissão hash-bound em [recibo](AUD20-19-FU1-human-approval-admission-20260924.md) e verificado em [relatório BUILD](AUD20-19-FU1-build-report-20260924.md) (suíte repetida após sincronizar runtime: 289 arquivos/12 skipped, 2.256 testes PASS/192 skips; coverage statements 90,84%, branches 87,00%, functions 89,27%, lines 91,43%).

## 2. Pacote selado proposto ao revisor

- SPEC v4: `docs/02_spec/aud20_19_imp50_18_human_session_harness_20260923.md` (SHA-256 `decb8d441c2a17678026c6305fb71a9c31a2069d6836ad010362f9c3b9179688`).
- Parecer de prontidão v4 (revisão humana, não aceite): [v4](AUD20-19-FU1-independent-critic-v4-20260923.md).
- Evidências de execução: [unit](AUD20-19-FU1-unit-20260924.log) (`21/21 PASS`), [verify isolado](AUD20-19-FU1-verify-20260924.log) (`2/2 PASS`), [suíte integral](AUD20-19-FU1-full-test-20260924.log) e [suíte inicial com falhas documentais preservada](AUD20-19-FU1-full-test-initial-20260924.log).
- O revisor deve conferir hashes em disco por conta própria e registrar o fingerprint pré/pós (exigência: nenhuma escrita pelo crítico).

## 3. Quesitos propostos

1. Os resultados unit/verify/suíte/coverage conferem com os logs, sem extrapolação?
2. A ausência de sessão headed/participante/mídia está comprovada nos artefatos?
3. Há qualquer gap que impeça `PASS_LOCAL` do harness (escopo controlado, sem sessão)?
4. O veredito deve ser `PASS`, `CONDITIONAL` ou `REJECT`, com achados numerados?

## 4. Requisitos do revisor

Contexto fresco, sem acesso ao histórico de construção; somente leitura; sem executar BUILD, testes, banco ou sessão. O parecer R2 **não** autoriza a sessão humana (gate separado, objeto do [pedido de autorização](AUD20-19-human-session-authorization-request-20260925.md)).

## 5. O que este pedido NÃO autoriza

Aceite de `IMP50-18`, sessão humana, staging, produção, novo BUILD, alteração de thresholds ou reuso do veredito fora do escopo do harness. A decisão de solicitar R2 cabe à autoridade humana; sem ela, `AUD20-19` permanece `WAITING_HUMAN_APPROVAL`.
