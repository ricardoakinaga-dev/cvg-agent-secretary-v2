# Policy Engine

## Ordem de decisão

```text
hard safety  →  organization  →  agent behavior
```

Uma camada inferior nunca libera o que uma camada superior bloqueou. A função
`evaluatePlatformPolicy` recebe ação, confiança, risco e `AgentConfig` e retorna
decisão, camada, motivo e versão de policy.

## Decisões

- `allowed`: ação habilitada e confiança suficiente;
- `blocked`: hard safety, policy indisponível, ação bloqueada ou não habilitada;
- `requires_approval`: ação declarada como dependente de approval;
- `clarify`: baixa confiança dentro do limite de clarificações;
- `handoff`: baixa confiança além do limite ou risco alto/crítico.

## Hard safety

O conjunto de padrões bloqueia diagnóstico, prescrição, medicação, prontuário,
cobrança, confirmação/cancelamento/reagendamento real, provider/canal real e
envio externo. Risco alto/crítico exige handoff. Essas regras são código e não
podem ser removidas por configuração de agente.

## Configuração declarativa

`PolicyBundleSchema` limita versão, thresholds, `maxClarifications`, ações
habilitadas, actions de approval e bloqueios. Thresholds relacionais são
validados antes de criar uma versão. O Control Center salva um novo snapshot;
não modifica a policy de uma versão publicada.

## Falha fechada

Policy ausente, config inválida, knowledge não aprovada, tool não resolvida ou
approval inválida não viram `allowed`. O trace registra o motivo redigido e o
runtime escolhe resposta segura, clarify ou handoff conforme o caso.
