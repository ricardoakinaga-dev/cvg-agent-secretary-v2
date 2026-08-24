# Gap analysis — prompt da plataforma versus implementação verificada

## Matriz de gaps

| Requisito                        | Evidência atual                          | Gap                                                       | Severidade | Tratamento                                           |
| -------------------------------- | ---------------------------------------- | --------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| kernel/runtime genérico          | `runAgentTurn` e workflows hospitalares  | não existe runtime parametrizado por agente/versão        | P0         | primeiro slice: resolver versão e executar dry-run   |
| Control Plane persistido         | schema só contém conversas/tarefas/audit | não há entidades de configuração                          | P0         | contratos + store + migração compatível              |
| tenant isolation                 | nenhum `tenantId` nas tabelas/records    | risco de mistura de configuração                          | P0         | tenant obrigatório em novos objetos e queries        |
| Agent/AgentVersion               | inexistente                              | sem draft/test/approve/publish/rollback                   | P0         | máquina de estados e publicação imutável             |
| Prompt Management                | prompt fixo em workflows                 | sem blocos, composição determinística ou versão           | P0         | composer puro com bloqueio de segredos               |
| Model Providers                  | apenas `OPENAI_API_KEY` no env           | sem adapter/provider config/fallback                      | P1         | interface e provider fake; segredo por `secretRef`   |
| Policy Engine configurável       | `evaluatePolicy` hardcoded               | sem camadas hard safety/org/behavior                      | P0         | hard safety não sobrescrevível + regras declarativas |
| Plugin manifest/gateway          | `ToolRegistry` sem metadados             | não há capabilities, permissões, rate limit ou audit hook | P0         | manifest + gateway deny-by-default                   |
| adapters atuais                  | fake WhatsApp e funções locais           | não registrados como plugins                              | P1         | adapters compatíveis e bindings declarativos         |
| Handoff engine                   | resumo textual                           | sem rules/destinations/state machine                      | P0         | state machine controlada; silent human takeover      |
| Human Takeover                   | status `waiting_human` pontual           | sem `BOT_ACTIVE`/`HUMAN_ACTIVE` explícitos                | P0         | estado persistido e guard de silêncio                |
| Knowledge bindings               | RAG noop                                 | sem source lifecycle/binding/permission                   | P1         | binding seguro; sem RAG real                         |
| Test Lab                         | inexistente                              | não há dry-run, trace, eval/regression                    | P0         | executor determinístico e trace sem payload sensível |
| observabilidade                  | audit de Secretary                       | sem trace por agente/versão/policy/tool                   | P1         | trace schema e correlação                            |
| Admin API/RBAC                   | rotas operacionais                       | sem Control Center e autorização de config                | P0         | rotas admin tenant-aware; Admin only                 |
| Admin UI                         | console operacional                      | sem edição de config e publicação                         | P1         | tela mínima do Control Center                        |
| config history/rollback          | inexistente                              | mudança não é explicável/reversível                       | P0         | histórico imutável e rollback por nova publicação    |
| harness hermético                | alias Vitest externo                     | testes podem não validar este workspace                   | P0         | resolver aliases localmente e adicionar regression   |
| migration/backward compatibility | migration inicial                        | não há tabelas novas/índices/rollback plan                | P1         | migration aditiva e smoke PostgreSQL                 |

## Riscos prioritários

1. **P0 — falso verde de testes:** alias externo no Vitest.
2. **P0 — cross-tenant configuration leakage:** novos objetos sem tenant obrigatório.
3. **P0 — unsafe dynamic tools:** registry atual executa handlers sem autorização contextual.
4. **P0 — mutable/publish ambiguity:** ausência de snapshot imutável deixa prompt/policy mutáveis após execução.
5. **P1 — real-provider leakage:** provider config não pode carregar segredo para UI/trace.
6. **P1 — drift documental:** docs antigas registram controlled construction do Secretary, não o novo control plane.

## Critério de fechamento do gap desta rodada

O primeiro slice fecha somente os gaps P0 que podem ser verificados sem dados reais: harness local, contratos/control plane em memória e PostgreSQL, versionamento, prompt/policy/plugin gateway, Test Lab dry-run, RBAC tenant-aware, API admin mínima e testes. Os gaps de operação real, fontes institucionais, cargos reais e provider externo continuam deliberadamente não liberados.
