# PRD AUD20-19 — qualificação honesta de resiliência e acessibilidade

## Objetivo e escopo

Separar claramente perfis de chaos/load, eliminar PASS com required skip,
executar carga local durável comparável e preparar/registrar validação humana
de acessibilidade.

Inclui manifesto de perfil, inventário de skips, fingerprint de hardware,
workload PostgreSQL sintético, thresholds locais declarados, roteiro de leitor
de tela e relatório humano. Exclui benchmark de produção, usuários reais sem
consentimento, teste clínico, staging, deploy e extrapolação de capacidade.

## Requisitos

- FR01: todo relatório declara perfil, candidato, Node, OS/CPU/memória,
  configuração, dataset, duração, concorrência e limitações.
- FR02: skip desconhecido ou required reprova; skip condicional só vale quando
  coberto por gate executado no mesmo candidato.
- FR03: workload durável usa PostgreSQL descartável, API/worker local e dados
  sintéticos; memória não pode qualificar persistência/capacidade.
- FR04: medir throughput, latência p50/p95/p99, erros, retries, backlog e
  recuperação, sem chamar thresholds locais de SLO.
- FR05: regressões de replay, tenant, lease, approval e efeitos permanecem
  invariantes sob carga/falha.
- FR06: roteiro humano cobre landmarks, nomes/descrições, ordem de foco,
  anúncios dinâmicos, erros, approvals e tarefas críticas.
- FR07: relatório humano identifica participante autorizado, tecnologia,
  roteiro, timestamps, achados e decisão; ausência permanece explícita.

## Aceite

- AC01: chaos completo no perfil declarado tem zero required/unknown skip.
- AC02: workload PostgreSQL gera relatório reproduzível com fingerprint e sem
  alegação de produção.
- AC03: known-bad sem DB, com skip oculto ou relatório in-memory é rejeitado.
- AC04: dossiê humano fica pronto sem inventar resultado; sessão real é gate
  separado e obrigatório para fechar F28.
- AC05: full/coverage/static/docs e crítica independente passam para tooling.
- AC06: produção e release continuam `NO_GO`.

## Gate

`PRODUCT_DEFINED`: requisitos técnicos e humanos estão separados. BUILD local
de tooling requer SPEC/aprovação; sessão humana requer pessoa e autorização.
