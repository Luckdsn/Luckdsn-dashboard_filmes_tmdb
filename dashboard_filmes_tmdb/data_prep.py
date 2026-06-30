"""
Script de preparação de dados — TMDB 5000
Lê tmdb_5000_movies.csv, extrai gêneros, filtra e agrega métricas,
gerando dashboard_data.json para alimentar o dashboard HTML.
"""
import pandas as pd
import ast
import json

# 1. Carregar dados
df = pd.read_csv('tmdb_5000_movies.csv')
df = df[df['status'] == 'Released'].copy()

# 2. Tratar datas
df['release_date'] = pd.to_datetime(df['release_date'], errors='coerce')
df['year'] = df['release_date'].dt.year
df = df.dropna(subset=['year'])
df['year'] = df['year'].astype(int)

# 3. Parsear coluna de gêneros (vem como string de lista de dicts)
def parse_genres(x):
    try:
        l = ast.literal_eval(x)
        return [g['name'] for g in l]
    except Exception:
        return []

df['genre_list'] = df['genres'].apply(parse_genres)
df = df[df['genre_list'].map(len) > 0]

# 4. Filtros de qualidade
df = df[(df['year'] >= 1990) & (df['year'] <= 2017)]
df = df[df['vote_count'] >= 10]

# 5. "Explodir" por gênero (uma linha por filme x gênero)
rows = []
for _, r in df.iterrows():
    for g in r['genre_list']:
        rows.append({
            'genre': g, 'year': r['year'], 'popularity': r['popularity'],
            'vote_average': r['vote_average'], 'vote_count': r['vote_count'],
            'budget': r['budget'], 'revenue': r['revenue'], 'title': r['title']
        })
exp = pd.DataFrame(rows)

# 6. Resumo por gênero (mantém só gêneros com >= 15 filmes)
genre_summary = exp.groupby('genre').agg(
    count=('title', 'count'),
    avg_popularity=('popularity', 'mean'),
    avg_vote=('vote_average', 'mean'),
    total_votes=('vote_count', 'sum'),
    avg_revenue=('revenue', 'mean'),
    avg_budget=('budget', 'mean')
).reset_index()
genre_summary = genre_summary[genre_summary['count'] >= 15]
genre_summary = genre_summary.sort_values('avg_popularity', ascending=False)

top_genres = genre_summary['genre'].tolist()

# 7. Popularidade média por gênero/ano (para o gráfico de evolução)
exp_top = exp[exp['genre'].isin(top_genres)]
genre_year = exp_top.groupby(['genre', 'year']).agg(
    avg_popularity=('popularity', 'mean'),
    count=('title', 'count')
).reset_index()

# 8. Top filmes por popularidade (para a tabela de ranking)
movies = df[['title', 'year', 'popularity', 'vote_average', 'vote_count',
             'budget', 'revenue', 'genre_list']].copy()
movies['budget'] = movies['budget'].fillna(0)
movies['revenue'] = movies['revenue'].fillna(0)
top_movies = movies.sort_values('popularity', ascending=False).head(300).to_dict(orient='records')

# 9. Montar e salvar JSON final
output = {
    'genre_summary': genre_summary.to_dict(orient='records'),
    'genre_year': genre_year.to_dict(orient='records'),
    'top_movies': top_movies,
    'genres_list': top_genres,
    'year_range': [int(df['year'].min()), int(df['year'].max())]
}

with open('dashboard_data.json', 'w') as f:
    json.dump(output, f, default=str)

print(f"Pronto! {len(movies)} filmes, {len(top_genres)} gêneros.")
