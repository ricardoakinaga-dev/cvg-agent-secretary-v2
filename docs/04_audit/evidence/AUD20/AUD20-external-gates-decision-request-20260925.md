# Pedido de decisão — 8 gates externos/humanos (B25-09/R5) — 2026-09-25

Status deste documento: **PEDIDO**, não dossiê comprobatório e não autorização. Cada gate só fecha com evidência própria + owner + autorização específica. Sem isso, produção permanece `NO_GO`.

## Estado atual

`certification/external-gates.json`: `modelProvider`, `channel` e `externalIdentity` como `NOT_VALIDATED`; `humanSignoff` como `PENDING` ("No real provider credentials, channels, IdP or human approval were available in this environment"). RAG institucional, RPO/RTO, piloto e rollback seguem sem prova, ambiente ou owner.

## Gates, evidência exigida e owner (tudo TBD salvo o estado)

| # | Gate | Estado | Evidência exigida | Owner/decisor TBD |
|---|------|--------|-------------------|-------------------|
| 1 | Provider de modelo | `NOT_VALIDATED` | Homologação com credenciais/quotas reais, fallbacks, orçamento; sem efeitos fora do escopo | Dono do provider + segurança |
| 2 | Canal (ex. WhatsApp) | `NOT_VALIDATED` | Homologação gateway→efeito, números/contas autorizadas, opt-in/out | Dono do canal + operação |
| 3 | Identidade externa (IdP) | `NOT_VALIDATED` | IdP confiável composto, rotação de credenciais, sem identidade controlada em produção | Segurança + dono do serviço |
| 4 | RAG institucional | sem prova | Fonte institucional aprovada, corpus/versões, proveniência, revogação e recusa | Dono dos dados + produto |
| 5 | RPO/RTO | sem prova | Metas assinadas + exercício de restore/carga representativo medido | Operação/dono do serviço |
| 6 | Piloto | sem prova | Janela, participantes, critérios de saída e rollback ensaiado | Produto + operação |
| 7 | Rollback | sem prova | Procedimento versionado + exercício (não apenas documento) | Operação |
| 8 | Sign-off humano | `PENDING` | Aprovação explícita do candidato selado + escopo, com validade | Autoridade de release |

## Limites

- Nenhum gate fecha por inferência, nota alta, suíte verde ou pressão de prazo; "ausência de evidência não é sucesso presumido".
- Estes gates não destravam entre si: cada um exige seu dossiê; o sign-off (8) vem por último, sobre o candidato selado (B25-08).
- Este pedido não autoriza homologações, pilotos, contato com usuários, credenciais reais, staging/produção ou deploy. Sem os 8 fechados, `promotion:check` permanece inelegível e produção `NO_GO`.
