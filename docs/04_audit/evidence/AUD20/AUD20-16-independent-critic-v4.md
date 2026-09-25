# AUD20-16 — crítica independente v4 — 2026-09-22

## Veredito técnico

`PASS` para C01–C06 no escopo local controlado. C04 é
`PASS_NOT_APPLICABLE_ARCHIVE`. Staging e produção permanecem `NO_GO`.

## Reavaliação dos achados v3

- C01 PASS: metadata aprovada é imutável no código; owner/ref/datas/clock não
  são inputs. A validade usa `transaction_timestamp()` e é revalidada em cada
  batch.
- C02 PASS: tenant/key/digest/timestamps permanecem; `resource_id = NULL` só é
  aceito no shape minimizado da política v1.
- C03 PASS local: modelo de capacidade permanece restrito a dados sintéticos.
- C04 PASS_NOT_APPLICABLE_ARCHIVE: retenção direta foi escolhida; não há
  archive/partitioning.
- C05 PASS: reader/writer preparados antes da migration executam depois dela,
  o reader aceita a linha minimizada e replay continua bloqueado pela PK.
- C06 PASS: mudança de hold e minimização compartilham advisory lock; o update
  repete o anti-join; ledger e mutação são atômicos; `preservedHoldCount` conta
  registros maduros protegidos.

Nenhum bloqueio técnico remanescente foi identificado para C01–C06. O revisor
não reproduziu o PostgreSQL porque `TEST_DATABASE_URL` não estava definido em
seu shell; sua execução encontrou 13 testes condicionais e os marcou como
skip. A rodada principal executou os mesmos 13/13 contra PostgreSQL local
descartável. O reseal C07 foi deliberadamente deixado para depois desta
revisão.
