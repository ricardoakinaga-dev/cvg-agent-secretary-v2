# AUD17-01 — contrato de baseline e reconciliação do candidato

**Programa:** `AUD17-AAA`
**Task:** `AUD17-01`
**Gate:** `G0 — baseline/contrato`
**Status inicial:** `READY_FOR_CONTRACT`
**Escopo:** documentação, diagnóstico e controle de evidência local

## Objetivo observável

Separar o candidato histórico selado em `c8e514d` da árvore atual que contém
alterações documentais não commitadas, sem apagar ou reverter trabalho do
usuário. O verificador corrente deve continuar rejeitando a árvore stale, e o
programa deve passar a ter um baseline atual, uma barra congelada e um único
próximo passo executável.

## Contratos preservados

- O pipeline é `DISCOVERY -> PRD -> SPEC -> BUILD -> AUDIT`.
- O PRD e a SPEC Phase 11.2 continuam válidos apenas para BUILD local
  controlado; não concedem produção, piloto ou integração externa.
- `c8e514d` é evidência histórica candidate-bound, não evidência atual para
  bytes posteriores.
- Os quatro arquivos documentais já modificados e os quatro arquivos novos do
  planejamento pertencem ao usuário e devem ser preservados.
- Oito gates externos/humanos continuam separados e bloqueados.

## Baseline executável

Executar sob Node `22.23.2`, no repositório local e sem egress:

1. `git status --short --branch`, `git rev-parse HEAD` e diff/name-status;
2. hashes dos controles, auditoria, plano, roadmap, backlog, PRD, SPEC e bar;
3. `npm run certification:verify` — esperado `FAIL` por stale/dirty/untracked
   candidate e hash drift;
4. `npm run evidence:verify:phase11` — esperado o mesmo `FAIL`;
5. `npm run promotion:check` — esperado exit não zero, `eligible=false`,
   produção sem efeito e oito bloqueios externos;
6. fingerprint read-only fora do repositório, com mutation sentinel separado.

## Critérios de aceite

- O relatório de baseline registra HEAD, árvore suja, pointer, candidato,
  escopo/hash drift e os exits reais dos negativos.
- O verificador stale continua falhando por razões observáveis; nenhuma saída
  histórica é reclassificada como PASS atual.
- O arquivo [`quality-bar-v1.json`](../04_audit/evidence/AUD17-AAA/quality-bar-v1.json)
  congela os critérios AUD17-01..15, seus métodos, prioridades, limitações e
  bloqueios externos.
- O backlog, execution log e runtime state apontam para `AUD17-01`, com uma
  `next_action` única; histórico anterior não é reescrito.
- Nenhum código de produto, banco real, provider, canal, IdP, RAG, deploy,
  commit, push ou efeito externo é executado nesta task.

## Saída e transição

Saídas: este contrato, o baseline report e a matriz/barra congelada. Depois da
revisão do contrato, `AUD17-01` pode avançar para `VERIFIED` dentro do escopo
documental; a próxima task é `AUD17-02`. Qualquer mudança de código exige
contrato específico, teste RED, gate aplicável e reabertura do selo.
