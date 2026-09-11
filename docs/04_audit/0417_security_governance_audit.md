# 0417 — Security Governance Audit

## Parecer vigente — AUD-DOC-001 — 2026-09-05T00:54:31-03:00

Segurança: AUD-F01 P1: risco composto não escalado. AUD-F05 P2: HTTPS por header sob trustProxy numérico, condicionado a acesso direto à origem. Fastify5.8.5: 1 dependência moderada/2 advisories; zero high/critical.

Fonte atual: [relatório integral](0539_documentation_implementation_review.md), [inventário](0540_documentation_review_inventory.json) e [evidências](0541_documentation_review_evidence.json). Auditoria solicitada concluída; correções futuras ainda abertas.

AUD-F07 (P2) adicional: repositório de approval de atendimento aceita escrita de snapshot obsoleto; consumo único de capability approval não prova CAS nessa fila. Reprodução e limites no relatório 0539; remediação futura por gate próprio.

## Registro histórico anterior a esta auditoria

## Permissoes

Validar papeis Operator, Approver, Supervisor, Admin e System.

## Acessos indevidos

Testar se:

- operador sem permissao aprova acao sensivel;
- frontend tenta executar tool;
- system tenta diagnosticar ou prescrever;
- admin apaga evento auditavel.

## Acoes sensiveis

- Confirmar consulta sensivel.
- Alterar dado definitivo.
- Cancelar agenda critica.
- Executar cobranca.
- Responder conteudo medico proibido.

## Segregacao

Aprovacao humana deve registrar ator e nao pode ser mascarada como decisao automatica.

## Status atual

Aguardando implementacao de auth, policy e audit.
