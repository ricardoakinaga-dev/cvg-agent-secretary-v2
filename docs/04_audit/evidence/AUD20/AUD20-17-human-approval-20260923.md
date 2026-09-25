# Registro da aprovação humana — AUD20-17 / IMP50-40

- Registrado em: `2026-09-23T11:40:43Z`.
- Autoridade: usuário, resposta explícita nesta conversa.
- Decisão: aprovar somente o BUILD local controlado da primeira fatia
  request-context de `AUD20-17` / `IMP50-40`.
- SPEC aprovada por conteúdo/hash: `docs/02_spec/aud20_17_hotspot_decomposition_20260922.md`,
  SHA-256 `a3c200e7323db28245b98dc8b35f120fcf6b8e961e570664044c62f2cd329d37`.
- Limites: somente o escopo/allowlist do adendo; exclui orquestração,
  persistência, web, alteração de API/schema, dados reais, staging e produção.
  Commit, push e deploy não foram autorizados.
- Esta decisão admite a fatia para BUILD, mas não aceita `IMP50-40` nem seus
  critérios; fechamento depende de evidência fresca e auditoria.
- Observação prévia: o levantamento read-only encontrou 4.958 linhas em
  `server.ts` e 214 linhas nos dez helpers nomeados. Isso sugere que o limite
  `<=4708` do C02 não cabe na extração nominal; a implementação deve medir o
  resultado sem alargar a allowlist. Qualquer escopo adicional ou ajuste de
  critério requer revisão própria.

## Reafirmação da decisão — 2026-09-23T15:11Z

- Após revisar `docs/02_spec/aud20_17_hotspot_decomposition_20260922.md#adendo-proposto--imp50-40--primeira-fatia`, o usuário selecionou “Aprovar BUILD local controlado”.
- A resposta reafirma somente a aprovação acima, vinculada ao mesmo hash SHA-256 e aos mesmos limites. O BUILD v1 já havia sido executado; nenhum código/teste foi repetido nem o aceite dos critérios foi concedido.
- A resposta não aprova a SPEC query-parser separada, nem alteração de escopo, staging, produção, commit, push ou deploy.

## Segunda reafirmação — 2026-09-23T15:51Z

- O usuário respondeu novamente “Aprovar BUILD local controlado” à confirmação do mesmo adendo request-context e hash.
- A decisão reafirma os limites já registrados. O BUILD v1 já foi executado e não será repetido sem mudança autorizada; os critérios continuam não aceitos por C02, C06 e C07.
- Esta resposta não aprova a SPEC query-parser separada, não altera a allowlist e não autoriza staging, produção, commit, push ou deploy.

## Terceira reafirmação — 2026-09-23T19:29Z

- Após revisar novamente o adendo `#adendo-proposto--imp50-40--primeira-fatia`, o usuário aprovou somente o BUILD local controlado da fatia request-context registrada em 0337.
- A decisão corresponde ao mesmo conteúdo/hash SHA-256 `a3c200e7323db28245b98dc8b35f120fcf6b8e961e570664044c62f2cd329d37` e à allowlist já admitida. O BUILD v1 já está no worktree; esta confirmação não pediu repetição, não amplia a allowlist e não altera os critérios.
- C02 permanece não atendido (`server.ts` 4.745 linhas contra `<=4708`, diferença de 37); C06/C07 continuam sem aceite. A SPEC query-parser segue separada e sem aprovação/admissão.
- Permanecem excluídos orquestração, persistência, web, mudança de API/schema, dados reais, staging, produção, commit, push e deploy.

## Quarta reafirmação — 2026-09-23T20:00Z

- O usuário aprovou novamente somente o BUILD local controlado da primeira
  fatia request-context registrada em 0337, após revisar o mesmo adendo.
- Esta resposta mantém o hash SHA-256
  `a3c200e7323db28245b98dc8b35f120fcf6b8e961e570664044c62f2cd329d37` e a
  allowlist existente. O BUILD v1 já foi executado; não houve pedido ou escopo
  para repeti-lo. C02 continua 37 linhas acima do teto e C06/C07 sem aceite.
- A resposta não aprova a SPEC query-parser nem altera escopo, API/schema,
  ambiente, dados permitidos ou autorização de staging/produção/commit/push/deploy.
