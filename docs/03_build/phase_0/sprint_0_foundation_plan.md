# Phase 0 / Sprint 0 — Foundation Plan

## Objetivo

Preparar a base tecnica para implementar a Esmeralda V2 sem acoplamento prematuro a canal, HIS ou UI.

Status desta sprint apos auditoria: pronta para aprovacao humana de execucao, nao pronta para iniciar fluxos funcionais sensiveis.

## Escopo

- Estrutura `apps`.
- Estrutura `packages`.
- Contratos compartilhados.
- Padrao de erro e envelope.
- Configuracao de testes.
- Setup obrigatorio de lint/typecheck antes de codigo funcional.

## Tasks

### Task 0 — Congelar baseline documental auditado

- O que: registrar que PRD, SPEC, audit, backlog e runtime state foram revisados criticamente.
- Onde: `docs/04_audit`, `docs/20_master_execution_log.md`, `docs/99_runtime_state.md`.
- Como: manter status condicional e bloquear decisoes de agenda, RAG e retencao.
- Dependencia: auditoria documental concluida.
- Criterio de pronto: `npm test` valida que nao ha falso ready documental.

### Task 1 — Criar estrutura do monorepo

- O que: criar diretorios `apps/api`, `apps/worker`, `apps/web` e packages do blueprint.
- Onde: raiz do repositorio.
- Como: manter bootstrap minimo, sem regra de produto e com imports entre packages testaveis.
- Dependencia: aprovacao da Phase 0.
- Criterio de pronto: estrutura criada, documentada e coberta por teste de smoke/import.

### Task 2 — Criar shared contracts

- O que: definir ids, enums, envelopes e erros.
- Onde: `packages/shared`.
- Como: usar schemas versionaveis, tipos compartilhados, envelope padrao, codigos de erro e correlation id.
- Dependencia: Task 1.
- Criterio de pronto: contratos importaveis por API, worker e packages; schemas com testes unitarios.

### Task 3 — Criar base de testes

- O que: configurar teste unitario e teste de integracao futuro.
- Onde: raiz e packages.
- Como: manter `npm test` executavel, preparar coverage e padrao para testes por package.
- Dependencia: Task 1.
- Criterio de pronto: `npm test` executa sem falso positivo e falha quando contrato critico quebra.

### Task 4 — Criar gates de qualidade do repositorio

- O que: configurar typecheck, lint e format sem depender de integracoes externas.
- Onde: raiz do repositorio.
- Como: adicionar scripts padrao e regras minimas antes de codigo de dominio.
- Dependencia: Task 1.
- Criterio de pronto: comandos `npm test`, typecheck e lint documentados; CI pode chama-los sem prompt interativo.

### Task 5 — Criar baseline de seguranca

- O que: definir `.env.example`, validacao de env, politica de secrets e bloqueio de dados reais em dev.
- Onde: raiz, `packages/shared` e documentacao operacional.
- Como: schema de env, erro claro em startup e nenhum segredo no repositorio.
- Dependencia: Task 2.
- Criterio de pronto: teste comprova que config obrigatoria falha fechado quando ausente.

### Task 6 — Preparar CI local/automatizavel

- O que: documentar ou criar pipeline para instalar, testar, typecheckar e auditar dependencias.
- Onde: raiz e futura `.github/workflows` se GitHub for usado.
- Como: comandos nao interativos e sem necessidade de segredo.
- Dependencia: Tasks 3 e 4.
- Criterio de pronto: suite local reproduz os gates de sprint.

## Riscos

- Criar estrutura demais sem fluxo.
- Misturar regra de negocio no setup.

## Criterios de validacao

- Estrutura reflete blueprint.
- Nenhum modulo acessa integracao externa diretamente.
- Teste base executa.
- `npm test` passa.
- Typecheck e lint devem existir antes da primeira sprint com codigo funcional.
- Cobertura alvo de 80%+ deve estar configurada ate a primeira sprint de dominio.
- Nenhum segredo, dado real ou integracao externa obrigatoria entra na Phase 0.
- Phase 0 nao implementa workflow de agenda, RAG, financeiro, prontuario ou resposta clinica.

## Definition of Done

- Arquivos criados estao alinhados ao mapa de modulos da SPEC.
- Contratos compartilhados tem schema, tipo, erro e teste.
- Scripts de verificacao rodam sem prompt interativo.
- Estado runtime e execution log foram atualizados.
- Backlog reflete qualquer debito descoberto.
- Nenhum gate documental fica marcado como pronto se houver decisao humana pendente.
