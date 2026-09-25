# AUD20-17-FU1 — crítica independente da proposta de SPEC v2

- rodada: `2026-09-23`;
- escopo: revisão fresh-context das correções à proposta PRD/SPEC;
- veredito do draft: **SEM BLOQUEADOR DE SPEC**;
- execução: somente leitura; nenhum teste foi executado e nenhum arquivo foi
  alterado pelo revisor.

O revisor confirmou que as correções resolveram os pontos de v1: comportamento
de chaves desconhecidas especificado por parser; teste direto para parâmetros
de paginação repetidos e filtros audit não string; aceitação HTTP exige código,
mensagem, status e envelope; import de `@cvg/persistence` precisa ser
type-only.

Obrigações no BUILD, caso haja aprovação humana e admissão: os testes de rota
atuais geralmente verificam status e código, não a mensagem exata; adicionar
asserções de mensagem dentro da allowlist da nova SPEC. O BUILD continua
unadmitido até revisão humana hash-bound separada. Esta crítica não autoriza
código nem aceita a primeira fatia.
