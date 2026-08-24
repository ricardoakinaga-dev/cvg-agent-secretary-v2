# 0102 — Bounded Contexts

## Conversation Context

- Responsabilidade: conversas, mensagens, sessoes e historico.
- Pertence: `conversations`, `messages`, `sessions`.
- Nao pertence: decisao de autonomia, agenda ou faturamento.
- Relacoes: alimenta Agent Runtime e Audit.

## Agent Runtime Context

- Responsabilidade: orquestrar estado, workflows, tool calls e agent runs.
- Pertence: `agent_runs`, estado de workflow, tool registry.
- Nao pertence: implementacao de canal ou HIS.
- Relacoes: chama Workflows, Tools, Policy e Memory.

## Workflow Context

- Responsabilidade: fluxos de identificacao, triagem, agendamento, handoff, confirmacao, retorno e duvida institucional.
- Pertence: definicao dos grafos, estados e transicoes.
- Nao pertence: persistencia direta ou integracao externa direta.

## Tool Context

- Responsabilidade: contratos operacionais como buscar tutor, criar draft, encontrar slots e criar task.
- Pertence: validacao de input/output da tool, idempotencia e resultado.
- Nao pertence: UI, canal e decisao de permissao.

## Policy Context

- Responsabilidade: limites de autonomia, acoes proibidas, approvals e safety.
- Pertence: regras de bloqueio, permissao e escalonamento.
- Nao pertence: execucao externa da acao.

## Approval Context

- Responsabilidade: fila, decisoes humanas e auditoria de aprovacao.
- Pertence: `approval_requests`, status, decisor, decisao.
- Nao pertence: conteudo livre da conversa alem do resumo necessario.

## Task Context

- Responsabilidade: tarefas internas derivadas de conversa.
- Pertence: `tasks`, prioridade, status e vinculos.
- Nao pertence: agenda definitiva ou prontuario.

## Integration Context

- Responsabilidade: adapters para WhatsApp, HIS, Desk, CIP, agenda, financeiro e RAG.
- Pertence: contratos externos, falhas, retries e contingencia.
- Nao pertence: regras de produto.

## Audit Context

- Responsabilidade: rastreabilidade de eventos, safety, tool calls e integracoes.
- Pertence: `tool_calls`, `safety_events`, `integration_events`.
- Nao pertence: tomada de decisao operacional.

## Riscos de acoplamento

- Workflow chamar adapter diretamente.
- API conter regra de policy.
- Painel confirmar acao sem passar por Approval Context.
- HIS virar fonte obrigatoria para o MVP.
