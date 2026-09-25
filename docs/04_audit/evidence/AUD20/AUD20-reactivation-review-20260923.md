# AUD20 — pacote de revisão da reativação local

- decisão do usuário recebida em `2026-09-23`: reativar
  `AUD20-10/17/20` para trabalho local controlado, sem substituir revisão
  humana de SPEC, gates, dependências ou autorização de sessão humana.
- worktree: preservar alterações existentes; nenhuma alteração de código,
  teste de produto, sessão humana, integração, commit, push, deploy, staging ou
  produção foi feita nesta preparação.

## Disposição proposta

| Task | IMP50 admitido para próxima fatia | Estado proposto | Gate seguinte |
| --- | --- | --- | --- |
| `AUD20-17` | primeira fatia de `IMP50-40`, somente request context | `WAITING_HUMAN_APPROVAL` | Revisar o adendo da SPEC e executar primeiro segundo o caminho 0336/0338; nenhuma extração maior. |
| `AUD20-10` | `IMP50-09`, somente wiring/coleta correlacionada sintética | `WAITING_HUMAN_APPROVAL` | Revisar o adendo da SPEC e executar depois de `AUD20-17`. Owner/SLO, approval latency e alertas continuam em slices próprios. |
| `AUD20-20` | `IMP50-47` permanece futuro | `BLOCKED` | A sequência R3 depende de R2 e de `AUD20-18`; não criar comportamento/schema nem iniciar BUILD agora. |
| `AUD20-19` | `IMP50-18` permanece futuro | `WAITING_HUMAN_APPROVAL` | O roteiro manual foi preparado; autorização, consentimento e sessão ainda faltam. |

As duas revisões SPEC pendentes são:

- [SPEC AUD20-10 — adendo IMP50-09](../../../02_spec/aud20_10_operational_observability_20260922.md#adendo-proposto--imp50-09--collector-conectado);
- [SPEC AUD20-17 — adendo da primeira fatia](../../../02_spec/aud20_17_hotspot_decomposition_20260922.md#adendo-proposto--imp50-40--primeira-fatia).

O estado da sessão humana está descrito em
[roteiro manual proposto](AUD20-19-manual-a11y-session-plan-20260923.md).
Nenhum adendo está aprovado para BUILD. A sequência congelada em 0336/0338
coloca `AUD20-17` antes de `AUD20-10`; a próxima revisão solicitada é a da
SPEC `AUD20-17`/`IMP50-40`. Somente uma task fica ativa no caminho crítico.

## Ajustes após crítica independente

- a sequência crítica mantém `AUD20-17` antes de `AUD20-10`, conforme 0336/0338;
- o adendo de `AUD20-10` explicita flush/close no shutdown da API e dos caminhos
  worker memory/PostgreSQL, com a ordem de teardown e cobertura por testes;
- o adendo de `AUD20-17` inclui `parseInboundChannel` e os contratos inbound
  de tenant, runtime e segurança na matriz de regressão;
- o roteiro proposto de `AUD20-19` agora exige harness interativo isolado,
  marcador sintético acessível, captura de candidato pelo helper oficial,
  observações separadas de ordem de leitura/foco, fixture loading pausável,
  passos separados para incerteza/handoff, parada e retenção consentida, e
  resultado `READY_FOR_HUMAN_REVIEW` explicitamente distinto de aprovação F28.

## Verificação documental

Executado em `2026-09-23` com Node `v22.23.2`:

- `npm run docs:check` — PASS; 891 links, 609 arquivos JSON, estados e ação
  corrente válidos;
- `npm run format:check` — PASS; todos os arquivos seguem Prettier;
- `git diff --check` — PASS.

Nenhum teste de produto, BUILD ou sessão humana foi iniciado; status,
dependências e release gates permanecem inalterados.
