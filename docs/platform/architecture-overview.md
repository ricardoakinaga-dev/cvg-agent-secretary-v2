# Architecture overview — CVG Agent Platform

## Estado

Este documento descreve a implementação verificável do MVP controlado. O
artefato é `CONTROLLED_MVP_READY`; não é autorização para dados reais, canais,
providers, RAG ou ações sensíveis.

## Separação de planos

```text
Admin/API/UI ──► Control Plane ──► AgentVersion imutável
                    │ tenant + RBAC + CAS + audit
                    ▼
              Agent Kernel / Test Lab
                    │ policy + knowledge binding + gateway
                    ▼
              Trace redigido / handoff controlado
                    │
                    ▼
              Secretary data plane legado
```

O Control Plane é implementado principalmente em `packages/platform` e tem
portas equivalentes em `InMemoryControlPlaneStore` e
`PostgresControlPlaneRepository`. `apps/api` expõe a superfície administrativa
tenant-aware e `apps/web` fornece o Control Center. `packages/agent-core`
executa o runtime publicado e o worker usa a mesma porta de execução.

## Domínios

- configuração: `Agent`, `AgentVersion`, prompt, modelo, policy, plugins,
  knowledge e handoff;
- governança: approvals, release candidates, audit evidence e CAS;
- execução: kernel, Test Lab, suites, traces, event bus e capability gateway;
- compatibilidade: repositories/adapters da Secretary e sessão com pinning de
  agente/versão.

## Invariantes

Todo objeto novo é tenant-scoped, toda versão é snapshot e toda entrada externa
é validada por schema. Segredos aparecem somente como `secretRef`. O caminho
controlado usa provider determinístico (`externalCall: false`) e handlers
fixture; o caminho real continua deliberadamente fechado.

## Referências de implementação

- kernel: `docs/platform/agent-kernel.md`;
- configuração e lifecycle: `docs/platform/control-plane.md` e
  `docs/platform/agent-versioning.md`;
- plugins: `docs/platform/plugin-system.md`;
- segurança: `docs/platform/security-model.md`;
- operação: `docs/platform/operations-runbook.md`.
