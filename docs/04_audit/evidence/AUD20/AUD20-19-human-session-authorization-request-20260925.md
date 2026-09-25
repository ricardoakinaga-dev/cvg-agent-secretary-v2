# Pedido de autorização — sessão humana AUD20-19 — 2026-09-25

Status deste documento: **PEDIDO**, não autorização. A sessão só existe após decisão humana específica com os campos abaixo preenchidos. Nenhuma automação pode declarar esta sessão concluída.

## 1. Finalidade

Sessão humana de acessibilidade/qualificação de `AUD20-19/IMP50-18` sobre o harness admitido (SPEC v4 em `docs/02_spec/aud20_19_imp50_18_human_session_harness_20260923.md`), para os gates que evidência automatizada não supre (tecnologia assistiva, operação real por pessoas, consentimento, mídia).

## 2. Decisões exigidas da autoridade humana (todas TBD)

| Campo                  | Valor atual |
| ---------------------- | ----------- |
| Participantes          | TBD — recrutar e identificar |
| Consentimento          | TBD — termo assinado antes de qualquer captura |
| Equipamento/AT         | TBD — leitor de tela, dispositivos, browser |
| Janela/data            | TBD |
| Ambiente               | Somente harness local controlado; nunca staging/produção ou dados reais |
| Mídia/dados capturados | TBD — política de retenção/descarte antes da sessão |
| Critério de aceite     | TBD — o que conta como sessão válida vs. inconclusiva |
| Owner do dossiê        | TBD |

## 3. Limites rígidos

- Sem participantes sem consentimento; sem captura fora do termo; sem dados reais, prontuários ou integrações externas.
- A sessão avalia o harness, não aprova produto, release, canais, RAG ou operação hospitalar.
- Worktree deve estar limpo e candidato identificado antes da sessão; caso contrário, a sessão prova apenas o que foi executado, sem binding a release.

## 4. O que este pedido NÃO autoriza

A sessão em si, qualquer aceite de `IMP50-18`, uso de dados reais, staging/produção, ou dispensa da crítica R2 (objeto do [pedido R2](AUD20-19-FU1-R2-critic-request-20260925.md)). Sem resposta humana preenchendo a tabela acima, `AUD20-19` permanece `WAITING_HUMAN_APPROVAL`.
