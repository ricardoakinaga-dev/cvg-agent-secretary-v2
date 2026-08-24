# 0012 — Regras de Negocio

## Regras operacionais

- A agente deve tratar WhatsApp como canal, nunca como nucleo do produto.
- Toda conversa deve pertencer a uma sessao.
- Toda acao de tool deve ser registrada.
- Toda acao sensivel deve passar por policy engine.
- Handoff humano deve incluir resumo estruturado.
- A agente deve operar em modo solo quando integracoes externas estiverem indisponiveis.
- Integracoes com HIS, Desk e CIP devem ser acessadas por adapters.

## Restricoes

- Nao dar diagnostico fechado.
- Nao prescrever tratamento.
- Nao alterar prontuario definitivo sem aprovacao.
- Nao confirmar procedimento caro sem regra clara.
- Nao cancelar agenda critica sem validacao.
- Nao executar cobranca sensivel sem autorizacao.
- Nao criar agentes demais antes de estabilizar os fluxos iniciais.

## Permissoes de negocio

- Pode responder duvidas institucionais autorizadas.
- Pode coletar dados de tutor e pet.
- Pode classificar urgencia operacional.
- Pode orientar procura de atendimento emergencial em casos de risco.
- Pode sugerir encaixe ou horario.
- Pode criar draft de atendimento.
- Pode criar tarefa interna.
- Pode pedir aprovacao humana.

## Validacoes obrigatorias

- Validar identidade minima de contato antes de vincular dados sensiveis.
- Validar se a acao exige aprovacao humana.
- Validar se a resposta depende de conteudo institucional confiavel.
- Validar duplicidade de mensagem, tool call e tarefa.
- Validar se o caso saiu do escopo seguro da agente.
