# Evidência de auditoria — PLAT-S14-001

## Identificação

- task: `PLAT-S14-001_CONTROLLED_SAFETY_PUBLISH_PREFLIGHT`
- lane: `PLAT-S14_CONTROLLED_SAFETY_PUBLISH_PREFLIGHT`
- timestamp do fechamento: `2026-08-25T09:59:11-03:00`
- fase: `AUDIT`
- base: `f9e0096` (`main`) + checkout controlado não publicado
- dados: somente fixtures fictícias e Test Lab fake/determinístico

## Escopo auditado

O lane adiciona cinco cases críticos imutáveis e internos para medicamento,
confirmação/cancelamento/reagendamento de consulta real e envio externo. O
preflight executa no mesmo tenant/agent/version, retorna apenas resumo redigido
e é exigido pelo endpoint de publish e pelo rollback. O Control Center chama o
endpoint de preflight antes da publicação para dar visibilidade ao operador;
API repete a barreira no boundary para impedir bypass.

Nenhum provider, canal, RAG, agenda, migration, dado real ou side effect foi
adicionado. O bootstrap controlado `CVG Secretary` também roda o preflight antes
de publicar seu preset fictício.

## Quality bar

| ID      | Resultado                                                                              |
| ------- | -------------------------------------------------------------------------------------- |
| CTRL-48 | PASS controlado — cases fixos, sem input arbitrário, binding validado                  |
| CTRL-49 | PASS controlado — publish/rollback recusam sem mutação quando o preflight falha        |
| CTRL-50 | PASS controlado — relatório/audit não carregam mensagem, resposta ou trace             |
| CTRL-51 | PASS controlado — medicamento bloqueia e encaminha; ações reais permanecem bloqueadas  |
| CTRL-52 | PASS controlado — `externalCall: false` nos cases normais e fixture negativa detectada |
| CTRL-53 | PASS controlado — regressão completa permanece verde                                   |

## Evidência executável

- RED inicial: 5 falhas focadas (módulo/endpoint ausentes e bypass de publish),
  antes da implementação.
- GREEN focado: 2 arquivos, 12 testes pass.
- `npm run verify`: PASS.
- `npm test`: 80 arquivos pass, 2 skips, 289 testes pass, 16 skips, 305 total.
- coverage: 85,06% statements; 80,38% branches; 85,97% functions; 85,98% lines.
- `npm run readiness`: PASS, 1 arquivo/4 testes.
- `npm run test:e2e`: PASS, 1 fluxo/7,1 s; browser configura, executa preflight,
  publica e confirma dry-run sem chamada externa.
- `npm run test:postgres`: PASS, 4 arquivos; 49 testes pass; 16 skips
  condicionais por ausência de `TEST_DATABASE_URL`.
- `npm audit --audit-level=high`: PASS, 0 vulnerabilidades.
- `git diff --check`: PASS.

## Revisão de segurança

O relatório público contém somente `caseId`, resultado, falhas, decisão,
response mode, handoff e indicador de chamada externa. A auditoria de publish
persiste somente contagem, ids de cases falhos e o resultado do gate. A fixture
`UnsafeTraceStore` foi usada para provar que `externalCall: true` falha fechado
e deixa a versão em `APPROVED`; rollback recebe a mesma proteção.

O fechamento foi lead-only: child agents não estavam disponíveis por limite de
uso/incompatibilidade de modelo. Não é reivindicada aprovação independente.

## Veredito e limites

`PLAT-S14-001` = `COMPLETED_CONTROLLED`.

O resultado máximo continua `CONTROLLED_MVP_READY`. Produção real permanece
`NO-GO`/`WAITING_HUMAN_APPROVAL`: IdP/RBAC/tenant binding, RLS e rollout do data
plane legado, roles/secrets, limiter/replay/HA distribuídos, host security,
retenção/PII, providers/canais, knowledge institucional, observabilidade e
qualquer ação clínica, financeira, de prontuário ou agenda real continuam fora
do gate.
