# Counter-Strike 2

## Resultado

- Status: `cross_verified`
- Versao do perfil: 2
- Data da auditoria: 2026-09-05
- Escopo: hipfire 360, DPI independente por origem/destino
- Coeficiente usado: `0.022`

## Evidencia

| Fonte | Classe | O que sustenta | O que nao sustenta |
| --- | --- | --- | --- |
| [Valve Half-Life SDK, inputw32.cpp](https://github.com/ValveSoftware/halflife/blob/master/cl_dll/inputw32.cpp) | codigo-fonte oficial | `m_yaw` padrao 0.022 e aplicacao linear de sensibilidade ao delta horizontal | comportamento interno do CS2 atual |
| [KovaaK Sensitivity Matcher](https://www.kovaak.com/sensitivity-matcher/) | medicao reproduzivel | formula count x sens x yaw, yaw Source/Quake 0.022 e teste multi-volta | limites e casas aceitas pelo CS2 |

As fontes sao independentes e convergem no modelo angular da linhagem Source. Isso justifica `cross_verified`, mas nao `verified`: falta uma especificacao primaria do CS2 atual e uma execucao fisica registrada pelo projeto.

## Entrada e arredondamento

O perfil conserva temporariamente `min=0.01`, `max=20`, `step=0.001` e tres casas. Esses valores sao herdados da implementacao anterior e nao foram confirmados por fonte primaria. A conversao exibe o valor matematico e o valor normalizado separadamente.

O coeficiente tambem pressupoe `m_yaw=0.022`. Se o usuario alterar `m_yaw`, o perfil deixa de representar a configuracao real.

## Vetores a 800 DPI

| Sensibilidade | cm/360 esperado |
| ---: | ---: |
| 0.5 | 103.909091 |
| 1.0 | 51.954545 |
| 2.0 | 25.977273 |

## Pendencias

- Medir o CS2 atual em multiplas voltas e publicar contagens, drift e margem de erro.
- Confirmar a precisao efetivamente persistida pelo console/configuracao.
- Confirmar limites minimo e maximo.
- Modelar `m_yaw` configuravel antes de declarar equivalencia para setups modificados.
