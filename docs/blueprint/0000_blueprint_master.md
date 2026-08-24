# Blueprint Master — cvg-agent-secretary-v2

## Identidade

- Nome: `cvg-agent-secretary-v2`
- Apelido operacional: Esmeralda V2
- Papel: agente operacional autonoma ou semi-autonoma para comunicacao, triagem, agenda, tarefas e apoio interno do hospital veterinario.
- Natureza do produto: runtime de agente hospitalar, capaz de operar sozinho ou conectado a sistemas existentes.

## Objetivo principal

Criar uma agente capaz de executar o ciclo:

```txt
Atender -> entender -> classificar -> coletar dados -> executar ou sugerir acao -> registrar -> escalar para humano
```

O sistema nao deve depender fortemente de CVG-HIS, Connect Desk ou Connect CIP. A arquitetura deve permitir modo solo, modo integrado e modo semi-autonomo.

## Principio arquitetural

Modelo proibido:

```txt
WhatsApp -> Bot -> HIS
```

Modelo correto:

```txt
Canal
-> Adapter
-> Agent Runtime
-> LangGraph Workflows
-> Tools
-> System Adapters
-> HIS / Desk / CIP / WhatsApp / Banco proprio
```

## Modos de operacao

### Modo Solo

A Esmeralda V2 funciona sem HIS, com banco proprio, painel minimo, sessoes, tarefas, historico de conversas, fila de aprovacao humana e integracao WhatsApp.

### Modo Integrado

A agente se conecta a CVG-HIS, Connect Desk, Connect CIP, Meta WhatsApp API, RAG institucional, agenda e financeiro.

### Modo Semi-autonomo

A agente executa tarefas controladas e pede aprovacao para acoes sensiveis. Ela pode responder horarios, coletar dados de agendamento e sugerir encaixes; confirmacoes sensiveis dependem de regra explicita.

## Nivel de autonomia do MVP

O MVP deve operar entre:

- Nivel 1: coleta dados.
- Nivel 2: sugere acao.

Nao deve iniciar com automacao medica avancada, diagnostico, prontuario definitivo ou decisoes financeiras sensiveis.

## Componentes principais

```txt
cvg-agent-secretary-v2
├── apps
│   ├── api
│   ├── worker
│   └── web
├── packages
│   ├── agent-core
│   ├── workflows
│   ├── tools
│   ├── adapters
│   ├── memory
│   ├── policy
│   ├── rag
│   └── shared
└── docs
    ├── blueprint
    ├── discovery
    ├── prd
    ├── spec
    ├── build
    ├── audit
    └── runtime
```

## Nucleo do agente

O nucleo deve conter:

- Agent Runtime
- Session Manager
- State Manager
- LangGraph Orchestrator
- Tool Registry
- Policy Engine
- Memory Engine
- Human Approval Layer
- Audit Logger
- Task Queue

## Workflows iniciais

1. `01_identificacao_tutor_pet`
2. `02_triagem_inicial`
3. `03_agendamento_consulta`
4. `04_handoff_humano`
5. `05_confirmacao_agenda`
6. `06_retorno_pos_atendimento`
7. `07_duvida_institucional`

## Multiagentes iniciais

Comecar com poucos agentes:

- Reception Agent
- Triage Agent
- Scheduling Agent
- Handoff Agent
- Task Agent

Agentes futuros:

- Billing Agent
- Medical Context Agent
- Internal CIP Agent
- Quality Supervisor Agent

## Tools iniciais

As tools devem ser contratos desacoplados:

- `search_owner_by_phone`
- `create_owner_draft`
- `search_patient`
- `create_patient_draft`
- `classify_triage_risk`
- `find_available_slots`
- `create_appointment_draft`
- `request_human_approval`
- `send_message`
- `create_internal_task`
- `create_handoff_summary`

No comeco, essas ferramentas podem usar banco local ou mocks. Depois apontam para HIS, Desk e CIP por adapters.

## Banco proprio minimo

Tabelas minimas:

- `conversations`
- `messages`
- `sessions`
- `agent_runs`
- `tool_calls`
- `approval_requests`
- `handoff_events`
- `tasks`
- `contacts`
- `patient_links`
- `memory_facts`
- `safety_events`
- `integration_events`

## Regras de seguranca

A agente nao deve:

- dar diagnostico fechado;
- prescrever tratamento;
- alterar prontuario definitivo sem aprovacao;
- confirmar procedimento caro sem regra clara;
- cancelar agenda critica sem validacao;
- executar cobranca sensivel sem autorizacao.

A agente pode:

- coletar dados;
- classificar urgencia operacional;
- orientar procura de atendimento emergencial;
- resumir conversa;
- abrir tarefa;
- sugerir acao;
- pedir aprovacao humana.

## MVP recomendado

O primeiro MVP deve entregar:

1. Receber mensagem.
2. Criar sessao.
3. Identificar intencao.
4. Identificar tutor e pet.
5. Rodar triagem simples.
6. Criar resumo de handoff.
7. Enviar resposta.
8. Registrar tudo em auditoria.
9. Permitir aprovacao humana.
10. Criar tarefa interna.

## Ordem correta de construcao

1. Fase 0: Blueprint.
2. Fase 1: Discovery operacional.
3. Fase 2: PRD do produto.
4. Fase 3: SPEC tecnica.
5. Fase 4: Arquitetura de pastas.
6. Fase 5: Agent Core.
7. Fase 6: Workflows LangGraph.
8. Fase 7: Tools desacopladas.
9. Fase 8: Adapters.
10. Fase 9: Painel minimo.
11. Fase 10: Auditoria e runtime.

## Decisao de produto

O projeto deve ser construido como `Agent Platform Hospitalar`. Essa decisao permite que a Esmeralda V2 evolua para atendente virtual, secretaria operacional, assistente da recepcao, assistente interno do CIP, orquestradora de tarefas, camada inteligente do Connect Desk e produto SaaS veterinario.
