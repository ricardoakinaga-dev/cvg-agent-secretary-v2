# PRD AUD20-06 — crítico e mutation como gates do selo

## Visão

O certificador deve tratar crítico independente e mutation sentinel como
pré-condições obrigatórias, candidate-bound e fail-closed da decisão local.

## Escopo funcional

1. O runner executa um gate `mutation_sentinel` com modo fail-on-gaps.
2. O runner valida o crítico pelo candidato/fingerprint corrente e rejeita
   relatório ausente, inválido, stale, adulterado ou de outra identidade.
3. Ambos os gates produzem logs e reports versionados no pacote de
   certificação e aparecem na lista canônica de gates requeridos.
4. O verificador reabre os reports, confere hashes, identidade do candidato,
   freshness e coerência com `gates.json`/resultado/manifesto.
5. Qualquer falha, `NOT_RUN`, gap, mutante não aplicável, exit code não zero ou
   artefato divergente impede formal closure e decisão qualificável.

## Regras

- `PASS` do mutation exige `detected === total`, `notDetected === 0` e
  `notApplicable === 0` para o catálogo congelado aplicável.
- O comando obrigatório contém `--fail-on-gaps`; não basta interpretar JSON
  depois de uma execução permissiva.
- O crítico precisa declarar identidade distinta, fresh context, ausência de
  escrita no worktree e fingerprint before/after idêntico.
- Crítico e mutation usam o mesmo `candidateId`, commit e tree hash da decisão.
- Report ausente/stale é falha, nunca skip opcional.
- Alteração do candidato após qualquer um dos reports invalida o gate.

## Aceite do produto

- AC01: caminho válido inclui ambos os gates e permite a decisão local apenas
  quando todos os requisitos existentes também passam.
- AC02: crítico de outro commit/candidato ou adulterado derruba o selo.
- AC03: mutante sobrevivente, target stale/não aplicável ou report ausente
  derruba o selo.
- AC04: exit code mascarado ou divergência entre log/report/gate derruba o selo.
- AC05: verifier detecta alteração pós-review/pós-mutation.
- AC06: evidência é redigida, reproduzível e não autoriza staging/produção.

## Não objetivos

- Produzir um parecer independente automaticamente.
- Expandir o catálogo de mutantes além do necessário para integrar o gate.
- Aprovar external gates, release ou produção.

## Estado do produto

`PRODUCT_DEFINED` para SPEC técnica. O único boundary humano restante é a
autorização do BUILD local após a SPEC.
