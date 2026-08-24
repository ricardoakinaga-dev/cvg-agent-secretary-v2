# 0417 — Security Governance Audit

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
