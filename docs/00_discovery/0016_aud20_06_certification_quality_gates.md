# Discovery AUD20-06 — gates obrigatórios de crítico e mutation

## Estado e evidência

- task: `AUD20-06`
- achados: `F08` e parte de `F25`
- fase: `DISCOVERY`
- execução: `CONTROLLED_LOCAL`
- dados: somente artefatos locais e fixtures sintéticas
- staging/produção: `NO_GO`

## Problema observado

O certificador Phase 11 já executa `independent_critic` como gate requerido e
o verificador confere a lista de gates, mas a evidência do crítico é um arquivo
externo ao run, historicamente fixado em AUD19. O mutation sentinel existe,
detecta gaps honestamente e aceita `--fail-on-gaps`, porém não é comando nem
gate obrigatório de `PHASE11_2_REQUIRED_GATES`, não entra na decisão agregada e
seu report não é pacote obrigatório.

Assim, uma execução pode manter mutation como evidência lateral; e o crítico,
embora obrigatório nominalmente, pode estar ausente, stale, ligado a outro
candidato ou ter sido alterado fora de uma cadeia de geração/consumo explícita.

## Resultado desejado

Nenhum selo local pode passar sem:

1. crítico independente válido, fresco e ligado ao candidato exato;
2. mutation sentinel executado com `--fail-on-gaps`, todos os mutantes críticos
   detectados e nenhum target `not_applicable`;
3. logs e reports hashados no manifesto do mesmo candidato;
4. verificador read-only que recalcule binding, freshness e resultado, sem
   confiar no status autodeclarado ou mascarar exit code.

## Usuários e impacto

- release owner/auditor: recebe uma decisão agregada reproduzível;
- engenharia: não consegue promover relatório lateral ou stale;
- operação: mantém `NO_GO` quando falta evidência local obrigatória.

## Restrições e não objetivos

- Não criar um serviço externo de crítica nem simular independência humana.
- Não executar produção, staging real, dados reais ou integrações externas.
- Não alterar thresholds, catálogo de mutantes ou relatórios históricos para
  fabricar PASS.
- Não resolver holdout, supply chain ou gates externos desta task.

## Evidência de saída

O problema, o impacto e a fronteira estão suficientemente definidos para PRD.
Não há decisão de produto material pendente; a implementação permanece sujeita
à SPEC e à aprovação humana do BUILD local controlado.
