const COLORS = ['#D4A017','#C1453B','#6B9080','#A875C9','#E08E45','#5B9BD5','#E0577F','#8FAE3A','#C9A9E0','#4FB0A5','#D98E04','#B0552E','#7E8CE0','#E0BE3A','#3F8F7A','#C75D8A','#9CC4E0','#E0793A','#6FA0D9','#B58CE0'];

let activeGenres = new Set();
let charts = {};
let currentSort = 'popularity';

function fmtNum(n, decimals=1){
  return Number(n).toLocaleString('pt-BR', {minimumFractionDigits:decimals, maximumFractionDigits:decimals});
}
function fmtMoney(n){
  if(n >= 1e9) return '$' + (n/1e9).toFixed(2) + 'B';
  if(n >= 1e6) return '$' + (n/1e6).toFixed(1) + 'M';
  if(n >= 1e3) return '$' + (n/1e3).toFixed(0) + 'K';
  return '$' + n;
}

function colorFor(genre){
  const idx = DASHBOARD_DATA.genres_list.indexOf(genre);
  return COLORS[idx % COLORS.length];
}

function init(){
  // default: top 6 genres by avg_popularity active
  DASHBOARD_DATA.genre_summary.slice(0,6).forEach(g => activeGenres.add(g.genre));

  renderHeroStats();
  renderGenreReel();
  renderAll();

  document.getElementById('sortSelect').addEventListener('change', e => {
    currentSort = e.target.value;
    renderMovieTable();
  });
}

function renderHeroStats(){
  const totalMovies = DASHBOARD_DATA.genre_summary.reduce((a,g)=>a+0,0); // placeholder not used
  const [y0,y1] = DASHBOARD_DATA.year_range;
  const numGenres = DASHBOARD_DATA.genres_list.length;
  const topGenre = DASHBOARD_DATA.genre_summary[0];

  const stats = [
    { num: `${y0}–${y1}`, label: 'Período analisado' },
    { num: numGenres, label: 'Gêneros mapeados' },
    { num: topGenre.genre, label: 'Gênero mais popular' },
    { num: fmtNum(topGenre.avg_popularity), label: `Popularidade média (${topGenre.genre})` },
  ];
  const el = document.getElementById('heroStats');
  el.innerHTML = stats.map(s => `
    <div class="stat">
      <div class="num">${s.num}</div>
      <div class="label">${s.label}</div>
    </div>
  `).join('');
}

function renderGenreReel(){
  const el = document.getElementById('genreReel');
  el.innerHTML = DASHBOARD_DATA.genre_summary.map(g => `
    <div class="genre-pill ${activeGenres.has(g.genre) ? 'active' : ''}" data-genre="${g.genre}">
      ${g.genre} <span style="opacity:0.6">(${g.count})</span>
    </div>
  `).join('');

  el.querySelectorAll('.genre-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const genre = pill.dataset.genre;
      if(activeGenres.has(genre)){
        if(activeGenres.size > 1) activeGenres.delete(genre);
      } else {
        activeGenres.add(genre);
      }
      pill.classList.toggle('active');
      renderAll();
    });
  });
}

function renderAll(){
  renderGenrePopChart();
  renderScatterChart();
  renderTimelineChart();
  renderMovieTable();
}

function renderGenrePopChart(){
  const data = DASHBOARD_DATA.genre_summary.filter(g => activeGenres.has(g.genre))
    .sort((a,b) => b.avg_popularity - a.avg_popularity);

  const ctx = document.getElementById('chartGenrePop');
  if(charts.genrePop) charts.genrePop.destroy();
  charts.genrePop = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.genre),
      datasets: [{
        data: data.map(d => d.avg_popularity),
        backgroundColor: data.map(d => colorFor(d.genre)),
        borderRadius: 3,
        barThickness: 22,
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display:false }, tooltip: {
        callbacks: { label: (c) => `Popularidade média: ${fmtNum(c.parsed.x)}` }
      }},
      scales: {
        x: { grid: { color: 'rgba(242,232,213,0.06)' }, ticks: { color:'#A89A85', font:{family:"'Space Mono', monospace", size:10} } },
        y: { grid: { display:false }, ticks: { color:'#F2E8D5', font:{family:"'Inter', sans-serif", size:12} } }
      }
    }
  });
}

function renderScatterChart(){
  const data = DASHBOARD_DATA.genre_summary.filter(g => activeGenres.has(g.genre));
  const ctx = document.getElementById('chartScatter');
  if(charts.scatter) charts.scatter.destroy();
  charts.scatter = new Chart(ctx, {
    type: 'bubble',
    data: {
      datasets: data.map(d => ({
        label: d.genre,
        data: [{ x: d.avg_vote, y: d.count, r: Math.max(6, Math.sqrt(d.avg_popularity)*2) }],
        backgroundColor: colorFor(d.genre) + 'CC',
        borderColor: colorFor(d.genre),
        borderWidth: 1.5,
      }))
    },
    options: {
      plugins: {
        legend: { position:'bottom', labels:{ color:'#A89A85', font:{family:"'Space Mono', monospace", size:10}, boxWidth:8, usePointStyle:true } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: nota ${fmtNum(c.raw.x,2)}, ${c.raw.y} filmes` } }
      },
      scales: {
        x: { title:{ display:true, text:'Nota média', color:'#A89A85', font:{size:10} }, grid:{ color:'rgba(242,232,213,0.06)'}, ticks:{ color:'#A89A85', font:{size:10} } },
        y: { title:{ display:true, text:'Nº de filmes', color:'#A89A85', font:{size:10} }, grid:{ color:'rgba(242,232,213,0.06)'}, ticks:{ color:'#A89A85', font:{size:10} } }
      }
    }
  });
}

function renderTimelineChart(){
  const years = [];
  for(let y = DASHBOARD_DATA.year_range[0]; y <= DASHBOARD_DATA.year_range[1]; y++) years.push(y);

  const datasets = [...activeGenres].map(genre => {
    const rows = DASHBOARD_DATA.genre_year.filter(r => r.genre === genre);
    const byYear = {};
    rows.forEach(r => byYear[r.year] = r.avg_popularity);
    return {
      label: genre,
      data: years.map(y => byYear[y] !== undefined ? byYear[y] : null),
      borderColor: colorFor(genre),
      backgroundColor: colorFor(genre) + '22',
      tension: 0.35,
      spanGaps: true,
      pointRadius: 2,
      borderWidth: 2,
    };
  });

  const ctx = document.getElementById('chartTimeline');
  if(charts.timeline) charts.timeline.destroy();
  charts.timeline = new Chart(ctx, {
    type: 'line',
    data: { labels: years, datasets },
    options: {
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position:'bottom', labels:{ color:'#A89A85', font:{family:"'Space Mono', monospace", size:10}, boxWidth:8, usePointStyle:true } }
      },
      scales: {
        x: { grid:{ color:'rgba(242,232,213,0.06)'}, ticks:{ color:'#A89A85', font:{size:10}, maxRotation:0, autoSkip:true, maxTicksLimit:14 } },
        y: { grid:{ color:'rgba(242,232,213,0.06)'}, ticks:{ color:'#A89A85', font:{size:10} } }
      }
    }
  });
}

function renderMovieTable(){
  let movies = DASHBOARD_DATA.top_movies.filter(m =>
    m.genre_list.some(g => activeGenres.has(g))
  );
  movies = movies.slice().sort((a,b) => b[currentSort] - a[currentSort]);
  movies = movies.slice(0, 50);

  document.getElementById('rankCount').textContent = `${movies.length} filmes encontrados`;

  const maxPop = Math.max(...movies.map(m => m.popularity), 1);

  const tbody = document.getElementById('movieTableBody');
  tbody.innerHTML = movies.map((m, i) => `
    <tr>
      <td class="rank">${i+1}</td>
      <td>
        <div class="movie-title">${m.title}</div>
        <div class="movie-genre-tag">${m.genre_list.join(' · ')}</div>
      </td>
      <td>${m.year}</td>
      <td>${fmtMoney(m.revenue)}</td>
      <td>★ ${fmtNum(m.vote_average,1)}</td>
      <td class="bar-cell">
        <div class="bar-track"><div class="bar-fill" style="width:${(m.popularity/maxPop*100).toFixed(0)}%"></div></div>
        <div style="font-family:'Space Mono',monospace; font-size:10px; color:var(--cream-dim); margin-top:3px;">${fmtNum(m.popularity)}</div>
      </td>
    </tr>
  `).join('');
}

init();
