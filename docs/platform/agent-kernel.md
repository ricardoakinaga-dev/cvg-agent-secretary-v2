# Agent Kernel

## Responsabilidade

O kernel é o pipeline genérico que executa uma `AgentVersion` resolvida. A
entrada é tenant, agente, mensagem limitada, histórico limitado e contexto
opcional. O kernel não aceita código, segredo, grant de capability ou escolha
de versão fornecida pelo modelo.

## Fluxo controlado

1. `executePublishedAgent` resolve a versão publicada ou usa o `versionId`
   pinned do worker/sessão.
2. O runtime rejeita versão inexistente, de outro agente, `DRAFT` ou `TESTING`;
   uma continuação pode usar somente o snapshot `ARCHIVED` originalmente
   pinned.
3. `executeConfiguredAgent` valida mensagem, histórico e `approvedKnowledge`
   antes da pipeline.
4. O prompt composer ordena blocos habilitados de forma determinística.
5. O provider determinístico gera a resposta fixture e declara
   `externalCall: false`.
6. A policy avalia hard safety, policy organizacional e comportamento do
   agente; falhas viram `blocked`, `handoff`, `clarify` ou
   `requires_approval`.
7. Knowledge só é considerada quando source/version coincide com binding
   aprovado; ausência resulta em handoff seguro.
8. O registry/gateway planeja e autoriza somente handlers compilados e
   bindings exatos; se a output policy rejeitar a completion, planning,
   approval e execução não são iniciados.
9. A output policy valida tipo, limite, redaction e conteúdo após `model.after`;
   output inseguro vira fallback seguro e o handoff/evento final mantém motivo
   coerente.
10. O runtime produz trace redigido com decisão `outputPolicy` bounded, resposta
    segura e eventual handoff. O modo controlado não faz dispatch, gravação
    clínica, confirmação, cancelamento ou reagendamento real.

## Entradas confiáveis

`tenantId`, `agentId`, `versionId`, actor, approvals e bindings são validados
nas bordas. O histórico é truncado e redigido antes de ser usado. O worker
aceita job strict/bounded em `PublishedAgentJobSchema`; sem adapter de fila o
entrypoint encerra com erro bounded.

## Saída e evidência

O `TestRunTrace` inclui identidade da versão, intent/confidence, policy,
knowledge, prompt, tools, handoff, resposta, decisão `outputPolicy`, provider e
spans. Texto e campos sensíveis são redigidos na fronteira de persistência;
decisões de output são bounded e não carregam conteúdo rejeitado. Traces de
execução não concedem permissão nem substituem aprovação.

## Limite atual

Não há provider externo, canal, broker, outbox, RAG institucional, dado real ou
side effect. A ativação desses componentes exige novo SPEC, infraestrutura,
revisão humana e evidência operacional.
