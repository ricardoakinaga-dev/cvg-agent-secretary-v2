# Task 01 - Evidence And Readiness Sync

## ID

DBG-COR-01

## Prioridade

P0

## Findings relacionados

- DBG-F01
- DBG-F02

## Objetivo

Sincronizar os documentos de evidencia e readiness com o estado real auditado. Proibir score `100` enquanto houver gaps P0/P1 abertos.

## Arquivos permitidos

- `docs/03_build/0310_construction_readiness_95.json`
- `docs/03_build/0310_construction_readiness_95.md`
- `docs/03_build/0311_controlled_construction_sprint_01.md`
- `docs/03_build/0312_controlled_construction_sprint_02.md`
- `docs/04_audit/0491_runtime_evidence.md`
- `docs/09_debug_corrections/0903_correction_backlog.json`
- `docs/09_debug_corrections/0904_validation_matrix.json`

## Passos

1. Executar `npm run test:coverage` e registrar numeros reais.
2. Executar `npm test` e registrar contagem real de arquivos/testes.
3. Atualizar documentos que ainda declaram dados antigos.
4. Ajustar `current_confidence_percent` para valor defensavel enquanto os gaps estiverem abertos.
5. Registrar que score `100` fica bloqueado ate todos os itens P0/P1 estarem `completed`.

## Testes

```bash
npm run readiness
npm run verify
```

## Definition of Done

- Nenhum documento declara cobertura diferente da saida atual.
- Nenhum documento declara contagem antiga de testes como estado atual.
- Readiness nao e `100` enquanto houver item P0/P1 aberto.
- `docs/04_audit/0491_runtime_evidence.md` diferencia evidencia isolada, verify integrado e PostgreSQL real.
