# Diagnósticos do navegador

## Refresh Rate

O teste usa apenas timestamps entregues por `requestAnimationFrame`. Após 750 ms de aquecimento, coleta quatro segundos de intervalos entre frames. A frequência observada é `1000 / mediana do intervalo`.

- São necessárias pelo menos 90 amostras válidas.
- Outliers ficam fora da mediana quando se afastam mais que o maior valor entre 0,2 ms, 18% do intervalo-base e quatro desvios absolutos medianos.
- Um frame é considerado atrasado quando seu intervalo supera 1,5 vez a mediana.
- A coleta é invalidada quando a aba perde foco ou visibilidade, quando há poucas amostras, quando a mediana supera 50 ms ou quando mais de 20% dos frames estão atrasados.
- Estabilidade: `100 - (MAD / intervalo mediano) * 400`, limitada entre 0 e 100. Valores a partir de 95 são estáveis; entre 85 e 95 indicam variação moderada.

O resultado representa o ritmo observado pelo navegador naquela sessão. Ele não certifica o refresh físico do monitor.

## Drift do controle

O teste lê a fonte compartilhada da Gamepad API. Não aplica deadzone aos eixos. Depois de uma contagem de três segundos, coleta quatro segundos com os analógicos em repouso.

- Magnitude: `sqrt(x² + y²)`.
- O deslocamento do centro usa a mediana das magnitudes; média e pico também são registrados.
- O eixo predominante é definido pelas médias absolutas de X e Y. Diferenças menores que 0,002 são tratadas como equilibradas.
- Estabilidade do centro: `100 - (MAD / 0,05) * 100`, limitada entre 0 e 100.
- Abaixo de 3% é uma referência baixa; entre 3% e 8%, moderada; a partir de 8%, alta.
- A coleta exige 120 amostras por analógico e é invalidada se qualquer magnitude ultrapassar 35%, indicando movimento deliberado.

Sistema operacional, driver, firmware e navegador podem processar os valores. A classificação é uma referência de leitura e, isoladamente, não comprova defeito físico.
