# Discovery AUD20-19 — chaos/load e acessibilidade humana

## Trigger e problema

O usuário determinou avançar de `AUD20-10`, que fica adiada sem conclusão,
para `AUD20-19` (F27/F28).

Há boa cobertura automatizada: chaos local, PostgreSQL condicional, E2E
multi-browser, axe, teclado, zoom e forced colors. Porém um resultado agregado
`PASS` pode esconder dois testes PostgreSQL skipped; o load histórico é
in-memory e não representa composição durável; e não houve sessão humana com
leitor de tela ou usuário.

## Evidência e atores

- `test:chaos` não exige PostgreSQL e permite os dois casos condicionais;
- o gate PostgreSQL separado pode executá-los, mas não há perfil único que
  vincule hardware, configuração, workload, skips e candidato;
- a suíte de acessibilidade usa fixtures sintéticas e cobre automação extensa,
  sem evidência humana;
- operadores/revisores precisam distinguir prova automatizada local,
  workload PostgreSQL e avaliação humana, sem promover uma à outra.

## Resultado e guardrails

Produzir perfis explícitos e comparáveis, workload local PostgreSQL descartável
com hardware/config registrados, política fail-closed para required skips e um
dossiê de sessão humana executável. Sem pessoa/equipamento autorizado, a parte
F28 permanece `WAITING_HUMAN_APPROVAL`, nunca simulada.

Somente dados sintéticos; sem staging, produção, usuário/paciente real,
telemetria externa ou claim de capacidade produtiva.

## Recomendação

`DISCOVERY_READY`: construir primeiro tooling e execução técnica local de F27,
mais roteiro/artefato de F28. A task completa só poderá ser declarada após a
sessão humana; sem ela, o resultado honesto é parcial e bloqueado.
