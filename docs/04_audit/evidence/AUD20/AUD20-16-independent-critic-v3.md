# AUD20-16 — crítica independente v3 — 2026-09-22

## Veredito

`FAIL` para o candidato inicial v2; staging e produção `NO_GO`.

## Achados bloqueantes

- P0: metadata, validade e clock eram fornecidos pelo chamador, sem binding
  imutável à decisão humana; C01/C06/C07.
- P1: legal hold podia ser criado entre seleção e update; C06.
- P1: o teste demonstrava old writer e replay, mas não executava statement de
  old reader preparado antes da migration contra `resource_id = NULL`; C05.
- P1: receipts existentes pertenciam ao candidato parcial v1 e não selavam o
  candidato v2; C07.
- P2: `preservedHoldCount` contava holds, não linhas efetivamente preservadas;
  C06/C07.

## Disposição

O candidato não foi concluído. A remediação vinculou os metadados a constantes
da decisão, passou a usar `transaction_timestamp()` e revalidar a janela em
cada batch, serializou mudanças de hold por advisory lock/trigger, repetiu o
predicado de hold no update, adicionou old reader/writer preparados antes da
migration e passou a contar linhas preservadas. Uma nova crítica é obrigatória
após os testes e antes do reseal final.
