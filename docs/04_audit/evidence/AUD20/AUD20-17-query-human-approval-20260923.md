# Registro de aprovação humana — AUD20-17-FU1 / IMP50-40 query-parser

- Registrado em: `2026-09-23T20:44:20Z`.
- Autoridade: usuário, resposta explícita nesta conversa.
- Decisão: aprovar a SPEC e admitir somente BUILD local controlado da fatia
  query-parser descrita no documento abaixo.
- SPEC aprovada por conteúdo/hash:
  `docs/02_spec/aud20_17_imp50_40_query_parsers_20260923.md`, 7.398 bytes,
  SHA-256
  `fec5dcf0ea25e98ccf87e7b80e3b442b0c006521247d6e1137cbfd0f7c79e348`.
- Gates de origem: Discovery 0023 e PRD 0033 estão validados; a crítica
  fresh-context v2 não encontrou bloqueador de SPEC e exige assertions das
  mensagens HTTP exatas durante BUILD.
- Admissão: registrada em `0190_spec_validation.md` e na task
  `AUD20-17-FU1` de 0337 antes de qualquer edição de código.
- Limites: somente a allowlist, contratos e caps definidos na SPEC. Permanecem
  excluídos mudanças de API/schema, handlers além dos imports necessários,
  persistência, worker, web, dados reais, staging, produção, commit, push e
  deploy.
- Esta aprovação não aceita critérios da primeira fatia request-context nem
  altera sua SPEC/allowlist. O BUILD começa localmente após este registro;
  auditoria e aceite exigem evidência fresca.
