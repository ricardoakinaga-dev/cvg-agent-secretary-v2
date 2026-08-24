# 0014 — Requisitos Nao Funcionais de Produto

## Performance esperada

- Criacao de sessao e registro de mensagem: p95 menor ou igual a 2s em ambiente controlado do MVP.
- Primeira resposta operacional ou acknowledgement: p95 menor ou igual a 10s quando o modelo externo estiver saudavel.
- Classificacao simples nao pode bloquear a persistencia da mensagem; se o agente falhar, a conversa deve permanecer investigavel e escalavel.
- Operacoes externas devem ter timeout explicito, fallback e registro de falha por correlation id.

## Confiabilidade

- O sistema deve operar em modo solo se HIS, Desk ou CIP estiverem indisponiveis.
- Mensagens duplicadas nao devem gerar tarefas ou tool calls duplicadas.
- Acoes sensiveis devem ser bloqueadas quando policy estiver indisponivel.
- Webhook, tool call, approval decision e task creation devem ser idempotentes.
- Falha de worker nao pode perder mensagem ja aceita.

## Rastreabilidade

- Toda conversa deve ter correlation id.
- Toda tool call deve ser registrada com input conceitual, output, status e erro.
- Toda aprovacao humana deve manter decisao, responsavel e horario.
- Cada resposta enviada deve apontar agent run, policy version e fonte quando aplicavel.
- Eventos de auditoria devem ser append-only para acoes sensiveis.

## Seguranca operacional

- Diagnostico, prescricao e alteracoes definitivas devem ser bloqueados.
- Dados sensiveis devem ser expostos apenas para perfis autorizados.
- A agente deve preferir handoff quando a confianca for baixa.
- Acesso ao painel deve exigir autenticacao, autorizacao por papel e registro de eventos sensiveis.
- Secrets devem vir de variaveis de ambiente ou secret manager; nenhum segredo pode existir no repositorio.
- Dados pessoais devem seguir minimizacao, mascaramento em UI e retencao aprovada.

## Multiusuario

- Operadores podem visualizar filas e assumir casos.
- Conflitos de aprovacao devem ser prevenidos por estado e auditoria.
- Duas decisoes simultaneas sobre o mesmo approval devem produzir apenas um resultado final.

## Governanca

- O nivel de autonomia deve ser configuravel.
- Regras de policy devem ser versionadas.
- Mudancas de regra sensivel devem ser auditaveis.
- Rollout com dados reais exige checklist de seguranca, privacidade, observabilidade e fallback humano.
- Qualquer mudanca de autonomia deve ser tratada como alteracao de risco.

## Metas minimas de engenharia

- Testes unitarios e de integracao devem atingir 80%+ de cobertura antes de rollout controlado.
- Fluxos criticos devem ter testes de idempotencia, policy fail-closed e auditoria.
- Nenhuma sprint pode fechar se `npm test`, typecheck e lint estiverem quebrados.
