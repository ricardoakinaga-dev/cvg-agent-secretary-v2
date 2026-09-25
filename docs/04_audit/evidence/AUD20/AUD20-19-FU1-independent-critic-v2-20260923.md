# AUD20-19-FU1 — crítica independente da SPEC v2

- Parecer: `CONDITIONAL` para revisão humana.
- Hash SHA-256 da SPEC lida, no início e no fim: `02b04400517cbc6c0657b20dfeb60659be78d40785ad1377a825152405d6f399`.
- Arquivo avaliado: `docs/02_spec/aud20_19_imp50_18_human_session_harness_20260923.md`.
- Escopo do parecer: prontidão para revisão; não autoriza BUILD nem sessão humana.
- Arquivos alterados pela crítica: nenhum.
- Testes executados: nenhum.

## Achados priorizados

1. **Alta — H09 omite chamadas de leitura do Admin panel.** Além de agents e
   versions, o carregamento chama `GET /v1/admin/test-lab/runs?limit=10` e
   `GET /v1/admin/execution-traces?limit=10`. A tabela estrita proposta
   bloquearia H09. Incluir os dois endpoints e respostas sintéticas, e exigir
   que H09 valide essas leituras e rejeite near misses.
2. **Média — gramática de query de assets ainda aberta.** A frase “formatos
   emitidos pelo Vite” não fixa valores aceitos nem regra para chave duplicada.
   Especificar valores/gramática, normalização e rejeição de duplicatas com
   casos positivos e negativos.
3. **Média — autorização/consentimento/captura precisam de contrato explícito.**
   O modo `session` diz “consentimento confirmado” e screenshots podem ser
   ligados com consentimento específico, mas não define como autorização e
   consentimento são verificados antes do browser headed, quem pode registrar
   as decisões ou lifecycle de armazenamento/retenção/exclusão. O roteiro
   manual fornece regras de parada e artefatos, mas o contrato do harness deve
   explicitar as pré-condições ou manter captura desativada nesta fatia.
4. **Média — caminho do candidato limpo não está definido.** O helper
   `buildPhase11Candidate` exige Git limpo; não há disposição declarada para
   tornar BUILD files em candidato limpo nem esclarecimento sobre autorização
   de commit. Definir essa disposição antes de depender do gate.

## Itens conferidos

Discovery 0021 e PRD 0032 sustentam preparar evidência de acessibilidade humana
mantendo o resultado humano separado de `PASS_LOCAL`. O rascunho preserva essa
separação e declara os gates de autorização, consentimento e participante. A
task FU1 consta como draft rastreável, não admitida a BUILD; `IMP50-18` continua
sem admissão; a ação crítica PLAN50 segue `AUD20-17-FU1`.

As configurações próprias propostas corrigem a configuração raiz do Playwright
(que inicia/reutiliza API e Vite e captura artefatos em falha) e o proxy da
configuração Vite padrão. O instalador session-only também é apropriado dado
que a fixture existente é ampla/permissiva. Foram consultados Discovery 0021,
PRD 0032, SPEC original e draft, roteiro manual, 0190, 0337, 0341, gate-review,
status IMP50, configs Playwright/Vite, pacote/lock, fixtures e testes E2E,
call sites da UI/API e o helper de candidate.

## Parecer

`CONDITIONAL`: o documento pode continuar como draft para crítica/revisão. Os
quatro pontos acima precisam ser fechados antes de tratá-lo como pronto para
aprovação. Esta crítica não autoriza BUILD ou sessão humana.
