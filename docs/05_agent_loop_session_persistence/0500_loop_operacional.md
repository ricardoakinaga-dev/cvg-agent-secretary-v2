# 0500 — Loop Operacional Obrigatorio

## Principio

Agente executor nao deve depender de memoria implicita. Estado, log e backlog precisam ser persistidos em arquivos de controle.

## Loop oficial

```txt
LER ESTADO
-> EXECUTAR ETAPA
-> VALIDAR
-> ATUALIZAR ESTADO
-> ATUALIZAR LOG
-> ATUALIZAR BACKLOG
-> DECIDIR: CONTINUAR | BLOQUEAR | AGUARDAR HUMANO | FINALIZAR
```

## Arquivos obrigatorios

- `docs/99_runtime_state.md`
- `docs/20_master_execution_log.md`
- `docs/30_backlog_master.md`

## Regras de execucao

1. Ler `99_runtime_state.md` antes de agir.
2. Executar apenas a proxima acao coerente com o estado.
3. Validar resultado contra o gate da fase.
4. Registrar acao no log.
5. Atualizar backlog quando surgir dependencia, risco ou debito.
6. Definir `next_action`.
7. Encerrar sempre com status valido.

## Proibido

- Encerrar apenas com resumo narrativo.
- Avancar com gate reprovado.
- Ignorar bloqueio.
- Esconder pendencia.
- Assumir decisao de negocio.
