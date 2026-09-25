# 0572 — Nova rodada de melhorias após o query-parser

**Fonte:** [revisão incremental 0571](0571_implementation_state_review_2026-09-23.md). Esta rodada complementa os 50 itens do [backlog 0341](../03_build/0341_plan50_backlog_20260923.md); não os renumera nem cria BUILD aprovado. Os 12 itens abaixo são fatias propostas, vinculadas a tasks `AUD20-*` e `IMP50-*` existentes. Critérios completos e disposição estão no [backlog 0343](../03_build/0343_post_query_backlog_20260923.md).

## Alta prioridade — 5

1. **NQP-01 — fechar o piso de coverage de funções.** Investigar 89,25% contra ≥90% sem alterar denominador/threshold para fabricar PASS (`IMP50-36`, `AUD20-12`; QP-02).
2. **NQP-02 — classificar e executar os 192 skips.** Separar testes condicionais de required skips e exercitar PostgreSQL descartável (`IMP50-07/36`, `AUD20-11/12`; QP-03).
3. **NQP-03 — adjudicar request-context.** Avaliar C01–C07 da primeira fatia sobre evidência própria e candidato integrado, com revisão de SPEC se necessária (`IMP50-40`, `AUD20-17`; QP-04).
4. **NQP-04 — executar o collector sintético admitido.** Após NQP-03, seguir a SPEC já aprovada de `AUD20-10/IMP50-09`, com negativos de PII, correlação e entrega (`QP-06`).
5. **NQP-05 — produzir candidato único e re-selo.** Após os gates locais, reconstruir imagens/SBOM, compor serviços e certificar os mesmos bytes (`IMP50-01..08`, `AUD20-07/11/12`; QP-08).

## Média prioridade — 5

6. **NQP-06 — reconciliar estado e ponteiros.** Corrigir resumos vivos que confundem proposta, fatia aceita e task concluída; a reconciliação documental inicial foi feita nesta rodada (`IMP50-21`, `AUD20-08`; QP-05).
7. **NQP-07 — testar drift semântico.** Fazer o checker detectar divergência entre estado canônico, resumo de 0337/0341 e status de subfatia, com negativo explícito (`IMP50-22`, `AUD20-08`; QP-05).
8. **NQP-08 — validar query-parser no boundary integrado.** Repetir rotas/erros e cenários PostgreSQL pertinentes no build final, sem reutilizar o PASS local como prova da composição (`IMP50-28/34`, `AUD20-11/12`; QP-01/03).
9. **NQP-09 — resolver linhagem de evidências.** Buscar suporte exato ou política aprovada para os 141 vínculos, sem classificar automaticamente `IMP50-49` (`AUD20-08-FU3`; QP-07).
10. **NQP-10 — obter owner e SLO operacionais.** Preparar medidas propostas e pedir decisão humana antes de fechar alertas ou aceitar metas (`IMP50-10/23`, `AUD20-10`; QP-06).

## Baixa prioridade — 2

11. **NQP-11 — simplificar navegação corrente/histórica.** Apontar para 0571/0342/0343 nos masters sem duplicar o status das tasks (`IMP50-43`, `AUD20-08`; QP-05).
12. **NQP-12 — alinhar launcher e catálogo de comandos.** Após gate próprio de `IMP50-42`, verificar descoberta de Node 22.23.2 e atualizar o catálogo `IMP50-50` se scripts mudarem (`AUD20-08`; QP-05).

Nenhum item altera o teto local de evidência, a necessidade de aprovação da SPEC/BUILD ou o `NO_GO` de staging e produção. A ordem real está no [roadmap 0342](../03_build/0342_post_query_roadmap_20260923.md).
