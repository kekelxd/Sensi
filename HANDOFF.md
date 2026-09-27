# XENSI Handoff

## Estado atual

- Branch: `main`, sincronizada com `origin/main` antes desta mudanca.
- O workspace tinha itens nao rastreados preexistentes (`.playwright-cli/`, `agent.md`, pastas de skills/design, etc.). Eles nao foram alterados.
- Implementacao validada em desktop com Vite local em `http://127.0.0.1:5173/`.

## Arquitetura de navegacao

- O app continua sem React Router.
- O contrato de URLs fica centralizado em `src/routes.ts`.
- `src/App.tsx` le a URL inicial, sincroniza `popstate`, normaliza deep links/redirects legados e renderiza a view correspondente.
- Rotas canonicas em ingles:
  - `/`
  - `/train`
  - `/train/target-switch`
  - `/train/tracking`
  - `/train/target-shooting`
  - `/train/reaction`
  - `/train/gridshot`
  - `/train/strafetrack`
  - `/train/sniper`
  - `/train/routines`
  - `/calibrate`
  - `/convert`
  - `/analysis`
  - `/analysis/history`
  - `/methodology`
  - `/diagnostics`
  - `/diagnostics/polling-rate`
  - `/diagnostics/input`
  - `/diagnostics/refresh-rate`
  - `/diagnostics/controller-drift`
  - `/profile`
  - `/login`, `/register`, `/forgot-password`
- Rotas antigas continuam aceitas e sao normalizadas:
  - `/diagnostico` -> `/diagnostics`
  - `/polling-rate` -> `/diagnostics/polling-rate`
  - `/input-diagnostics` -> `/diagnostics/input`
  - `/drift-controle` -> `/diagnostics/controller-drift`
  - `/warmup` -> `/train`
  - `/routine` -> `/train/routines`
  - `/calibration` -> `/calibrate`
  - `/converter` -> `/convert`

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
  - CTA "Explorar diagnosticos" abre `/diagnostics`.
  - Item direto "Polling Rate" da Home abre `/diagnostics/polling-rate`.
  - Item direto "Refresh Rate" da Home abre `/diagnostics/refresh-rate`.
  - Dropdown Diagnostico abre "Drift do Controle" em `/diagnostics/controller-drift`.
  - Deep link `/methodology` carrega a metodologia.
  - Deep link `/train/reaction` abre o setup do exercicio de reacao.
  - Back do navegador retorna corretamente para a Home.

## Observacoes para proximas threads

- A internacionalizacao ainda tem copias locais grandes em alguns componentes (`Home.tsx`, `AppNavigation.tsx`, `DiagnosticLanding.tsx`, `Analysis.tsx`, `AuthPages.tsx`). O fallback global foi corrigido, mas uma centralizacao completa das strings pode ser feita em uma etapa separada.
- Nao foi adicionada dependencia de roteamento.
- Nao foram alterados contratos de `localStorage`, matematica de sensibilidade, calibracao, rotinas, perfil ou diagnosticos.
