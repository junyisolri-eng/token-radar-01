// Token Launch Radar — radar-2 dashboard.
// Data comes from window.RADAR (data.js, written by main.ts from the sealed
// snapshot): rows are the 197 ranked pre-token protocols with their farm
// steps, live holds the 24 already-trading protocols set aside for
// comparison, and watchlist names the 40 watchlist slugs. No network: this
// file makes no fetch and loads nothing.
(function () {
  'use strict';
  var D = window.RADAR;
  var watch = new Set(D.watchlist || []);
  var $ = function (id) { return document.getElementById(id); };
  var rowsEl = $('rows'), headEl = $('headrow'), countEl = $('count');

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function money(v) {
    if (v == null) return '–';
    if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
    if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
    if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(v);
  }
  function pct(v) {
    if (v == null) return '–';
    var c = v >= 0 ? 'up' : 'down';
    return '<span class="' + c + '">' + (v >= 0 ? '+' : '') + v.toFixed(1) + '%</span>';
  }
  function mult(v) { return '×' + v.toFixed(3); }

  // ---- state, kept in the URL hash so a view can be linked ----
  var state = { view: 'board', q: '', cat: '', sort: 'rank', watch: false, slug: '' };
  function readHash() {
    var h = (location.hash || '').replace(/^#/, '');
    h.split('&').forEach(function (part) {
      var kv = part.split('=');
      if (kv.length !== 2) return;
      var k = decodeURIComponent(kv[0]), v = decodeURIComponent(kv[1]);
      if (k === 'view' && (v === 'board' || v === 'live')) state.view = v;
      else if (k === 'q') state.q = v;
      else if (k === 'cat') state.cat = v;
      else if (k === 'sort') state.sort = v;
      else if (k === 'watch') state.watch = v === '1';
      else if (k === 'slug') state.slug = v;
    });
  }
  function writeHash() {
    var parts = ['view=' + state.view];
    if (state.q) parts.push('q=' + encodeURIComponent(state.q));
    if (state.cat) parts.push('cat=' + encodeURIComponent(state.cat));
    if (state.sort !== 'rank') parts.push('sort=' + encodeURIComponent(state.sort));
    if (state.watch) parts.push('watch=1');
    if (state.slug) parts.push('slug=' + encodeURIComponent(state.slug));
    history.replaceState(null, '', '#' + parts.join('&'));
  }

  // ---- filtering and sorting ----
  function filteredRows() {
    var q = state.q.trim().toLowerCase();
    var list = D.rows.filter(function (r) {
      if (state.watch && !watch.has(r.slug)) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (!q) return true;
      var hay = (r.name + ' ' + r.slug + ' ' + (r.category || '') + ' ' + r.chains.join(' ')).toLowerCase();
      return hay.indexOf(q) >= 0;
    });
    var by = {
      rank: function (a, b) { return a.rank - b.rank; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
      growth: function (a, b) { return (b.change_7d == null ? -1e9 : b.change_7d) - (a.change_7d == null ? -1e9 : a.change_7d); },
      age: function (a, b) { return (b.age_days == null ? -1 : b.age_days) - (a.age_days == null ? -1 : a.age_days); },
      name: function (a, b) { return a.name.localeCompare(b.name); },
    }[state.sort] || function (a, b) { return a.rank - b.rank; };
    return list.slice().sort(by);
  }

  function chainMult(r) {
    var corr = r.trading_correction || 1;
    var denom = r.tvl_usd * r.category_multiple * r.growth_multiplier * r.maturity_multiplier * corr;
    if (!denom) return 1;
    return Math.max(1, Math.min(1.1, r.implied_value_usd / denom));
  }

  // ---- rendering ----
  var BOARD_HEAD = '<th class="num">Rank</th><th>Protocol</th><th>Category</th><th>Chains</th>' +
    '<th class="num">TVL</th><th class="num">7-day</th><th class="num">Implied value</th><th class="num">Category ×</th>';
  var LIVE_HEAD = '<th class="num">#</th><th>Protocol</th><th>Category</th><th>Chains</th>' +
    '<th class="num">TVL</th><th class="num">7-day</th><th class="num">Market cap</th><th class="num">Mcap / TVL</th>';

  function render() {
    $('tab-board').classList.toggle('on', state.view === 'board');
    $('tab-live').classList.toggle('on', state.view === 'live');
    $('q').value = state.q;
    $('cat').value = state.cat;
    $('sort').value = state.sort;
    $('watch').checked = state.watch;
    $('watch').disabled = state.view === 'live';
    $('sort').disabled = state.view === 'live';
    if (state.view === 'board') renderBoard(); else renderLive();
    renderDetail();
  }

  function renderBoard() {
    headEl.innerHTML = BOARD_HEAD;
    var list = filteredRows();
    countEl.textContent = 'Showing ' + list.length + ' of ' + D.rows.length + ' pre-token protocols' +
      (state.watch ? ' on the watchlist' : '') + '.';
    $('empty').hidden = list.length > 0;
    rowsEl.innerHTML = list.map(function (r) {
      var wl = watch.has(r.slug) ? '<span class="badge">WATCHLIST</span>' : '';
      return '<tr data-slug="' + esc(r.slug) + '" class="' + (state.slug === r.slug ? 'sel' : '') + '">' +
        '<td class="num rank">' + r.rank + '</td>' +
        '<td><strong>' + esc(r.name) + '</strong>' + wl + '<br><span class="chains">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '–') + '</td>' +
        '<td class="chains">' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num"><strong>' + money(r.implied_value_usd) + '</strong></td>' +
        '<td class="num">' + mult(r.category_multiple) + '</td></tr>';
    }).join('');
  }

  function renderLive() {
    headEl.innerHTML = LIVE_HEAD;
    var list = D.live.slice().sort(function (a, b) { return (b.mcap_usd || 0) - (a.mcap_usd || 0); });
    countEl.textContent = 'Showing ' + list.length + ' protocols whose token already trades — for comparison, never ranked.';
    $('empty').hidden = true;
    rowsEl.innerHTML = list.map(function (r, i) {
      var ratio = r.tvl_usd ? (r.mcap_usd || 0) / r.tvl_usd : null;
      return '<tr data-slug="' + esc(r.slug) + '" class="' + (state.slug === r.slug ? 'sel' : '') + '">' +
        '<td class="num rank">' + (i + 1) + '</td>' +
        '<td><strong>' + esc(r.name) + '</strong><br><span class="chains">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '–') + '</td>' +
        '<td class="chains">' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td>' +
        '<td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num"><strong>' + money(r.mcap_usd) + '</strong></td>' +
        '<td class="num">' + (ratio == null ? '–' : '×' + ratio.toFixed(2)) + '</td></tr>';
    }).join('');
  }

  function renderDetail() {
    var hint = $('detail-hint'), body = $('detail-body');
    var row = null, live = null;
    if (state.slug) {
      row = D.rows.find(function (r) { return r.slug === state.slug; }) || null;
      if (!row) live = D.live.find(function (r) { return r.slug === state.slug; }) || null;
    }
    if (!row && !live) { hint.hidden = false; body.hidden = true; return; }
    hint.hidden = true; body.hidden = false;
    if (live) {
      $('d-kicker').textContent = 'Live token · already trading';
      $('d-name').textContent = live.name;
      $('d-meta').textContent = (live.category || 'Uncategorised') + ' · ' + live.chains.join(', ');
      var ratio = live.tvl_usd ? ((live.mcap_usd || 0) / live.tvl_usd).toFixed(2) : '–';
      $('d-model').innerHTML =
        '<dt>Market cap</dt><dd><strong>' + money(live.mcap_usd) + '</strong></dd>' +
        '<dt>TVL</dt><dd>' + money(live.tvl_usd) + '</dd>' +
        '<dt>7-day TVL change</dt><dd>' + (live.change_7d == null ? '–' : live.change_7d.toFixed(1) + '%') + '</dd>' +
        '<dt class="total">Mcap / TVL</dt><dd class="total">×' + ratio + '</dd>';
      $('d-steps').innerHTML = '<li>This protocol already trades, so there is no launch left to farm. It is shown here only as a yardstick: its market-cap-to-TVL ratio is one of the numbers the board’s category multiples are taken from.</li>';
      $('d-note').textContent = 'Live rows are never ranked on the board. Values from the snapshot as of ' + D.as_of + '.';
      return;
    }
    $('d-kicker').textContent = 'Rank #' + row.rank + (watch.has(row.slug) ? ' · Watchlist' : ' · Below the watchlist floor');
    $('d-name').textContent = row.name;
    $('d-meta').textContent = (row.category || 'Uncategorised') + ' · ' + row.chains.join(', ') +
      ' · listed ' + (row.listed_at || 'unknown date') + (row.age_days != null ? ' (' + row.age_days + ' days)' : '');
    $('d-model').innerHTML =
      '<dt>TVL</dt><dd>' + money(row.tvl_usd) + '</dd>' +
      '<dt>× Category multiple</dt><dd>' + mult(row.category_multiple) + '</dd>' +
      '<dt>× Growth multiplier</dt><dd>' + mult(row.growth_multiplier) + '</dd>' +
      '<dt>× Chain multiplier</dt><dd>' + mult(chainMult(row)) + '</dd>' +
      '<dt>× Maturity multiplier</dt><dd>' + mult(row.maturity_multiplier) + '</dd>' +
      (row.trading_correction && row.trading_correction !== 1
        ? '<dt>× Already-trading correction</dt><dd>' + mult(row.trading_correction) + '</dd>'
        : '') +
      '<dt class="total">Implied value</dt><dd class="total">' + money(row.implied_value_usd) + '</dd>';
    $('d-steps').innerHTML = row.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    $('d-note').textContent = 'Implied value is this entry’s claim from the snapshot as of ' + D.as_of +
      '. It is not a prediction that a token will launch, or when. Claim a launch only from the protocol’s own published link, and never pay a fee to claim.';
  }

  // ---- wiring ----
  function init() {
    var cats = [];
    D.rows.forEach(function (r) { if (r.category && cats.indexOf(r.category) < 0) cats.push(r.category); });
    cats.sort().forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      $('cat').appendChild(o);
    });
    $('stat-ranked').textContent = D.rows.length;
    $('stat-watch').textContent = D.watchlist_size;
    $('stat-date').textContent = D.as_of;
    $('stat-top').textContent = money(D.rows.length ? D.rows[0].implied_value_usd : null);
    $('foot-src').textContent = 'Source: DefiLlama protocol snapshot, fetched ' + D.as_of +
      ' (758 protocols at or above $5M TVL; watchlist floor $50M). Model ' + D.model_version +
      ' · ' + D.early_size + ' of the ' + D.rows.length + ' ranked rows sit below the watchlist floor — the early finds this radar exists for.';
    readHash();
    render();
    $('tab-board').addEventListener('click', function () { state.view = 'board'; state.slug = ''; writeHash(); render(); });
    $('tab-live').addEventListener('click', function () { state.view = 'live'; state.slug = ''; writeHash(); render(); });
    $('q').addEventListener('input', function (e) { state.q = e.target.value; writeHash(); render(); });
    $('cat').addEventListener('change', function (e) { state.cat = e.target.value; writeHash(); render(); });
    $('sort').addEventListener('change', function (e) { state.sort = e.target.value; writeHash(); render(); });
    $('watch').addEventListener('change', function (e) { state.watch = e.target.checked; writeHash(); render(); });
    rowsEl.addEventListener('click', function (e) {
      var tr = e.target.closest('tr');
      if (!tr) return;
      state.slug = state.slug === tr.getAttribute('data-slug') ? '' : tr.getAttribute('data-slug');
      writeHash(); render();
    });
    window.addEventListener('hashchange', function () { readHash(); render(); });
  }
  init();
})();
