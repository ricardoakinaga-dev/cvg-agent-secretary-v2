# 0570 — 50 melhorias propostas por prioridade — 2026-09-23

Fonte: [auditoria corrente 0569](0569_repository_audit_2026-09-23.md), [base F01–F30 0568](0568_full_repository_audit_2026-09-21.md) e [backlog AUD20-REM v2](../03_build/0337_aud20260921_backlog.md). Esta lista é uma priorização de oportunidades, não cria tarefas aprovadas nem altera gates. Entregas já concluídas localmente devem ser **revalidadas no candidato final**, sem repetir BUILD por padrão. `AUD20-10/17/20` continuam adiadas; ações externas e humanas dependem de autoridade e ambiente próprios. Staging real e produção seguem `NO_GO`.

## Alta prioridade — 20

1. **Congelar o candidato exato de release.** Registrar commit, árvore, arquivos, configuração e digests antes de gerar qualquer evidência final (`AUD20-12`).
2. **Refazer o selo Phase 11 no candidato congelado.** Executar todos os gates obrigatórios e verificar `certification/current.json` depois do último write (`AUD20-12`).
3. **Revalidar critic e mutation no mesmo candidato.** Conferir freshness, SHA-256, negativos e ausência de mutantes críticos sobreviventes (`AUD20-06/12`).
4. **Reconstruir API, worker e web a partir dos mesmos bytes.** Registrar digests de imagem e vínculo com source, migrations e policy (`AUD20-07`).
5. **Gerar SBOM e scans vinculados às imagens finais.** Guardar resultados de licenças, segredos, dependências e análise estática no mesmo pacote candidate-bound (`AUD20-07`).
6. **Inspecionar o conteúdo efetivo das imagens.** Comprovar usuário sem privilégios, ausência de segredos/testes e entrypoints corretos (`AUD20-07/18`).
7. **Montar composição descartável API + worker + PostgreSQL.** Usar o mesmo build, configuração segura e zero required skips (`AUD20-11`).
8. **Exercitar restart, drain, replay e aprovação nessa composição.** Provar que falhas entre etapas não duplicam efeitos nem perdem estado (`AUD20-11`).
9. **Ligar telemetria do runtime a um collector real do ambiente controlado.** Provar correlação entre request, worker, approval e persistência (`AUD20-10`).
10. **Entregar um alerta operacional de ponta a ponta.** Induzir uma falha sintética, medir detecção, entrega e ação do operador (`AUD20-10`).
11. **Qualificar o provider de modelo autorizado.** Validar identidade, versão, egress, limites e negativas com owner e evidência externa (`AUD20-13`).
12. **Qualificar o canal externo autorizado.** Testar autenticidade, retries, duplicatas e revogação em ambiente permitido (`AUD20-13`).
13. **Qualificar identidade externa e escopo de tenant.** Provar claims, expiração, revogação e rejeição de acesso cruzado (`AUD20-13`).
14. **Homologar fontes institucionais para RAG.** Versionar corpus, aprovação, revogação, citação e handoff quando faltar fonte (`AUD20-13`).
15. **Medir restore físico e RPO/RTO.** Usar metas aprovadas e registrar perda, tempo e integridade em ambiente autorizado (`AUD20-14`).
16. **Ensaiar rollback do artefato exato.** Provar retorno de API, worker, schema compatível e configuração sem reintroduzir efeitos duplicados (`AUD20-14`).
17. **Executar piloto supervisionado com critérios de parada.** Definir escopo, responsável, janela, monitoramento e desligamento seguro (`AUD20-14`).
18. **Realizar a sessão humana de acessibilidade.** Registrar consentimento, tecnologia assistiva, roteiro, problemas e decisão separada do `PASS_LOCAL` (`AUD20-19`).
19. **Atestar os recursos observados no preflight final.** Conferir bytes de configuração/keyring e grants efetivos do replay store antes de bind ou promoção (`AUD20-05/12`).
20. **Obter revisão e sign-off humanos vinculados ao digest.** Decidir risco residual somente com oito gates externos/humanos completos (`AUD20-15`).

## Média prioridade — 20

21. **Reconciliar masters e backlog executivo.** Atualizar ponteiros e rotular checkpoints antigos para não contradizer o estado corrente (`AUD20-08`).
22. **Ampliar o checker documental semântico.** Rejeitar divergência entre resumos, seções de task, matriz, candidato e próxima ação (`AUD20-08`).
23. **Formalizar owner e SLOs operacionais.** Submeter metas e responsabilidade a decisão humana e vinculá-las a alertas/runbooks (`AUD20-10`).
24. **Medir latência de aprovação no caminho composto.** Emitir `approval_latency_ms` com dimensões limitadas e verificar correlação (`AUD20-10`).
25. **Exercitar triagem de dead-letter e reconciliação.** Dar ao operador um fluxo auditável de inspeção, retry controlado e encerramento (`AUD20-10/11`).
26. **Ensaiar locks e tempo de migração em volume sintético.** Medir `0027–0029`, timeouts e plano expand/validate sob concorrência (`AUD20-04/16`).
27. **Testar convivência de versões durante migração.** Cobrir writer antigo/novo, rollback por roll-forward e recuperação após interrupção (`AUD20-04/16`).
28. **Revalidar isolamento entre tenants na composição integrada.** Incluir RLS, approval, replay, outbox e observabilidade em cenários cruzados (`AUD20-11/12`).
29. **Ensaiar rotação de chaves e referências de segredo.** Verificar troca, expiração e falha fechada sem registrar material sensível (`AUD20-05/13`).
30. **Monitorar crescimento dos tombstones.** Definir indicadores de capacidade, limiares e revisão da política já aprovada (`AUD20-16`).
31. **Revisar minimização dos identificadores retidos.** Confirmar classificação, justificativa e impossibilidade de replay após minimização (`AUD20-16`).
32. **Revalidar a semântica do ledger de retenção.** Distinguir tombstone, delete e redaction em consultas, métricas e API (`AUD20-04/16`).
33. **Repetir carga PostgreSQL em perfis comparáveis.** Registrar hardware, concorrência, p50/p95/p99, erros, backlog e limites de interpretação (`AUD20-19`).
34. **Reexecutar E2E multibrowser no candidato final.** Cobrir desktop/mobile, teclado, zoom, forced colors e recuperação de erro (`AUD20-12/19`).
35. **Reexecutar o holdout integrado no candidato final.** Preservar dataset, seed, digest e resultados por categoria (`AUD20-09/12`).
36. **Reavaliar coverage e mutation dos módulos críticos após mudanças.** Usar casos de comportamento e negativos, sem perseguir branch isolado (`AUD20-06/12`).
37. **Excluir testes recursivamente do contexto Docker.** Inspecionar a imagem final para impedir inclusão de `*.test.ts(x)` (`AUD20-18`).
38. **Fazer o healthcheck do worker respeitar o readiness path configurado.** Adicionar teste com caminho alternativo e falha segura (`AUD20-18`).
39. **Fixar imagens base por digest.** Definir atualização controlada com rebuild e verificação de compatibilidade (`AUD20-18`).
40. **Decompor os hotspots em fatias verticais.** Começar por contexto de request da API e seguir orquestração/persistência com contratos públicos intactos (`AUD20-17`, adiada).

## Baixa prioridade — 10

41. **Arquivar metadados Phase 10 ambíguos.** Impedir que notas e findings históricos sejam lidos como resultado corrente (`AUD20-08`).
42. **Oferecer comando local que selecione Node 22.23.2.** Evitar a falha recorrente de `docs:check` no shell padrão com Node 24 (`AUD20-08`).
43. **Simplificar a navegação da documentação.** Criar índice curto para fontes correntes, histórico e evidências, sem duplicar status.
44. **Criar resumos pequenos dos logs de gates.** Manter stdout bruto e destacar comando, exit, candidato, skips e digest para revisão.
45. **Reduzir duplicação das suítes grandes.** Consolidar fixtures e testes de contrato sem diminuir cobertura ou negativos (`AUD20-09/17`).
46. **Avaliar artefato JavaScript compilado para produção.** Comparar tamanho, startup, dependências e rollback com o runtime `tsx` atual (`AUD20-18`).
47. **Atualizar comentários de schema/idempotência.** Alinhar descrições à chave derivada por hash e eliminar metadados redundantes (`AUD20-20`, adiada).
48. **Padronizar nomes de métricas e eventos entre API e worker.** Publicar convenção curta e validar compatibilidade das consultas existentes.
49. **Detectar evidências órfãs ou duplicadas em `docs/`.** Sinalizar artefatos sem ponteiro corrente ou supersessão explícita, preservando histórico.
50. **Melhorar a descoberta dos scripts do monorepo.** Documentar qual comando prova cada gate e quando exige PostgreSQL, browser ou ambiente externo.
