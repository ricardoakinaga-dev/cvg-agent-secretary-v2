# AUD19-10 — Acessibilidade e cobertura multibrowser (evidência)

- **Task:** `AUD19-10` (programa `AUD19-REM`), achado de origem `P2-UX-01` em `docs/04_audit/0566_full_repository_gauntlet_audit_2026-09-19.md`.
- **Data:** 2026-09-20.
- **Status:** `READY_FOR_NEXT_STEP` (local controlado; sem staging/produção).
- **Gate:** BUILD local autorizado (`docs/CURRENT.md`: `READY_FOR_NEXT_STEP`, sem dependência externa).
- **Dados:** 100% sintéticos e rotulados; nenhum backend, tenant, paciente, provider ou ação clínica/financeira real.

## Escopo entregue

| Entregável | Situação |
| --- | --- |
| `@axe-core/playwright` como devDependency (Node 22) | FEITO (`@axe-core/playwright@4.13.0`, `axe-core@4.13.0`) |
| `npm run audit:security` | PASS (`found 0 vulnerabilities`, exit 0) |
| `npm run licenses:check` | PASS (`total:374`, `denied:0`, `unclassified:0`, exit 0) |
| Playwright com chromium + firefox + webkit | FEITO (`playwright.config.ts`) |
| `tests/e2e/accessibility.spec.ts` | FEITO (16 testes × 3 browsers) |
| Correções reais em `apps/web` | FEITO (contraste, tipografia, targets, foco, forced-colors, `definition-list`) |
| Evidência bruta + relatório | FEITO (`raw/`, JSON agregado e este relatório) |
| Leitor de tela | **Amostragem limitada / NOT_RUN como teste completo** (ver Limitações) |

## Ambiente

- Node `22.23.2` (nvm), npm `10.9.8`.
- Playwright `1.59.1`; browsers: `chromium-1217`, `firefox-1511` (Firefox 148.0.2), `webkit-2272`.
- Linux Mint 22.3 (base Ubuntu noble), x86_64.
- WebKit exigiu dependências de sistema ausentes. Sem `sudo`, as bibliotecas (`libavif16`, `libgstreamer-plugins-bad1.0-0`, `libgav1-1`, `libyuv0`) foram extraídas localmente de `.deb` do Ubuntu noble e copiadas para o bundle `webkit-2272/minibrowser-wpe/lib`. Correção canônica continua sendo `npx playwright install-deps` com `sudo`. Sem esse ajuste o WebKit ficava `BLOCKED` por ambiente (registrado conforme a regra de honestidade do enunciado).

## Resultados por browser

Comando exato solicitado — `npx playwright test tests/e2e/accessibility.spec.ts`:

- **chromium:** 16/16 PASS
- **firefox:** 16/16 PASS
- **webkit:** 16/16 PASS
- **Total: 48/48 PASS**

Suíte E2E existente por browser (mesmo diretório, API real + dados sintéticos, `--workers=1` para determinismo com o backend in-memory compartilhado):

| Browser | Resultado |
| --- | --- |
| chromium | 25/25 PASS |
| firefox | 25/25 PASS |
| webkit | 25/25 PASS |

> Nota: rodar os três projects do mesmo arquivo mutador (`platform-control-center.spec.ts`) em paralelo compartilhando o mesmo servidor in-memory é flaky e acumula estado entre projects; a execução por project com servidor fresco e `--workers=1` (como o CI já configura) é verde. O primeiro project a rodar `platform-control-center` passa; o segundo herda agentes já criados e o teste existente não é idempotente — falha pré-existente do desenho do teste, não da acessibilidade.

### axe (axe-core 4.13.0, tags `wcag2a/wcag2aa/wcag21a/wcag21aa/wcag22aa`)

8 varreduras por browser, todas com **0 violações** (inclusive moderate/minor):

`console-desktop`, `console-mobile`, `admin-control-center`, `console-empty`, `console-error`, `console-loading`, `console-uncertain`, `console-forced-colors`.

- **critical/serious:** `0` em chromium, `0` em firefox, `0` em webkit.
- **Exceções congeladas:** nenhuma foi necessária (lista vazia no JSON).
- Regressões reais corrigidas que apareceram antes do fix: `color-contrast` (4.24:1 em texto muted sobre `--accent-soft`, ex.: linha selecionada e nav) e `definition-list` serious em `.orchestrationBudget` (filho `div > span` não permitido dentro de `<dl>`).

### Contraste WCAG AA (texto operacional)

- 3 varreduras com `color-contrast` por browser (`console-full`, `console-uncertain`, `admin-control-center`).
- **0 violações** em todos os browsers; `--muted` foi escurecido de `#60747b` para `#52666d` (≈6.0:1 sobre branco, ≈5.2:1 sobre `accent-soft`).

### Teclado e ordem de foco

- Skip link é o primeiro foco, ativa com Enter e move o foco para `#console-operacional`.
- **21/21 controles focáveis** alcançados por Tab em todos os browsers; ordem estritamente DOM; **0 controles sem indicador de foco visível**.
- Ativações por teclado verificadas: seleção de conversa (`aria-pressed`), decisão de aprovação (Enter), handoff (Enter), retry de erro (Enter).

### Estados preservados

- loading, error + retry (recuperação real após falha sintética), empty, approval, handoff e `UNCERTAIN` — todos renderizados e auditados por axe sem violações.
- `UNCERTAIN`: seção de reconciliação visível, texto "nenhuma repetição automática está autorizada", **0 botões** (somente leitura).

### Zoom / reflow

Emulação por equivalência de viewport (sem API nativa cross-engine de zoom):

| Cenário | Viewport | Equivalência | scrollWidth doc/body | Painéis com overflow |
| --- | --- | --- | --- | --- |
| `320csspx` | 320×800 | 1280 a 400% | 320/320 | 0 |
| `zoom-200` | 640×800 | 1280 a 200% | 640/640 | 0 |
| `zoom-400` | 320×800 | 1280 a 400% | 320/320 | 0 |

Sem scroll horizontal e com conteúdo crítico visível nos três browsers.

### forced-colors

- `forcedColors: 'active'` honrado pelos três engines (`matchMedia('(forced-colors: active)').matches === true`).
- Conteúdo e ações funcionam (seleção de conversa via teclado mantém `aria-pressed=true`).
- Foco e seleção continuam distinguíveis: outline `3px solid Highlight` (novo bloco `@media (forced-colors: active)`), sem quebra de layout.
- axe no modo forced-colors: 0 violações.

### Touch targets

- Console 30/30 e Admin 86/86 controles com **≥ 44×44 CSS px** em cada browser; 0 exceções de inline link foram necessárias nos fluxos medidos.
- Correções: `button`, nav links, `actions`, inputs/selects/textarea, skip link, summary mobile, opções de rádio das jornadas e labels de checkbox do Admin.

### Tipografia operacional

- 129 amostras no console + 47 no Admin por browser, **0 falhas** com `font-size >= 12px` e `line-height >= 1.4`.
- Toda a escala 9/10/11px foi elevada para 12px e line-heights 1.2–1.35 para 1.4.

## Correções aplicadas em `apps/web`

1. `apps/web/src/styles.css`
   - `--muted: #52666d` (linha 15) — contraste AA.
   - `body { line-height: 1.4 }` (39) — base tipográfica.
   - `button` com `min-height: 44px`, `font-size: 13px`, `line-height: 1.4` (66/75).
   - Inputs/selects/textareas 44px (362), `.sessionButton` (427), `.sectionNav/.platformNav a` (449), `.actions button` (724), skip link (166), summary mobile (1948→44px).
   - Escala tipográfica: 9px/10px/11px → 12px; line-heights 1.2/1.25/1.3/1.35 → 1.4.
   - `summary:focus-visible` incluído no anel de foco global (97).
   - `.journeyStep .choice` e `.platformFields label:has(input[type='checkbox'|'radio'])` com `min-height: 44px`.
   - Novo `@media (forced-colors: active)` (fim do arquivo): outline `Highlight` em `:focus`, seleção (`aria-pressed`) e passo atual; bordas de badge em `CanvasText`.
2. `apps/web/src/features/orchestration/index.tsx` (233) — legenda "uso/limite" movida para dentro do `<dd>` do `BudgetMetric`, corrigindo o `definition-list` serious do axe no `<dl class="orchestrationBudget">`. Sem mudança de semântica ou de dados.
3. `tests/e2e/visual-shell.spec.ts` — `window.scrollTo(0, 0)` antes do screenshot por viewport; elimina flake de posição de scroll (os snapshots por viewport herdavam o scroll do foco no botão de sessão). Nenhuma asserção foi removida ou enfraquecida.
4. `playwright.config.ts` — projects `chromium`, `firefox`, `webkit` (nenhum teste existente reduzido).
5. `package.json` — devDependency `@axe-core/playwright` + script `test:a11y`.
6. `tests/e2e/fixtures/synthetic-a11y-fixtures.ts` — fixtures sintéticas rotuladas (`SYNTHETIC_*`, prefixos `synthetic_`) servidas por `page.route`; nenhum backend real responde nas varreduras.

## Exceções e limitações

- **Exceções axe congeladas:** nenhuma (0 critical/serious e 0 violações totais). O JSON registra a lista vazia.
- **Leitor de tela:** **NÃO houve teste completo de leitor de tela**. Não há Orca/NVDA/VoiceOver disponível neste ambiente. A cobertura é amostragem limitada: nomes/roles verificados pelo axe (0 violações de ARIA/name) e travessia de teclado completa; isso **não** substitui certificação com leitor de tela real. Registrado como `NOT_RUN` para certificação SR plena.
- **Zoom/reflow:** emulado por viewport equivalente; não há zoom nativo de browser cross-engine no Playwright. CSS em `px` não responde a preferência de fonte 200% (text-only zoom); o medido foi o equivalente a page zoom.
- **axe:** varreduras rodam com `prefers-reduced-motion: reduce` para não amostrar contraste em meio a transições de 140ms; as regras de reduced-motion do app são honradas.
- **Ambiente:** resultados Linux-only; snapshots por browser são `*-linux.png`. WebKit dependeu do workaround local de libs descrito acima.
- **E2E existente:** `platform-control-center.spec.ts` não é idempotente contra um backend já populado; com servidor fresco por project (e `--workers=1`, como no CI) passa nos três browsers.
- **Typecheck global:** os arquivos desta task passam; `npm run typecheck` continua vermelho por erros pré-existentes em `apps/api/**` e `packages/persistence/**` de frentes em andamento (`AUD19-07/08`, decomposição de hotspots) que este escopo não pode editar.

## Artefatos de evidência

- `docs/04_audit/evidence/AUD19/AUD19-10-a11y-report.md` (este relatório).
- `docs/04_audit/evidence/AUD19/AUD19-10-a11y-results.json` (agregado por browser: axe, contraste, teclado, reflow, forced-colors, targets, tipografia, estados, exceções, limitações).
- `docs/04_audit/evidence/AUD19/raw/*.json` (99 brutos, 33 por browser, com `synthetic: true`).
- Baselines visuais: `tests/e2e/visual-shell.spec.ts-snapshots/*-{chromium,firefox,webkit}-linux.png` (30 arquivos; 20 novos para firefox/webkit e 10 chromium regenerados pela mudança intencional de tipografia/targets).

## Reprodutibilidade

```bash
nvm use 22.23.2
AUD19_A11Y_EVIDENCE=1 npx playwright test tests/e2e/accessibility.spec.ts   # 48/48
npx playwright test --project=chromium --workers=1                          # 25/25
npx playwright test --project=firefox --workers=1                           # 25/25
npx playwright test --project=webkit --workers=1                            # 25/25
npm run audit:security && npm run licenses:check && npm test
npm run lint && npm run format:check
node docs/04_audit/evidence/AUD19/AUD19-10-aggregate-a11y.mjs  # regenera o JSON agregado a partir de raw/
```

## Limites de autoridade

Evidência local e sintética. Não autoriza staging, produção, dados reais, provider/canal/IdP/RAG institucional, nem ação clínica, financeira, de agenda ou prontuário. Toda ação sensível permanece dependente de approval ou handoff.
