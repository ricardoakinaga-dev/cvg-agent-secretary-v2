# PRD — PLAT-S48 baseline controlado e determinismo de testes

## Problema

O baseline S47 documentado não é reproduzível no checkout atual. Uma boundary
de approval depende de duas fontes de tempo diferentes e um teste web usa uma
consulta global para uma mensagem que existe em dois contextos legítimos.
Isso impede distinguir falha de produto de falha de fixture e bloqueia um
veredito confiável do MVP controlado.

## Resultado controlado

O `CapabilityGateway` aceitará uma função `now` opcional, usando o relógio real
por padrão e o mesmo relógio dos fixtures quando injetado. A verificação local
continuará rejeitando expiração inválida ou vencida e a autoridade configurada
continuará responsável pela decisão durável final. O teste de aplicação
consultará a timeline selecionada por seu rótulo semântico, preservando a
prova do preview separado quando necessário.

## Critérios de aceite

- `PLAT-S48-001` passa o caso de approval válido com clock compartilhado e
  mantém rejeição fail-closed para expiração inválida/vencida;
- o default do gateway continua funcionando com o relógio do processo, sem
  depender de configuração de teste;
- o gateway não usa uma fonte de tempo diferente da função configurada;
- `PLAT-S48-002` localiza `Mensagem via API` dentro da timeline selecionada e
  não fica ambíguo quando preview e timeline têm o mesmo texto;
- `npm test`, coverage >= 80% em statements/branches/functions/lines,
  typecheck, lint, format, audit e diff check passam;
- nenhuma boundary de produção é ampliada e nenhum efeito externo é criado.

## Fora de escopo

Não alterar o contrato HTTP de approval, o algoritmo de hash/binding, a
autoridade persistente, schema/migration, policy, canais, providers, RAG,
infraestrutura, autenticação real ou comportamento funcional da UI. A pequena
extensão de `CapabilityGatewayOptions` é somente uma seam TypeScript interna e
não é configurável por input externo.

## Gate

`SPEC_APPROVED_CONTROLLED_BUILD`: aprovado para BUILD controlado após o SPEC
registrado na mesma lane. O RED focado é obrigatório antes da implementação.
