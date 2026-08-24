# 0120 — SPEC Master

## Visao arquitetural

A Esmeralda V2 sera uma plataforma modular de agente hospitalar com apps `api`, `worker` e `web`, e packages `agent-core`, `workflows`, `tools`, `adapters`, `memory`, `policy`, `rag` e `shared`.

## Dominios

Os bounded contexts principais sao Conversation, Agent Runtime, Workflow, Tool, Policy, Approval, Task, Integration e Audit.

## Modulos

Cada modulo possui fronteira clara. Workflows usam tools; tools usam adapters; policy autoriza acoes; audit registra eventos; frontend opera via API.

## Modelo de dominio

As entidades centrais sao Conversation, Message, Session, AgentRun, ToolCall, ApprovalRequest, HandoffEvent, Task, Contact, PatientLink, MemoryFact, SafetyEvent e IntegrationEvent.

## Fluxos tecnicos

O fluxo principal recebe mensagem, normaliza pelo adapter, cria ou retoma sessao, executa agent run, aplica policy, chama tools, registra auditoria e responde ou escala.

## Contratos

Foram definidos comandos de aplicacao, queries, endpoints conceituais, eventos e idempotencia.

## Persistencia

Banco proprio inicial com entidades auditaveis. Sistemas externos entram por adapters. Eventos criticos preservam correlation id e historico.

## Permissoes

Papeis Operator, Approver, Supervisor, Admin e System. Acoes sensiveis exigem policy e trilha de auditoria.

## Integracoes

WhatsApp, Evolution API temporario, CVG-HIS, Connect Desk, Connect CIP, RAG, agenda e financeiro sao integracoes planejadas, todas atras de adapters.

## Observabilidade

Logs, metricas, health checks, tracing por correlation id e monitoramento de falhas criticas sao obrigatorios.

## Frontend operacional

Painel minimo com conversas, timeline, approvals, tarefas, auditoria e configuracoes basicas.

## Plano de build

Fases: fundacao, dominio base, fluxos principais, integracoes, frontend operacional, hardening e rollout controlado.

Phase 0 esta liberada apenas para aprovacao humana e fundacao tecnica. Funcionalidades sensiveis seguem bloqueadas ate decisoes de agenda, RAG institucional, retencao, matriz de cargos e autonomia.

## Rastreabilidade

- Blueprint -> Discovery -> PRD -> SPEC.
- Casos de uso -> comandos/API/workflows.
- Regras de seguranca -> policy/approval/audit.
- MVP -> fases de build.
