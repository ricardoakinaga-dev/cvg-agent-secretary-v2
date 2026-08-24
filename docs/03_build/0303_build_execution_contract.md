# 0303 — Build Execution Contract

## Objetivo

Este contrato transforma a fase de Build em execucao deterministica. O executor nao deve decidir produto, arquitetura, stack, estrutura, ordem, nomes de arquivos, criterios de aceite ou comportamento de erro fora do que estiver descrito em `docs/03_build`.

## Fontes de verdade

Usar esta ordem de autoridade:

1. `docs/01_prd/0010_casos_de_uso.md`
2. `docs/01_prd/0012_regras_de_negocio.md`
3. `docs/01_prd/0013_requisitos_funcionais.md`
4. `docs/01_prd/0014_requisitos_nao_funcionais_produto.md`
5. `docs/02_spec/0103_mapa_de_modulos.md`
6. `docs/02_spec/0104_modelo_de_dominio.md`
7. `docs/02_spec/0105_maquina_de_estados_e_fluxos.md`
8. `docs/02_spec/0106_contratos_de_aplicacao.md`
9. `docs/02_spec/0107_contratos_de_api.md`
10. `docs/02_spec/0109_dados_e_persistencia.md`
11. `docs/02_spec/0111_permissoes_governanca_e_auditoria.md`
12. `docs/02_spec/0113_observabilidade_runtime_e_operacao.md`
13. `docs/03_build/0304_traceability_matrix.json`
14. `docs/03_build/0305_repository_target_structure.json`
15. `docs/03_build/0306_phase_sprint_plan.json`
16. `docs/03_build/0308_task_catalog.json`

Se houver conflito, parar, registrar `BLOCKED` em `docs/99_runtime_state.md` e criar item P0 em `docs/30_backlog_master.md`.

## Stack travada para execucao

Estas escolhas ficam congeladas para remover decisao do executor:

- Package manager: `npm` com workspaces.
- Linguagem: TypeScript strict.
- Modulos: ESM.
- Runtime: Node.js LTS.
- API: Fastify com Zod para validacao de entrada e saida.
- Worker: processo Node.js separado, consumindo jobs internos e outbox DB-backed no MVP.
- Web: React com Vite e TanStack Query.
- Persistencia: PostgreSQL com Drizzle ORM e migrations versionadas.
- Testes unitarios/integracao: Vitest.
- Cobertura: Vitest coverage provider `v8`.
- E2E: Playwright.
- Logs: Pino com JSON estruturado.
- Observabilidade: OpenTelemetry preparado a partir de Phase 8; exportador pode ser noop no MVP.
- RAG: package isolado; fonte real bloqueada ate decisao humana.
- Integracoes reais: atras de adapters; Phase 0 nao conecta nenhum provedor externo.

## Algoritmo obrigatorio de execucao

Para cada task:

1. Ler a task em `docs/03_build/phase_*/task_*.md` ou `0306_phase_sprint_plan.json`.
2. Confirmar que o task id existe em `0308_task_catalog.json`.
3. Ler as referencias PRD/SPEC listadas na task.
4. Confirmar dependencias completas.
5. Criar ou alterar somente os arquivos listados em `files_expected`.
6. Escrever primeiro os testes listados em `tests_expected`.
7. Rodar o comando de teste esperado e confirmar falha RED quando a task envolver codigo funcional.
8. Implementar o minimo necessario.
9. Rodar todos os comandos em `validation_commands`.
10. Atualizar tracking JSON da sprint.
11. Atualizar `docs/20_master_execution_log.md` e `docs/99_runtime_state.md`.

## TDD obrigatorio

- RED: teste novo deve falhar pelo motivo esperado.
- GREEN: implementar somente o necessario para passar.
- REFACTOR: melhorar sem alterar comportamento.
- Nao remover teste para fazer build passar.
- Nao aceitar task sem teste quando ela cria comportamento.
- Cobertura minima: 80% antes de rollout controlado; Phase 0 deve configurar o mecanismo mesmo que a cobertura funcional ainda seja baixa.

## Definition of Done global

Uma task so pode ser marcada `DONE` quando:

- Todos os arquivos esperados existem.
- Todos os exports publicos estao documentados por teste.
- `npm test` passa.
- `npm run typecheck` passa quando criado.
- `npm run lint` passa quando criado.
- `npm run test:coverage` passa quando criado.
- Nao ha segredo hardcoded.
- Nao ha dado real em fixtures.
- Eventos sensiveis falham fechado se policy, auth ou audit estiver indisponivel.
- `docs/03_build/tracking/build_tracking.json` foi atualizado.

## Regras de bloqueio

Marcar `BLOCKED` quando:

- A task exigir decisao nao documentada em PRD/SPEC/Build.
- O executor precisar escolher tecnologia fora da stack travada.
- Um arquivo necessario nao estiver listado na task.
- Uma regra de agenda, RAG, retencao, cargo real ou autonomia for necessaria e ainda estiver pendente.
- Um teste obrigatorio nao puder ser escrito.
- `npm audit --audit-level=high` apontar high ou critical sem plano.

## Proibicoes

- Nao criar nova feature sem task.
- Nao alterar stack.
- Nao conectar Meta WhatsApp, HIS, Desk, CIP, agenda real, gateway de pagamento ou RAG real na Phase 0.
- Nao criar diagnostico, prescricao, prontuario definitivo ou cobranca sensivel.
- Nao implementar confirmacao automatica de agenda antes de regra humana.
- Nao pular audit logger em comandos que mudam estado.

## Formato minimo de evidencia por sprint

Cada sprint deve gerar:

- Lista de tasks concluidas.
- Lista de arquivos criados/alterados.
- Resultado de comandos.
- Cobertura quando disponivel.
- Gaps novos.
- Decisoes humanas pendentes.
- Link para testes adicionados.
