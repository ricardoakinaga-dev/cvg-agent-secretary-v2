# Relatório do BUILD local — AUD20-19-FU1 / IMP50-18

- Data: 2026-09-24.
- Admissão: SPEC aprovada e BUILD local controlado admitido no recibo
  [hash-bound](AUD20-19-FU1-human-approval-admission-20260924.md).
- SPEC: `docs/02_spec/aud20_19_imp50_18_human_session_harness_20260923.md`,
  SHA-256 `decb8d441c2a17678026c6305fb71a9c31a2069d6836ad010362f9c3b9179688`.
- Limite: somente allowlist de 0337; nenhum arquivo de aplicação, API/schema
  público ou configuração padrão de rede foi alterado. Nenhum dado real,
  staging ou produção.
- Sessão: modo headed não foi iniciado. Não houve participante, consentimento,
  tecnologia assistiva, captura de mídia ou evidência humana. O gate separado
  segue sem autorização; `human_a11y` permanece `PENDING` e
  `releaseEligible: false`.
- Candidate binding: worktree já estava dirty/untracked. O harness não criou
  commit, staging, stash, reset ou worktree, e nenhum candidate ID/tree hash
  foi alegado para esta execução. O estado impede sessão até existir candidato
  limpo e aprovação específica.

## Implementação e correções

- Criados runner/configs isolados, allowlists de assets/API, helpers de binding,
  schemas/templates fechados, fixtures sintéticas session-only, testes unitários
  e testes Playwright headless.
- `verify` exige Node `22.23.2`, hash exato da SPEC, `unshare` user/network
  namespace, interface `lo` e ausência de rota externa; remove proxy herdado,
  inicia apenas Vite na origem fixa e limpa seus artefatos temporários.
- H09 responde os dois endpoints Admin com envelopes paginados vazios; os
  métodos, paths, queries, bodies e combinações não allowlisted falham fechados.
- O primeiro teste focal encontrou payload esperado incorreto para H09; a
  fixture/helper foi alinhada à página sintética vazia da SPEC. O primeiro
  Playwright isolado encontrou o observer do aviso iniciando antes da raiz DOM;
  o init script passou a observar `document` e a repetição passou. O teste de
  TypeScript foi ajustado para carregar o helper JavaScript como contrato de
  runtime.

## Verificação local

| Gate | Resultado |
| --- | --- |
| Unit focal do harness | `PASS`, 21/21 |
| `node ... human-session-harness.mjs verify` | `PASS`, 2/2 Playwright Chromium dentro do namespace |
| Typecheck | `PASS` |
| Lint | `PASS` |
| Prettier global | `PASS` |
| Suíte integral, primeira rodada | 301 arquivos; 2.254 PASS, 192 skips, 2 failures somente em `docs-integrity.test.js` por `next_action_mismatch`; registrada como rodada inicial/supersedida |
| Suíte integral, rodada final | `PASS`, 289 arquivos aprovados, 12 skipped; 2.256 testes aprovados, 192 skipped |
| Coverage | `PASS`: statements 90,84%, branches 87,00%, functions 89,27%, lines 91,43% |
| `docs:check` | `PASS`, 1.875 links/634 JSONs, estado semântico e nextAction válidos |
| `tests/docs-integrity.test.js` | `PASS`, 12/12 após a sincronização final |
| `git diff --check` | `PASS` |
| Crítica independente R2 | Pendente; BUILD local ainda não aceito |

O teste unitário `.mjs` foi executado por Vitest com configuração temporária
que acrescentou somente esse caminho ao `include` da configuração existente;
o arquivo temporário foi removido. `npm test` continua cobrindo a suíte
integral padrão e seu resultado final está registrado separadamente.

Evidências: [unit focal](AUD20-19-FU1-unit-20260924.log),
[verify isolado](AUD20-19-FU1-verify-20260924.log),
[typecheck](AUD20-19-FU1-typecheck-20260924.log),
[lint](AUD20-19-FU1-lint-20260924.log),
[formatação](AUD20-19-FU1-format-check-20260924.log),
[suíte integral final](AUD20-19-FU1-full-test-20260924.log),
[rodada inicial](AUD20-19-FU1-full-test-initial-20260924.log),
[coverage](AUD20-19-FU1-coverage-20260924.log),
[docs-check](AUD20-19-FU1-docs-check-20260924.log),
[docs-integrity](AUD20-19-FU1-docs-integrity-20260924.log) e
[diff-check](AUD20-19-FU1-diff-check-20260924.log).

## Disposição

BUILD local executado sob a autorização registrada e todos os gates locais
escopados passaram após sincronizar runtime. Ainda não aceito: crítica
independente R2 permanece obrigatória. A task-mãe `AUD20-19`/`IMP50-18`
permanece `WAITING_HUMAN_APPROVAL` pela sessão humana, que não foi iniciada nem
autorizada nesta rodada. Staging e produção permanecem `NO_GO`.
