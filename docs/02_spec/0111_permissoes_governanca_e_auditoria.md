# 0111 — Permissoes, Governanca e Auditoria

## Papeis

- Operator: acompanha conversas, tasks e handoffs.
- Approver: decide approval requests.
- Supervisor: revisa auditoria e safety events.
- Admin: configura policy, integrações e niveis de autonomia.
- System: executa workflows e tools.

## Acoes permitidas

- Operator pode assumir conversa e atualizar tarefa.
- Approver pode aprovar, rejeitar ou assumir approval.
- Supervisor pode revisar trilhas e classificar gaps.
- Admin pode alterar configuracoes, com auditoria.
- System pode sugerir e executar apenas acoes permitidas por policy.

## Acoes proibidas

- System nao pode diagnosticar ou prescrever.
- Operator sem permissao nao pode aprovar acao sensivel.
- Admin nao deve apagar eventos auditaveis.
- Frontend nao pode executar tool diretamente.

## Trilhas de auditoria

- Quem executou ou aprovou.
- Quando executou.
- Qual policy estava vigente.
- Qual workflow e tool foram usados.
- Qual input conceitual foi usado.
- Qual resultado ou erro ocorreu.

## Eventos sensiveis

- Bloqueio por safety.
- Approval solicitado.
- Approval aprovado ou rejeitado.
- Handoff humano.
- Falha de integracao.
- Tentativa de acao proibida.

## Segregacao de responsabilidades

Quem configura policy nao deve aprovar silenciosamente eventos sem trilha. Acoes sensiveis precisam registrar ator humano ou decisao automatica permitida por regra versionada.

## Baseline de seguranca

- Aplicar least privilege por papel e por superficie.
- Autenticacao obrigatoria para painel, API operacional e endpoints de auditoria.
- Secrets devem ficar fora do repositorio e ser validados no startup.
- Logs nao podem expor token, segredo, payload clinico integral ou dado pessoal desnecessario.
- Dados pessoais devem seguir LGPD: finalidade explicita, minimizacao, controle de acesso, retencao e possibilidade de expurgo governado.
- Integracoes externas devem ter timeout, retry controlado, circuit breaker quando aplicavel e auditoria de falha.
- Configuracoes de policy e autonomia exigem versionamento, autor e motivo.

## Matriz minima de acesso

| Acao                      | Operator | Approver | Supervisor | Admin           | System             |
| ------------------------- | -------- | -------- | ---------- | --------------- | ------------------ |
| Ver conversa atribuida    | sim      | sim      | sim        | sim             | nao                |
| Assumir conversa          | sim      | sim      | sim        | sim             | nao                |
| Decidir approval sensivel | nao      | sim      | sim        | sim, com trilha | nao                |
| Alterar policy            | nao      | nao      | nao        | sim             | nao                |
| Ver auditoria completa    | limitado | limitado | sim        | sim             | nao                |
| Executar tool             | nao      | nao      | nao        | nao             | somente via policy |
