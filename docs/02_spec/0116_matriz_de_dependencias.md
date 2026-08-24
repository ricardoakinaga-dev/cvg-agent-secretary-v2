# 0116 — Matriz de Dependencias

## Dependencias entre modulos

| Modulo       | Depende de                      | Bloqueia                      |
| ------------ | ------------------------------- | ----------------------------- |
| `shared`     | nenhuma                         | todos os demais               |
| `agent-core` | `shared`                        | workflows, tools, audit       |
| `policy`     | `shared`                        | approvals e execucao sensivel |
| `tools`      | `shared`, `policy`              | workflows praticos            |
| `workflows`  | `agent-core`, `tools`, `policy` | worker e MVP                  |
| `memory`     | `shared`, `agent-core`          | contexto enriquecido          |
| `adapters`   | `shared`, `tools`               | canais e integracoes          |
| `api`        | `shared`, `agent-core`          | painel e webhooks             |
| `worker`     | `agent-core`, `workflows`       | execucao assincrona           |
| `web`        | `api`, `shared`                 | operacao humana               |

## Pode ser paralelo

- `policy` e `agent-core` apos `shared`.
- `api` e `worker` apos contratos de aplicacao.
- `web` pode iniciar com mocks apos contratos de API.
- `adapters` podem iniciar com mocks antes de integracoes reais.

## Ordem segura

1. Shared e contratos.
2. Persistencia e dominio base.
3. Policy e approvals.
4. Tools locais.
5. Workflows.
6. API e worker.
7. Web.
8. Adapters externos.
9. Observabilidade e hardening.

## Bloqueios criticos

- Sem policy nao ha execucao sensivel.
- Sem auditoria nao ha MVP enterprise.
- Sem session manager nao ha workflow confiavel.
- Sem approval layer nao ha agendamento sensivel.
