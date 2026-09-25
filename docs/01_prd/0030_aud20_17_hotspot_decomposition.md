# PRD AUD20-17 — primeira fatia de decomposição

## Objetivo e escopo

Reduzir o hotspot `apps/api/src/server.ts` por uma extração incremental de
contexto de request, preservando integralmente o comportamento público e os
controles de identidade, permissão e tenant.

Inclui inventário/caps, módulo interno coeso, migração dos callers, testes de
contrato e arquitetura e roadmap das próximas fatias. Exclui novas APIs,
microserviços, mudanças de schema, persistência, contratos HTTP, políticas,
roles, mensagens públicas, frontend e refatoração simultânea dos demais
hotspots.

## Requisitos

- FR01: existir um único módulo owner da resolução de identidade/tenant e dos
  permission checks usados pelo servidor.
- FR02: `buildServer` e todos os endpoints manterão request/response, status,
  erro e efeitos observáveis atuais.
- FR03: trusted mode continuará fail-closed sem resolver e exigirá identidade
  tenant-bound; simulation manterá somente o comportamento controlado atual.
- FR04: divergência entre tenant da identidade e header continuará negada; o
  header nunca ampliará autoridade.
- FR05: memoização por objeto de headers continuará válida somente dentro do
  request, sem cache global ou compartilhamento entre requests.
- FR06: a fatia reduzirá `server.ts` em pelo menos 250 linhas e o novo módulo
  ficará abaixo de 450 linhas, sem ciclo ou import reverso.
- FR07: caps arquiteturais serão atualizados para a nova baseline reduzida e
  falharão para crescimento ou dependência proibida.
- FR08: próximas fatias dos hotspots remanescentes serão inventariadas sem
  autorizar seu BUILD nesta rodada.

## Aceite

- AC01: matriz de identidade/role/tenant passa pelos endpoints públicos.
- AC02: negativos sem resolver, sem tenant, tenant cruzado e replay entre
  requests permanecem fail-closed.
- AC03: testes de arquitetura provam ownership único, aciclicidade e redução
  mensurável; busca não encontra implementação duplicada no `server.ts`.
- AC04: focused, full suite, coverage, typecheck, lint, format, docs e crítica
  independente passam sem redução dos pisos.
- AC05: rollback restaura os helpers no servidor sem mudança de contrato ou
  dados; nenhuma migration é necessária.
- AC06: staging, produção, commit, push e deploy continuam não autorizados.

## Gate

`PRODUCT_DEFINED`: comportamento, invariantes, limites e aceite estão
definidos. BUILD depende da SPEC e de confirmação humana explícita.
