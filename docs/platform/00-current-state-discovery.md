# Discovery — estado atual e ponto de partida da Agent Platform

> **Nota temporal:** este documento registra o Discovery de 2026-08-23 e é histórico. Para o estado atual do checkout após PLAT-S06, consulte `docs/platform/final-technical-audit.md`; os gaps descritos abaixo foram parcialmente fechados pelo vertical slice controlado e os bloqueios de produção continuam válidos.

**Data da rodada:** 2026-08-23
**Escopo:** `cvg-agent-secretary-v2` e todo o conteúdo de `docs/`
**Modo operacional:** construção controlada; sem dados reais, canais reais ou produção irrestrita.

## Resultado executivo

O repositório possui um MVP funcional de secretaria hospitalar controlada, não uma plataforma declarativa de agentes. A base existente é aproveitável: há contratos compartilhados, runtime de conversa, persistência em memória/PostgreSQL, approvals, RBAC operacional, auditoria, adapters fake, workflows de triagem/agendamento e console web. O prompt da plataforma exige um segundo plano arquitetural — control plane, versões de agentes, prompts, políticas, plugins, providers, handoff, Test Lab e configuração por tenant — que ainda não está presente no código.

Portanto, a decisão de Discovery é:

> **DISCOVERY_READY_WITH_DRIFT** — o data plane atual pode ser preservado, mas a nova plataforma precisa ser construída como uma camada explícita e compatível, com um primeiro vertical slice controlado.

## Evidência executável baseline

Comandos executados neste workspace antes de alterações de código:

| Evidência                    | Resultado    | Observação                                                                 |
| ---------------------------- | ------------ | -------------------------------------------------------------------------- |
| `npm test -- --reporter=dot` | PASS         | 42 arquivos; 102 testes pass; 2 skips                                      |
| `npm run typecheck`          | PASS         | TypeScript estrito sem emissão                                             |
| `npm run lint`               | PASS         | ESLint sem achados                                                         |
| `npm run format:check`       | PASS         | Prettier sem divergências                                                  |
| `npm run readiness`          | PASS         | 1 arquivo; 4 testes pass                                                   |
| Git status                   | INCONCLUSIVO | este diretório não possui `.git`; nenhuma limpeza/destruição foi executada |

### Risco do harness identificado

`vitest.config.ts` resolve todos os aliases `@cvg/*` para `/home/ricardo/.openclaw/workspace/cvg-agent-secretary-v2`, que é outro caminho fora deste workspace. A configuração de TypeScript aponta para `packages/*` localmente, mas o runner pode testar artefatos externos. Até a correção, a suíte baseline é evidência de comportamento do conjunto carregado pelo Vitest, não prova hermética do checkout atual.

## Inventário do data plane existente

| Área                  | Evidência                                  | Estado                                                           |
| --------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| contratos e envelopes | `packages/shared/src`                      | presente; hospitalar e parcialmente genérico                     |
| runtime de conversa   | `packages/agent-core`, `apps/worker`       | presente; `runAgentTurn` é determinístico e simples              |
| persistência          | `packages/persistence`, `0000_initial.sql` | presente; tabelas do Secretary sem tenant/control plane          |
| policy/approval       | `packages/policy`                          | presente; hardcoded para limites conservadores                   |
| ferramentas           | `packages/tools`                           | presente; registry imutável em memória, sem manifest/gateway     |
| adapters              | `packages/adapters`                        | fake WhatsApp e resiliência básica                               |
| RAG/memória           | `packages/rag`, `packages/memory`          | contratos mínimos; RAG noop sem fonte aprovada                   |
| handoff               | `packages/workflows`, `agent-core`         | resumo/fluxos; não há state machine de takeover                  |
| observabilidade       | auditoria e logs de rota                   | presente; trace de Test Lab inexistente                          |
| console               | `apps/web/src`                             | console operacional de approvals/tasks/audit; sem Control Center |
| CI                    | `.github/workflows/verify.yml`             | presente; precisa incluir gates da plataforma                    |

## Restrições de segurança que permanecem ativas

- Somente dados fictícios e ambientes controlados.
- Nenhuma confirmação, cancelamento ou reagendamento real.
- Nenhuma ação clínica, financeira ou prontuário definitivo.
- RAG somente com fonte institucional aprovada; default é handoff/no-op.
- Ações sensíveis exigem approval ou handoff.
- Segredos são referências/configuração de ambiente; nunca entram em UI, prompt persistido ou trace.
- O lançamento produzido nesta rodada não autoriza piloto real nem produção irrestrita.

## Conhecidos e desconhecidos

### Conhecidos

- O data plane existente tem testes unitários, integração, E2E controlado e smoke PostgreSQL.
- A política atual fecha agenda real e ações clínicas/financeiras.
- Não há modelo de tenant no schema atual.
- Não há modelo de `Agent`, `AgentVersion`, `PromptBlock`, `PluginManifest`, `ModelProvider`, `TestCase` ou `Trace` no runtime atual.

### Desconhecidos que não podem ser inventados

- Mapeamento real de cargos, tenants e destinos de handoff.
- Fonte institucional autorizada e sua governança de atualização.
- Provedor/modelo real e referências de segredo para qualquer ambiente externo.
- Regras operacionais para liberar piloto.

Esses pontos ficam fora do primeiro slice e registrados no backlog como decisões humanas, não como defaults silenciosos.

## Atualização após o primeiro slice controlado

O slice `PLAT-S01` agora existe no workspace local e é reproduzível com aliases herméticos. O control plane possui contratos e persistência tenant-aware; o Control Center cria Agent/AgentVersion, percorre DRAFT → TESTING → APPROVED → PUBLISHED, executa rollback como nova versão, roda Test Lab/eval sem chamada externa e registra auditoria minimizada. A seção `docs/platform/08-security-release-boundary.md` separa o que está pronto para construção controlada do que ainda exige integração humana/infraestrutura antes de qualquer dado real.
