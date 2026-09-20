# AUD19-13..15 — Pedido de autorização para qualificação externa

- Programa: `AUD19-REM`; tasks: `AUD19-13`, `AUD19-14`, `AUD19-15`; status: `BLOCKED` / `WAITING_HUMAN_APPROVAL` (decisão).
- Candidato congelado: `commit fa78f92`, `candidateId fbca3d2b…`; pacote local
  `CONDITIONAL_GO` / `AAA_CANDIDATE`, elegível `STAGING`; produção `NO_GO`.
- Este pedido não autoriza nada por si só: ele apresenta a decisão humana
  necessária, o impacto e o procedimento exato no ambiente autorizado.

## 0. Registro de decisão

- `2026-09-20`: o solicitante humano escolheu a **Opção A** (autorizar a
  qualificação externa). A autorização de *iniciar* está registrada; a execução
  permanece condicionada ao preenchimento dos inputs da seção 2 e ao ambiente
  autorizado. Nenhum sistema real foi contatado até aqui.

## 1. Decisão solicitada

**Opção A — autorizar a qualificação externa (recomendada se houver ambiente):**
designar owners, ambiente, credenciais e janela para AUD19-13; depois AUD19-14
(restore/RPO/RTO/rollback/piloto) e AUD19-15 (revisão e decisão de release).
Impacto: habilita M6/M7 e a única rota legítima para sair de `NO_GO` produtivo.

**Opção B — adiar a qualificação externa:** manter `AUD19-13..15` `BLOCKED` e a
produção `NO_GO`; o candidato local permanece válido apenas para avaliação em
staging controlado, com os P2 documentados.

## 2. O que a autorização precisa conter (por gate)

| Gate            | Owner necessário         | Ambiente/segredo                                   | Dados permitidos                          |
| --------------- | ------------------------ | -------------------------------------------------- | ----------------------------------------- |
| modelProvider   | Integrações + Segurança  | endpoint, API key em cofre, egress allowlist       | somente sintéticos/classificação aprovada |
| channel         | Integrações + Operações  | webhook secret, URL pública, replay store          | somente sintéticos                        |
| externalIdentity| IdP admin + Segurança    | issuer/audience, JWKS/chave rotacionável, revogação| identidades de teste                      |
| institutionalRag| Curador da fonte + Dados | corpus versionado, política de citação             | fonte institucional aprovada              |
| rpoRto          | Infraestrutura           | backup/restore isolado, janela, metas aprovadas    | dados sintéticos                          |
| rollback        | Operações                | artefato anterior, runbook, janela                 | sintéticos                                |
| pilot           | Operações + Clínica      | supervisor humano, critérios de interrupção        | sintéticos                                |
| human_signoff   | Autoridade de release    | registro hash-bound                                | n/a                                       |

## 3. Critérios de entrada (checklist)

- [ ] Autorização escrita com ambiente, janela, dados e classificação máxima.
- [ ] Owners nominais por gate e canal de escalonamento.
- [ ] Credenciais em cofre (nunca no repositório/logs/imagem) e plano de revogação.
- [ ] Egress allowlist e orçamento aprovados.
- [ ] Atestação externa assinada (HMAC) vinculada a `candidateDigest` e `configDigest` do candidato congelado.
- [ ] Dossiês AUD19-13/14 preenchidos e assinados dentro da validade.

## 4. Comandos no ambiente autorizado

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
# 1. validar a atestação assinada contra o candidato congelado
CVG_EXTERNAL_ATTESTATION_HMAC_KEY=<chave-no-ambiente> \
  node scripts/aud19-external-evidence-check.mjs --gate=<gate> --attestation=<dossie.json>
# 2. preflight de produção (deve permanecer rejeitando até todos os oito gates)
npm run production:preflight
# 3. promoção somente com todos os gates válidos
npm run promotion:check
```

## 5. Dry-run local já executado (prova fail-closed)

- `npm run production:preflight` → exit `1`, 32 bloqueios, `sideEffects:false`.
- Checker sem atestação → `REJECTED` (exit 1).
- Fixture assinada com owner placeholder e digests divergentes → `REJECTED`
  (`owner,candidate_digest,config_digest,signature`), nunca promovida.
- Evidência: `AUD19-13-15-dry-run-evidence.json`.

## 6. Impacto e limite

Sem a Opção A, `AUD19-13..15` permanecem `BLOCKED`, o selo local continua
`STAGING`-only e a produção `NO_GO`. Nenhuma fixture, flag ou documento local
substitui dossiê assinado e sign-off humano. Ações clínicas, financeiras, de
agenda real e prontuário continuam proibidas e sujeitas a approval/handoff.
