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
