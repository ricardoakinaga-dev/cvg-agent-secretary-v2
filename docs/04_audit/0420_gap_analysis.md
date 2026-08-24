# 0420 — Gap Analysis

## Gaps criticos

### GAP-C01 — Implementacao inexistente

- Impacto: auditoria real nao pode ser executada.
- Causa: fase documental em andamento.
- Acao: concluir build planejado antes de auditoria runtime.

### GAP-C02 — Regras humanas de agenda pendentes

- Impacto: confirmacao de consulta nao pode ser automatizada com seguranca.
- Causa: regra de negocio ainda exige validacao.
- Acao: obter decisao humana antes de liberar workflow de confirmacao.

### GAP-C03 — Build sem runtime e sem suite de produto

- Impacto: qualquer auditoria runtime seria simulada e nao confiavel.
- Causa: ainda nao ha `apps`, `packages` funcionais ou testes de dominio.
- Acao: executar Phase 0 e Phase 1 com testes reais antes de validar aderencia funcional.

## Gaps importantes

### GAP-I01 — Fonte RAG institucional nao definida

- Impacto: duvidas institucionais podem exigir handoff.
- Acao: definir base autorizada e politica de atualizacao.

### GAP-I02 — Retencao de dados pendente

- Impacto: auditoria e privacidade precisam de politica formal.
- Acao: definir retencao por tipo de evento.

### GAP-I03 — Matriz real de cargos hospitalares pendente

- Impacto: risco de permissao ampla demais ou aprovacao por pessoa errada.
- Causa: SPEC define papeis genericos, mas ainda nao valida cargos reais do hospital.
- Acao: mapear cargos reais para Operator, Approver, Supervisor e Admin.

## Melhorias

### GAP-M01 — Dashboard operacional futuro

- Impacto: melhora supervisao.
- Acao: criar apos MVP funcional.

### GAP-M02 — CI/CD ainda inexistente

- Impacto: sprints podem fechar sem verificacao repetivel.
- Causa: Phase 0 ainda precisa criar gates automatizaveis.
- Acao: adicionar pipeline depois dos scripts locais de test, lint e typecheck.
