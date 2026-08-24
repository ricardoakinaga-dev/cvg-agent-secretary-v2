# 0002 — Contexto Operacional

## Onde o problema ocorre

Na interface entre tutores, recepcao, equipe clinica, agenda, sistemas internos e canais de comunicacao.

## Etapas afetadas

1. Entrada da mensagem.
2. Criacao ou retomada de sessao.
3. Identificacao de intencao.
4. Identificacao de tutor e pet.
5. Triagem inicial.
6. Sugestao de acao ou handoff.
7. Registro e auditoria.
8. Criacao de tarefa interna.

## Atores envolvidos

- Tutor.
- Pet/paciente.
- Recepcionista.
- Equipe clinica.
- Gestor operacional.
- Agente Esmeralda V2.
- Sistemas externos: HIS, Connect Desk, Connect CIP, WhatsApp, agenda, financeiro e RAG institucional.

## Ferramentas atuais ou previstas

- Canal de mensagem, inicialmente WhatsApp.
- Banco proprio da agente.
- Painel minimo.
- HIS, Desk e CIP como integracoes futuras ou adaptadas.
- LangGraph para workflows.
- Tools desacopladas para acoes operacionais.

## Processo atual inferido

O atendimento depende de humanos e sistemas separados. A coleta de dados, triagem, handoff e registro precisam ser padronizados para reduzir retrabalho e risco.

## Workaround existente

Operacao manual por recepcao, com transferencia de contexto entre canais e sistemas. Esse workaround e aceitavel no inicio, mas nao escala sem runtime, auditoria e approvals.
