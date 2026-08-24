# 0100 — SPEC Readiness Review

## Documentos lidos

- `docs/blueprint/0000_blueprint_master.md`
- `docs/00_discovery/0009_discovery_master.md`
- `docs/00_discovery/0090_discovery_validation.md`
- `docs/01_prd/0010_casos_de_uso.md`
- `docs/01_prd/0011_escopo_fase.md`
- `docs/01_prd/0012_regras_de_negocio.md`
- `docs/01_prd/0013_requisitos_funcionais.md`
- `docs/01_prd/0014_requisitos_nao_funcionais_produto.md`
- `docs/01_prd/0015_metricas_de_sucesso.md`
- `docs/01_prd/0020_prd_master.md`
- `docs/01_prd/0090_prd_validation.md`

## Resumo executivo do produto derivado

A Esmeralda V2 e uma plataforma de agente hospitalar com runtime proprio, workflows LangGraph, tools desacopladas, adapters de integracao, memoria, policy engine, approvals humanos, auditoria e painel minimo.

## Confirmacao do PRD

O PRD esta aprovado para SPEC documental em `docs/01_prd/0090_prd_validation.md`.

## Lacunas que afetam a SPEC

- Regras finais de confirmacao de consulta ainda precisam de validacao humana.
- Fonte oficial do RAG institucional ainda precisa ser definida.
- Politica exata de retencao de dados ainda nao foi definida.
- Permissoes detalhadas por cargo hospitalar precisam de validacao operacional.

## Hipoteses tecnicas necessarias

- O repositorio sera organizado como monorepo com `apps` e `packages`, conforme blueprint.
- O Agent Runtime sera independente do canal.
- Workflows serao modelados como maquinas de estado orquestradas por LangGraph.
- Tools terao contratos estaveis e implementacoes locais ou adapters externos.
- Banco proprio sera a fonte operacional inicial da agente.

## Bloqueios

Nao ha bloqueio para SPEC documental. Ha bloqueio para implementacao irrestrita de agenda, cobranca, prontuario, RAG com fonte real, retencao de dados e qualquer acao clinica sem validacao humana.

## Decisao de readiness

```txt
STATUS: SPEC_DOCUMENTAL_OK_BUILD_FUNCTIONAL_BLOCKED
PERMITIDO: detalhar e aprovar Phase 0 de fundacao tecnica
BLOQUEADO: fluxos sensiveis, uso de dado real e rollout
```
