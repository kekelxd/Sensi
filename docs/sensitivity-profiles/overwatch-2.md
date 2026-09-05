# Overwatch 2

## Resultado

- Status: `measured`
- Versao do perfil: 2
- Data da auditoria: 2026-09-05
- Escopo: hipfire 360; ADS e ajustes por heroi excluidos
- Coeficiente usado: `0.0066`

## Evidencia

| Fonte | Classe | O que sustenta | O que nao sustenta |
| --- | --- | --- | --- |
| [Sensitivity Matcher, codigo do preset](https://github.com/KovaaK/SensitivityMatcher/blob/master/ReleaseAssets/bin/SensitivityMatcher.au3) | medicao reproduzivel | constante `0.0066`, formula e ferramenta de repeticao | garantia oficial da Blizzard para o coeficiente |
| [Notas oficiais de julho de 2016](https://overwatch.blizzard.com/en-us/news/patch-notes/live/2016/07/) | oficial | entrada numerica e duas casas decimais | coeficiente angular e limites atuais |
| [Notas oficiais de outubro de 2019](https://overwatch.blizzard.com/en-us/news/patch-notes/ptr/2019/10/) | oficial | opcao de alta precisao usa polling nativo para determinar o disparo | relacao entre sensibilidade e graus por count |

O perfil fica em `measured`: ha medicao reproduzivel para `0.0066` e documentacao oficial complementar para entrada, mas nao existe coeficiente oficial publicado nem validacao fisica registrada pelo XENSI no build atual.

## Entrada e arredondamento

Duas casas decimais sao sustentadas por nota oficial. `min=0.01` e `max=100` permanecem provisórios. O erro residual deve ser calculado depois do arredondamento para 0.01.

## Vetores a 800 DPI

| Sensibilidade | cm/360 esperado |
| ---: | ---: |
| 2.0 | 86.590909 |
| 4.0 | 43.295455 |
| 8.0 | 21.647727 |

## Pendencias

- Repetir o teste multi-volta no Overwatch 2 atual e registrar build e erro.
- Confirmar limites minimo e maximo da entrada.
- Verificar se herois, ADS ou modos especificos alteram o modelo antes de ampliar o escopo.
