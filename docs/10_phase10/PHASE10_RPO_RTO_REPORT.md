# PHASE 10 — RPO/RTO REPORT

Fonte mecânica: `certification/restore-report.json`, gerado por
`npx tsx scripts/phase10-restore-check.ts`.

## Resultado local controlado

| Verificação                      | Resultado          |
| -------------------------------- | ------------------ |
| snapshot formatVersion           | 1                  |
| digest do snapshot após restore  | igual              |
| integridade referencial (digest) | PASS               |
| outbox preservado                | PASS (250 eventos) |
| isolamento de tenant no snapshot | PASS               |
| captureMs                        | ~15 ms             |
| restoreMs                        | ~14 ms             |

## RPO/RTO

- **RPO medido:** não. Requer WAL/backup contínuo em infraestrutura real.
- **RTO medido:** apenas o restore local (milissegundos); não representa o RTO
  de produção.
- **Veredito:** `NOT_VALIDATED_ON_PRODUCTION_INFRASTRUCTURE`.

## Plano de medição

1. Habilitar backup contínuo (WAL) e snapshots periódicos.
2. Executar restore completo em banco separado e medir tempo até aceitar tráfego.
3. Medir janela entre último commit durável e último backup íntegro para RPO.
4. Validar cadeia de auditoria e estado do outbox no ambiente restaurado.
5. Repetir com dados sintéticos em escala representativa.

Enquanto o item acima não for executado, a decisão máxima permanece
`CONDITIONAL_GO`.
