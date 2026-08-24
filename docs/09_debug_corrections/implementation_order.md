# Implementation Order - Debug Corrections

## Regra

Executar na ordem abaixo. Nao pular task. Nao marcar task como concluida sem teste e evidencia.

## Ordem deterministica

### 1. DBG-COR-01 - Evidence and readiness sync

- Motivo: impede que a documentacao continue declarando maturidade maior que o runtime.
- Arquivo: `tasks/task_01_evidence_and_readiness_sync.md`
- Gate minimo:
  - `npm run readiness`

### 2. DBG-COR-02 - Traceability test alignment

- Motivo: a matriz precisa apontar para arquivos reais antes de novas features.
- Arquivo: `tasks/task_02_traceability_test_alignment.md`
- Gate minimo:
  - `npm test`

### 3. DBG-COR-03 - Web conversation listing

- Motivo: remove IDs fixos e fecha gap funcional do console.
- Arquivo: `tasks/task_03_web_conversation_listing.md`
- Gate minimo:
  - `npm test`
  - `npm run test:e2e`

### 4. DBG-COR-04 - PostgreSQL idempotency hardening

- Motivo: idempotencia precisa ser garantida pelo banco antes de qualquer rollout controlado mais amplo.
- Arquivo: `tasks/task_04_postgres_idempotency_hardening.md`
- Gate minimo:
  - `TEST_DATABASE_URL=... npm run test:postgres`

### 5. DBG-COR-05 - Format gate and CI verify

- Motivo: o repositorio nao pode aceitar verify sem formatacao em baseline enterprise.
- Arquivo: `tasks/task_05_format_gate_and_ci_verify.md`
- Gate minimo:
  - `npm run format:check`
  - `npm run verify`

### 6. DBG-COR-06 - Final validation and evidence

- Motivo: fecha a fila com evidencia real, nao declarativa.
- Arquivo: `tasks/task_06_final_validation_and_evidence.md`
- Gate minimo:
  - todos os comandos de `acceptance_tests.md`

## Condicao de parada

Parar apenas se:

- um teste obrigatorio falhar e nao puder ser corrigido sem decisao humana; ou
- uma correcao exigir dados reais, canal real, agenda real, RAG real ou acao sensivel.

Caso contrario, corrigir e continuar ate fechar todos os itens.
