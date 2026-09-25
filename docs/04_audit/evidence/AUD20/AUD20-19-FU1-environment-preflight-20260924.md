# AUD20-19-FU1 — preflight read-only do ambiente — 2026-09-24T06:55Z

## Escopo

Probe read-only de pré-condições locais para a SPEC v4 do harness, sem iniciar
app, Vite, API, browser, teste, sessão humana ou tráfego externo. O probe não
altera arquivos do repositório. A SPEC avaliada tem SHA-256
`decb8d441c2a17678026c6305fb71a9c31a2069d6836ad010362f9c3b9179688`; a crítica
fresh-context v4 tem SHA-256
`4942f6fbbb096a92f3e0c465cd6217373e8bfa0e127c907cd72a610b063cd723` e PASS
somente para prontidão de revisão humana.

## Resultados

| Verificação | Resultado observado |
| --- | --- |
| `unshare --user --map-root-user --net sh -c 'ip link show; ip route show'` | Exit 0; namespace criado. Só apareceu `lo`, em estado `DOWN`; `ip route show` não imprimiu rotas. |
| Binários de isolamento | `/usr/bin/unshare` e `/usr/sbin/ip` presentes. |
| Node selecionado para BUILD | `/home/ricardo/.nvm/versions/node/v22.23.2/bin/node` presente; executou `v22.23.2`. Node no PATH padrão: `v24.20.0`. |
| Playwright | `@playwright/test` `1.59.1`; o caminho de Chromium resolvido existe em `/home/ricardo/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome`. O browser não foi iniciado. |
| Vite | `8.2.2`, conforme a SPEC. |
| Worktree | 81 arquivos tracked alterados, além dos untracked; não está limpo. Nenhuma sessão pode usar este worktree como candidato limpo. |

O probe confirma que este ambiente permite criar um namespace de rede sem rota
externa visível. Não prova o comportamento do launcher, da configuração Vite,
do browser ou dos filtros de rede da SPEC; essas propriedades só podem ser
verificadas após BUILD admitido, pelos testes isolados definidos na SPEC.

## Gate e limites

Em `2026-09-24`, foi solicitada decisão humana hash-bound para aprovar a SPEC e
admitir somente o BUILD local controlado da allowlist registrada em 0337. A
decisão permanece pendente neste registro. Não há admissão de BUILD nem
autorização de sessão humana. `AUD20-19` e `IMP50-18` continuam
`WAITING_HUMAN_APPROVAL`; consentimento, participante, tecnologia assistiva e
autorização de sessão exigem gate separado. Staging e produção permanecem
`NO_GO`.

## Validação documental — 2026-09-24T06:56Z

- `npm run docs:check` passou sob Node `v22.23.2`: 1.582 links, 627 JSONs,
  nenhum link quebrado e estado/ação semânticos válidos.
- Prettier check dos sete documentos atualizados e `git diff --check` passaram.
- A primeira tentativa de `docs:check` usou Node `v24.20.0` do PATH e foi
  rejeitada pelo guard `node_runtime_mismatch`; a repetição com Node 22 passou.
- Nenhum teste de produto, app, browser, BUILD, sessão humana, PostgreSQL,
  mutation, staging ou produção foi executado.
