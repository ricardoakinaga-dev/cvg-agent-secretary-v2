# Item B — plano de execução dos 8 gates externos/humanos — 2026-09-25

Base: [promotion:check pós-fix](../AUD20/AUD20-head-anchored-fix-promotion-post-20260925.log) — `verifier PASS`, `eligible:false`, `reason: production_assurance_incomplete`, 8 bloqueios. Nenhum gate fecha por inferência; cada linha exige owner, evidência própria e decisão humana.

| # | Gate | Estado atual | Evidência exigida | O que o owner/usuário precisa fornecer | Preparação local que eu posso fazer |
|---|---|---|---|---|---|
| 1 | `modelProvider` | `NOT_VALIDATED` | Homologação com credenciais reais, quotas, fallbacks, orçamento; negativos | Credencial/endpoint do provider e owner | Dossiê de critérios + roteiro de homologação + negativos sintéticos |
| 2 | `channel` | `NOT_VALIDATED` | Gateway→efeito com conta autorizada, opt-in/out, limites | Conta/número de teste e owner do canal | Roteiro de homologação e checklist de opt-in |
| 3 | `externalIdentity` | `NOT_VALIDATED` | IdP confiável composto, rotação, sem identidade simulada | Tenant/IdP e owner de segurança | Contrato de composição e negativos de identidade |
| 4 | `institutionalRag` | `NOT_VALIDATED` | Fonte institucional aprovada, corpus/versões, proveniência, revogação, recusa | Fonte/corpus aprovado e owner de dados | Catálogo de fontes e checklist de proveniência/revogação |
| 5 | `rpoRto` | `NOT_VALIDATED` | Metas assinadas + restore/carga representativos medidos | Metas (RPO/RTO) e janela de exercício | Roteiro de restore/carga e template de medição |
| 6 | `pilot` | `NOT_VALIDATED` | Janela, participantes, critérios de saída, rollback ensaiado | Autorização de piloto e participantes | Plano de piloto e critérios de saída |
| 7 | `rollback` | `NOT_VALIDATED` | Procedimento versionado + exercício real | Janela/ambiente de exercício | Runbook de rollback e roteiro de ensaio |
| 8 | `humanSignoff` | `PENDING` | Aprovação explícita do candidato `68bb9d0a` + escopo, com validade | Decisor de release | Minuta de sign-off vinculada ao candidato e às condições |

## Ordem sugerida e dependências

1. **Dossiês de critérios (1–4)**: sem credenciais, posso preparar os documentos de homologação e os negativos sintéticos agora.
2. **Exercícios operacionais (5, 7)**: exigem ambiente/janela; eu preparo os roteiros e executo sob autorização.
3. **Piloto (6)** e **sign-off (8)**: dependem de participantes e do decisor; vêm por último, sobre o candidato congelado.

## Limites

- Nada aqui autoriza dados reais, integração externa, staging ou produção por si só; cada execução exige autorização própria e credenciais fornecidas pelo owner.
- O candidato certificado corrente é `68bb9d0a531007c5` (`CONDITIONAL_GO`/`AAA_CANDIDATE`); mudanças de fonte reabrem a certificação.
- A sessão humana de acessibilidade (`AUD20-19`) permanece adiada e é item do gate 8.

## Próximo passo concreto

Preencher, para cada gate: owner, credencial/ambiente e janela. Com os itens 1–4 respondidos, começo pelos dossiês de homologação; com 5/7, pelos roteiros de exercício.
