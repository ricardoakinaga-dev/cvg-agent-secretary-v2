# AUD20-19-FU1 — crítica independente da SPEC v3

- Parecer: `CONDITIONAL` para revisão humana.
- Hash SHA-256 da SPEC lida: `a358ec70742306980644ed0e16f8c4d695f5c8e1dcb0865fa9453436e7705ce3`.
- Arquivo avaliado: `docs/02_spec/aud20_19_imp50_18_human_session_harness_20260923.md`.
- Escopo do parecer: prontidão para revisão; não autoriza BUILD nem sessão humana.
- Arquivos alterados pela crítica: nenhum.
- Testes executados: nenhum.

## Achados priorizados

1. **Média — proveniência da aprovação e vínculo do facilitador.** O schema de
   autorização aceita o papel `AUTHORIZED_FACILITATOR`, enquanto o registro
   `--session-approval` é definido apenas em prosa e não tem schema próprio nem
   forma de vincular a confirmação ao facilitador autorizado. Definir como a
   proveniência e a autoridade são verificadas, por registro restrito e vínculo
   opaco ou por etapa explícita de verificação humana externa.
2. **Média — destino dos artefatos após sessão bem-sucedida.** A SPEC exige
   hashes de relatório, suplemento e receipt de rede, mas remove a pasta
   temporária no encerramento e só define saída persistida para parada/retirada.
   Especificar o destino dos artefatos de sucesso, suas permissões e retenção
   para permitir revisão independente após cleanup.

## Pontos anteriores reavaliados

Os quatro achados da crítica v2 foram endereçados: H09 inclui os dois GETs do
Admin panel e negativos exatos; a gramática de query Vite 8.2.2 fecha nomes,
valores e duplicatas; a sessão define autorização/consentimento antes do
browser, sem captura de mídia, e cleanup; o harness não cria commit e bloqueia
candidato dirty. Os registros 0190/0337 mantêm o draft e BUILD não admitido,
sem mudar a ordem PLAN50.

Fontes adicionais rechecadas: call sites de H09 em
`apps/web/src/features/platform/index.tsx` e `apps/web/src/api/client.ts`,
implementação local/lock do Vite 8.2.2, configs Playwright/Vite e fixtures.
Também foram lidos Discovery 0021, PRD 0032, SPEC original e draft, roteiro
manual, 0190, 0337, 0341, gate-review e registros PLAN50.

## Parecer

`CONDITIONAL`: os dois itens acima devem ser esclarecidos antes da aprovação
humana da SPEC. Esta crítica não autoriza BUILD ou sessão humana.
