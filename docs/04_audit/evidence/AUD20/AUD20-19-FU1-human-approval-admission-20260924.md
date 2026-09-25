# Aprovação humana e admissão BUILD — AUD20-19-FU1 / IMP50-18 — 2026-09-24

- Registrado em: `2026-09-24T12:13Z`.
- Autoridade: usuário, resposta explícita nesta conversa.
- Question ID: `call_DeTTq9di8HQWwTZsFlc1dx3l`.
- Resposta exata: `Aprovar SPEC e admitir BUILD local controlado`.
- SPEC aprovada por hash: `docs/02_spec/aud20_19_imp50_18_human_session_harness_20260923.md`,
  33.145 bytes, SHA-256
  `decb8d441c2a17678026c6305fb71a9c31a2069d6836ad010362f9c3b9179688`.
- Gate de origem: Discovery 0021 e PRD 0032 validados; a crítica fresh-context
  v4 deu `PASS` somente para prontidão de revisão humana do mesmo hash.
- Decisão: `SPEC_APPROVED_CONTROLLED_BUILD`. O BUILD local controlado foi
  admitido conforme a allowlist de AUD20-19-FU1 em 0337, registrada antes de
  qualquer código.
- Escopo admitido: launcher/helpers do harness; fixtures sintéticas
  session-only; testes unitários e Playwright headless `verify`; configs
  Playwright/Vite dedicadas; schemas/templates de autorização e suplemento;
  e os registros operacionais listados em 0337. Preservar os defaults das
  fixtures existentes e não alterar fonte de aplicação, API/schema, config de
  rede padrão ou validador existente.
- Exclusões: nenhum modo `session`, participante, facilitador, consentimento,
  captura de mídia, artefato de sessão, alteração de UI/API/schema, dado real,
  PostgreSQL, staging, produção, commit, push ou deploy. A autorização aprova
  o harness; `IMP50-18` e o gate humano da sessão permanecem
  `WAITING_HUMAN_APPROVAL`; `human_a11y: PENDING` e `releaseEligible: false`.
- A resposta não reordena Q1/Q2: `AUD20-17` permanece sem aceite por C06/C07;
  `AUD20-10` segue enfileirada; staging/produção `NO_GO`.
- Próximo passo: executar o BUILD local exatamente conforme a SPEC e registrar
  resultados; parar se preflight, allowlist ou gate falhar.
