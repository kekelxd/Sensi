# XENSI Handoff

## Estado atual

- Branch: `main`, sincronizada com `origin/main` antes desta mudanca.
- O workspace tinha itens nao rastreados preexistentes (`.playwright-cli/`, `agent.md`, pastas de skills/design, etc.). Eles nao foram alterados.
- Implementacao validada em desktop com Vite local em `http://127.0.0.1:5173/Sensi/`.

## Arquitetura de navegacao

- O app continua sem React Router.
- O contrato de URLs fica centralizado em `src/routes.ts`.
- `src/App.tsx` le a URL inicial, sincroniza `popstate`, normaliza deep links/redirects legados e renderiza a view correspondente.
- Rotas canonicas em ingles:
  - `/Sensi/`
  - `/Sensi/train`
  - `/Sensi/train/target-switch`
  - `/Sensi/train/tracking`
  - `/Sensi/train/target-shooting`
  - `/Sensi/train/reaction`
  - `/Sensi/train/gridshot`
  - `/Sensi/train/strafetrack`
  - `/Sensi/train/sniper`
  - `/Sensi/train/routines`
  - `/Sensi/calibrate`
  - `/Sensi/convert`
  - `/Sensi/analysis`
  - `/Sensi/analysis/history`
  - `/Sensi/methodology`
  - `/Sensi/diagnostics`
  - `/Sensi/diagnostics/polling-rate`
  - `/Sensi/diagnostics/input`
  - `/Sensi/diagnostics/refresh-rate`
  - `/Sensi/diagnostics/controller-drift`
  - `/Sensi/profile`
  - `/Sensi/login`, `/Sensi/register`, `/Sensi/forgot-password`
- Rotas antigas continuam aceitas e sao normalizadas:
  - `/Sensi/diagnostico` -> `/Sensi/diagnostics`
  - `/Sensi/polling-rate` -> `/Sensi/diagnostics/polling-rate`
  - `/Sensi/input-diagnostics` -> `/Sensi/diagnostics/input`
  - `/Sensi/drift-controle` -> `/Sensi/diagnostics/controller-drift`
  - `/Sensi/warmup` -> `/Sensi/train`
  - `/Sensi/routine` -> `/Sensi/train/routines`
  - `/Sensi/calibration` -> `/Sensi/calibrate`
  - `/Sensi/converter` -> `/Sensi/convert`

## Mudancas principais

- `src/routes.ts`: novo mapa central de rotas, parser e gerador de paths.
- `src/App.tsx`: navegacao baseada em rota canonica, suporte a back/forward e deep links.
- `src/Warmup.tsx`: callback opcional para refletir a escolha do minigame em `/train/...`; a logica interna do treino nao foi alterada.
- `src/AppNavigation.tsx` e `src/navigationState.ts`: tipos de view passam a vir do mapa central.
- `src/DiagnosticLanding.tsx`: usa o tipo central de rota.
- `scripts/prepare-pages-routes.mjs`: build copia `index.html` para as novas rotas estaticas e mantem rotas legadas.
- `src/i18n.tsx`: prioridade de idioma corrigida para salvo > navegador > ingles, com fallback de traducao em ingles.
- `src/styles.css`: ajuste responsivo na Home v3 para impedir que a lista do card intercepte o CTA em viewports estreitos.
- `src/routes.test.ts`: testes para o contrato de paths canonicos e parse de rotas.

## Validacao executada

- `npm run lint`: passou.
- `npm test`: passou, 25 arquivos de teste e 166 testes.
- `npm run build`: passou. O Vite manteve apenas o aviso de chunk acima de 500 kB.
- `npm run test:e2e`: passou, 147 testes aprovados e 9 skipped condicionais.
- Playwright manual via script:
  - CTA "Explorar diagnosticos" abre `/Sensi/diagnostics`.
  - Item direto "Polling Rate" da Home abre `/Sensi/diagnostics/polling-rate`.
  - Item direto "Refresh Rate" da Home abre `/Sensi/diagnostics/refresh-rate`.
  - Dropdown Diagnostico abre "Drift do Controle" em `/Sensi/diagnostics/controller-drift`.
  - Deep link `/Sensi/methodology` carrega a metodologia.
  - Deep link `/Sensi/train/reaction` abre o setup do exercicio de reacao.
  - Back do navegador retorna corretamente para a Home.

## Observacoes para proximas threads

- A internacionalizacao ainda tem copias locais grandes em alguns componentes (`Home.tsx`, `AppNavigation.tsx`, `DiagnosticLanding.tsx`, `Analysis.tsx`, `AuthPages.tsx`). O fallback global foi corrigido, mas uma centralizacao completa das strings pode ser feita em uma etapa separada.
- Nao foi adicionada dependencia de roteamento.
- Nao foram alterados contratos de `localStorage`, matematica de sensibilidade, calibracao, rotinas, perfil ou diagnosticos.
