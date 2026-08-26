# Plugin System

## Camadas

1. `PluginManifest` descreve nome, versão, capabilities, tools, hooks,
   permissões, risco e schema de configuração.
2. `PluginRegistry` mantém somente plugins compilados e snapshots imutáveis;
   resolução exige versão exata e pode selecionar por intent bounded.
3. `PluginBinding` conecta uma versão de agente a plugin/tool habilitado.
4. `CapabilityGateway` é a autoridade de execução: tenant, agente, versão,
   lifecycle, actor, policy, approval, idempotência e audit são verificados
   antes do handler.
5. `PluginEventBus` entrega eventos tipados apenas a hooks declarados, com
   payload sanitizado e isolamento de falha.

## Catálogo

O catálogo administrativo persiste manifest metadata-only com lifecycle
`DRAFT/APPROVED/ARCHIVED`. Aprovar um registro não instala código, não registra
handler, não cria capability e não autoriza execução. Não existe import dinâmico
ou marketplace neste repositório.

## Identidade e resolução

`name@version/tool` é a identidade mínima. `latest`, versão ausente, plugin não
registrado, tool ausente, colisão ou múltiplos bindings são bloqueados. A
permissão é derivada do manifest compilado pelo servidor; request, modelo,
catálogo e job não podem fornecer grant.

## Segurança operacional

Handlers atuais são fixtures controladas. Ferramentas como scheduling retornam
dados determinísticos e não criam, confirmam, cancelam ou reagendam consulta.
Uma ferramenta real só pode entrar após contrato de side effect, approval,
lease, retry/idempotência, retenção, audit e decisão humana.
