# PRD — CVG Agent Platform MVP controlado

## Problema

O runtime atual atende a Secretary com regras e fluxos acoplados ao domínio hospitalar. Isso impede criar Agent A/B, editar comportamento sem código, testar regressões de configuração e governar plugins sem duplicar runtime. O produto precisa de um control plane declarativo que preserve a operação controlada existente.

## Objetivo do MVP

Permitir que um operador administrativo autorizado, em ambiente de teste, crie uma configuração de agente, componha seus prompts/policies/plugins, execute um dry-run rastreável e publique/retorne versões imutáveis. O MVP deve ser genérico no kernel e manter a Secretary como template/adaptação inicial.

## Usuários

- **Admin controlado:** mantém agentes, versões, bindings e flags do próprio tenant.
- **Supervisor/Approver:** revisa policy, handoff e ações que exigem approval.
- **Builder/QA:** executa Test Lab e compara traces sem canal real.
- **Runtime:** resolve apenas versões publicadas e aplica hard safety.

## User stories e aceite

1. Como Admin, crio um draft com persona, greeting, thresholds e model ref sem segredo.
2. Como Builder, executo um caso fictício e vejo agent/version, intent, confidence, policy, knowledge, tools, response, handoff e trace.
3. Como Supervisor, uma ação sensível é bloqueada ou encaminhada; nenhuma configuração de agente a libera.
4. Como Admin, publico uma versão aprovada; o snapshot anterior não muda.
5. Como Admin, faço rollback criando uma nova versão apontando para snapshot anterior.
6. Como operador de outro tenant, não consigo ler, editar ou executar configurações fora do meu tenant.
7. Como runtime, uma ferramenta sem binding/permissão/approval não executa.
8. Como operador humano, quando takeover está ativo o bot fica silencioso até retorno explícito.
9. Como maintainer, a Secretary legada continua passando seus fluxos controlados.

## Não objetivos do MVP

- envio para WhatsApp/Chatwoot ou qualquer canal real;
- chamada a OpenAI/OpenRouter ou outro provider externo;
- RAG institucional real, prontuário, cobrança ou agenda real;
- marketplace de plugins;
- decisões clínicas, financeiras ou definitivas;
- descoberta automática de tenants/cargos reais;
- deploy ou migração destrutiva.

## Quality bar congelado

| ID    | Barra de qualidade              | Evidência mínima                                                 |
| ----- | ------------------------------- | ---------------------------------------------------------------- |
| QB-01 | nenhum alias externo no teste   | teste de resolução + inspeção de config                          |
| QB-02 | validação de fronteira          | schemas rejeitam tenant/id/config inválidos                      |
| QB-03 | isolamento tenant               | testes cross-tenant para read/write/run                          |
| QB-04 | publicação imutável             | testes de snapshot e rollback                                    |
| QB-05 | hard safety                     | matriz clínica/financeira/agenda sempre blocked/handoff          |
| QB-06 | gateway deny-by-default         | tool sem binding/permission/policy não roda                      |
| QB-07 | segredo não persistido/traceado | schema e redaction tests                                         |
| QB-08 | dry-run sem efeitos reais       | fake provider/channel e assertions de zero dispatch              |
| QB-09 | Secretary compatível            | suíte atual sem regressão, incluindo Postgres quando disponível  |
| QB-10 | engenharia verificável          | format, typecheck, lint, unit/integration, coverage local, audit |

## Métricas do MVP controlado

- 100% das decisões de tool e handoff no trace.
- 0 chamadas de provider/canal externo no Test Lab.
- 0 leitura cross-tenant nos testes.
- 100% de versões publicadas com hash/snapshot não mutável.
- cobertura mínima do código novo alinhada ao gate do repositório (80% statements/branches/functions/lines).

## Riscos e mitigação

- configuração flexível pode virar bypass: hard safety em código + gateway central;
- versionamento incorreto pode alterar conversas em curso: pin por versão e snapshot imutável;
- teste falso verde: aliases locais e teste de origem;
- vazamento em trace: schemas minimizados/redaction;
- pressão por piloto real: boundary explícito e signoff separado.

## PLAT-S10 — Control Center para catálogo declarativo de plugins

### Problema

O catálogo tenant-aware de manifests foi implementado no control plane e exposto
por API, mas o operador Admin ainda precisa sair do Control Center para revisar
metadata. Isso deixa a governança do plugin parcialmente API-only e não satisfaz
o requisito de uma superfície operacional para Plugins.

### Resultado controlado

O Admin deve conseguir carregar o catálogo do tenant, criar um snapshot de
metadata a partir dos campos controlados do editor, revisar o status e solicitar
as transições `DRAFT → APPROVED` ou `DRAFT → ARCHIVED`. O resultado precisa
exibir claramente que `APPROVED` é apenas metadata revisada: não instala código,
não concede permission, não registra handler e não libera provider, canal ou
efeito externo.

### Fora de escopo

Marketplace, download/instalação, dependências de rede, health probe externo,
handlers persistentes, provider/canal real, dados reais e qualquer side effect.

### Aceite

- o Control Center lista apenas os registros do tenant autenticado;
- a criação usa manifest validado e não envia segredo ou código executável;
- a aprovação envia `expectedStatus` e diferencia conflito stale de erro de
  validação;
- a UI informa status, versão e actor de aprovação e mantém a mensagem
  metadata-only;
- o fluxo legado de AgentVersion/Test Lab permanece inalterado.

## PLAT-S11 — event bus e hooks de plugins controlados

### Problema

O contrato de `PluginManifest` já reserva `hooks`, mas a plataforma ainda não
tem um barramento interno que publique eventos do pipeline nem uma fronteira
que obrigue cada hook a ser declarado pelo plugin. Sem esse contrato, um
plugin local não consegue observar lifecycle, policy, handoff ou erro de forma
tenant-aware e auditável.

### Resultado controlado

Adicionar um event bus tipado, allowlisted e somente em memória para o runtime
controlado. Hooks são registrados apenas por plugins locais já validados, com
tenant explícito, declaração correspondente no manifest, payload mínimo
redigido e envelope imutável. Falhas de hook são isoladas, registradas como
falha sanitizada e nunca alteram a decisão do Test Lab nem habilitam dispatch
externo.

### Fora de escopo

- broker durável, retry/outbox, webhook ou entrega entre processos;
- execução de manifests aprovados do catálogo S09;
- marketplace, instalação, código de terceiros, provider, canal ou side effect;
- payload bruto de mensagem, PII deliberada, segredo ou fonte institucional;
- observabilidade de produção, SLA de entrega ou garantia de HA.

### Aceite

- eventos internos usam nomes tipados e allowlisted e rejeitam nomes
  desconhecidos;
- a inscrição falha fechado quando o hook não está declarado no manifest, o
  handler não existe ou o tenant está inválido;
- cada entrega recebe cópia profunda redigida e imutável do envelope; um hook
  não consegue modificar a entrada original nem observar outro tenant;
- exceções de um hook não interrompem os demais hooks nem o Test Lab e geram
  resultado/auditoria sanitizados;
- o Test Lab emite eventos representativos de mensagem, resolução, policy,
  prompt, model, tool, handoff/security, response e conclusão sem alterar
  `externalCall: false`;
- testes RED/GREEN, typecheck, lint, format, build, coverage, readiness, E2E,
  audit e inspeção de fronteira permanecem verdes.
