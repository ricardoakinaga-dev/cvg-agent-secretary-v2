# Task 05 - Format Gate And CI Verify

## ID

DBG-COR-05

## Prioridade

P1

## Finding relacionado

- DBG-F06

## Objetivo

Fazer formatacao virar gate obrigatorio e deixar o repositorio formatado.

## Arquivos permitidos

- `package.json`
- `.github/workflows/verify.yml`
- arquivos alterados pelo formatter
- `tests/workspace-scripts.test.js`, se existir validacao de scripts

## Passos

1. Executar `npm run format:check` para confirmar falha.
2. Rodar formatter do projeto.
3. Atualizar `npm run verify` para incluir `npm run format:check`.
4. Se houver teste de scripts, atualizar expectativa do verify.
5. Executar `npm run format:check`.
6. Executar `npm run verify`.

## Testes

```bash
npm run format:check
npm run verify
```

## Definition of Done

- `npm run format:check` passa.
- `npm run verify` executa formatacao.
- CI continua usando `npm run verify`.
- Nenhuma alteracao sem relacao funcional e introduzida fora da formatacao necessaria.
