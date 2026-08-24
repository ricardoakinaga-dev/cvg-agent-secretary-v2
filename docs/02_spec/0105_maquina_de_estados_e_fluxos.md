# 0105 — Maquina de Estados e Fluxos

## Conversation

Estados:

- `new`
- `active`
- `waiting_human`
- `waiting_approval`
- `resolved`
- `archived`

Transicoes:

- `new -> active`: primeira mensagem processada.
- `active -> waiting_approval`: policy exige aprovacao.
- `active -> waiting_human`: risco, baixa confianca ou handoff.
- `waiting_approval -> active`: aprovacao concedida.
- `waiting_approval -> waiting_human`: rejeicao, expiracao ou assuncao.
- `active -> resolved`: fluxo concluido.
- `resolved -> archived`: retencao operacional encerrada.

Transicoes proibidas:

- `archived -> active` sem nova sessao.
- `waiting_approval -> resolved` sem decisao.

## Session

Estados:

- `open`
- `collecting_data`
- `triage`
- `scheduling`
- `handoff`
- `closed`

Falhas:

- dados insuficientes;
- intencao ambigua;
- adapter indisponivel;
- policy bloqueou acao.

## ApprovalRequest

Estados:

- `pending`
- `approved`
- `rejected`
- `expired`
- `assumed`

Regras:

- Uma aprovacao pendente nao pode ser aprovada duas vezes.
- A decisao deve registrar operador, horario e justificativa quando houver rejeicao.

## Task

Estados:

- `open`
- `in_progress`
- `done`
- `canceled`

Regras:

- Task precisa de titulo, origem, prioridade e vinculo operacional.
- Task cancelada deve registrar motivo.

## Fluxos iniciais

- `01_identificacao_tutor_pet`: coleta e vincula contato/paciente.
- `02_triagem_inicial`: classifica risco operacional sem diagnosticar.
- `03_agendamento_consulta`: sugere slots e cria draft.
- `04_handoff_humano`: cria resumo e transfere.
- `05_confirmacao_agenda`: exige policy e possivelmente approval.
- `06_retorno_pos_atendimento`: cria follow-up seguro.
- `07_duvida_institucional`: responde com RAG autorizado ou handoff.
