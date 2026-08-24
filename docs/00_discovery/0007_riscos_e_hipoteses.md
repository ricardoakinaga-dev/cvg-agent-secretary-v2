# 0007 — Riscos e Hipoteses

## Hipoteses nao validadas

- A recepcao aceitara operar approvals em painel minimo.
- Os fluxos iniciais cobrem volume suficiente para o MVP.
- Banco proprio da agente e suficiente antes de integrar HIS.
- Regras de confirmacao de consulta podem ser formalizadas sem depender de decisao humana em todos os casos.
- RAG institucional tera conteudo confiavel para duvidas simples.

## Riscos operacionais

- A agente executar ou sugerir acao alem do nivel permitido.
- Handoff incompleto em caso sensivel.
- Indisponibilidade de adapter externo.
- Duplicidade de tarefa ou agendamento se idempotencia for fraca.
- Falta de auditoria dificultar investigacao.

## Riscos de adocao

- Recepcao ignorar fila de approvals se o painel for lento.
- Equipe confiar demais em resposta automatica.
- Usuarios esperarem diagnostico ou decisao medica.
- Gestao querer integrar tudo antes do runtime estar solido.

## Dependencias externas

- Meta WhatsApp API ou Evolution API temporario.
- CVG-HIS.
- Connect Desk.
- Connect CIP.
- RAG institucional.
- Agenda e financeiro.

## Limitacoes conhecidas

- MVP nao cobre prontuario definitivo.
- MVP nao cobre prescricao ou diagnostico.
- MVP nao automatiza cobranca sensivel.
- MVP depende de regras humanas para acoes criticas.
