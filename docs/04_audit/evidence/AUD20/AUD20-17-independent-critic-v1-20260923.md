# AUD20-17 / IMP50-40 — crítica independente final v1

- escopo: leitura independente dos bytes atuais da extração, testes e arquitetura
  permitidos; sem edições ou execução de testes;
- evidência de execução considerada: matriz focal 103 pass / 9 skip; suíte
  global 2.243 pass / 192 skip, uma falha C02; coverage com a mesma falha;
  typecheck, lint, format, docs-check e diff-check `PASS`;
- veredito: **não aprovar o fechamento de IMP50-40 v1** enquanto C02 não for
  atendido e C06 não tiver resultado de coverage aprovado.

| Critério | Parecer | Fundamentação |
| --- | --- | --- |
| C01 — owner único/boundary | `PASS` | Os dez helpers pertencem ao módulo novo; imports permitidos, reexport e ciclos foram verificados. |
| C02 — caps/redução | `FAIL` | `server.ts` tem 4.745 linhas (37 acima de 4.708); o módulo tem 258 linhas (abaixo de 450). Soma atual: 5.003 contra baseline do servidor de 4.958. |
| C03 — tenant/identidade/default deny | `PASS` | Trusted sem resolver/tenant falha fechado; identidade limita tenant e memoização é por objeto de headers. |
| C04 — HTTP/exports | `PASS` para esta extração | Chamadas e erro/status foram cobertos pela matriz focal; `ChannelSchema` preserva os três canais, e o type export público é mantido. |
| C05 — negativos/arquitetura | `PASS` | Assertions de cap do módulo, imports, env, reexport e duplicatas (`function` e bindings) precedem o limite C02. A execução focada final passou por elas e falhou somente em `4745 <= 4708`. |
| C06 — regressão/cobertura | `FAIL` como gate de aceite | A suíte global tem uma falha C02 e coverage não produziu resultado aprovado. |
| C07 — crítica independente | `FAIL` | A crítica não aprova v1 enquanto C02 falhar. |

O worktree estava amplamente alterado. `assertProductionReplayConfiguration`
e suas chamadas em `server.ts` foram identificadas como preexistentes a esta
fatia e não são atribuídas ao IMP50-40; isso limita a reconstrução independente
do delta completo do arquivo, mas não altera a medição do cap C02.

Não foi recomendado alterar o cap nem ampliar a allowlist. É necessária nova
decisão de SPEC antes de qualquer expansão ou ajuste de critério.
