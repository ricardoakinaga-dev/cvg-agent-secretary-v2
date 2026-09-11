# REM-0539 R1 — Requisitos corretivos

Estado: PRD_VALIDATED_CONTROLLED; deriva da discovery R0 e REM-03. Autorização de implementação local: instrução explícita atual do usuário. Nenhuma autorização de piloto/dados/serviços reais.

1. A intenção administrativa nunca suprime sinal afirmativo de risco na mensagem ou contexto relevante. Encaminhar risco alto com prioridade high, sem planejar/executar tools nem consultar approval para ação automática.
2. Preservar pedidos administrativos benignos, exames de sangue rotineiros, negações delimitadas e palavras contendo substrings. Negação de um sintoma não nega outro. História textual sem papel confiável não vira autorização; suspeita não resolvida permanece conservadora e perguntas/boilerplate não devem criar sintoma fictício. Não interpretar relato como diagnóstico.
3. Publicação/rollback reprovam ausência de risco/handoff/prioridade ou planejamento de tools nos casos críticos fixos. Regressões passam pelo executor publicado, API e worker.
4. Transporte HTTP de origem não confiável não pode afirmar HTTPS por header. Confiar apenas em endereços explícitos configurados pelo servidor. Configuração numérica insegura deve falhar com orientação de migração.
5. Uma approval de atendimento aceita uma única decisão terminal; concorrente recebe conflito sem mudar ator/data. A decisão e sua auditoria são atômicas. Aprovação de capabilities continua independente. UI informa conflito e atualiza fila sem vazar estado entre tenants.

Aceites: os exemplos ruins anteriores falham antes do BUILD e passam após correção; controles benignos preservados; concorrência PostgreSQL com duas conexões e rollback de audit; suite vigente integrada. Casos críticos sintéticos não comprovam segurança clínica populacional.
