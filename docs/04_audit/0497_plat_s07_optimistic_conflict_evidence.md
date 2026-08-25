# Evidência — PLAT-S07 conflito otimista controlado

## Identificação

- task: `PLAT-S07-001_OPTIMISTIC_VERSION_LIFECYCLE_CONFLICT_CONTROLLED`
- timestamp do fechamento: `2026-08-24T19:17:01-03:00`
- escopo: precondition de lifecycle no Control Center, store em memória, repository PostgreSQL, API e UI
- dados: somente fixtures e valores fictícios
- efeitos externos: `0`

## Resultado

```txt
PLAT-S07-001: COMPLETED_CONTROLLED
CONTROLLED_MVP_READY: PASS
PRODUCTION_REAL_DATA_READY: NO-GO
```

O lifecycle de `AgentVersion` agora aceita `expectedStatus` em transition, publish e rollback. Um snapshot stale recebe erro de domínio `conflict` e envelope HTTP 409, sem mutação parcial e sem auditoria de sucesso. O Control Center envia o status observado e orienta o operador a recarregar quando outro operador venceu a disputa.

## Implementação verificada

- store em memória compara a precondition antes de qualquer mutação;
- repository PostgreSQL mantém lock transacional, compara o status observado e preserva a atualização condicional;
- wrapper tenant-scoped repassa a mesma precondition;
- API valida o payload, mapeia `conflict` para 409 e só emite audit de sucesso depois da mutação concluída;
- client web preserva status/code da falha e a UI diferencia conflito de recusa de policy;
- chamadas internas sem precondition permanecem compatíveis somente no boundary controlado; a UI sempre envia o status observado;
- nenhuma rota S07 chama provider, canal, dispatcher ou ação sensível.

## Evidência executável

| Gate                           | Resultado                                                                 |
| ------------------------------ | ------------------------------------------------------------------------- |
| `npm run verify`               | PASS — 67 arquivos; 247 testes pass; 15 skips condicionais; 262 total     |
| coverage                       | PASS — statements 84,82%; branches 80,18%; functions 85,13%; lines 85,69% |
| `npm run readiness`            | PASS — 1 arquivo; 4 testes                                                |
| `npm run test:e2e`             | PASS — 1 fluxo Playwright                                                 |
| `npm run test:postgres`        | PASS — 6 arquivos; 49 testes pass; 15 skips condicionais                  |
| `npm audit --audit-level=high` | PASS — 0 vulnerabilidades                                                 |
| `npm run format:check`         | PASS                                                                      |
| `git diff --check`             | PASS                                                                      |

Os testes cobrem RED/GREEN em memória e API, stale precondition no repository PostgreSQL, publish stale em fixture real, ausência de sucesso indevido e recuperação visual do conflito no Control Center. O E2E final continuou verde após a mudança.

## Revisão e limites

A inspeção lead-only verificou ausência de mutação no conflito, preservação do tenant boundary, manutenção do caminho legacy controlado e ausência de efeitos externos. Os child agents continuaram indisponíveis por rejeição de modelo/limite da conta; esta evidência não reivindica aprovação independente.

S07 não entrega IdP confiável, RBAC operacional, ETag de proxy, lock distribuído, HA, coordenação multi-região, rollout real, retenção/PII, provider/canal ou side effects. A decisão permanece `CONTROLLED_MVP_READY`; produção real continua `NO-GO`/`WAITING_HUMAN_APPROVAL`.
