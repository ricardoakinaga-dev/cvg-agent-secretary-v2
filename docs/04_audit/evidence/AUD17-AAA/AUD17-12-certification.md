# AUD17-12 — certificação candidate-bound final

Status inicial desta evidência: `IN_PROGRESS_FINAL_SEAL`.

## Contrato

O selo final deve ser executado depois da última alteração do candidato, sob
Node `22.23.2`, sem dados reais nem efeitos externos. A barra `AUD17-AAA-V1`
permanece congelada. A certificação deve vincular commit, tree hash, candidate
digest, comandos, logs, evidências e decisão; `AUD17-13..15` continuam
`BLOCKED_EXTERNAL` se provider, canal, identidade, RAG institucional,
RPO/RTO, piloto, rollback ou sign-off não estiverem comprovados.

## Pré-condições locais verificadas

- AUD17-01..04 e AUD17-06..11 têm contratos, mudanças/testes e evidências
  locais registradas no mesmo escopo.
- AUD17-05 está explicitamente limitado pela ausência de
  `TEST_DATABASE_URL`; os testes PostgreSQL não podem ser contados como PASS.
- Typecheck, lint, format, suíte, coverage, E2E, evals, chaos, security,
  startup, readiness, bypass e red-team foram executados localmente; os
  respectivos números e skips estão nos relatórios das tasks.
- A árvore ainda exige commit e a execução do certificador; nenhum resultado
  histórico é reutilizado como PASS atual.

## Resultado

Será preenchido após `npm run certify` e os verificadores current/evidence,
incluindo a crítica independente fresca. Este arquivo é evidência excluída da
superfície do candidato, mas não substitui o pacote canônico nem a verificação
de digest.
