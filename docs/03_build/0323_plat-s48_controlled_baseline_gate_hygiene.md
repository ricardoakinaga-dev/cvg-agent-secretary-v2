# BUILD — PLAT-S48 baseline controlado e determinismo de testes

## Registro

- task: `PLAT-S48-001_CONTROLLED_DETERMINISTIC_APPROVAL_CLOCK`
- task: `PLAT-S48-002_CONTROLLED_SEMANTIC_TIMELINE_ASSERTION`
- sprint: `PLAT-S48_CONTROLLED_BASELINE_DETERMINISM`
- fase: `SPEC` → `BUILD` controlado
- gate: `SPEC_APPROVED_CONTROLLED_BUILD`
- owner: `platform/security/test-infrastructure`
- dependências: `PLAT-S47-001`, `PLAT-S45-001`

## Sequência obrigatória

1. Congelar os dois REDs reproduzidos no discovery.
2. Ajustar primeiro os testes para explicitar clock compartilhado e escopo
   semântico da timeline; confirmar RED ou falha de compilação esperada.
3. Implementar somente a opção `now` no gateway e a comparação local usando
   essa função.
4. Executar focused GREEN e regressão de approval/web.
5. Executar todos os gates controlados e auditar diff, cobertura e fronteiras.
6. Atualizar tracking, runtime, backlog, progress e evidência com os números
   efetivamente observados.

## Definition of Done

- focused RED/GREEN registrados;
- testes unitários/integrados relevantes passam;
- coverage global permanece >= 80% em todas as métricas;
- typecheck, lint, format, build, readiness, worker smoke, PostgreSQL, E2E,
  audit e diff check passam ou têm falha externa explicitamente registrada;
- nenhuma alteração de produção real, dado real ou side effect;
- review independente tentado e limitação documentada se indisponível.

## Limites

Sem migration, alteração de contrato HTTP/API externa ou mudança de
policy/approval semântica; a opção TypeScript `now` é uma seam interna não
configurável por input externo. Sem provider/canal real, RAG, rede, deploy,
segredo, agenda, ação clínica, financeira ou prontuário definitivo.
