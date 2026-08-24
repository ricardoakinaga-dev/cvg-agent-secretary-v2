# 0502 — Gates e Bloqueios

## Gates oficiais

- Discovery libera PRD se `docs/00_discovery/0090_discovery_validation.md` estiver aprovado.
- PRD libera SPEC se `docs/01_prd/0090_prd_validation.md` estiver aprovado.
- SPEC libera somente Build Planning se `docs/02_spec/0190_spec_validation.md` estiver condicionalmente aprovado.
- Build real exige sprint estruturada, aprovacao humana do escopo e ausencia de bloqueio para o tipo de funcionalidade.
- Audit real exige sistema funcional e observavel.
- Rollout exige build funcional, testes, observabilidade, seguranca, privacidade e aprovacao de negocio.

## Quando bloquear

Marcar `BLOCKED` quando houver:

- falta de informacao critica;
- conflito entre documentos;
- dependencia ausente;
- erro nao recuperavel;
- gate nao aprovado;
- acesso necessario indisponivel.

## Registro de bloqueio

Todo bloqueio deve registrar:

- causa raiz;
- impacto;
- acao necessaria;
- proxima dependencia;
- fase onde ocorreu.

## Bloqueios conhecidos atuais

- Implementacao real depende de revisao humana da SPEC.
- Confirmacao de agenda depende de regra operacional final.
- RAG institucional depende de fonte autorizada.
- Retencao de dados depende de governanca.
- Cargos reais do hospital ainda precisam ser mapeados para os papeis tecnicos.
- Auditoria runtime depende de sistema funcional.
