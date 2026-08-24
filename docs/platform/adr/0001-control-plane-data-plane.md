# ADR-0001 — Separar Control Plane de Data Plane

## Decisão

Adicionar a plataforma como camada modular (`packages/platform`) e manter `apps/api`, `apps/worker` e entidades de conversa da Secretary compatíveis. O kernel resolve configuração, mas efeitos do data plane continuam protegidos pelos contratos e policies existentes.

## Motivo

Reescrever o runtime atual aumentaria risco clínico/operacional e quebraria evidências já existentes. A separação permite Agent A/B e evolução incremental.

## Consequência

Há duas portas de persistência e um resolver de compatibilidade durante a migração. O fallback legado é explícito e controlado, não uma permissão de produção.
