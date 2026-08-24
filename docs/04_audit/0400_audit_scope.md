# 0400 — Audit Scope

## Sistema auditado

`cvg-agent-secretary-v2`, Esmeralda V2.

## Versao

Pre-build documental. A versao de runtime sera definida no primeiro ambiente funcional.

## Ambiente

Inicialmente desenvolvimento. Auditoria real deve ser repetida em staging e producao.

## Escopo da auditoria

- Aderencia ao PRD.
- Aderencia a SPEC.
- Runtime.
- Logs.
- Metricas.
- Integracoes.
- Dados.
- Seguranca e governanca.
- Experiencia operacional.
- Gaps e plano de remediacao.

## Limitacoes

Como ainda nao ha sistema funcional, este conjunto define baseline de auditoria e criterios de coleta. Resultados reais devem ser preenchidos apos build executavel.

## Fontes de evidencia esperadas

- Logs estruturados.
- Metricas.
- Testes automatizados.
- Eventos de auditoria.
- Traces por correlation id.
- Observacao de fluxos reais.
- Revisao de PRD, SPEC e execution log.

## Periodo analisado

Primeira auditoria real deve cobrir o periodo do piloto controlado.
