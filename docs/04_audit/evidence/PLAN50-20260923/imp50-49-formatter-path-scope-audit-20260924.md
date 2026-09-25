# IMP50-49 — auditoria de escopo dos hits do formatter — 2026-09-24

## Pergunta e limites

Verificar se os 12 nomes de artefato que aparecem no log Prettier `full-cert`
constituem vínculo de conteúdo/candidato para os 141 casos IMP50-49. A análise é
read-only: leu manifestos e o log do gate, não abriu payloads `raw` ou arquivos
alvo, não executou ferramenta do produto e não alterou classes, snapshots ou
mapa.

## Evidência ligada ao run

- `manifest.json` SHA-256
  `35c422800f3793437850812130219cdabbf2fbacde734656cb7ad1e2b35146c0` registra
  `run-bf035ddfe187-mu0ldbpd`, candidate
  `bf035ddfe1874918cc01fdca99a7f199393894cbf7fa0e803063f3085c43f426`, commit
  `512bc11e80fbf7c7b8baf6263aacc811ff829309`.
- O manifesto do run aponta para `certification/logs/format.log`; seu registro de
  artefato declara SHA-256
  `d3cb23784cc406ae1c9c36575ef2632e89bd5f3c0d5b572e6cd685c24957cdc0` e 23.561
  bytes, correspondentes ao log `full-cert/format.log` copiado no pacote.
- `candidate-manifest.json` SHA-256
  `0777a3ff63c908c92447f51389f05708ac5a2b2bda4903e899be0220c71936ce` enumera
  895 arquivos de produto/configuração/contrato. O campo `scope.excludedPrefixes`
  exclui expressamente `docs/04_audit/evidence/`; o campo Git registra
  `dirty=true` no commit acima.
- Os 12 hits do log `full-cert/format.log`, entre os 13 alvos enumerados no
  [receipt da busca literal](imp50-49-exact-path-search-receipt-20260924.json),
  aparecem como avisos de caminho no `npm run format:check` hash-bound. O 13º
  alvo do receipt é referência ao código AUD19-11, não a esse log. Nenhum
  deles tem entrada no candidate manifest; tampouco estavam no tree do commit
  indicado. Como o próprio escopo exclui evidências e o worktree da captura era
  dirty, essa ausência não prova que os arquivos não existiam no workspace do
  gate. O log prova que os nomes foram emitidos, mas não vincula os bytes atuais
  dos arquivos nem a composição original da execução AUD19-10.

## Resultado e disposição

Os hits são referências exatas de caminho em um artefato de log ligado a outro
gate, mas não são registro hash-bound dos arquivos raw nem manifesto de membros
da execução/snapshot original. A ausência no manifest de produto é esperada pela
exclusão da árvore de evidências e não deve ser usada como finding negativo.

Portanto, esta verificação esclarece a força e a limitação das 12 ocorrências;
não atende, sozinha, ao requisito humano de suporte autoritativo por arquivo e
não adjudica nenhum caso. Todos os 141 permanecem sem adjudicação; v1 continua a
baseline e v2 o suplemento imutável. Nenhum arquivo alvo ou payload foi aberto;
nenhuma classificação, inventário ou gate foi alterado.

## Fontes

- [Manifest do run full-cert](../AAA/AAA-21/checks/full-cert/manifest.json)
- [Candidate manifest](../AAA/AAA-21/checks/full-cert/candidate-manifest.json)
- [Log format full-cert](../AAA/AAA-21/checks/full-cert/format.log)
- [Receipt da busca exata](imp50-49-exact-path-search-receipt-20260924.json)
- [Discovery 0022](../../../00_discovery/0022_aud20_08_imp50_49_evidence_lineage.md)
