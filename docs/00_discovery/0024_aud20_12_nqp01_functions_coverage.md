# Discovery proposta NQP-01 — lacuna de cobertura de functions

## Registro

- Documento: `DISCOVERY-AUD20-12-NQP01`
- Versão: `1`
- Owner: qualidade de software / auditoria AUD20
- Atualizado: `2026-09-24T05:24:17Z`
- Janela de evidência: candidato integrado AUD20-17 em 2026-09-24; somente leitura
- Tier: `T3` — proposta que atravessa API, worker, persistência, segurança e gates de qualificação; rever se o escopo futuro encolher
- Estado: `BLOCKED` para `DISCOVERY_READY`; sem PRD, SPEC, task admitida ou BUILD
- Task de referência: proposta `NQP-01` / `IMP50-36`, subordinada a `AUD20-12`

## Gatilho e intenção original

O backlog NQP-01 propõe fechar o piso contratual de functions coverage sem
reduzir o limiar nem excluir código para produzir `PASS`. No candidato
integrado usado pela crítica de AUD20-17, functions mede 89,27% (2.107/2.360),
abaixo do mínimo de 90% da barra AAA §9.1. A intenção deste Discovery é
entender quais comportamentos reais ainda não são exercitados e definir o
resultado que um futuro PRD deve exigir.

## Problema observado

No candidato integrado de AUD20-17, a execução unitária mede functions abaixo
do piso AAA. Os maiores grupos de funções não executadas aparecem em módulos de
approval/persistência, retenção, composição do worker e inicialização de
persistência. A maioria desses casos depende de testes PostgreSQL que foram
condicionados e não rodaram. Assim, a equipe não consegue qualificar o piso
functions com o run atual; somente acrescentar casos sem ligação a comportamento
observável poderia elevar o número sem aumentar confiança.

| Tipo de claim                                                                         | Estado da evidência                                      | Confiança   | Evidência                                                                                                         |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| O candidato integrado ficou abaixo de functions ≥90%                                  | `OBSERVED`, só para o candidato/run descritos            | Alta        | cobertura 2.107/2.360 = 89,27%; resumo SHA-256 `94abe96ed88109b890c4d30d5ef387cb002fbf30e170fc622560f166df23802b` |
| Os 192 skips são condicionais a PostgreSQL e não contam como sucesso                  | `OBSERVED` para o run; condições reconstruídas por fonte | Alta        | 2.256 PASS/192 skips/0 falhas; NQP-02 e manifesto por arquivo                                                     |
| Há comportamentos existentes com baixa ou nenhuma cobertura no run                    | `OBSERVED` por módulo; casos alvo candidatos             | Média-alta  | [inventário read-only](../04_audit/evidence/PLAN50-20260923/nqp01-coverage-gap-inventory-20260924.md)             |
| AAA-34/36 demonstram a proveniência do denominador corrente                           | `UNKNOWN`                                                | Baixa       | AAA-34 é histórico e segmentado; não foi localizado manifesto AAA-36                                              |
| Testes de comportamento nessas superfícies atingirão o piso sem alterar o denominador | `HYPOTHESIS`                                             | Média-baixa | deve ser medido no candidato final com PostgreSQL disponível; ganho não projetado neste Discovery                 |

## Usuários e stakeholders

| Grupo/papel                               | Resultado necessário                                                           | Contexto                              | Impacto/autoridade                                                      | Evidência                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| Engenharia de qualidade                   | saber quais comportamentos justificam teste e qual candidato está sendo medido | suíte unitária, PostgreSQL e coverage | implementa somente após gates próprios                                  | C06, relatórios e backlog NQP-01              |
| Owners de approval, persistência e worker | manter invariantes de segurança/durabilidade testáveis                         | fluxos condicionais ao banco          | responsáveis por comportamento; nenhuma autoridade de mudança presumida | suítes PostgreSQL identificadas no inventário |
| Auditor/revisor independente              | conferir denominador, skips e evidência candidate-bound                        | revisão C06/C07                       | não aceita resultados do autor sem prova independente                   | crítico AUD20-17 v2                           |
| Usuários finais                           | não são afetados por documentação ou testes isolados                           | sem mudança de produto nesta etapa    | nenhum                                                                  | escopo atual sem código/runtime               |

## Fluxo atual

1. O candidato AUD20-17 foi executado sob Node `22.23.2` com
   `TEST_DATABASE_URL=''`.
2. A suíte integrada reportou 2.256 testes aprovados e 192 PostgreSQL-condicionais
   skipped; a cobertura observou 89,27% functions.
3. A crítica concluiu C06 e C07 `FAIL`; request-context não foi aceito e Q1
   não liberou o DAG.
4. NQP-01 continua `PROPOSTO`; não há Discovery gate, SPEC, admissão ou
   autorização de BUILD específica.

### Exceções e falhas

- Sem database URL → testes condicionais de persistence/worker não executam →
  cobertura e comportamento PostgreSQL ficam sem qualificação.
- Invocar callbacks privados apenas para cobrir linha → percentagem poderia
  subir sem comprovar um resultado de domínio → tal teste não satisfaz a
  hipótese NQP-01.
- Usar AAA-34 ou qualquer denominador por pacote → mede código/base diferentes
  → não substitui o candidato integrado atual.
- Aprovar functions isoladamente → deixa C06 aberto por branches críticos,
  baseline válida, mutation selecionada e gate PostgreSQL; C07 também segue
  bloqueado.

## Resultado desejado e hipótese de valor

- Baseline observada: functions 2.107/2.360 (89,27%); statements 90,84%,
  branches 87,00%, lines 91,43%; run 301 arquivos, 2.256 PASS, 192 skips.
- Piso futuro: functions ≥90% no denominador acordado e candidato final; no
  denominador observado de 2.360, isso corresponde a pelo menos 2.124 funções.
- Guardrails: preservar demais pisos globais e críticos, o conjunto de arquivos
  do denominador e a semântica; não usar exclusões, skips ou testes de invocação
  sem assertion de comportamento para inflar a medida.
- Hipótese: testes dirigidos a resultados de domínio ainda não exercitados,
  especialmente nos fluxos que hoje só rodam com PostgreSQL, aumentarão
  functions coverage e tornarão falhas de approval/persistência/worker
  detectáveis no candidato medido.
- Falsificação: depois de uma medição válida com PostgreSQL e testes
  comportamentais, o piso ainda não é atingido; ou as funções restantes são
  inalcançáveis/obsoletas e não podem ser exercitadas sem teste artificial ou
  mudança de produto não aprovada.
- Janela de decisão: quando a evidência de baseline e ambiente PostgreSQL
  descartável de NQP-02 estiver liberada; não há prazo de calendário inventado.

### Alvos de investigação observados

O inventário aponta, sem prometer ganhos: `runtime-approval-store.ts` 7/62,
`retention.ts` 22/56, `postgres-controlled.ts` 13/38,
`kernel-composition.ts` 29/50, `bootstrap-persistence.ts` 8/28 e
`postgres-role-preflight.ts` 0/10. Os comportamentos existentes e casos
condicionais relacionados estão no [inventário por módulo](../04_audit/evidence/PLAN50-20260923/nqp01-coverage-gap-inventory-20260924.md).
`retention.ts` sobrepõe AUD20-04 e exige coordenação de owner antes de incluí-lo
em qualquer scope de implementação.

## Restrições e dependências

| ID     | Restrição/dependência                                                                                              | Fonte                                                                                       | Estado                     | Consequência                                                                              |
| ------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------- |
| CON-01 | piso functions ≥90% e demais floors AAA não se reduzem                                                             | AAA §9.1                                                                                    | Normativo                  | threshold e denominador não podem ser ajustados para `PASS`                               |
| CON-02 | cobertura de adapter e testes condicionais exige PostgreSQL descartável, teardown e zero required skips no gate    | mapa `aud19-critical-coverage.json`, NQP-02                                                 | Bloqueado/não executado    | NQP-01 pode ser especificado agora; sua aceitação aguarda evidência NQP-02                |
| CON-03 | NQP-01 está em AUD20-12/IMP50-36 e não tem Discovery/PRD/SPEC/gate próprios                                        | 0090, 0341, 0343                                                                            | Confirmado                 | não iniciar PRD sem gate de Discovery nem código sem todos os gates                       |
| CON-04 | Q1 falhou C06/C07 e o DAG não liberou Q2; Q3 depende das etapas anteriores e do DAG                                | 0342 e crítico AUD20-17 v2                                                                  | Bloqueio vigente           | nenhum BUILD NQP-01/Q2 é admitido por este documento                                      |
| CON-05 | funções críticas incluem approval e kernel; retenção concorre com AUD20-04                                         | mapa crítico e backlog AUD20                                                                | Confirmado                 | preservar invariantes e coordenar sobreposição antes de execução                          |
| CON-06 | manifesto candidato citado pelo BUILD report tem hash divergente do arquivo atual                                  | [inventário](../04_audit/evidence/PLAN50-20260923/nqp01-coverage-gap-inventory-20260924.md) | Observado                  | reconciliar proveniência no pacote válido seguinte; não tratar o digest antigo como atual |
| CON-07 | request-context mede 69/75 branches (92%) e C06 exige 95%, embora não conste do mapa congelado de módulos críticos | C06 e mapa `aud19-critical-coverage.json`                                                   | Divergência não adjudicada | NQP-01 não fecha nem reclassifica esse gate separado                                      |

## Pressupostos, desconhecidos e riscos

| ID      | Tipo      | Declaração                                                                                    | Evidência/confiança                                                                | Validação ou mitigação                                                                   |
| ------- | --------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ASM-01  | `UNKNOWN` | denominador/proveniência corrente precisa de confirmação contra contrato e configuração final | a tabela tem 2.360 funções, mas AAA-34/36 não dá baseline integrada atual          | PRD/SPEC deve definir binding do denominador e da configuração exata antes de BUILD      |
| ASM-02  | `UNKNOWN` | parte suficiente do gap pode ser fechada por testes que expressam comportamento existente     | há mais de 17 funções não cobertas nos maiores módulos, mas não foi medido o ganho | testes futuros exigem saída/assertion de domínio e comparação candidate-bound            |
| ASM-03  | `UNKNOWN` | escopo elegível de retenção não colide com AUD20-04                                           | sobreposição conhecida                                                             | coordenar owners/dependências; remover retenção do slice se não houver boundary disjunto |
| RISK-01 | `RISK`    | cobertura artificial mascarar comportamento ainda sem prova                                   | alto impacto na confiança do gate                                                  | exigir assert de resultado, negativos pertinentes, críticos frescos e denominator freeze |
| RISK-02 | `RISK`    | mocks podem esconder falha de transação/RLS/fencing                                           | alto para persistência e approval                                                  | PostgreSQL descartável; mocks só para contrato isolado e nunca em substituição ao gate   |
| RISK-03 | `RISK`    | correção prematura de configuração pode mudar o denominador                                   | pode invalidar comparação                                                          | congelar antes da execução; mudança exige motivo/evidência e decisão prévia              |

## Alternativas

- Testes de comportamento no denominador atual: caminho preferido para provar
  as funções existentes sem alterar a barra.
- Reavaliar código sem uso ou inalcançável: investigação de produto separada;
  remoção/alteração de produção não pertence ao NQP-01 atual.
- Manter a medição como está e esperar NQP-02: preserva segurança, mas deixa o
  gap conhecido aberto até ambiente/candidato válidos.
- Reduzir threshold, filtrar arquivos ou aceitar skips: rejeitado pelo contrato
  AAA; não é alternativa elegível.

## Recomendação e saída

- Decisão atual: não emitir `DISCOVERY_READY` nem iniciar PRD.
- Racional: crítica fresh-context bloqueou o gate porque o problema pode mudar
  após executar a suíte existente com PostgreSQL segundo o denominador
  contratado; a cobertura reportada não veio de uma medição válida para
  qualificação. A crítica também identificou divergência entre o SHA-256 do
  manifesto citado no BUILD report e o arquivo atual.
- Condições para reavaliar: executar o gate NQP-02/AUD20-11 em PostgreSQL
  descartável, com zero required skips e teardown; reconciliar os hashes do
  manifesto e do resumo candidate-bound; então decidir se ainda falta trabalho
  NQP-01 ou se os testes já existentes fecham o piso.
- Separação: NQP-01 continua restrita ao piso global de functions. Branches de
  request-context (92% contra o critério C06 de 95%), mutation selecionada e
  outros componentes C06/C07 permanecem pendências próprias.
- Revisão: [crítica fresh-context](../04_audit/evidence/PLAN50-20260923/nqp01-discovery-critic-20260924.md),
  que avaliou os bytes deste documento no SHA-256
  `cbf4b7d12b33ca0ee862737afd203202620fdc68325fa01601f28480ea8da74c`.
- Depois da crítica, Prettier aplicou apenas normalização de Markdown a este
  documento. O parecer citado permanece evidência do bloqueio nos bytes lidos;
  não é uma aprovação da versão formatada. Qualquer gate futuro exige crítica
  fresh-context dos bytes finais.
- Risco residual desta transição: não avaliado como gate aprovado; a decisão
  permanece `BLOCKED` até resolver os findings F-NQP01-01 e F-NQP01-02 no
  relatório de crítica.
- Próximo gate: reavaliação `DISCOVERY_READY` em
  `docs/00_discovery/0090_discovery_validation.md`, depois dos findings.
- Próxima ação: aguardar autorização e execução dos gates próprios NQP-02/
  AUD20-11 em ambiente descartável; revalidar o candidate/manifesto e reavaliar
  a necessidade de NQP-01 antes de elaborar PRD. Sem testes, PostgreSQL ou
  BUILD nesta rodada.

## Guardrails

- Nenhum teste, código, configuração de coverage, schema/API ou script é
  alterado nesta etapa.
- Nenhum threshold, denominador, exclusão ou interpretação de skip é reduzido.
- Nenhum banco, dado real, serviço externo ou efeito clínico/financeiro é usado.
- Não adjudica o ramo request-context, não satisfaz C06/C07 e não libera
  AUD20-10/Q2 ou o DAG.
- Sem staging, produção, commit, push ou deploy; ambos continuam `NO_GO`.
