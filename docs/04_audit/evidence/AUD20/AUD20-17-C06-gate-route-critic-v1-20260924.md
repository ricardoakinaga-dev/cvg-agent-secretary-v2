# AUD20-17 / IMP50-40 — crítica independente da proposta C06 — 2026-09-24

## Identificação

- Proposta examinada: `AUD20-17-C06-gate-route-proposal-20260924.md`
- SHA-256 da proposta examinada: `ec86568bd3e7a71b8d6d99b011b3ec4883bb855f86456b2b4e2f40e32adc5117`
- Veredito: **REVISE**.
- Escopo da crítica: precisão factual, completude, sequência e aderência às
  autorizações e gates presentes no repositório. Revisão somente leitura.
- O crítico não executou código, testes, banco, serviço, BUILD ou mutation e
  não escreveu arquivos.

## Achados

1. **Admissão de mutation separada.** O passo de execução de mutation deve
   ficar explicitamente condicionado a uma admissão própria, hash-bound. A
   aprovação de gate PostgreSQL não autoriza mutation. A aprovação humana da
   emenda restringe a execução PostgreSQL a um gate sintético admitido.
2. **Discovery existente.** A Discovery 0024/NQP-01 já existe e está bloqueada
   para `DISCOVERY_READY`. Depois de reconciliar o manifesto e obter medições
   válidas, reavaliar esse mesmo artefato e continuar seus gates, se o problema
   persistir. Criar Discovery nova somente para um gap de escopo distinto.
3. **Baseline candidate-bound.** O critério original C06 exige regressão e
   cobertura “sem redução”. Antes de executar uma nova medição, vincular a
   baseline ao candidato prévio exato, hashes de fontes, denominador e run.
   Não usar o run atual sem vínculo comprovado como baseline.
4. **Aplicabilidade do piso crítico.** A emenda aprovada mantém o piso de 95%
   para módulos críticos aplicáveis, mas o registro congelado
   `aud19-critical-coverage.json` não lista `request-context.ts`. Os resumos
   operacionais em 0190 e 0337 classificam os 92% observados como abaixo do piso
   crítico; essa classificação conflita com o registro. Manter a aplicabilidade
   sem adjudicação e não alterar o registro por inferência. C06 continua `FAIL`
   independentemente disso: functions globais reportadas em 89,27% (<90%),
   gate PostgreSQL e mutation não executados, e baseline sem vínculo válido.
   Até reconciliar os hashes, apresentar as métricas como relatadas pelo
   BUILD report/crítica, sem afirmar vínculo ao candidato.

## Resultado

A proposta preserva corretamente a divergência do digest do manifesto e não
usa a medição de 92% para decidir C06. A sequência proposta respeita o bloqueio
de `AUD20-11`/PostgreSQL. Revisar os quatro pontos acima antes de considerar a
rota documental pronta para decisão; este parecer não é aprovação, admissão ou
autorização de execução.

## SHA-256 dos artefatos examinados

- Proposta C06 v1: `ec86568bd3e7a71b8d6d99b011b3ec4883bb855f86456b2b4e2f40e32adc5117`
- Crítica request-context v2: `293a02f1411c35ff811d67dd2b4bac25bd14581b26887ea285de259514fe165d`
- BUILD report request-context v2: `0ebebf1c12032597a7733d935c7a08bc19aba4687c420223496499a58ae742a9`
- Manifesto atual: `6b86eb90a9275f3563c1c9f9deadd5477f7c114fe5228768313706512447fdba`
- Emenda aprovada v2: `1cb72b0e097ad19539c1f14fbdc892542ae9ddabf716bba00eef20b1c4cb237c`
- Recibo de aprovação: `a474bd2357377a70f50be372e7b1990103350ca3db9e393402a97a1378c89ec9`
- Contrato AAA: `aec324018513c43a3e949663e41769f2d59180c6812d7430bd5980fb4a357097`
- Registro de módulos críticos: `c16dbffdf9ecc7d058e6d073e81d7215be4b634f1af2ad5061f4fd447138b24b`
- Discovery 0024: `db2493fde811e6b135360f38fcb6eaac10400660f2fb492ef04b2eae6ae8250d`
- Crítica Discovery NQP-01: `25513893261b71f73d1b290bbe5ef3a4741355836509c79b59159c56508978e0`
- Crítica unit-only NQP-02: `cd6bffa63f97f6cc7cc276aed69a96804748405453e1432c145ceb0234972533`
- Backlog oficial 0337: `388cfa71ceaf04e6d15e6d30ae5fc1d29d921ef54cf3f0feae47ced27db3ea29`
- Backlog 0343: `912ff009f2b6b1b91e800d8080b1f7d6d7a5a4de476ce5c2d4852ff9a8897ae6`
- CURRENT: `c31bdd9e1ed01105bbb5cc0222deafe404e2ef86eac635bc829972b8d7a42cae`
- Validação SPEC 0190: `a9857fb210345eb0b166b95856c34e2173fdf36ad80ff00f950dc9a47f3c7f4d`
- SPEC request-context: `a3c200e7323db28245b98dc8b35f120fcf6b8e961e570664044c62f2cd329d37`
- SPEC query-parser: `fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`
- AGENTS do pipeline: `f62502666c51bebf8b43d551c67e2651e650c9e4889f09b9c7cd45fdc7e97607`
- Runtime state: `387ec2785b43007d22ca221d11b2226b34f96e4e1ea5856526b18ab7c5968884`
- Execution log: `b9b0310b1894d63257e5ebd64f9886dd994a12ecd6cf56a83378dd4c94bb32e1`
- Backlog mestre: `af868c344558ca6617df5f8bf69e6eef9e0cb69d3b36ceb8ef1dbe2dfe52ed3d`
