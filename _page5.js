
(function(){
  const dataEl = document.getElementById('competitor-driving-fee-data');
  const DATA = dataEl ? JSON.parse(dataEl.textContent) : { weeks: [], vehicle_types: {} };
  const COLORS3 = { turuca: '#1B2A4A', gcar: '#e9a23b', socar: '#2a9d8f' };
  const VTYPE_ORDER = ['경형','준중형','SUV(경형)','SUV(소형)','SUV(준중형)','SUV(중형)','중형','준대형','승합','전기','HEV(준중형)','HEV(소형SUV)','HEV(중형)'];
  let page5Charts = {};
  let page5Wired = false;
  let page5SelectedVtype = null;
  let page5SelectedDist = '50';
  let page5AvailableYears = [];
  let page5SelectedYears = [];

  function weekLabel(iso){
    const [y,m,d] = iso.split('-');
    return y.slice(2) + '/' + m + '/' + d;
  }

  function computePage5Years(){
    // 데이터에 존재하는 연도를 동적으로 추출(하드코딩 금지)
    page5AvailableYears = Array.from(new Set(DATA.weeks.map(w => parseInt(w.slice(0,4), 10)))).sort((a,b) => a-b);
    if (!page5SelectedYears.length){
      page5SelectedYears = page5AvailableYears.slice();
    } else {
      page5SelectedYears = page5SelectedYears.filter(y => page5AvailableYears.includes(y));
    }
  }

  function renderPage5YearCheckboxes(){
    const wrap = document.getElementById('page5YearCheckboxes');
    if (!wrap) return;
    wrap.innerHTML = page5AvailableYears.map(y => `
      <label class="year-cb-label">
        <input type="checkbox" class="page5-year-cb" value="${y}" ${page5SelectedYears.includes(y) ? 'checked' : ''}>
        ${y}년
      </label>`).join('');
    wrap.querySelectorAll('.page5-year-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const y = Number(cb.value);
        if (cb.checked){
          if (!page5SelectedYears.includes(y)) page5SelectedYears.push(y);
        } else {
          page5SelectedYears = page5SelectedYears.filter(v => v !== y);
        }
        page5SelectedYears.sort((a,b) => a-b);
        renderPage5DrivingCharts();
      });
    });
  }

  function page5FilteredIndices(){
    if (!page5SelectedYears.length) return DATA.weeks.map((_, i) => i);
    const idxs = [];
    DATA.weeks.forEach((w, i) => {
      if (page5SelectedYears.includes(parseInt(w.slice(0,4), 10))) idxs.push(i);
    });
    return idxs;
  }

  function page5Pick(arr, idxs){
    if (!arr) return arr;
    return idxs.map(i => arr[i]);
  }

  function destroyChart(id){
    if (page5Charts[id]){ page5Charts[id].destroy(); delete page5Charts[id]; }
  }

  function drawBucketChart(canvasId, labels, series){
    destroyChart(canvasId);
    const el = document.getElementById(canvasId);
    if (!el) return;
    const datasets = series.map(s => ({
      label: s.label, data: s.data,
      borderColor: s.color, backgroundColor: s.color,
      fill: false, tension: 0, stepped: true, spanGaps: true,
      pointRadius: 0, borderWidth: 2
    }));
    page5Charts[canvasId] = new Chart(el.getContext('2d'), {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 8, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } } },
          tooltip: { mode: 'index', intersect: false }
        },
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { beginAtZero: true, ticks: { font: { size: 10 }, callback: v => v + '원' } },
          x: { ticks: { font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 14 } }
        }
      }
    });
  }

  function renderPage5DrivingCharts(){
    const vt = page5SelectedVtype;
    const d = DATA.vehicle_types[vt];
    const idxs = page5FilteredIndices();
    const labels = idxs.map(i => weekLabel(DATA.weeks[i]));
    if (!d){
      ['page5ChartBucket1','page5ChartBucket2','page5ChartBucket3'].forEach(destroyChart);
      return;
    }
    drawBucketChart('page5ChartBucket1', labels, [
      { label: '투루카', data: page5Pick(d.turuca_50, idxs), color: COLORS3.turuca },
      { label: 'G car', data: page5Pick(d.gcar_30, idxs), color: COLORS3.gcar },
      { label: '쏘카', data: page5Pick(d.socar_low, idxs), color: COLORS3.socar }
    ]);
    drawBucketChart('page5ChartBucket2', labels, [
      { label: '투루카', data: page5Pick(d.turuca_51_100, idxs), color: COLORS3.turuca },
      { label: 'G car', data: page5Pick(d.gcar_30_100, idxs), color: COLORS3.gcar },
      { label: '쏘카', data: page5Pick(d.socar_high, idxs), color: COLORS3.socar }
    ]);
    drawBucketChart('page5ChartBucket3', labels, [
      { label: '투루카', data: page5Pick(d.turuca_101, idxs), color: COLORS3.turuca },
      { label: 'G car', data: page5Pick(d.gcar_100, idxs), color: COLORS3.gcar }
    ]);
    renderPage5DistanceChart();
  }

  function renderPage5DistanceChart(){
    const vt = page5SelectedVtype;
    const d = DATA.vehicle_types[vt];
    const idxs = page5FilteredIndices();
    const labels = idxs.map(i => weekLabel(DATA.weeks[i]));
    if (!d) { destroyChart('page5ChartDistance'); return; }
    const dist = page5SelectedDist;
    drawBucketChart('page5ChartDistance', labels, [
      { label: '투루카', data: page5Pick(d['dist' + dist + '_turuca'], idxs), color: COLORS3.turuca },
      { label: 'G car', data: page5Pick(d['dist' + dist + '_gcar'], idxs), color: COLORS3.gcar },
      { label: '쏘카', data: page5Pick(d['dist' + dist + '_socar'], idxs), color: COLORS3.socar }
    ]);
  }

  function populateVtypeSelect(){
    const sel = document.getElementById('page5VtypeSelect');
    if (!sel) return;
    const available = Object.keys(DATA.vehicle_types);
    const ordered = VTYPE_ORDER.filter(v => available.includes(v)).concat(available.filter(v => !VTYPE_ORDER.includes(v)));
    if (!page5SelectedVtype || !available.includes(page5SelectedVtype)){
      page5SelectedVtype = available.includes('준중형') ? '준중형' : (ordered[0] || null);
    }
    sel.innerHTML = ordered.map(v => `<option value="${v}" ${v === page5SelectedVtype ? 'selected' : ''}>${v}</option>`).join('');
    updateVtypeModelLabel();
  }

  function updateVtypeModelLabel(){
    const label = document.getElementById('page5VtypeModelLabel');
    if (!label) return;
    const d = DATA.vehicle_types[page5SelectedVtype];
    label.textContent = (d && d.model) ? ('기준 차종: ' + d.model) : '';
  }

  function wirePage5Once(){
    if (page5Wired) return;
    page5Wired = true;
    const catBar = document.getElementById('page5CategoryTabBar');
    if (catBar){
      catBar.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          catBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const cat = btn.dataset.cat;
          document.querySelectorAll('.page5-cat-panel').forEach(p => {
            p.style.display = (p.dataset.catpanel === cat) ? '' : 'none';
          });
          if (cat === 'driving') setTimeout(renderPage5DrivingCharts, 0);
        });
      });
    }
    const sel = document.getElementById('page5VtypeSelect');
    if (sel){
      sel.addEventListener('change', () => {
        page5SelectedVtype = sel.value;
        updateVtypeModelLabel();
        renderPage5DrivingCharts();
      });
    }
    const distBar = document.getElementById('page5DistTabBar');
    if (distBar){
      distBar.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          distBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          page5SelectedDist = btn.dataset.dist;
          renderPage5DistanceChart();
        });
      });
    }
  }

  window.refreshPage5 = function(){
    wirePage5Once();
    populateVtypeSelect();
    computePage5Years();
    renderPage5YearCheckboxes();
    renderPage5DrivingCharts();
  };
})();
