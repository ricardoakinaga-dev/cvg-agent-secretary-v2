# SPEC AUD20-08 — índice corrente, checker semântico e pin Node

## Estado e gate

- task: `AUD20-08`
- fase: `AUDIT`
- status: `COMPLETED`
- dependência: `AUD20-06 COMPLETED_LOCAL`
- staging/produção: `NO_GO`
- autorização: opção A confirmada pelo usuário em `2026-09-22`, limitada ao
  BUILD local controlado

## Desenho proposto

### 1. Fonte corrente

Criar `docs/03_build/tracking/current_state.json`, schema versionado, com:

- `program`, `currentTask`, `currentStatus`, `nextAction`;
- `releaseBoundary.staging/production`;
- `runtime.node.exact`, `runtime.node.range`;
- ponteiros para CURRENT, runtime state, backlog, matriz e namespace de
  certificação corrente;
- lista explícita de namespaces históricos que não qualificam o corrente.

O JSON é autoridade operacional; Markdown permanece projeção humana e o
execution log permanece append-only.

### 2. Checker

Extrair funções puras em `scripts/lib/docs-state-check.mjs` e integrá-las a
`scripts/docs-check.mjs`. O checker deve:

1. validar shape e caminhos do índice;
2. comparar task/status com a matriz;
3. comparar task/status/next action com `docs/CURRENT.md`;
4. comparar a última `next_action` do runtime state;
5. validar `package.json#engines.node`, `.nvmrc`, `.node-version` e os valores
   `node-version` dos workflows;
6. validar ponteiro `certification/current.json` e impedir que
   `certification/findings.json` seja declarado corrente.

Falhas usam códigos estáveis, por exemplo `current_task_mismatch`,
`current_status_mismatch`, `next_action_mismatch`, `node_pin_mismatch` e
`historical_findings_selected_as_current`.

### 3. Pin Node

- adicionar `.nvmrc` e `.node-version` com `22.23.2`;
- manter `engines.node` em `>=22 <23`, mas registrar `22.23.2` no índice;
- trocar `actions/setup-node` de `22` para `22.23.2` em workflows Node;
- não alterar as tags Docker nesta task; o checker deve registrar essa fronteira
  e AUD20-18/07 fará pin por digest/rebuild.

### 4. Histórico Phase 10

Preservar `certification/findings.json` no lugar para compatibilidade do
verifier histórico. Adicionar metadado/pointer corrente que declare
`certification/phase11` como autoridade e teste que rejeite fallback para o
arquivo Phase 10. Não editar claims históricos.

## Sequência BUILD

1. RED com fixtures temporárias para cada drift semântico e de Node;
2. implementar schema/índice e funções puras;
3. integrar ao aggregate checker;
4. adicionar pins locais/CI e atualizar projeções correntes;
5. executar focused, docs-check, format, typecheck, lint e regressão completa;
6. crítica independente e evidência candidate-bound local.

## Testes negativos obrigatórios

- task/status diferente entre índice e matriz;
- task inexistente ou duplicada;
- next action diferente entre índice, CURRENT e runtime state;
- estado fora do vocabulário oficial;
- `.nvmrc`, `.node-version` ou CI com `22`, `24` ou patch divergente;
- package range incompatível com `22.23.2`;
- namespace corrente apontando para findings Phase 10;
- ponteiro de certificação inexistente ou divergente.

## Rollback e compatibilidade

Rollback remove somente índice/checker/pins novos e restaura workflows; não
remove nem move histórico. A alteração é local, read-only em runtime e sem
migração de dados. Pacotes históricos continuam verificáveis por caminhos
explícitos. Qualquer alteração após crítica invalida binding e exige re-review.

## Critérios C01–C07

- C01: índice canônico completo e parseável;
- C02: task/status/next action reconciliados entre fontes;
- C03: Node exato coerente em local/package/CI;
- C04: receipts/checker derivam e validam runtime observado;
- C05: findings Phase 10 não podem qualificar o corrente;
- C06: negativos falham fechado e histórico é preservado;
- C07: regressão, crítica e binding passam no candidato final.

## Gate

`TECHNICALLY_SPECIFIED`: desenho, contratos, negativos, rollback e evidência
estão definidos. BUILD local exige confirmação humana explícita; commit, push,
deploy, staging e produção não estão autorizados.
