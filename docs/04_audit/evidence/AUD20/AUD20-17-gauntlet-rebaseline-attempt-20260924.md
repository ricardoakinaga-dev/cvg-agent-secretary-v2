# AUD20-17 — tentativa de rebaseline Gauntlet — 2026-09-24

## Resultado

A retomada read-only do run `IMP50-NQP-20260923` confirmou o objetivo e o bar
canônicos (`goal_match=true`, `bar_match=true`), mas recusou continuidade porque
há deriva do fingerprint (`expected=bacdf2e92646fa57ce464be0aab0be770587f51dc1628d1f77d9b940c01026c7`,
`actual=646c5514ff3300b545468099b4d38e2a04bace39c3aa91e828da39aae203fde7`).
O run mantinha estado de 2026-09-24T00:16Z e evidência antiga.

A tentativa de rebaseline pelo state manager oficial falhou fechado com:

```text
gauntlet-state: invalid state: artifact manifest item 13 hash differs;
artifact manifest item 17 hash differs; artifact manifest item 20 hash differs;
artifact manifest item 21 hash differs
```

Os itens 13/20 do manifesto apontam para `0342_post_query_roadmap_20260923.md`,
o item 17 para `0337_aud20260921_backlog.md` e o item 21 para
`0343_post_query_backlog_20260923.md`. Os recibos antigos não foram editados.
O comando não alterou o estado: hashes antes/depois da tentativa permaneceram
state `9b470863e6390025f5872d0a78e4c8e1af7c53d4dfeb59cb4fc6035537a776ec`, bar
`48cc35a5845254dec7bdf9ada8a52c489214c8bc99b117831689df5d182e6b90`, artifacts
`c64d05e9c73a8f640fb8fa78913b35072e7e2474fb2072329e475b92d34dcc38` e history
`7015a4c1e09d1ccf84e058bdce3e13f93a5af2cad13d59b304b2b73042062fdd`.

## Disposição

Não contornar a validação nem editar manualmente `.gauntlet` ou os artefatos
históricos. A evidência antiga continua `STALE/MISSING`; nenhum critério é
promovido por esta tentativa. Antes de gravar nova rodada Gauntlet, obter um
mecanismo suportado para reconciliar recibos de artefatos modificados ou
iniciar run com identidade separada em workspace próprio, preservando este run.
