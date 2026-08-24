# Implementation roadmap — Agent Platform

## Fases

| Fase | Entrega                                                 | Gate de saída                                            |
| ---- | ------------------------------------------------------- | -------------------------------------------------------- |
| 0    | harness hermético + discovery/PRD/SPEC                  | `DISCOVERY_READY`, baseline reproduzível                 |
| 1    | control plane: tenant, Agent, AgentVersion, store/repos | `IMPLEMENTATION_READY`, CRUD testado                     |
| 2    | prompts, model refs, policy bundle, response templates  | composição e fail-closed testados                        |
| 3    | plugin manifest, registry, capability gateway           | tool deny-by-default e audit                             |
| 4    | runtime kernel + adapters Secretary                     | Agent A/B em dry-run sem rewrite                         |
| 5    | handoff engine + human takeover                         | bot silencioso em `HUMAN_ACTIVE`                         |
| 6    | Test Lab, trace, eval/regression, A/B                   | zero canal real; trace completo                          |
| 7    | Admin API + Control Center UI                           | Admin tenant-aware edita/publica/rollback                |
| 8    | migration/Postgres, observability e hardening           | CI, security, coverage e smoke                           |
| 9    | preparação de signoffs                                  | release candidate com restrições; sem go-live automático |

## Fatia construída nesta rodada

O trabalho começa pelas fases 0–3 e por uma fatia vertical mínima da fase 4/6:

- aliases locais e regression de hermeticidade;
- contratos declarativos e store control plane;
- versão publicada/rollback imutáveis;
- prompt composer e policy bundle fail-closed;
- manifest/registry/gateway com fake tool;
- runtime dry-run com trace e provider determinístico;
- testes unitários/integrados e API admin mínima, se o limite de risco permitir.

## Próximas fatias registradas

- adaptar persistence PostgreSQL com tabelas de control plane e schema tenant-aware;
- implementar state machine de human takeover;
- adicionar Test Lab UI e edição de prompts/policies/plugins;
- conectar adapters atuais por manifests sem ativar canais;
- executar auditoria de segurança e E2E da jornada Admin → draft → test → publish → rollback.

## Não fazer como atalho

- não importar prompt fixo para substituir configuração declarativa;
- não expor API key ou segredo em `AgentVersion`;
- não aceitar `tenantId` de corpo sem validar contexto do operador;
- não chamar provider/canal real para “provar” o fluxo;
- não reescrever a Secretary antes de existir compatibilidade de contrato;
- não declarar produção pronta por cobertura verde em harness externo.
