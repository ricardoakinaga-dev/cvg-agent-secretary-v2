# 0112 — Integracoes Externas

## WhatsApp Meta API

- Objetivo: canal oficial de mensagens.
- Dados recebidos: mensagens, remetente, status.
- Dados enviados: respostas e notificacoes permitidas.
- Falhas: webhook duplicado, rate limit, indisponibilidade.
- Contingencia: registrar evento e manter sessao pendente.

## Evolution API temporario

- Objetivo: alternativa temporaria de canal quando aplicavel.
- Restricao: nao deve definir arquitetura central.
- Contingencia: adapter substituivel.

## CVG-HIS

- Objetivo: consultar ou sincronizar tutor, pet, agenda e dados hospitalares quando aprovado.
- Restricao: MVP nao depende dele.
- Falhas: indisponibilidade, divergencia de dados, permissao.

## Connect Desk

- Objetivo: superficie de atendimento e possivel destino de handoff.
- Falhas: handoff nao entregue, conversa duplicada.

## Connect CIP

- Objetivo: apoio interno e tarefas futuras.
- Falhas: tarefa nao criada, contexto insuficiente.

## RAG institucional

- Objetivo: responder duvidas institucionais autorizadas.
- Falhas: fonte ausente, conteudo desatualizado, baixa confianca.
- Contingencia: handoff ou resposta de indisponibilidade.

## Agenda

- Objetivo: consultar slots e criar drafts.
- Restricao: confirmacao sensivel exige policy.

## Financeiro e gateway de pagamento

- Objetivo futuro: fluxos financeiros controlados.
- Restricao: fora do MVP automatizado.

## Observabilidade minima por integracao

- Provider.
- Operation.
- Correlation id.
- Latencia.
- Status.
- Erro normalizado.
- Retry count.
