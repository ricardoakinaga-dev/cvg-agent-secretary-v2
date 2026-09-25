# AUD20-08 — evidência de preparação da SPEC

- execução: `CONTROLLED_LOCAL`
- pipeline: `DISCOVERY -> PRD -> SPEC`
- status: `WAITING_HUMAN_APPROVAL`
- staging/produção: `NO_GO`

## Evidência observada

- shell padrão: Node `v24.20.0`;
- runtime qualificado disponível: Node `v22.23.2`;
- `package.json`: range `>=22 <23`;
- workflows Node: `node-version: 22`;
- Docker: tags móveis `node:22-bookworm-slim`;
- `.nvmrc` e `.node-version`: ausentes;
- `docs:check`: links, JSON, vocabulário de estados e última next action, sem
  reconciliação de task/status/matriz/Node/certification namespace;
- `certification/findings.json`: Phase 10, ainda necessário ao verificador
  histórico; `certification/phase11/findings.json` é o namespace corrente.

## Decisão de escopo

AUD20-08 tratará fonte current, checker e pin exato local/CI. Digest e rebuild
de imagens ficam em AUD20-18/07. Histórico será rotulado e preservado, sem move
destrutivo. Nenhum código, workflow, pin ou pacote foi alterado nesta rodada.

## Artefatos

- Discovery 0017;
- PRD 0028;
- SPEC `aud20_08_state_node_reconciliation_20260922.md`;
- gates incrementais 0090/0090/0190.

Próxima ação: obter confirmação humana explícita para BUILD local controlado.
