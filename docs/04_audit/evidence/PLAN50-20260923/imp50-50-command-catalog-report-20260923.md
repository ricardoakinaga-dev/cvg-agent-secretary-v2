# IMP50-50 — catálogo dos comandos npm — 2026-09-23

## Resultado

`IMP50-50` está aceito em escopo **documental-only** pela fatia registrada
`AUD20-08-FU2`. O pai `AUD20-08` permanece `COMPLETED`; nenhum código,
`package.json`, comando operacional catalogado, serviço, banco ou efeito
externo foi executado nesta fatia. Para validar os documentos, foram usados
somente `docs:check`, `format:check` e `git diff --check`; nenhum outro script
npm foi executado para exercitar seu comportamento. O catálogo está em
[`docs/README.md`](../../../README.md#catálogo-dos-comandos-npm).

## Inventário e cobertura

- `package.json` raiz: 39 scripts; SHA-256 do snapshot inventariado:
  `7ebd4586785acbb46b1a6ced6ebd311d23e973b149bc476d1f469a3dff5da254`.
- Manifests em `apps/` e `packages/`: 21; scripts de workspace: zero.
- Catálogo: 39 linhas, cada script raiz uma vez; sem ausências, extras ou
  duplicatas. Uma leitura mecânica dos manifests confirmou cobertura `39/39`.
- SHA-256 de `docs/README.md` no snapshot documentado:
  `0de2bca47db596f4d9d86320a92b7fb53ea67e741c27b98d44553f392e87b0d2`.
- `package.json` e manifests foram fontes de inventário read-only e não foram
  editados por `AUD20-08-FU2`.

Cada linha identifica comando, gate/finalidade, pré-requisitos e efeitos/limites.
Foram descritos aliases, Node pin, banco PostgreSQL descartável, rede de
`audit:security`, escritas em certificação/evidências, servidor acessível pela
rede local, `BASE_URL` local para Playwright, limites de `promotion:check` e
precondições para execução em cópia isolada.

## Revisão e verificação

- Crítico independente fresh-context: `PASS`; confirmou a cobertura 39/39, 21
  manifests sem scripts e a clareza das precondições `BASE_URL`, PostgreSQL,
  acesso ao registry e certificadores. Revisão read-only; zero edições e zero
  testes/comandos de produto.
- `git diff --check`: `PASS`.
- Inventário mecânico: `PASS` (`missing=[]`, `unexpected=[]`, `duplicates=[]`).
- `docs:check` sob Node `v22.23.2`: `PASS`, 920 links válidos, 612 JSONs
  válidos e estado semântico/next-action válidos.
- `format:check` sob Node `v22.23.2`: `PASS`; `git diff --check`: `PASS`.
- Mirror Gauntlet isolado sincronizado e rebaselined; `validate --check-drift`
  `PASS`. O run permanece `ACTIVE` em `DECOMPOSE`, 0 rounds, freshness
  `STALE`. Isto valida somente o snapshot de fontes; não foi declarada uma
  rodada Gauntlet concluída.
- Nenhum teste de produto foi executado.

## Aceite, limites e qualidade

O critério documental de IMP50-50 está satisfeito para o snapshot descrito. O
catálogo pode ficar desatualizado quando os manifests mudarem; reexecute o
inventário e revise os efeitos antes de acrescentar ou mudar scripts. O aceite
não aprova a SPEC `IMP50-42`, não admite outro follow-up, não reabre `AUD20-08`
e não libera staging/produção.

- **P0:** `PASS` limitado à rastreabilidade documental deste item.
- **P1:** `BLOCKED` para produto/release; gates e revisão humana permanecem.
- **P2:** `NOT_RUN`; sem BUILD ou testes de produto.
- **P3:** `PASS_LIMITED`; edição documental local, sem efeitos externos.
- **P4/P5:** `NOT_RUN`; sem integração ou candidato de produto congelado.
- **P6:** `BLOCKED/NOT_RUN`; autoridade externa/humana não foi inferida.
- **P7:** `BLOCKED`; promoção continua `NO_GO`.

**Candidato de produto/hash:** nenhum. Os hashes acima identificam somente os
bytes locais usados no inventário documental.

**Próxima ação única:** revisar/aprovar a SPEC de `AUD20-17` para
`IMP50-40`; depois registrar essa fatia exata antes de qualquer BUILD.
