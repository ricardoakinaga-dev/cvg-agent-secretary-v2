# Item B — dossiês e roteiros dos 8 gates externos/humanos — 2026-09-25

Candidato de referência: `68bb9d0a531007c5` (`CONDITIONAL_GO`/`AAA_CANDIDATE`). Cada dossiê lista critério de aceite, evidência a produzir, negativos e o insumo humano/credencial necessário. Nenhum dossiê autoriza execução por si só.

## 1. `modelProvider` — homologação de provider

- **Aceite**: chamada real ao provider autorizado com credencial do owner; fallback configurado e testado; orçamento/limites declarados; nenhum efeito fora do escopo sintético.
- **Evidência**: recibo de chamada (provider/modelo/região), log redigido, teste de fallback, negativos (credencial inválida, quota excedida, timeout).
- **Negativos**: sem credencial → falha fechada; modelo indisponível → fallback; payload com PII → bloqueado pela policy.
- **Insumo necessário**: endpoint + credencial + owner + ambiente autorizado.

## 2. `channel` — homologação de canal

- **Aceite**: mensagem sintética enviada/recebida por conta autorizada; opt-in/out respeitado; webhook verificado (HMAC/lease) no canal real.
- **Evidência**: recibo de envio/recebimento, verificação de assinatura, teste de opt-out, limites de rate.
- **Negativos**: assinatura inválida → 401; conta não autorizada → bloqueio; opt-out → supressão.
- **Insumo necessário**: conta/número de teste + credencial + owner do canal.

## 3. `externalIdentity` — IdP confiável

- **Aceite**: identidade real resolvida por IdP confiável; rotação de credenciais; modo `simulation` proibido fora de teste.
- **Evidência**: recibo de token/claims, teste de rotação, negativos de spoof de header e tenant divergente.
- **Negativos**: header forjado → rejeitado; identidade sem tenant → negada; replay de JTI → bloqueado.
- **Insumo necessário**: IdP/tenant + credencial + owner de segurança.

## 4. `institutionalRag` — fonte institucional

- **Aceite**: corpus aprovado versionado; proveniência por documento; revogação remove do índice; resposta sem fonte aprovada → recusa.
- **Evidência**: catálogo de fontes/versões, teste de proveniência, teste de revogação, negativos de pergunta sem fonte.
- **Negativos**: documento revogado → não recuperado; pergunta fora do corpus → handoff/recusa.
- **Insumo necessário**: fonte/corpus aprovado + owner de dados.

## 5. `rpoRto` — metas e exercício

- **Aceite**: metas RPO/RTO assinadas; restore executado em ambiente representativo com medição; carga representativa registrada.
- **Evidência**: documento de metas assinado, log de restore com tempos, relatório de carga, comparação com metas.
- **Negativos**: restore parcial → alerta; tempo acima da meta → falha explícita.
- **Insumo necessário**: metas (valores) + janela + ambiente + owner de operação.

## 6. `pilot` — piloto controlado

- **Aceite**: janela/participantes/critérios de saída definidos; rollback ensaiado antes do início; nenhum dado real sem consentimento.
- **Evidência**: plano de piloto aprovado, termo de consentimento, critérios de saída, recibo de rollback.
- **Negativos**: critério de saída violado → parada; rollback falho → bloqueio do piloto.
- **Insumo necessário**: autorização + participantes + janela.

## 7. `rollback` — procedimento e exercício

- **Aceite**: runbook versionado e exercitado em ambiente controlado; rollback do candidato `68bb9d0a` demonstrado (imagem/config/versão anteriores).
- **Evidência**: runbook com hashes, log de ensaio, estado pós-rollback verificado.
- **Negativos**: artefato de rollback ausente → falha; rollback parcial → estado inconsistente detectado.
- **Insumo necessário**: ambiente/janela + owner de operação.

## 8. `humanSignoff` — sign-off de release

- **Aceite**: aprovação explícita do candidato `68bb9d0a531007c5` + escopo + validade, com as condições do aceite local.
- **Evidência**: minuta assinada vinculada ao `candidateId`/`treeHash` e aos 7 gates anteriores.
- **Insumo necessário**: decisor de release (autoridade humana).

## Sequência de execução

1. Com owners/credenciais dos gates 1–4: executar homologações e anexar recibos.
2. Com ambiente/janela dos gates 5 e 7: executar exercícios e medir.
3. Com autorização/participantes do gate 6: piloto; em seguida sign-off (8) sobre o candidato congelado.
