# Valorant

## Resultado

- Status: `experimental`
- Versao do perfil: 2
- Data da auditoria: 2026-09-05
- Escopo: hipotese de hipfire 360
- Coeficiente usado: `0.07`

## Evidencia

A auditoria encontrou repeticao ampla de `0.07` em calculadoras e projetos comunitarios, mas nao encontrou documentacao tecnica primaria da Riot nem um relatorio independente com contagens, multiplas voltas, drift e erro declarado. Repeticao de um numero nao equivale a verificacao independente.

O [protocolo do Sensitivity Matcher](https://github.com/KovaaK/SensitivityMatcher/blob/master/README.md) foi registrado como metodo exigido para uma futura medicao, nao como prova do coeficiente de Valorant.

## Entrada e arredondamento

O perfil conserva `min=0.001`, `max=10`, `step=0.001` e tres casas apenas por compatibilidade com o comportamento anterior. A precisao armazenada internamente e os limites ainda precisam ser confirmados.

## Vetores da hipotese a 800 DPI

| Sensibilidade | cm/360 esperado pelo modelo atual |
| ---: | ---: |
| 0.2 | 81.642857 |
| 0.4 | 40.821429 |
| 0.8 | 20.410714 |

Esses vetores verificam a implementacao da hipotese `0.07`; nao comprovam que o jogo usa esse coeficiente.

## Pendencias

- Executar medicao multi-volta em build identificado do Valorant.
- Repetir em sensibilidades baixa, media e alta e publicar incerteza.
- Confirmar casas decimais aceitas, valor persistido e limites.
- Obter uma segunda linha independente de evidencia antes de promover o status.
