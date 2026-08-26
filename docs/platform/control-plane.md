# Control Plane

## Modelo

O control plane guarda configuração declarativa e snapshots versionados:

- `Agent`: identidade tenant-scoped e `activeVersionId`;
- `AgentVersion`: configuração completa, lifecycle e autoria;
- bindings de prompt/model/policy/plugin/knowledge/handoff dentro da versão;
- `KnowledgeSource` e `PluginCatalogRecord`: catálogos metadata-only;
- `ReleaseCandidateRecord`: evidência bounded de publicação;
- suites, runs e traces do Test Lab.

## Portas

`ControlPlaneStore` define operações de criação, leitura, transição, publicação,
rollback, catálogos e Test Lab. A implementação em memória é usada em fixtures;
o repository PostgreSQL usa SQL parametrizado e filtros `tenant_id`. O wrapper
`TenantScopedPostgresControlPlane` reserva uma conexão e define o contexto
tenant para RLS.

## Lifecycle

Versões seguem `DRAFT -> TESTING -> APPROVED -> PUBLISHED -> ARCHIVED`.
Transições e publicação aceitam `expectedStatus` e falham com conflito quando o
estado mudou. Nenhuma versão publicada é editada in-place.

## API administrativa

As rotas `/v1/admin/agents`, `/versions`, `/plugins/catalog`,
`/knowledge-sources`, `/release-candidates` e `/test-lab` exigem escopo de
operador e schemas strict. Publish e rollback exigem candidato validado e
preflight crítico; a UI nunca é autoridade de tenant, role ou capability.

## Tenant e RBAC

O tenant vem do contexto confiável do operador, não de um campo livre usado para
ampliar escopo. Cada leitura e mutação valida IDs, associação e estado. Em
produção, headers autoafirmados não autenticam operador; é necessário resolver
de identidade injetado e tenant-bound.

## Compatibilidade

O control plane é aditivo ao data plane da Secretary. Se não houver configuração
de plataforma no runtime legado controlado, a operação existente continua pelo
adapter compatível; a migração de dados reais não faz parte do MVP.
