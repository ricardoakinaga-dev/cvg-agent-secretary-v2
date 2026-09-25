# AUD20-19-FU1 — crítica independente da SPEC v1 — 2026-09-23

## Resultado

**CONDITIONAL** para apresentação a revisão humana. A SPEC pode permanecer como
follow-up somente de especificação, mas a configuração de execução, a fronteira
de rede e o modo estrito das fixtures precisam de correção antes de solicitar
aprovação. Este parecer não aprova SPEC, task, BUILD ou sessão humana.

## Integridade do alvo

- Alvo lido pelo crítico: `docs/02_spec/aud20_19_imp50_18_human_session_harness_20260923.md`
- SHA-256 dos bytes revisados: `a3212ab61ae36dbeab9a6c4024deb26547c98c373bcf8ced81ef6cb6d5f363e3`
- Fase/status então declarados: `SPEC` / `DRAFT_PENDING_HUMAN_REVIEW`.
- Nenhum arquivo foi alterado e nenhum teste foi executado pelo crítico.

## Achados prioritários

1. **Alta — execução E2E contradizia a fronteira declarada.** O comando usava
   `playwright.config.ts`, que inicia API e Vite, permite reuso de servidor e
   depende do `dev:web` que escuta em `0.0.0.0`. O Vite padrão envia `/v1` e
   `/health` ao API local. A allowlist não incluía configuração isolada.
2. **Alta — hooks Playwright não provavam egress global.** Context routing não
   intercepta requests atendidos por service workers; WebSocket precisa de
   `context.routeWebSocket` antes de criar páginas. Downloads e redirects não
   estavam demonstrados. Um receipt do browser não prova ausência de tráfego
   de todo o processo.
3. **Alta — fixture existente era mais permissiva que o contrato.** Ela cobre
   apenas `page.route('**/v1/**')`, não `/health`, aplica delay a todas as
   respostas quando habilitado, responde genericamente a GETs desconhecidos e
   aceita genericamente métodos de escrita. A allowlist de BUILD previa apenas
   pause/release.
4. **Média — manter a ordem PLAN50.** A SPEC proposta não deve substituir a
   próxima ação crítica AUD20-17/IMP50-40 ou reordenar 0336/0340. A exigência de
   registrar a fatia na task-pai vem do backlog 0341; a task FU1 continua apenas
   proposta.
5. **Média — melhorar rastreabilidade e minimização.** Faltavam links diretos
   ao relatório/crítica C01–C07 já concluídos e uma regra precisa para remover
   segmentos dinâmicos antes de registrar caminhos.

## Base e método

O crítico inspecionou Discovery 0021, PRD 0032, SPEC original e draft FU1,
roteiro manual, gate-review, 0190, 0337, 0341, registro por IMP50, além de
`playwright.config.ts`, `vite.config.mts`, `package.json`, fixtures sintéticas,
E2E de acessibilidade e o helper de candidate binding. Confirmou que Discovery
e PRD existentes dão base para uma SPEC-only follow-up; sessão e autoridade
humana continuam separadas.

Referências técnicas consultadas: [BrowserContext Playwright](https://playwright.dev/docs/api/class-browsercontext)
e [Page Playwright](https://playwright.dev/docs/api/class-page). A documentação
descreve o limite do routing com service workers e o hook de WebSocket; isso
não substitui uma barreira de egress do processo.

## Correções requeridas

- Nova configuração Playwright/Vite sem API, sem proxy, sem captura e sem reuso;
  bind somente loopback e teste usando explicitamente essa configuração.
- Barreia de egress no nível do processo/ambiente, com `BLOCKED` sem ela; não
  usar contadores Playwright como prova global.
- Roteador estrito session-only com tabela method/path exata, endpoints
  sintéticos necessários, rejeição de qualquer fallback e pausa H05 somente no
  GET de loading; manter defaults da fixture existente.
- Negativos de popup/frame, redirect, fetch/XHR, workers/service worker,
  download, WebSocket, método/path desconhecido e ausência do API.
- Registrar que a preparação ocorre em paralelo sem alterar a próxima ação
  crítica; fazer link à evidência local C01–C07 e remover valores de path
  dinâmico antes da serialização.

Nenhuma aprovação de BUILD é recomendada nesta versão. Até revisar a SPEC
corrigida por novos bytes, `AUD20-19-FU1` permanece proposta e não admitida.
