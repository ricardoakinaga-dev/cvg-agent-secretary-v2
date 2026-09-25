# Discovery AUD20-08 — estado canônico e runtime reproduzível

## Estado

- task: `AUD20-08`
- fase: `DISCOVERY`
- status: `READY_FOR_NEXT_STEP`
- origem: achados `F15`, `F16`, `F17`, `F18` e `F26` da auditoria 0568
- execução permitida: inspeção e documentação local, sem dados reais
- staging/produção: `NO_GO`

## Problema observado

O operador precisa responder de forma determinística qual task está corrente,
qual seu estado, qual a próxima ação, qual candidato é aplicável e qual runtime
Node executou cada gate. Hoje essas respostas dependem de interpretar Markdown
acumulativo e arquivos de certificação de épocas diferentes.

Evidência direta:

- `scripts/docs-check.mjs` valida links, JSON, vocabulário de estados e somente
  a última `next_action`; não cruza task/status/DAG/release boundary;
- `docs/CURRENT.md`, runtime state, backlog e matriz repetem estado corrente em
  formatos diferentes, enquanto os logs preservam snapshots históricos;
- o shell padrão observado é Node `v24.20.0`, embora `package.json` exija
  `>=22 <23` e o runtime qualificado disponível seja `v22.23.2`;
- CI usa `node-version: 22`, Docker usa tags móveis `node:22-bookworm-slim` e
  não existem `.nvmrc`/`.node-version`;
- `certification/findings.json` é Phase 10 e ainda reside em um caminho que pode
  ser interpretado como corrente; Phase 11 possui namespace próprio.

## Atores e impacto

- executor e revisor: podem retomar a task errada ou confiar em estado stale;
- mantenedor/CI: pode executar gates em patch versions diferentes de Node;
- release operator: pode tratar metadado Phase 10 como finding atual;
- auditor: não consegue provar coerência transversal apenas com `docs:check`.

Não há usuário final, dado clínico ou integração externa nesta task.

## Resultado desejado

Uma única fonte machine-readable deve declarar task/status/next action/release
boundary/runtime esperado e apontar para as fontes humanas. O checker deve
rederivar e comparar esses campos, falhando em drift. Shell e CI devem usar a
mesma versão Node exata; cada receipt deve registrar a versão do processo que o
produziu. Metadado histórico deve ser explicitamente impossível de consumir
como corrente sem passar pelo ponteiro canônico.

## Guardrails e fronteiras

- preservar documentos e pacotes históricos; não reescrever seus claims;
- não mover `certification/findings.json` nesta task se isso quebrar o
  verificador Phase 10 histórico; rotulá-lo e governar seu consumo;
- pin de imagens por digest pertence a `AUD20-18/07`; AUD20-08 limita-se a
  runtime local/CI e ao contrato que detectará divergência futura;
- nenhuma certificação, imagem, deploy, integração ou efeito real será criado;
- worktree dirty não pode ser apresentado como release candidate.

## Hipótese e falsificação

Hipótese: um índice canônico pequeno, validado contra as fontes correntes, mais
pin exato de Node elimina o drift silencioso sem apagar história.

Falsificação: fixtures que alterem task/status/next action/Node/candidate ou
apontem para findings históricos devem fazer o checker falhar com código
estável; árvore coerente deve passar. Se o parser precisar inferir semântica de
blocos históricos livres, o desenho deve voltar à SPEC.

## Riscos e desconhecidos

- risco: criar mais uma fonte duplicada; mitigação: o JSON será a autoridade e
  os documentos humanos serão projeções verificadas;
- risco: pin exato exigir atualização coordenada; mitigação: um único campo de
  runtime e teste de igualdade entre `.nvmrc`, `.node-version`, CI e package;
- desconhecido não bloqueante: digest final de imagem, deliberadamente
  encaminhado a AUD20-18/07;
- desconhecido não bloqueante: limpeza física de snapshots antigos; esta task
  exige classificação/ponteiro, não exclusão.

## Recomendação e gate

`DISCOVERY_READY`: avançar para PRD com um contrato observável de fonte
canônica, checker fail-closed, pin Node exato e namespace histórico explícito.
Não há decisão de produto ou autoridade externa pendente para definir o WHAT.
