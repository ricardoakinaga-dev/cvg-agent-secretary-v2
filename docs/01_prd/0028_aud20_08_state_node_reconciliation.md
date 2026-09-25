# PRD AUD20-08 — reconciliação de estado, candidato e Node

## Estado

- task: `AUD20-08`
- fase: `PRD`
- status: `READY_FOR_NEXT_STEP`
- discovery: `docs/00_discovery/0017_aud20_08_state_node_reconciliation.md`
- staging/produção: `NO_GO`

## Objetivo

Permitir que executor, CI e auditor determinem e validem automaticamente o
estado corrente do programa e a versão Node qualificada, sem interpretar
snapshots históricos ou confiar em um único texto solto.

## Escopo funcional

### FR01 — índice canônico

Deve existir um registro machine-readable corrente com programa, task, estado,
próxima ação, release boundary, runtime Node exato e ponteiros para matriz,
backlog, runtime state e índice humano.

### FR02 — reconciliação semântica

`docs:check` deve comparar o índice canônico com `docs/CURRENT.md`, última seção
do runtime state e matriz AUD20. Divergência, campo ausente, estado inválido,
task inexistente ou next action diferente deve produzir `valid=false` e código
de erro estável.

### FR03 — runtime reproduzível

`.nvmrc`, `.node-version`, `package.json` e workflows que executam Node devem
concordar com a versão exata qualificada. O checker deve falhar se um deles usar
major móvel ou versão diferente.

### FR04 — provenance de receipts

Receipts novos devem derivar a versão de `process.version` no processo executor;
o contrato deve rejeitar versão declarada divergente quando houver evidência de
execução associada.

### FR05 — história não corrente

O índice deve identificar o namespace de certificação corrente e classificar
`certification/findings.json` como histórico Phase 10. Consumidores correntes
não podem selecioná-lo por fallback implícito.

## Regras

- o índice canônico é autoridade de estado atual; logs permanecem cronologia e
  não são reescritos;
- somente estados oficiais são aceitos;
- `currentTask` deve existir exatamente uma vez na matriz e ter o mesmo status;
- `nextAction` deve ser singular e igual nas projeções humanas correntes;
- staging/produção não podem ser promovidos por esta task;
- package histórico continua verificável em seu contexto original.

## Fora de escopo

- digest/pin de imagens base, rebuild de imagens e SBOM (`AUD20-18/07`);
- re-selo Phase 11 (`AUD20-12`);
- migração/limpeza de todo o acervo documental;
- provider, canal, IdP, RAG, dados reais ou produção.

## Aceitação

- AC01: árvore coerente passa `docs:check` e testes focados;
- AC02: cada mutação isolada de task, status, next action, Node ou namespace
  corrente falha com motivo específico;
- AC03: Node `22.23.2` é idêntico em arquivos locais, package e CI;
- AC04: shell Node 24 é detectado como incompatível, sem impedir uso explícito
  do binário 22.23.2;
- AC05: findings Phase 10 são rotulados como históricos e o ponteiro corrente
  aponta somente para `certification/phase11`;
- AC06: nenhum histórico é apagado e staging/produção permanecem `NO_GO`.

## Qualidade e riscos

O checker deve ser determinístico, read-only e executável sem rede. Mensagens
de erro não devem depender de ordem de filesystem. O risco principal é
duplicação de autoridade; ele é controlado tornando o JSON a fonte canônica e
testando cada projeção. Não há permissão ou fluxo de usuário final aplicável.

## Gate

`PRODUCT_DEFINED`: escopo, regras, negativos, limites e aceitação são
determinísticos. Avançar para SPEC técnica.
