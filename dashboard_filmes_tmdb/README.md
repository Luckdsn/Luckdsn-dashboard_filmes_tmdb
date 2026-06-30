# Dashboard TMDB 5000 — Gêneros & Popularidade

## Arquivos

- `data_prep.py` — script Python que lê `tmdb_5000_movies.csv`, trata os dados
  (parseia gêneros, filtra por status/ano/votos) e gera `dashboard_data.json`.
- `dashboard_data.json` — dados já processados e agregados (saída do script acima).
- `app.js` — lógica do dashboard: filtros de gênero, gráficos (Chart.js) e tabela de ranking.
- `dashboard_template.html` — estrutura/estilo do dashboard, com placeholders
  `__DATA_PLACEHOLDER__` e `__APP_PLACEHOLDER__` onde os dados e o JS são injetados.
- `dashboard_filmes_tmdb.html` — **arquivo final pronto para uso**, já com tudo
  embutido (dados + lógica + visual). É só abrir no navegador.

## Como regerar do zero

1. Coloque `tmdb_5000_movies.csv` na mesma pasta de `data_prep.py`.
2. Rode: `python3 data_prep.py` → gera `dashboard_data.json` atualizado.
3. Junte tudo num único HTML:

```python
with open('dashboard_template.html', encoding='utf-8') as f:
    html = f.read()
with open('dashboard_data.json', encoding='utf-8') as f:
    data_json = f.read()
with open('app.js', encoding='utf-8') as f:
    app_js = f.read()

html = html.replace('__DATA_PLACEHOLDER__', f'const DASHBOARD_DATA = {data_json};')
html = html.replace('__APP_PLACEHOLDER__', app_js)

with open('dashboard_filmes_tmdb.html', 'w', encoding='utf-8') as f:
    f.write(html)
```

## Fonte dos dados

TMDB 5000 Movie Dataset (Kaggle): https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata
Filtros aplicados: status = "Released", ano entre 1990–2017, vote_count >= 10.
