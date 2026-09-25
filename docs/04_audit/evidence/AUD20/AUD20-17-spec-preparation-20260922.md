# AUD20-17 — preparação Discovery/PRD/SPEC

- F20 confirmado: hotspots atuais 4.958/3.452/3.438/2.912/2.235 linhas;
- primeira fatia: contexto de request de `apps/api/src/server.ts`;
- escolha: módulo interno no monólito; microserviço e big-bang rejeitados;
- invariantes: default deny, tenant-bound, header sem ampliação de autoridade,
  memoização por request e compatibilidade HTTP integral;
- meta: reduzir `server.ts` em pelo menos 250 linhas, módulo novo <=450;
- estado: `WAITING_HUMAN_APPROVAL` para BUILD local;
- limites: sem schema, dado real, integração, efeito, commit, push ou deploy.
