# ADR-0004 — Gateway único para capabilities e tools

## Decisão

Todo tool/plugin passa por `CapabilityGateway`; manifest e binding descrevem capacidade, mas não concedem autorização sozinhos. O gateway faz tenant, RBAC, policy, risk, approval, rate limit e audit.

## Motivo

Executar handlers diretamente por configuração é um bypass de segurança. Um ponto único é verificável e permite adaptar os tools existentes sem duplicar checks.

## Consequência

Plugins antigos precisam de adapter. O default é `blocked`, e o Test Lab usa apenas handlers fake sem efeitos externos.
