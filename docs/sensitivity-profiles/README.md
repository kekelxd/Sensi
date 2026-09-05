# Auditoria de perfis de sensibilidade

Escopo desta rodada: Counter-Strike 2, Valorant e Overwatch 2. Auditoria realizada em 2026-09-05.

## Modelo matematico

Para perfis lineares de hipfire, o XENSI usa:

```text
graus_por_count = sensibilidade * coeficiente_angular
counts_por_360 = 360 / graus_por_count
cm_por_360 = counts_por_360 / DPI * 2.54
sens_destino = sens_origem * coef_origem * DPI_origem / (coef_destino * DPI_destino)
```

O resultado matematico e normalizado para o modelo de entrada do jogo de destino. O erro residual e calculado novamente a partir do valor configuravel, e nao do valor teorico.

## Hierarquia de evidencia

1. Documentacao oficial ou codigo-fonte do fornecedor.
2. Medicao reproduzivel com metodo e margem de erro observavel.
3. Ferramenta tecnica com implementacao publica.
4. Consenso comunitario, usado apenas como pista.

Fontes que repetem a mesma tabela nao contam como evidencias independentes. Nenhum perfil recebe `verified` sem formula, validacao fisica reproduzivel, precisao de entrada confirmada, duas linhas independentes de evidencia e ausencia de contradicao relevante.

## Matriz de status

| Jogo | Coeficiente usado | Precisao configurada | Evidencia principal | Status | Pendencia critica |
| --- | ---: | --- | --- | --- | --- |
| Counter-Strike 2 | 0.022 | passo 0.001, provisório | codigo Valve historico + metodo independente | `cross_verified` | confirmar no CS2 atual o coeficiente, limites e precisao de entrada |
| Valorant | 0.07 | passo 0.001, provisório | consenso tecnico sem fonte primaria suficiente | `experimental` | medicao multi-volta independente e documentacao da entrada |
| Overwatch 2 | 0.0066 | 2 casas decimais | matcher reproduzivel + notas oficiais da Blizzard | `measured` | confirmar coeficiente no build atual e limites do campo |

## Protocolo de reproducao fisica

1. Desativar qualquer aceleracao configurada no jogo e registrar DPI, polling rate, resolucao e FOV.
2. Escolher um marcador fixo no jogo e registrar a sensibilidade exibida e o valor persistido no arquivo/configuracao, quando acessivel.
3. Reproduzir multiplas voltas com uma contagem conhecida de mouse counts; uma volta isolada amplifica erro de quantizacao.
4. Ajustar overshoot ou undershoot ate que o desvio acumulado seja menor que meio incremento mensuravel.
5. Repetir em pelo menos tres sensibilidades baixa, media e alta e registrar build, data, resultado e incerteza.
6. Confirmar o menor incremento aceito, persistencia depois de reiniciar e limites minimo/maximo.

O XENSI nao executou os jogos durante esta auditoria. As validacoes fisicas registradas aqui sao evidencias externas reproduziveis, identificadas por fonte.

## Testes automatizados

`src/sensitivityProfileAudit.test.ts` cobre coeficientes, tres vetores de cm/360 por jogo, normalizacao, limites configurados, round-trip, DPI diferente, erro residual e regras que impedem promocao indevida de status.

Esses testes detectam regressao da implementacao. Eles nao transformam um parametro externo nao comprovado em fato verificado.
