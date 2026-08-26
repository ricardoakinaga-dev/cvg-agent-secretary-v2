# Plugin authoring — processo controlado

## Regra principal

Um manifest é declaração, não código executável. O authoring atual aceita
somente handlers compilados no servidor e fixtures sem rede. Salvar ou aprovar
JSON no catálogo nunca carrega um módulo.

## Passos

1. Defina nome e versão exatos; não use `latest`.
2. Declare capabilities, tools, intents bounded, hooks e permissões sem
   duplicidade.
3. Valide `PluginManifestSchema` e o schema de configuração.
4. Registre o handler no `PluginRegistry` fechado e escreva testes de deny by
   default, tenant, policy, approval, redaction e erro.
5. Crie o binding da `AgentVersion` com versão e tool explícitas.
6. Execute Test Lab e release gates; só então o operador pode validar o
   release candidate controlado.

Exemplo de identidade declarativa:

```text
plugin: scheduling.controlled
version: 1.0.0
tool: find_available_slots
intent: scheduling_lookup
```

Isso não autoriza um handler por si só. O gateway ainda precisa encontrar a
mesma identidade compilada e verificar o contexto de execução.

## Proibições

Não incluir API keys, tokens, URLs de provider, código serializado, shell,
webhook real ou permissões implícitas no manifest. Não publicar metadata como
se fosse instalação. Não testar authoring com tenant ou paciente real.

## Checklist de revisão

- versão exata e invariantes semânticas;
- handler presente somente no registry do servidor;
- tenant/agent/version binding conferido;
- policy e approval testados;
- trace sem payload sensível;
- side effect explicitamente `false` no modo controlado;
- rollback e comportamento quando o plugin está ausente.
