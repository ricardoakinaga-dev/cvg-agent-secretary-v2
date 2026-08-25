# Evidência — PLAT-S08 integridade de manifests e version pinning controlado

## Identificação

- task: `PLAT-S08-001_PLUGIN_MANIFEST_SEMANTIC_VALIDATION_AND_VERSION_PINNING`
- timestamp do fechamento: `2026-08-24T19:33:10-03:00`
- escopo: `PluginManifestSchema`, `PluginBinding`, `PluginRegistry`, `CapabilityGateway` e editor do Control Center
- dados: somente fixtures e handlers locais fake
- efeitos externos: `0`

## Resultado

```txt
PLAT-S08-001: COMPLETED_CONTROLLED
CONTROLLED_MVP_READY: PASS
PRODUCTION_REAL_DATA_READY: NO-GO
```

Manifests agora rejeitam coleções ambíguas, permissions ausentes para tools e dependência de si próprio. O registry aceita versões imutáveis do mesmo plugin, rejeita a combinação nome/versão duplicada, resolve a maior versão de modo determinístico quando o binding é legacy e resolve somente a versão exata quando o binding usa `version`. A versão pinned inexistente falha fechado antes do handler.

## Implementação verificada

- `PluginBinding.version` é opcional, preservando snapshots e configurações legacy sem pinning;
- `PluginManifestSchema` aplica invariantes de unicidade e coerência de permissions;
- `PluginRegistry` mantém cópias defensivas, suporta múltiplas versões e ordena resolução deterministicamente;
- `CapabilityGateway` retorna `plugin_version_not_registered` para pinning ausente sem invocar handler;
- Control Center permite informar/remover a versão pinned do plugin lógico;
- nenhuma operação acessa rede, instala código, persiste handler ou chama provider/canal.

## Evidência executável

| Gate                           | Resultado                                                                 |
| ------------------------------ | ------------------------------------------------------------------------- |
| `npm run verify`               | PASS — 68 arquivos; 250 testes pass; 15 skips condicionais; 265 total     |
| coverage                       | PASS — statements 84,88%; branches 80,17%; functions 85,22%; lines 85,74% |
| `npm run readiness`            | PASS — 1 arquivo; 4 testes                                                |
| `npm run test:e2e`             | PASS — 1 fluxo Playwright                                                 |
| `npm run test:postgres`        | PASS — 6 arquivos; 49 testes pass; 15 skips condicionais                  |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilidades                                                 |
| `npm run format:check`         | PASS                                                                      |
| `git diff --check`             | PASS                                                                      |

Os testes RED/GREEN cobrem manifesto inválido, múltiplas versões, duplicate name/version, cópia defensiva, pinning exato, seleção legacy e ausência de chamada em versão inexistente. A suíte existente de runtime, API, UI, E2E e PostgreSQL permaneceu verde.

## Revisão e limites

A auditoria lead-only verificou que version pinning não concede permission, approval ou bypass do CapabilityGateway; somente muda a resolução de um plugin já registrado localmente. Child agents permaneceram indisponíveis por limite de conta/incompatibilidade de modelo; nenhuma aprovação independente foi reivindicada.

S08 não entrega marketplace, catalogação persistente, dependências de rede, instalação de código de terceiros, provider/canal, HA ou produção real. A decisão permanece `CONTROLLED_MVP_READY`; produção continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.
