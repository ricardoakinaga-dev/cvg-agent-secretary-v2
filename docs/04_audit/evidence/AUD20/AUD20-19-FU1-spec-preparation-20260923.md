# AUD20-19-FU1 — preparação documental da SPEC

- Task: proposta sob `AUD20-19`, relacionada a `IMP50-18`.
- Estado final desta preparação: `DRAFT_PENDING_HUMAN_REVIEW`; não admitida a
  BUILD. Sessão humana não autorizada nem executada.
- Scope executado: leitura do contrato, correções documentais de escopo e
  crítica independente; nenhum código, teste de produto, candidato, sessão,
  staging ou produção.
- Gate seguinte desta proposta: decisão humana hash-bound sobre esta SPEC e
  seu registro em 0337/0190; mesmo se aprovada, a sessão humana precisará de
  autorização separada, consentimento, participante voluntário e equipamento/
  tecnologia assistiva escolhidos pela pessoa.

## Evolução e críticas

| Versão | SHA-256 | Parecer | Evidência |
| --- | --- | --- | --- |
| v1 | `a3212ab61ae36dbeab9a6c4024deb26547c98c373bcf8ced81ef6cb6d5f363e3` | `CONDITIONAL` — configuração, egress, mapa de fixtures, ordem e privacidade | [crítica v1](AUD20-19-FU1-independent-critic-v1-20260923.md) |
| v2 | `02b04400517cbc6c0657b20dfeb60659be78d40785ad1377a825152405d6f399` | `CONDITIONAL` — duas leituras Admin H09, gramática de query, contrato de consentimento/captura e candidato limpo | [crítica v2](AUD20-19-FU1-independent-critic-v2-20260923.md) |
| v3 | `a358ec70742306980644ed0e16f8c4d695f5c8e1dcb0865fa9453436e7705ce3` | `CONDITIONAL` — proveniência/facilitador e destino/retenção dos artefatos de sucesso | [crítica v3](AUD20-19-FU1-independent-critic-v3-20260923.md) |
| v4 | `decb8d441c2a17678026c6305fb71a9c31a2069d6836ad010362f9c3b9179688` | `PASS` para revisão humana; nenhum achado restante prioritário | [crítica v4](AUD20-19-FU1-independent-critic-v4-20260923.md) |

O [draft v4](../../../02_spec/aud20_19_imp50_18_human_session_harness_20260923.md)
inclui mapa H09 fechado, gramática de query vinculada ao Vite 8.2.2, aprovação
e consentimento antes do browser, mídia sempre desabilitada nesta fatia,
verificação humana externa de proveniência/facilitador, bloqueio de candidato
Git dirty sem commit do harness e destino local com permissões/retenção
explícitos para artefatos sanitizados de uma futura sessão aprovada.

## Limites mantidos

- O PASS da crítica é apenas prontidão para revisão humana, não aprovação de
  SPEC, admissão de BUILD, autorização de sessão ou aceite de `IMP50-18`.
- A ação crítica PLAN50 segue AUD20-17-FU1/IMP50-40, conforme 0336/0340.
- `IMP50-49` é um workstream de Discovery separado. O usuário escolheu o novo
  inventário read-only integral v2 depois de congeladas as escritas; essa escolha
  não adjudica as 141 referências insuficientes nem emite `DISCOVERY_READY`.
- Nenhum teste foi executado nesta preparação.
