# 0430 — Enterprise Readiness Audit

## Escopo

Auditoria critica do briefing documental em `docs/00_discovery` ate `docs/08_runtime`, com foco em preparar sprints de desenvolvimento sem falso sinal verde.

## Resultado executivo

```txt
STATUS: APROVADO PARA PILOTO CONTROLADO
STATUS OPERACIONAL: BASELINE ENTERPRISE VERIFICADO COM RESTRICOES
MOTIVO: runtime funcional existe, gates passam, audit nao reporta vulnerabilidades e decisoes conservadoras bloqueiam acoes reais sensiveis
```

## Achados criticos

### ER-001 — Gates sinalizavam pronto apesar de bloqueios

- Evidencia: PRD/SPEC estavam marcados como aprovados, enquanto runtime state e gap analysis mantinham agenda, RAG e retencao pendentes.
- Risco: iniciar sprint funcional com requisitos sensiveis indefinidos.
- Correcao aplicada: gates agora usam status condicional e deixam explicito o que nao esta autorizado.

### ER-002 — Requisitos nao funcionais estavam pouco mensuraveis

- Evidencia: expressoes como "tempo operacional adequado" e "altamente confiaveis".
- Risco: aceitar entrega sem criterio objetivo.
- Correcao aplicada: metas p95, fail-closed, idempotencia, cobertura e investigabilidade foram adicionadas.

### ER-003 — Baseline de seguranca e privacidade estava incompleto

- Evidencia: havia bloqueios de diagnostico/prescricao, mas faltavam LGPD, secrets, least privilege, matriz de acesso e retencao provisoria.
- Risco: construir um sistema hospitalar sem governanca minima de dados.
- Correcao aplicada: SPEC de permissoes e persistencia recebeu baseline explicito.

### ER-004 — API estava conceitual demais para execucao enterprise

- Evidencia: endpoints existiam, mas sem transversais obrigatorios de auth, idempotencia, paginacao, correlation e erro seguro.
- Risco: implementacoes divergentes e inseguras nas sprints.
- Correcao aplicada: contratos de API receberam requisitos transversais e regras por endpoint critico.

### ER-005 — Sprint 0 estava subespecificada

- Evidencia: sprint inicial aceitava modulos vazios e "teste base executa" como pronto.
- Risco: criar estrutura sem garantia de evolucao testavel.
- Correcao aplicada: Sprint 0 agora inclui baseline documental, smoke/import tests, gates de qualidade, seguranca e CI automatizavel.

### ER-006 — Nao havia verificacao executavel do briefing

- Evidencia: `package.json` tinha script de teste que sempre falhava e nao validava a documentacao.
- Risco: regressao documental invisivel.
- Correcao aplicada: adicionado `tests/docs-readiness.test.js` e `npm test` para validar gates e bloqueios documentais.

### ER-007 — Dependencias vulneraveis foram removidas

- Evidencia anterior: `npm audit --audit-level=high` reportava vulnerabilidades moderadas em `uuid` transitivo via LangGraph/LangChain.
- Correcao aplicada: dependencias LangChain/LangGraph/Qdrant nao utilizadas foram removidas.
- Evidencia atual: `npm run verify` executou `npm audit --audit-level=high` com 0 vulnerabilidades.

## Bloqueios remanescentes

- Fonte oficial, dono e ciclo de atualizacao do RAG institucional para uso real.
- Politica de retencao por classe de dado para dados reais.
- Matriz operacional real de cargos do hospital.
- Banco real, secrets manager e observabilidade externa antes de producao irrestrita.
- Decisao humana nova para qualquer automacao real de agenda, financeiro, prontuario ou clinica.

## Decisao de auditoria

Aprovado para piloto controlado do baseline enterprise. Nao aprovado para producao irrestrita nem para automacoes reais sensiveis sem nova decisao humana documentada em PRD/SPEC.
