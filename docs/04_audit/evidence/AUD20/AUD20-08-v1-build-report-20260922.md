# AUD20-08 — build report v1

- escopo: índice operacional canônico, checker semântico, pin Node exato e
  separação verificável entre certificação corrente Phase 11 e histórico Phase 10;
- Node qualificado e observado: `22.23.2`;
- focused final: `3` arquivos / `21` testes PASS;
- regressão completa: `285` arquivos / `2.224` testes PASS / `192` skips;
- cobertura: statements `90,83%`, branches `86,99%`, functions `89,16%`, lines
  `91,42%`;
- gates: `docs:check`, typecheck, lint, format e `git diff --check` PASS;
- crítica independente: v1/v2 `FAIL` com P1 corrigidos; v3 `PASS`, C01–C07;
- fronteira: worktree dirty e execução somente local; staging e produção
  `NO_GO`; sem commit, push, deploy, dado real ou efeito externo.
