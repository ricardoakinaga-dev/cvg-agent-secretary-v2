# Discovery AUD20-17 — decomposição incremental de hotspots

## Trigger e problema

`AUD20-09` foi concluída e o DAG liberou `AUD20-17`, responsável pelo achado
F20. O problema observado não é apenas tamanho: `apps/api/src/server.ts`
concentra composição HTTP, identidade, autorização, tenant, parsing, rotas e
tradução de erro em 4.958 linhas. Essa concentração aumenta o custo de revisão
e torna mudanças de segurança difíceis de isolar.

Outros hotspots permanecem em `agent-runtime/orchestration.ts` (3.452),
`persistence/postgres.ts` (3.438), `agent-runtime/runtime.ts` (2.912) e no
frontend de plataforma (2.235). Atacar todos de uma vez elevaria o risco e
contrariaria o backlog, que exige uma extração vertical por rodada.

## Evidência e fluxo atual

- `buildServer` resolve identidade efetiva e expõe closures usadas por dezenas
  de rotas;
- funções de contexto do request entre `parseInboundChannel`, resolução de
  tenant, permission checks e `requirePlatformScope` vivem no final de
  `server.ts`, embora constituam uma responsabilidade coesa;
- testes de boundary, identidade, tenant e arquitetura já exercitam o caminho
  público e fornecem rede de regressão;
- o cap arquitetural atual impede crescimento além da baseline, mas não exige
  redução nem verifica direção de dependência da extração.

## Resultado desejado e guardrails

A primeira fatia deve mover a responsabilidade coesa de contexto de request
(identidade, permissões e tenant) para módulo interno dedicado, mantendo
`buildServer`, exports, rotas, status HTTP, mensagens de erro e defaults de
teste exatamente compatíveis. `server.ts` deve reduzir materialmente e não
pode nascer um segundo caminho de autorização.

Guardrails: modular monolith, sem serviço novo, schema, migration, API, dado
real ou efeito externo; default deny e vínculo de tenant permanecem; uma
extração por vez; staging e produção `NO_GO`.

## Alternativas consideradas

1. Manter apenas caps: rejeitada, pois evita regressão mas não fecha F20.
2. Quebrar todas as rotas/hotspots simultaneamente: rejeitada por blast radius,
   ownership difuso e rollback ruim.
3. Extrair primeiro contexto de request: recomendada por coesão, alto reúso,
   ausência de persistência e verificação disponível no boundary HTTP.

## Hipótese, riscos e recomendação

Hipótese: uma extração puramente estrutural e contract-first reduz ao menos 250
linhas do hotspot, concentra um único owner para identidade/tenant e preserva
100% dos contratos observáveis. Riscos: relaxar fail-closed, criar ciclo,
duplicar helpers, alterar memoização ou depender de constantes internas.

`DISCOVERY_READY`: seguir para PRD/SPEC da primeira fatia. A task completa
exige essa fatia verificada e um inventário priorizado das próximas; não exige
big-bang dos cinco hotspots.
