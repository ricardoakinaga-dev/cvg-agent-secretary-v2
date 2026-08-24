# 0101 — Visao Arquitetural

## Objetivo arquitetural

Construir a Esmeralda V2 como plataforma modular de agente hospitalar, com runtime central desacoplado de canais, sistemas externos e interfaces.

## Principios

- Canal e adapter, nao produto.
- Tools sao contratos, nao chamadas soltas.
- Policy decide autonomia antes da execucao.
- Toda execucao relevante e auditavel.
- Modo solo deve funcionar antes do modo integrado.
- Integrações externas entram por adapters e nao contaminam o dominio.

## Estilo arquitetural

Arquitetura modular em camadas com nucleo de dominio e aplicacao isolado de infraestrutura:

```txt
apps/api
apps/worker
apps/web
packages/agent-core
packages/workflows
packages/tools
packages/adapters
packages/memory
packages/policy
packages/rag
packages/shared
```

## Blocos de alto nivel

- API: contratos HTTP para canais, painel e operacao.
- Worker: execucao assincrona de workflows, retries, tasks e integracoes.
- Web: painel minimo para conversas, approvals, tarefas e auditoria.
- Agent Core: runtime, session manager, state manager, orchestrator e tool registry.
- Workflows: fluxos LangGraph versionados.
- Tools: comandos operacionais desacoplados.
- Adapters: WhatsApp, HIS, Desk, CIP, agenda, financeiro e RAG.
- Memory: fatos, historico util e contexto persistente.
- Policy: regras de autonomia, bloqueios e approvals.
- Shared: tipos, contratos, erros, envelope e utilitarios.

## Fronteiras

- Frontend nao cria regra de negocio; dispara comandos e exibe estado.
- API nao implementa regra de workflow; valida entrada e chama aplicacao.
- Workflows nao acessam sistemas externos diretamente; usam tools.
- Tools nao conhecem canal; usam adapters.
- Adapters nao decidem politica; apenas executam contratos externos.

## Justificativa

Essa arquitetura suporta modo solo e integrado porque a agente opera sobre contratos internos. HIS, Desk, CIP e WhatsApp podem ser substituidos ou adicionados sem alterar workflows de produto.

## Trade-offs aceitos

- Mais estrutura inicial em troca de auditabilidade e evolucao.
- Banco proprio inicial em troca de independencia de HIS.
- Approval layer explicita em troca de menor autonomia no MVP.

## Trade-offs rejeitados

- Bot direto no WhatsApp.
- Workflows chamando HIS diretamente.
- Regras de seguranca espalhadas pelo codigo.
- Confirmacao sensivel sem policy.
