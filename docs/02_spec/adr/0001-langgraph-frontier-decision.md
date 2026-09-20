# ADR 0001 — Fronteira de workflow: contrato primeiro, dependência LangGraph adiada

- Status: `ACCEPTED` (decisão técnica registrada; resolve o requisito LangGraph de AUD19-02/AUD19-07).
- Data: 2026-09-19. Programa: `AUD19-REM`. Tasks: `AUD19-02`, `AUD19-07`.
- Contexto normativo: [aaa_composition_contract.md](../aaa_composition_contract.md) (D01 = C), [decisão D01](../prod20260913_decision_packet.md), auditoria [0566](../../04_audit/0566_full_repository_gauntlet_audit_2026-09-19.md) (P2-MAINT-01), [backlog 0332](../../03_build/0332_aud20260919_backlog.md) (AUD19-07).

## Contexto

O RF-011 pede execução de workflow LangGraph. A decisão D01 = C registrada em
13/09/2026 definiu convivência com fronteira explícita: o LangGraph coordena a
composição (etapas, transições, retomada) atrás de um adapter injetado; o kernel
governado permanece a autoridade de identidade, policy, aprovação,
idempotência, journal, persistência, auditoria e efeito. O código atual
implementa a seleção fail-closed
(`packages/agent-runtime/src/composition.ts`): `WORKFLOW_COORDINATOR` ausente →
`governed-kernel`; `langgraph-frontier` sem adapter → `frontier_not_configured`;
valor desconhecido → falha no startup. Nenhum nó de grafo recebe executor de
ferramenta, outbox, journal ou credencial.

A auditoria 0566 registra que um adapter LangGraph real não foi demonstrado. O
pacote `langgraph` não existe no `package-lock.json`, e a barra
[aaa_quality_contract.md](../aaa_quality_contract.md) §6/§9 exige que qualquer
dependência nova passe por lockfile em janela exclusiva, auditoria de
licenças/vulnerabilidades, SBOM e requalificação.

## Decisão

1. A implementação local qualificada é a **fronteira contratual** com adapter
   determinístico (`WorkflowCoordinatorPort`), não o pacote LangGraph.
2. A adoção do pacote `langgraph` real fica `BLOCKED` por autorização de
   supply chain e por lockfile; ela não é necessária para satisfazer o contrato
   de composição no perfil controlado e não é autorizada por esta rodada.
3. O requisito RF-011 é considerado **atendido no escopo qualificado**
   (fronteira, seleção fail-closed, equivalência comportamental contra o kernel
   governado, nenhum bypass de efeito). A execução com o runtime upstream
   LangGraph permanece não demonstrada e explicitamente fora do selo local — não
   pode ser rotulada como implementada.
4. Se e quando a dependência for autorizada, o adapter real entra atrás do
   mesmo port, sem alterar a cadeia de governança, e reabre as evidências de
   composição.

## Alternativas consideradas

- **Adicionar o pacote agora**: exigiria rede, lockfile novo, licenças/SBOM,
  revisão de supply chain e requalificação completa; fora da autorização local.
- **Remover o requisito LangGraph do RF-011**: rejeitado; D01 = C foi decisão
  humana registrada e a fronteira já existe e é testável.
- **Substituir a fronteira por execução direta**: rejeitado; ampliaria bypass e
  violaria o contrato de composição.

## Consequências

- A documentação corrente não pode afirmar "LangGraph implementado"; deve
  afirmar "fronteira de workflow implementada; runtime LangGraph upstream
  bloqueado por dependência".
- `AUD19-07` deve preservar `composition.ts` como fronteira e adicionar
  architecture tests que impeçam imports diretos de LangGraph fora dela.
- A futura adoção exige nova decisão de dependência e revalidação das
  evidências afetadas.

## Evidência de suporte

- `packages/agent-runtime/src/composition.ts` — seleção fail-closed e port.
- `docs/02_spec/aaa_composition_contract.md` §3(e) — invariantes.
- `package-lock.json` — ausência de `langgraph`.
