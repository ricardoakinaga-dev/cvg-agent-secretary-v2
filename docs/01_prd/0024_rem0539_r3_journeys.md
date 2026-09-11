# 0024 — PRD R3: jornadas operacionais em fixtures

Data: 2026-09-05. Programa: `REM-0539`. Onda: R3. Estado: `PRD_VALIDATED_CONTROLLED`.

## Resultado do produto

Entregar uma jornada testável de secretária que identifica tutor e pet, coleta dados mínimos, propõe horários, cria tarefas e prepara handoff. A experiência deve sobreviver a reinício do processo e tornar cada incerteza visível ao operador. O resultado é uma sugestão rastreável; a decisão sensível continua humana.

## Requisitos funcionais

- **RF-R3-01** — Buscar tutor por identificador sintético dentro do tenant.
- **RF-R3-02** — Representar zero, um ou vários candidatos; nunca escolher candidato ambíguo automaticamente.
- **RF-R3-03** — Criar e recuperar `owner_draft` e `patient_draft` com idempotência e prazo de expiração.
- **RF-R3-04** — Vincular pet apenas por `candidateId` explícito, mesma conversa/tenant e estado elegível.
- **RF-R3-05** — Oferecer slots futuros de uma fonte local controlada e registrar a versão da fonte.
- **RF-R3-06** — Criar `appointment_draft` com `confirmationBlocked=true` e estado `awaiting_approval`.
- **RF-R3-07** — Criar tarefa operacional idempotente para pendências ou handoff.
- **RF-R3-08** — Produzir resumo de handoff redigido, correlacionado e recuperável.
- **RF-R3-09** — Permitir retomada após reconstruir o repositório sem perder drafts ou estado.

## Requisitos não funcionais e segurança

Tenant é obrigatório para toda leitura e mutação. PII de fixtures é minimizada e redigida em auditoria. O relógio pertence ao repositório; o chamador não escolhe `now`. Estados inválidos falham fechado. Risco crítico impede tools de jornada. A operação deve ser observável por eventos de auditoria sem payload sensível.

## Fora de escopo

Cadastro definitivo, agenda externa, confirmação/cancelamento/reagendamento reais, notificações, prescrição, prontuário, fonte institucional real, login externo e qualquer piloto. Esses itens exigem gates R4/R5 e aprovação humana separada.

## Critérios de sucesso

As jornadas principais e seus caminhos de ambiguidade, expiração, reinício, cross-tenant e takeover passam em testes determinísticos. Nenhum teste considera um stub vazio como integração. O gate R3 só fecha com evidência de persistência, handoff e regressão safety.
