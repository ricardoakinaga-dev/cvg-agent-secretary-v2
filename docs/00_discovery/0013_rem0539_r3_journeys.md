# 0013 — Discovery R3: jornadas tutor, pet e agenda

Data: 2026-09-05. Programa: `REM-0539`. Onda: R3. Estado: `DISCOVERY_VALIDATED_CONTROLLED`.

## Problema observado

As ferramentas locais de tutor, pet e agenda retornavam listas vazias, objetos efêmeros ou horários fixos já vencidos. Isso impede testar retomada depois de reinício, ambiguidade de identidade, vínculo autorizado e handoff completo. Um stub que sempre retorna sucesso também mascara perda de contexto e não prova a jornada operacional descrita no plano.

## Escopo da descoberta

- Fixtures sintéticas por tenant, com identificadores claramente fictícios.
- Busca determinística por telefone normalizado e nome do pet.
- Rascunhos persistentes de tutor, pet e appointment, sempre com estado explícito.
- Slots gerados a partir de relógio injetável, sempre futuros no instante da consulta.
- Ambiguidade, expiração, retomada e isolamento cross-tenant como comportamentos de primeira classe.
- Handoff com resumo de intenção, risco, dados coletados, pendências e próximo passo.

## Limites e hipóteses

Um draft não é cadastro definitivo. Um slot proposto não é consulta confirmada. Nenhuma ferramenta confirma, cancela ou reagenda compromisso real. Vínculo só ocorre com candidato explícito, tenant correto e autorização do fluxo; múltiplos candidatos geram `clarify_owner`. A triagem de risco continua prevalecendo sobre coleta ou agenda. Dados reais, canais, providers, RAG institucional e produção estão fora deste gate.

## Evidência e próximo gate

O problema é reproduzido pelos testes existentes em `packages/tools/src/__tests__/owner-patient-tools.integration.test.ts` e `packages/tools/src/__tests__/tool-registry.test.ts`, que demonstram respostas vazias/efêmeras e slots históricos. A descoberta pode seguir para PRD controlado, desde que os contratos preservem drafts, auditoria, tenant scope e handoff.
