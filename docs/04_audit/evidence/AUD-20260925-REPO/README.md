# Evidência AUD-20260925-REPO — selagem do candidato (B25-01, onda R0)

## Propósito

Selar a identidade do candidato corrente do roadmap
`docs/03_build/0344_post_audit_roadmap_20260925.md` (item B25-01, onda R0):
inventariar o HEAD, hashear os arquivos de referência, registrar as
divergências do worktree e concluir o veredito. O worktree sujo é fato
esperado nesta onda; o veredito é `NOT_SEALED_FOR_RELEASE`, com todas as
divergências registradas em vez de ocultadas.

## Conteúdo

| Arquivo | Papel |
|---|---|
| `b25-01-candidate-manifest.json` | Manifesto legível por máquina: HEAD, data, contagens do worktree (modified/deleted/untracked), sha256 e linhas dos arquivos de referência, Node pinado e contagens de documentos. |
| `b25-01-seal-report.md` | Relatório humano: veredito `NOT_SEALED_FOR_RELEASE`, tabela de identidade, lista das divergências observadas, próximos passos (R1–R4 exigem worktree limpo) e limites da lane. |
| `README.md` | Este índice do diretório de evidência. |

Arquivos de referência com sha256 + linhas verificados em disco no manifesto:
`apps/api/src/server.ts`, `apps/api/src/server/request-context.ts`,
`apps/api/src/server/request-query.ts` e `package.json`. Os pins
`.nvmrc`/`.node-version` foram conferidos por conteúdo (`22.23.2` em ambos),
sem hash — não contam como arquivos hasheados.

## Limites

- Somente inventário, hash e registro: nenhuma suíte foi reexecutada nesta
  lane (sem testes, typecheck ou lint).
- Sem commit/push, sem alteração de código-fonte do produto, sem acesso a
  rede e sem dados reais.
- Os hashes valem para o estado em disco no momento da coleta; qualquer
  movimentação posterior do worktree exige nova rodada de inventário.

## Espaço reservado

As lanes B e C adicionarão seus arquivos neste mesmo diretório
(`AUD-20260925-REPO`), complementando esta selagem R0 sem alterar os três
arquivos acima.
