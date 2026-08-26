# Prompt Management

## Estrutura

`AgentConfig` contém persona, greeting, `promptBlocks`, response templates,
model, policies, plugins, knowledge e handoff. Cada bloco tem id, kind,
conteúdo, prioridade e enabled. O composer filtra blocos ativos, ordena por
prioridade e desempata por id.

## Proteções

Schemas são strict e bounded. Segredos, credenciais, tokens, PII conhecida,
prototype keys e alterações a blocos `system`/`safety`/`kernel` são rejeitados
ou preservados conforme a regra do perfil. Templates operacionais têm limites e
fallbacks seguros.

## Control Center

O editor web aceita JSON de prompt blocks e texto de templates. A API repete a
validação; o browser não é autoridade. Salvar ou clonar cria nova
`AgentVersion` em `DRAFT`, preservando o snapshot anterior.

## Reprodutibilidade

O profile normalizado produz checksum determinístico. O trace do Test Lab
exibe checksum, ids e status do profile sem incluir segredo ou payload bruto.
O provider controlado recebe prompt limitado e devolve somente resposta
determinística.

## Evolução

Alterações de persona, tom, greeting, template ou policy exigem transição e
release candidate da nova versão. Não há prompt fixo usado como substituto da
configuração declarativa e não se deve editar snapshots publicados diretamente.
