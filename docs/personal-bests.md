# Personal Bests

O XENSI registra o melhor resultado do jogador por minigame e por contexto de sessão. O primeiro resultado válido cria o recorde inicial; resultados melhores exibem o feedback de novo recorde; empates e resultados inferiores não criam um novo destaque.

## Métrica principal

| Minigame | Métrica | Regra |
| --- | --- | --- |
| Target Switch | Score | Maior é melhor |
| Tracking | Precisão | Maior é melhor |
| Flick | Score | Maior é melhor |
| Reflex | Score | Maior é melhor |
| Gridshot | Score | Maior é melhor |
| Strafe Track | Precisão | Maior é melhor |
| Sniper Reaction | Melhor reação | Menor é melhor |

A precisão é comparada com uma casa decimal, o score sem casas decimais e o tempo de reação em milissegundos sem casas decimais. Isso evita que pequenas oscilações de cálculo sejam apresentadas como um novo recorde.

## Comparabilidade e histórico

Um recorde só é comparado com sessões do mesmo jogo, dificuldade e duração. Sessões antigas que não possuem configuração ficam agrupadas como legado e não são misturadas com sessões configuradas. O histórico é salvo junto da última sessão em `localStorage`, limitado às 100 entradas mais recentes.

O contexto do resultado é copiado no momento da sessão. Assim, alterações posteriores no preset de sensibilidade, DPI ou configuração do jogador não reescrevem o contexto do recorde já exibido.

Sessões sem uma métrica válida, como score ou precisão igual a zero, não entram no histórico de recordes. Sair antes da conclusão também não grava uma sessão.
