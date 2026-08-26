# Handoff Engine

## Decisão

O evaluator combina política, confiança, risco, ausência de knowledge e
necessidade de approval. A configuração declara destino de baixa confiança,
lista bounded de destinos, limite de clarificações e prioridade opcional.

Regras de segurança têm precedência: risco alto/crítico, medication advice,
policy indisponível e ações sensíveis não são convertidos em resposta
automática. O resultado é um handoff redigido com intent, motivo, próximo passo,
destino e prioridade.

## Destinos

Destinos são identificadores bounded, não URLs, telefones, emails, tokens ou
destinos de provider. O MVP usa destinos controlados e não faz dispatch.

## Trace

O trace informa `requested`, reason, destination, priority e event status sem
texto bruto sensível. A auditoria registra a decisão, não uma autorização para
agir externamente.

## Compatibilidade

O resumo textual legado continua disponível por adapter. A policy moderna pode
retornar `clarify` até `maxClarifications`; depois disso o runtime encaminha ao
handoff seguro. Qualquer ativação de destino real exige novo contrato e revisão
humana.
