/* ---------- shared helpers and brand palette (no data reads here) ---------- */
window.MT = (() => {
  const fmt = { n: d3.format(','), p: d3.format('.0%'), p1: d3.format('.1%'), sp: d3.format('+.1%'), sn: d3.format('+,') };
  const BRAND = { red: '#CE0F0F', ink: '#1C1C1C', mid: '#6E6E6E', light: '#BDBDBD' };
  // Groups get their own lettered palette, kept apart from the ballot-method and age colors
  const GROUP = ['#12807E', '#6A4C93', '#6B8E23', '#8C5A2B', '#A23B72'];
  const GL = ['A', 'B', 'C', 'D', 'E'];
  const GN = ['Early Voting leaning', 'Election Day leaning', 'Election Day leaning, low turnout', 'Absentee-heavy', 'Absentee-dominant'];
  // Channels share the group hues: Election Day gray, Absentee red, Early Voting blue
  const CHAN = ['#7D838C', '#B83232', '#2B6CB0'];
  const CHAN_N = ['Election Day', 'Absentee', 'Early Voting'];
  // Continuous scales: blue (low) to red (high)
  const div = (t) => d3.interpolateRdBu(1 - Math.max(0, Math.min(1, t)));
  const gc = (c) => GROUP[c % GROUP.length];
  const glabel = (c) => GL[c] + ' · ' + GN[c];
  const ok = (...ids) => ids.every((id) => dash.data(id).status === 'ok');
  const rows = (id) => dash.data(id).data || [];
  const tipOf = (el) => { let t = el.querySelector('.tip'); if (!t) { t = document.createElement('div'); t.className = 'tip'; t.hidden = true; el.appendChild(t); } return t; };
  const showTip = (el, tip, ev, title, lines) => {
    tip.replaceChildren();
    const h = document.createElement('div'); h.className = 't'; h.textContent = title; tip.appendChild(h);
    lines.forEach(([color, name, val]) => {
      const r = document.createElement('div');
      if (color) { const s = document.createElement('span'); s.className = 'sw'; s.style.background = color; r.appendChild(s); }
      r.appendChild(document.createTextNode(name + (val !== undefined ? ': ' + val : '')));
      tip.appendChild(r);
    });
    tip.hidden = false;
    const b = el.getBoundingClientRect(); const x = ev.clientX - b.left, y = ev.clientY - b.top;
    const w = tip.offsetWidth, h2 = tip.offsetHeight;
    tip.style.left = Math.max(0, Math.min(b.width - w, x + 12)) + 'px';
    tip.style.top = Math.max(0, (y - h2 - 10 < 0 ? y + 14 : y - h2 - 10)) + 'px';
  };
  const hideTip = (tip) => { tip.hidden = true; };
  const svgIn = (el, h) => {
    el.querySelectorAll('svg').forEach((s) => s.remove());
    const w = Math.max(280, el.clientWidth);
    const svg = d3.select(el).insert('svg', ':first-child').attr('width', '100%').attr('viewBox', `0 0 ${w} ${h}`).attr('height', h);
    return { svg, w, h };
  };
  const cleanAxis = (g) => g.attr('font-size', null).attr('font-family', null);
  const textW = (svg, s) => { const t = svg.append('text').attr('class', 'lbl').text(s); const n = t.node().getComputedTextLength(); t.remove(); return n; };
  const legend = (el, items) => {
    el.replaceChildren(...items.map(([c, n]) => { const s = document.createElement('span'); const i = document.createElement('i'); i.style.background = c; s.append(i, document.createTextNode(n)); return s; }));
  };
  const empty = (el) => { el.querySelectorAll('svg,.tip').forEach((n) => n.remove()); };
  let gid = 0;
  const gradId = () => 'mtg' + (++gid);
  return { fmt, BRAND, GROUP, GL, glabel, GN, CHAN, CHAN_N, div, gc, ok, rows, tipOf, showTip, hideTip, svgIn, cleanAxis, textW, legend, empty, gradId };
})();

/* ---------- calcs ---------- */
dash.calc('headline', {
  inputs: ['precincts', 'precinct_elections', 'township_2028'],
  title: 'Headline figures',
  description: 'Counts of precincts, groups and elections; Nov 2026 township totals; base 2028 projection.',
  fn: (precincts, precinct_elections, township_2028) => {
    const n26 = precinct_elections.filter((r) => r.election_date === '2026-11-03');
    const ballots = n26.reduce((a, r) => a + r.total_votes, 0);
    const reg = n26.reduce((a, r) => a + r.registered_voters, 0);
    return [{
      n_precincts: precincts.length,
      n_groups: new Set(precincts.map((r) => r.cluster)).size,
      n_elections: new Set(precinct_elections.map((r) => r.election_date)).size,
      stable_precincts: precincts.filter((r) => r.elections_in_group === 4).length,
      ballots_nov2026: ballots,
      turnout_nov2026: ballots / reg,
      ballots_2028_base: township_2028.find((r) => r.scenario === 'base').total_2028,
    }];
  },
});
dash.calc('election_totals', {
  inputs: ['precinct_elections'],
  title: 'Township totals by election',
  description: 'Ballots, registration, turnout and ballot-method shares summed over all precincts, for each election.',
  fn: (precinct_elections) => {
    const m = new Map();
    precinct_elections.forEach((r) => {
      const a = m.get(r.election_date) || { election_date: r.election_date, election: r.election, ed: 0, av: 0, ev: 0, tot: 0, reg: 0 };
      a.ed += r.election_day_votes; a.av += r.absentee_votes; a.ev += r.early_votes; a.tot += r.total_votes; a.reg += r.registered_voters; m.set(r.election_date, a);
    });
    return [...m.values()].map((a) => ({ election_date: a.election_date, election: a.election, ballots: a.tot, registered: a.reg, turnout: a.tot / a.reg, pct_election_day: a.ed / a.tot, pct_absentee: a.av / a.tot, pct_early: a.ev / a.tot }));
  },
});
dash.calc('group_election_mix', {
  inputs: ['precinct_elections'],
  title: 'Channel mix by group and election',
  description: 'Ballots by method summed over each group\'s precincts, as shares, for each election.',
  fn: (precinct_elections) => {
    const m = new Map();
    precinct_elections.forEach((r) => {
      const k = r.election_date + '|' + r.cluster;
      const a = m.get(k) || { election_date: r.election_date, election: r.election, cluster: r.cluster, ed: 0, av: 0, ev: 0, tot: 0 };
      a.ed += r.election_day_votes; a.av += r.absentee_votes; a.ev += r.early_votes; a.tot += r.total_votes; m.set(k, a);
    });
    return [...m.values()].map((a) => ({ election_date: a.election_date, election: a.election, cluster: a.cluster, pct_election_day: a.ed / a.tot, pct_absentee: a.av / a.tot, pct_early: a.ev / a.tot, ballots: a.tot }));
  },
});

/* ---------- tabs, filters (no data reads) ---------- */
(() => {
  const show = (name) => {
    document.querySelectorAll('.mt [data-page]').forEach((s) => { s.hidden = s.dataset.page !== name; });
    document.querySelectorAll('.mt .tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
    dash.setLink(name);
  };
  window.MT.show = show;
  document.querySelectorAll('.mt .tab').forEach((b) => b.addEventListener('click', () => show(b.dataset.tab)));
  const named = location.hash.slice(1);
  if (['overview', 'phase1', 'phase2', 'phase3', 'method'].includes(named)) show(named);
  document.querySelectorAll('.mt-metric').forEach((s) => s.addEventListener('change', () => dash.setParams({ metric: s.value })));
  document.querySelectorAll('.mt-elect').forEach((s) => s.addEventListener('change', () => dash.setParams({ election: s.value })));
  document.querySelectorAll('.mt-scn').forEach((s) => s.addEventListener('change', () => dash.setParams({ scenario: s.value })));
  document.querySelectorAll('.mt-p1kind').forEach((s) => s.addEventListener('change', () => dash.setParams({ p1kind: s.value })));
  dash.onData(() => {
    const p = dash.params();
    document.querySelectorAll('.mt-metric').forEach((s) => { s.value = p.metric || 'group'; });
    document.querySelectorAll('.mt-elect').forEach((s) => { s.value = p.election || '2026-11-03'; });
    document.querySelectorAll('.mt-scn').forEach((s) => { s.value = p.scenario || 'base'; });
    document.querySelectorAll('.mt-p1kind').forEach((s) => { s.value = p.p1kind || 'General'; });
    document.querySelectorAll('.mt-hint').forEach((h) => { h.hidden = !!p.precinct; });
    document.querySelectorAll('.mt-detail-table').forEach((h) => { h.hidden = !p.precinct; });
  });
})();

/* ---------- headline numbers ---------- */
(() => {
  const { fmt, ok, rows } = window.MT;
  const one = (name, field, f) => dash.draw(name, (el) => {
    if (!ok('headline')) { el.textContent = '—'; return; }
    el.textContent = f(rows('headline')[0][field]);
  });
  one('h_np', 'n_precincts', String); one('h_ng', 'n_groups', String); one('h_st', 'stable_precincts', String);
  const el1 = (name, field, f) => dash.draw(name, (el) => {
    const e = dash.params().election || '2026-11-03';
    el.dataset.where = 'election_date=' + e;
    if (!ok('election_totals')) { el.textContent = '—'; return; }
    const r = rows('election_totals').find((x) => x.election_date === e);
    el.textContent = r ? f(r[field]) : '—';
  });
  el1('e_bal', 'ballots', fmt.n); el1('e_turn', 'turnout', fmt.p1); el1('e_ed', 'pct_election_day', fmt.p1); el1('e_av', 'pct_absentee', fmt.p1); el1('e_ev', 'pct_early', fmt.p1); el1('e_name', 'election', String);
  const sc = (name, field, f) => dash.draw(name, (el) => {
    const s = dash.params().scenario || 'base';
    el.dataset.where = 'scenario=' + s;
    if (!ok('township_2028')) { el.textContent = '—'; return; }
    const r = rows('township_2028').find((x) => x.scenario === s);
    el.textContent = r ? f(r[field]) : '—';
  });
  sc('s_tot', 'total_2028', fmt.n); sc('s_pct', 'pct_change_vs_2024', fmt.sp); sc('s_ed', 'election_day_2028', fmt.n); sc('s_ed24', 'election_day_2024', fmt.n);
  sc('s_av', 'absentee_2028', fmt.n); sc('s_av24', 'absentee_2024', fmt.n); sc('s_ev', 'early_2028', fmt.n); sc('s_ev24', 'early_2024', fmt.n);
})();

/* ---------- legends ---------- */
(() => {
  const M = window.MT;
  dash.draw('mix_legend', (el) => M.legend(el, M.CHAN.map((c, i) => [c, M.CHAN_N[i]])));
  dash.draw('group_legend', (el) => M.legend(el, M.GN.map((n, i) => [M.gc(i), M.glabel(i)])));
  dash.draw('age_legend', (el) => M.legend(el, ['18–21', '22–30', '31–40', '41–50', '51–59', '60+'].map((a, i) => [M.div(0.05 + 0.9 * i / 5), a])));
  dash.draw('p1_turnout_legend', (el) => M.legend(el, [[M.BRAND.red, 'General'], [M.BRAND.mid, 'Primary']]));
  dash.draw('yr_legend', (el) => M.legend(el, [[M.BRAND.light, 'Nov 2026 midterm'], [M.BRAND.red, 'Nov 2024 presidential']]));
  dash.draw('yr2_legend', (el) => M.legend(el, [[M.BRAND.light, 'Nov 2026 actual'], [M.BRAND.red, 'Nov 2028 scenario']]));
})();
