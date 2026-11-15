
/* ---------- map + precinct detail ---------- */
(() => {
  const M = window.MT;
  const LBL = { group: 'Group', turnout_rate: 'Turnout', pct_absentee: 'Absentee share', pct_early: 'Early Voting share', pct_election_day: 'Election Day share' };
  dash.draw('map', (el) => {
    if (!M.ok('precinct_boundaries', 'precincts', 'precinct_elections')) { M.empty(el); return; }
    const geo = dash.data('precinct_boundaries').data;
    const feats = geo.features.map((f) => (d3.geoArea(f) > 2 * Math.PI ? { ...f, geometry: { ...f.geometry, coordinates: f.geometry.coordinates.map((r) => r.slice().reverse()) } } : f));
    const p = dash.params(); const metric = p.metric || 'group'; const elec = p.election || '2026-11-03';
    const pr = new Map(M.rows('precincts').map((r) => [r.precinct, r]));
    const pe = new Map(M.rows('precinct_elections').filter((r) => r.election_date === elec).map((r) => [r.precinct, r]));
    const legendH = 34;
    const w0 = Math.max(280, el.clientWidth);
    const h = Math.min(560, Math.max(380, w0 * 0.9));
    const { svg, w } = M.svgIn(el, h);
    const proj = d3.geoMercator().fitSize([w, h - legendH], { type: 'FeatureCollection', features: feats });
    const path = d3.geoPath(proj);
    let color, legendItems, contExt;
    if (metric === 'group') {
      color = (pc) => M.gc(pr.get(pc).cluster);
      legendItems = M.GN.map((n, i) => [M.gc(i), M.glabel(i)]);
    } else {
      const vals = [...pe.values()].map((r) => r[metric]);
      const ext = d3.extent(vals);
      const s = d3.scaleLinear(ext, [0, 1]);
      color = (pc) => M.div(s(pe.get(pc)[metric]));
      legendItems = null; contExt = ext;
    }
    const g = svg.append('g').attr('transform', `translate(0,${legendH})`);
    const tip = M.tipOf(el);
    g.selectAll('path').data(feats).join('path')
      .attr('d', path).attr('fill', (f) => color(f.properties.PCT_NO))
      .attr('stroke', p.precinct ? '#ffffff' : '#ffffff').attr('stroke-width', (f) => (f.properties.PCT_NO === p.precinct ? 3 : 1))
      .attr('opacity', (f) => (p.precinct && f.properties.PCT_NO !== p.precinct ? 0.55 : 1))
      .style('cursor', 'pointer')
      .on('mousemove', (ev, f) => {
        const pc = f.properties.PCT_NO; const a = pr.get(pc); const b = pe.get(pc);
        M.showTip(el, tip, ev, 'Precinct ' + pc + ' · ' + a.poll_location, [
          [M.gc(a.cluster), 'Group ' + M.glabel(a.cluster)],
          [null, 'Turnout (' + b.election + ')', M.fmt.p1(b.turnout_rate)],
          [null, 'Election Day / Absentee / Early Voting', [b.pct_election_day, b.pct_absentee, b.pct_early].map(M.fmt.p).join(' / ')],
        ]);
      })
      .on('mouseleave', () => M.hideTip(tip))
      .on('click', (ev, f) => dash.setParams({ precinct: f.properties.PCT_NO === p.precinct ? null : f.properties.PCT_NO }));
    g.selectAll('text.pl').data(feats).join('text').attr('class', 'lbl pl')
      .attr('x', (f) => path.centroid(f)[0]).attr('y', (f) => path.centroid(f)[1]).attr('text-anchor', 'middle').attr('dy', '0.35em')
      .style('pointer-events', 'none').style('fill', '#1C1C1C').style('font-weight', '700').style('stroke', '#ffffff').style('stroke-width', '3px').style('paint-order', 'stroke').text((f) => f.properties.PCT_NO);
    const lg = svg.append('g');
    let x = 0, y = 12;
    lg.append('text').attr('class', 'lbl').attr('x', 0).attr('y', y).attr('dy', '0.35em').text(LBL[metric] + (metric === 'group' ? '' : ' · ' + [...pe.values()][0].election) + ':');
    x = M.textW(svg, LBL[metric] + (metric === 'group' ? '' : ' · ' + [...pe.values()][0].election) + ':') + 10;
    if (legendItems) {
      legendItems.forEach(([c, n]) => {
        const tw = M.textW(svg, n) + 22;
        if (x + tw > w) { x = 0; y += 18; }
        lg.append('rect').attr('x', x).attr('y', y - 5).attr('width', 10).attr('height', 10).attr('fill', c);
        lg.append('text').attr('class', 'lbl').attr('x', x + 14).attr('y', y).attr('dy', '0.35em').text(n);
        x += tw;
      });
    } else {
      const id = M.gradId();
      const gr = svg.append('defs').append('linearGradient').attr('id', id);
      d3.range(0, 1.01, 0.1).forEach((t) => gr.append('stop').attr('offset', t).attr('stop-color', M.div(t)));
      const lo = M.fmt.p(contExt[0]) + ' (low)', hi = M.fmt.p(contExt[1]) + ' (high)';
      const lw = M.textW(svg, lo) + 6, bw = Math.min(180, Math.max(80, w - x - lw - M.textW(svg, hi) - 12));
      if (x + lw + bw + 60 > w) { x = 0; y += 18; }
      lg.append('text').attr('class', 'lbl').attr('x', x).attr('y', y).attr('dy', '0.35em').text(lo);
      lg.append('rect').attr('x', x + lw).attr('y', y - 5).attr('width', bw).attr('height', 10).attr('fill', `url(#${id})`);
      lg.append('text').attr('class', 'lbl').attr('x', x + lw + bw + 6).attr('y', y).attr('dy', '0.35em').text(hi);
    }
  });

  dash.draw('detail', (el) => {
    const pc = dash.params().precinct;
    if (!pc || !M.ok('precincts')) { el.textContent = pc ? '—' : ''; return; }
    const a = M.rows('precincts').find((r) => r.precinct === pc);
    if (!a) { el.textContent = '—'; return; }
    el.replaceChildren();
    const h = document.createElement('div'); h.className = 'gcard'; h.style.borderTopColor = M.gc(a.cluster);
    const t = document.createElement('p'); t.className = 'detail-name'; t.textContent = 'Precinct ' + a.precinct;
    const s = document.createElement('p'); s.className = 'note'; s.textContent = a.poll_location + ' · Group ' + M.glabel(a.cluster) + ' · ' + a.stability;
    const kv = document.createElement('div'); kv.className = 'kv';
    [['Avg. turnout', M.fmt.p1(a.avg_turnout_rate)], ['Avg. Election Day share', M.fmt.p1(a.avg_pct_election_day)], ['Avg. Absentee share', M.fmt.p1(a.avg_pct_absentee)], ['Avg. Early Voting share', M.fmt.p1(a.avg_pct_early)], ['Voters 60+ (avg.)', M.fmt.p1(a.avg_voters_60plus_share)], ['Avg. registered voters', M.fmt.n(Math.round(a.avg_registered))]]
      .forEach(([k, v]) => { const x = document.createElement('span'); x.textContent = k; const y = document.createElement('span'); y.textContent = v; kv.append(x, y); });
    h.append(t, s, kv); el.appendChild(h);
  });

  dash.draw('detail_rows', (tb) => {
    const pc = dash.params().precinct;
    tb.replaceChildren();
    if (!pc || !M.ok('precinct_elections')) return;
    M.rows('precinct_elections').filter((r) => r.precinct === pc).sort((a, b) => d3.ascending(a.election_date, b.election_date)).forEach((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.election_date + ',' + r.precinct;
      [[r.election], [M.fmt.n(r.total_votes), 1], [M.fmt.p1(r.turnout_rate), 1], [M.fmt.p1(r.pct_election_day), 1], [M.fmt.p1(r.pct_absentee), 1], [M.fmt.p1(r.pct_early), 1]]
        .forEach(([v, num]) => { const td = document.createElement('td'); if (num) td.className = 'num'; td.textContent = v; tr.appendChild(td); });
      tb.appendChild(tr);
    });
  });

  dash.draw('group_cards', (el) => {
    if (!M.ok('groups', 'group_age')) { el.textContent = '—'; return; }
    el.replaceChildren();
    const age = M.rows('group_age').filter((r) => r.age_group === '60+' && r.election_date === '2026-11-03');
    M.rows('groups').slice().sort((a, b) => a.cluster - b.cluster).forEach((g) => {
      const c = document.createElement('div'); c.className = 'card';
      const in1 = document.createElement('div'); in1.className = 'gcard'; in1.style.borderTopColor = M.gc(g.cluster);
      const nm = document.createElement('p'); nm.className = 'gname'; nm.textContent = 'Group ' + M.glabel(g.cluster);
      const pcs = document.createElement('p'); pcs.className = 'gpcts'; pcs.textContent = (g.n_precincts === 1 ? 'Precinct ' : 'Precincts ') + g.precincts;
      const mix = document.createElement('div'); mix.className = 'mix';
      [g.avg_pct_election_day, g.avg_pct_absentee, g.avg_pct_early].forEach((v, i) => { const s = document.createElement('span'); s.style.width = (v * 100) + '%'; s.style.background = M.CHAN[i]; mix.appendChild(s); });
      const kv = document.createElement('div'); kv.className = 'kv';
      const a = age.filter((r) => r.cluster === g.cluster);
      const v60 = a.length ? a[0].voter_share : null;
      [['Election Day / Absentee / Early Voting', [g.avg_pct_election_day, g.avg_pct_absentee, g.avg_pct_early].map(M.fmt.p).join(' / ')], ['Avg. turnout', M.fmt.p(g.avg_turnout_rate)], ['Voters aged 60+, Nov 2026', v60 == null ? '—' : M.fmt.p(v60)], ['Registered voters, Nov 2026', M.fmt.n(g.registered_nov2026)]]
        .forEach(([k, v]) => { const x = document.createElement('span'); x.textContent = k; const y = document.createElement('span'); y.textContent = v; kv.append(x, y); });
      in1.append(nm, pcs, mix, kv); c.appendChild(in1); el.appendChild(c);
    });
  });
})();


/* ---------- Phase 1 ---------- */
(() => {
  const M = window.MT;
  dash.draw('p1_turnout', (el) => {
    if (!M.ok('history')) { M.empty(el); return; }
    const H = M.rows('history').filter((r) => r.include_in_trend && r.turnout_pct != null && (r.election_kind === 'General' || r.election_kind === 'Primary')).map((r) => ({ ...r, d: new Date(r.election_date) }));
    const { svg, w, h } = M.svgIn(el, 280);
    const m = { t: 10, r: 12, b: 26, l: 40 };
    const x = d3.scaleUtc(d3.extent(H, (r) => r.d), [m.l, w - m.r]);
    const y = d3.scaleLinear([0, 0.9], [h - m.b, m.t]);
    svg.append('g').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(Math.max(3, Math.floor(w / 90))).tickSizeOuter(0)).call(M.cleanAxis);
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(M.fmt.p).tickSize(-(w - m.l - m.r))).call(M.cleanAxis).call((g) => g.select('.domain').remove());
    const tip = M.tipOf(el);
    [['General', M.BRAND.red], ['Primary', M.BRAND.mid]].forEach(([k, c]) => {
      const S = H.filter((r) => r.election_kind === k);
      svg.append('path').datum(S).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 2).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round')
        .attr('d', d3.line((r) => x(r.d), (r) => y(r.turnout_pct)));
      svg.append('g').selectAll('circle').data(S).join('circle').attr('cx', (r) => x(r.d)).attr('cy', (r) => y(r.turnout_pct)).attr('r', 4)
        .attr('fill', (r) => (r.presidential_year && k === 'General' ? '#ffffff' : c)).attr('stroke', c).attr('stroke-width', 2)
        .on('mousemove', (ev, r) => M.showTip(el, tip, ev, d3.utcFormat('%b %-d, %Y')(r.d) + ' ' + r.election_kind, [[c, 'Turnout', M.fmt.p1(r.turnout_pct)], [null, 'Ballots', M.fmt.n(r.total_votes)], [null, 'Registered', M.fmt.n(r.registered_voters)]]))
        .on('mouseleave', () => M.hideTip(tip));
    });
  });

  dash.draw('p1_mix', (el) => {
    if (!M.ok('history')) { M.empty(el); return; }
    const kind = dash.params().p1kind || 'General';
    const H = M.rows('history').filter((r) => r.include_in_trend && r.election_kind === kind && r.pct_election_day != null);
    const { svg, w, h } = M.svgIn(el, 280);
    const m = { t: 10, r: 8, b: 26, l: 40 };
    const x = d3.scaleBand(H.map((r) => r.election_date), [m.l, w - m.r]).padding(0.25);
    const y = d3.scaleLinear([0, 1], [h - m.b, m.t]);
    const lab = (d) => (kind === 'General' ? d.slice(0, 4) : d3.utcFormat("%b '%y")(new Date(d)));
    const step = Math.max(1, Math.ceil(H.length * (kind === 'General' ? 34 : 46) / Math.max(1, w - m.l - m.r)));
    svg.append('g').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickValues(x.domain().filter((d, i) => i % step === 0)).tickFormat(lab).tickSizeOuter(0)).call(M.cleanAxis);
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(M.fmt.p)).call(M.cleanAxis).call((g) => g.select('.domain').remove());
    const keys = ['pct_election_day', 'pct_absentee', 'pct_early'];
    const names = ['Election Day', 'Absentee', 'Early Voting'];
    const st = d3.stack().keys(keys).value((r, k) => r[k] || 0)(H);
    const tip = M.tipOf(el);
    st.forEach((s, i) => svg.append('g').attr('fill', M.CHAN[i]).selectAll('rect').data(s).join('rect')
      .attr('x', (d) => x(d.data.election_date) + Math.max(0, (x.bandwidth() - 32) / 2)).attr('width', Math.min(32, x.bandwidth()))
      .attr('y', (d) => y(d[1])).attr('height', (d) => Math.max(0, y(d[0]) - y(d[1])))
      .attr('opacity', (d) => (d.data.mix_partial ? 0.45 : 1))
      .on('mousemove', (ev, d) => M.showTip(el, tip, ev, d3.utcFormat('%b %-d, %Y')(new Date(d.data.election_date)) + ' ' + kind, keys.map((k, j) => [M.CHAN[j], names[j], M.fmt.p1(d.data[k] || 0)]).concat(d.data.mix_partial ? [[null, 'Based on 19 of 37 precincts']] : [])))
      .on('mouseleave', () => M.hideTip(tip)));
  });

  dash.draw('p1_maps', (tb) => {
    tb.replaceChildren();
    if (!M.ok('precinct_maps')) return;
    M.rows('precinct_maps').forEach((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.period;
      const a = document.createElement('td'); a.textContent = r.period; const b = document.createElement('td'); b.className = 'num'; b.textContent = r.precincts;
      tr.append(a, b); tb.appendChild(tr);
    });
  });
  dash.draw('p1_gaps', (tb) => {
    tb.replaceChildren();
    if (!M.ok('history')) return;
    M.rows('history').filter((r) => r.quality_note && r.election_kind !== 'Special').forEach((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.election_date;
      [r.election_date, r.election_kind, r.quality_note].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
      tb.appendChild(tr);
    });
  });
})();


/* ---------- Phase 2 ---------- */
(() => {
  const M = window.MT;
  dash.draw('p2_scatter', (el) => {
    if (!M.ok('precincts')) { M.empty(el); return; }
    const P = M.rows('precincts');
    const { svg, w, h } = M.svgIn(el, 300);
    const m = { t: 14, r: 14, b: 34, l: 18 };
    const ex = d3.extent(P, (r) => -r.pc1), ey = d3.extent(P, (r) => r.pc2);
    const x = d3.scaleLinear([ex[0] - 0.4, ex[1] + 0.4], [m.l, w - m.r]);
    const y = d3.scaleLinear([ey[0] - 0.4, ey[1] + 0.4], [h - m.b, m.t]);
    svg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', m.t).attr('y2', h - m.b).attr('stroke', '#D6D6D6');
    svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', '#D6D6D6');
    svg.append('text').attr('class', 'lbl').attr('x', m.l).attr('y', h - 8).text('← more Election Day, lower turnout');
    svg.append('text').attr('class', 'lbl').attr('x', w - m.r).attr('y', h - 8).attr('text-anchor', 'end').text('more Absentee, higher turnout →');
    svg.append('text').attr('class', 'lbl').attr('x', m.l + 2).attr('y', m.t + 4).text('↑ more Early Voting');
    const tip = M.tipOf(el);
    const sel = dash.params().precinct;
    const g = svg.append('g').selectAll('g').data(P).join('g').attr('transform', (r) => `translate(${x(-r.pc1)},${y(r.pc2)})`).style('cursor', 'pointer')
      .on('mousemove', (ev, r) => M.showTip(el, tip, ev, 'Precinct ' + r.precinct + ' · ' + r.poll_location, [[M.gc(r.cluster), 'Group ' + M.glabel(r.cluster)], [null, 'Election Day / Absentee / Early Voting', [r.avg_pct_election_day, r.avg_pct_absentee, r.avg_pct_early].map(M.fmt.p).join(' / ')], [null, 'Avg. turnout', M.fmt.p1(r.avg_turnout_rate)]]))
      .on('mouseleave', () => M.hideTip(tip))
      .on('click', (ev, r) => { dash.setParams({ precinct: r.precinct }); });
    g.append('circle').attr('r', (r) => (r.precinct === sel ? 13 : 11)).attr('fill', (r) => M.gc(r.cluster)).attr('stroke', '#ffffff').attr('stroke-width', 1.5);
    g.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').style('font-size', 'var(--cds-font-size-caption)').style('fill', '#ffffff').style('font-weight', '600').style('pointer-events', 'none').text((r) => r.precinct);
  });

  const chip = (svg, x, y, c, hgt) => {
    svg.append('rect').attr('x', x).attr('y', y).attr('width', 18).attr('height', hgt).attr('fill', M.gc(c));
    svg.append('text').attr('x', x + 9).attr('y', y + hgt / 2).attr('dy', '0.35em').attr('text-anchor', 'middle').style('font-size', '11px').style('font-weight', '700').style('fill', '#ffffff').style('pointer-events', 'none').text(M.GL[c]);
  };
  dash.draw('p2_mix', (el) => {
    if (!M.ok('group_election_mix')) { M.empty(el); return; }
    const R = M.rows('group_election_mix').slice().sort((a, b) => d3.ascending(a.election_date, b.election_date) || a.cluster - b.cluster);
    const elections = [...new Set(R.map((r) => r.election))];
    const rowH = 18, gap = 4, blockGap = 24;
    const ng = new Set(R.map((r) => r.cluster)).size;
    const h = elections.length * (ng * (rowH + gap) + blockGap) + 10;
    const { svg, w } = M.svgIn(el, h);
    const wide = w > 620;
    const labW = wide ? 196 : 24;
    const x = d3.scaleLinear([0, 1], [labW, w - 4]);
    const tip = M.tipOf(el);
    const keys = ['pct_election_day', 'pct_absentee', 'pct_early'], names = ['Election Day', 'Absentee', 'Early Voting'];
    let yy = 0;
    elections.forEach((e) => {
      svg.append('text').attr('class', 'lbl').attr('x', 0).attr('y', yy + 10).style('font-weight', '700').style('fill', 'var(--color-fg)').text(e);
      yy += 16;
      R.filter((r) => r.election === e).forEach((r) => {
        let x0 = 0;
        chip(svg, 0, yy, r.cluster, rowH);
        if (wide) svg.append('text').attr('class', 'lbl').attr('x', 24).attr('y', yy + rowH / 2).attr('dy', '0.35em').text(M.GN[r.cluster]);
        keys.forEach((k, i) => {
          svg.append('rect').attr('x', x(x0)).attr('y', yy).attr('width', Math.max(0, x(x0 + r[k]) - x(x0) - 1)).attr('height', rowH).attr('fill', M.CHAN[i])
            .on('mousemove', (ev) => M.showTip(el, tip, ev, e + ' · Group ' + M.glabel(r.cluster), keys.map((kk, j) => [M.CHAN[j], names[j], M.fmt.p1(r[kk])]).concat([[null, 'Ballots', M.fmt.n(r.ballots)]])))
            .on('mouseleave', () => M.hideTip(tip));
          if (r[k] > 0.09) svg.append('text').attr('x', x(x0) + 4).attr('y', yy + rowH / 2).attr('dy', '0.35em').style('font-size', '11px').style('fill', '#ffffff').style('pointer-events', 'none').text(M.fmt.p(r[k]));
          x0 += r[k];
        });
        yy += rowH + gap;
      });
      yy += blockGap - gap;
    });
  });

  dash.draw('p2_age', (el) => {
    if (!M.ok('group_age')) { M.empty(el); return; }
    const R = M.rows('group_age');
    const elections = [...new Set(R.slice().sort((a, b) => d3.ascending(a.election_date, b.election_date)).map((r) => r.election))];
    const ages = ['18–21', '22–30', '31–40', '41–50', '51–59', '60+'];
    const ramp = (t) => M.div(0.05 + 0.9 * t);
    const W = Math.max(280, el.clientWidth);
    const cols = W > 900 ? 4 : W > 520 ? 2 : 1;
    const cw = (W - (cols - 1) * 16) / cols;
    const groups = [...new Set(R.map((r) => r.cluster))].sort();
    const rowH = 18, gap = 5, blockH = 20 + groups.length * (rowH + gap);
    const h = Math.ceil(elections.length / cols) * (blockH + 14);
    const { svg } = M.svgIn(el, h);
    const tip = M.tipOf(el);
    elections.forEach((e, i) => {
      const ox = (i % cols) * (cw + 16), oy = Math.floor(i / cols) * (blockH + 14);
      const g = svg.append('g').attr('transform', `translate(${ox},${oy})`);
      g.append('text').attr('class', 'lbl').attr('y', 11).style('font-weight', '700').style('fill', 'var(--color-fg)').text(e);
      const x = d3.scaleLinear([0, 1], [22, cw - 4]);
      groups.forEach((c, j) => {
        const yy = 18 + j * (rowH + gap);
        chip(g, 0, yy, c, rowH);
        let x0 = 0;
        const rows = ages.map((a) => R.find((r) => r.election === e && r.cluster === c && r.age_group === a));
        rows.forEach((r, k) => {
          if (!r) return;
          g.append('rect').attr('x', x(x0)).attr('y', yy).attr('width', Math.max(0, x(x0 + r.voter_share) - x(x0) - 1)).attr('height', rowH).attr('fill', ramp(k / 5))
            .on('mousemove', (ev) => M.showTip(el, tip, ev, e + ' · Group ' + M.glabel(c), rows.map((rr, kk) => [ramp(kk / 5), ages[kk], M.fmt.p1(rr.voter_share)])))
            .on('mouseleave', () => M.hideTip(tip));
          if (k === 5 && r.voter_share > 0.12) g.append('text').attr('x', x(x0) + 4).attr('y', yy + rowH / 2).attr('dy', '0.35em').style('font-size', 'var(--cds-font-size-caption)').style('fill', '#ffffff').style('pointer-events', 'none').text('60+ ' + M.fmt.p(r.voter_share));
          x0 += r.voter_share;
        });
      });
    });
  });

  let sortKey = 'precinct', sortDir = 1;
  document.querySelectorAll('.mt-p2t th button').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.sort; if (sortKey === k) sortDir = -sortDir; else { sortKey = k; sortDir = 1; }
    document.querySelectorAll('.mt-p2t th').forEach((th) => th.removeAttribute('aria-sort'));
    b.parentElement.setAttribute('aria-sort', sortDir > 0 ? 'ascending' : 'descending');
    dash.draw('p2_rows');
  }));
  document.querySelectorAll('.mt-p2t').forEach((t) => t.addEventListener('click', (ev) => {
    const tr = ev.target.closest('tr[data-key]'); if (!tr) return;
    dash.setParams({ precinct: tr.dataset.key }); window.MT.show('overview');
    document.querySelectorAll('#map-heading').forEach((h) => h.scrollIntoView());
  }));
  dash.draw('p2_rows', (tb) => {
    tb.replaceChildren();
    if (!M.ok('precincts')) return;
    const sel = dash.params().precinct;
    const num = (v) => (typeof v === 'number' ? v : (isNaN(+v) ? v : +v));
    M.rows('precincts').slice().sort((a, b) => sortDir * d3.ascending(num(a[sortKey]), num(b[sortKey]))).forEach((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.precinct; tr.style.cursor = 'pointer'; if (r.precinct === sel) tr.className = 'sel';
      const cells = [[r.precinct], [r.poll_location], [r.group_label, 0, r.cluster], [r.stability], [M.fmt.p1(r.avg_pct_election_day), 1], [M.fmt.p1(r.avg_pct_absentee), 1], [M.fmt.p1(r.avg_pct_early), 1], [M.fmt.p1(r.avg_turnout_rate), 1], [M.fmt.p1(r.avg_voters_60plus_share), 1]];
      cells.forEach(([v, n, c]) => {
        const td = document.createElement('td'); if (n) td.className = 'num';
        if (c !== undefined) { const s = document.createElement('span'); s.className = 'sw'; s.style.background = M.gc(c); td.appendChild(s); }
        td.appendChild(document.createTextNode(v)); tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
  });
})();


/* ---------- Phase 3 ---------- */
(() => {
  const M = window.MT;
  dash.draw('p3_surge', (el) => {
    if (!M.ok('presidential_vs_midterm')) { M.empty(el); return; }
    const R = M.rows('presidential_vs_midterm').slice().sort((a, b) => a.cluster - b.cluster);
    const rowH = 44;
    const { svg, w, h } = M.svgIn(el, R.length * rowH + 34);
    const m = { l: 8, r: 70, t: 4 };
    const x = d3.scaleLinear([0.5, 0.9], [m.l, w - m.r]);
    svg.append('g').attr('transform', `translate(0,${h - 22})`).call(d3.axisBottom(x).ticks(4).tickFormat(M.fmt.p).tickSizeOuter(0)).call(M.cleanAxis);
    const muted = M.BRAND.light;
    const tip = M.tipOf(el);
    R.forEach((r, i) => {
      const yy = m.t + i * rowH;
      svg.append('text').attr('class', 'lbl').attr('x', m.l).attr('y', yy + 10).text('Group ' + M.glabel(r.cluster));
      const cy = yy + 26;
      svg.append('line').attr('x1', x(r.turnout_2026)).attr('x2', x(r.turnout_2024)).attr('y1', cy).attr('y2', cy).attr('stroke', M.gc(r.cluster)).attr('stroke-width', 3).attr('stroke-linecap', 'round');
      svg.append('circle').attr('cx', x(r.turnout_2026)).attr('cy', cy).attr('r', 6).attr('fill', muted);
      svg.append('circle').attr('cx', x(r.turnout_2024)).attr('cy', cy).attr('r', 6).attr('fill', M.BRAND.red);
      svg.append('text').attr('class', 'lbl').attr('x', x(r.turnout_2024) + 10).attr('y', cy).attr('dy', '0.35em').text('×' + d3.format('.2f')(r.turnout_ratio));
      svg.append('rect').attr('x', 0).attr('y', yy).attr('width', w).attr('height', rowH).attr('fill', 'transparent')
        .on('mousemove', (ev) => M.showTip(el, tip, ev, 'Group ' + M.glabel(r.cluster), [[muted, 'Nov 2026 turnout', M.fmt.p1(r.turnout_2026)], [M.BRAND.red, 'Nov 2024 turnout', M.fmt.p1(r.turnout_2024)], [null, 'Early Voting share 2026 → 2024', M.fmt.p(r.share_ev_2026) + ' → ' + M.fmt.p(r.share_ev_2024)], [null, 'Election Day share 2026 → 2024', M.fmt.p(r.share_ed_2026) + ' → ' + M.fmt.p(r.share_ed_2024)]]))
        .on('mouseleave', () => M.hideTip(tip));
    });
  });

  dash.draw('p3_groups', (el) => {
    const sc = dash.params().scenario || 'base';
    if (!M.ok('group_2028')) { M.empty(el); return; }
    const R = M.rows('group_2028').filter((r) => r.scenario === sc).sort((a, b) => a.cluster - b.cluster);
    const chans = [['election_day', 'Election Day'], ['absentee', 'Absentee'], ['early', 'Early Voting']];
    const blockH = 20 + chans.length * 2 * 9 + 14;
    const { svg, w, h } = M.svgIn(el, R.length * blockH + 26);
    const m = { l: 92, r: 54 };
    const x = d3.scaleLinear([0, d3.max(R, (r) => Math.max(...chans.map(([k]) => Math.max(r[k + '_2028'], r[k + '_2026']))))], [m.l, w - m.r]);
    svg.append('g').attr('transform', `translate(0,${h - 22})`).call(d3.axisBottom(x).ticks(Math.max(2, Math.floor(w / 110))).tickFormat(d3.format('~s')).tickSizeOuter(0)).call(M.cleanAxis);
    const muted = M.BRAND.light;
    const tip = M.tipOf(el);
    R.forEach((r, i) => {
      const yy = i * blockH;
      svg.append('rect').attr('x', 0).attr('y', yy + 2).attr('width', 4).attr('height', 10).attr('rx', 1).attr('fill', M.gc(r.cluster));
      svg.append('text').attr('class', 'lbl').attr('x', 8).attr('y', yy + 11).text('Group ' + M.glabel(r.cluster));
      chans.forEach(([k, n], j) => {
        const cy = yy + 18 + j * 18;
        svg.append('text').attr('class', 'lbl').attr('x', m.l - 6).attr('y', cy + 8).attr('text-anchor', 'end').attr('dy', '0.35em').text(n);
        svg.append('rect').attr('x', m.l).attr('y', cy).attr('height', 7).attr('rx', 2).attr('width', Math.max(0, x(r[k + '_2026']) - m.l)).attr('fill', muted);
        svg.append('rect').attr('x', m.l).attr('y', cy + 8).attr('height', 7).attr('rx', 2).attr('width', Math.max(0, x(r[k + '_2028']) - m.l)).attr('fill', M.BRAND.red);
        svg.append('text').attr('class', 'lbl').attr('x', x(Math.max(r[k + '_2028'], r[k + '_2026'])) + 4).attr('y', cy + 8).attr('dy', '0.35em').text(M.fmt.sn(r[k + '_2028'] - r[k + '_2026']));
        svg.append('rect').attr('x', 0).attr('y', cy).attr('width', w).attr('height', 16).attr('fill', 'transparent')
          .on('mousemove', (ev) => M.showTip(el, tip, ev, 'Group ' + M.glabel(r.cluster) + ' · ' + n, [[muted, 'Nov 2026 actual', M.fmt.n(r[k + '_2026'])], [M.BRAND.red, 'Nov 2028 scenario', M.fmt.n(r[k + '_2028'])], [null, 'Nov 2024 actual', M.fmt.n(r[k + '_2024'])]]))
          .on('mouseleave', () => M.hideTip(tip));
      });
    });
  });

  dash.draw('p3_rows', (tb) => {
    tb.replaceChildren();
    if (!M.ok('scenario_2028')) return;
    const sc = dash.params().scenario || 'base';
    const R = M.rows('scenario_2028').filter((r) => r.scenario === sc).sort((a, b) => +a.precinct - +b.precinct);
    const mx = d3.max(R, (r) => r.total_2028);
    R.forEach((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.scenario + ',' + r.precinct;
      const cells = [[r.precinct], [r.poll_location], [r.group_label, 0, r.cluster], [M.fmt.n(r.election_day_2028), 1], [M.fmt.n(r.absentee_2028), 1], [M.fmt.n(r.early_2028), 1], [M.fmt.n(r.total_2028), 1, undefined, r.total_2028 / mx], [M.fmt.sn(r.change_vs_2024), 1]];
      cells.forEach(([v, n, c, bar]) => {
        const td = document.createElement('td'); if (n) td.className = 'num';
        if (c !== undefined) { const s = document.createElement('span'); s.className = 'sw'; s.style.background = M.gc(c); td.appendChild(s); }
        if (bar !== undefined) { const b = document.createElement('span'); b.className = 'bar'; b.style.width = (bar * 4) + 'rem'; td.appendChild(b); }
        td.appendChild(document.createTextNode(v)); tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
  });
})();


/* ---------- method ---------- */
(() => {
  const M = window.MT;
  const f2 = (v) => (v == null ? '–' : d3.format('.2f')(v));
  dash.draw('m_rob', (tb) => {
    tb.replaceChildren();
    if (!M.ok('robustness')) return;
    M.rows('robustness').forEach((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.k; if (r.chosen) tr.className = 'sel';
      [[r.k], [d3.format('.1f')(r.within_group_ss), 1], [f2(r.silhouette), 1], [f2(r.gap), 1], [f2(r.agree_gmm), 1], [f2(r.agree_ward), 1], [f2(r.agree_drop_one_election), 1]]
        .forEach(([v, n]) => { const td = document.createElement('td'); if (n) td.className = 'num'; td.textContent = v; tr.appendChild(td); });
      tb.appendChild(tr);
    });
  });

  dash.draw('m_elbow', (el) => {
    if (!M.ok('robustness')) { M.empty(el); return; }
    const R = M.rows('robustness');
    const { svg, w, h } = M.svgIn(el, 240);
    const m = { t: 14, r: 16, b: 34, l: 42 };
    const x = d3.scaleLinear(d3.extent(R, (r) => r.k), [m.l, w - m.r]);
    const y = d3.scaleLinear([0, d3.max(R, (r) => r.within_group_ss) * 1.08], [h - m.b, m.t]);
    svg.append('g').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(R.length).tickFormat(d3.format('d')).tickSizeOuter(0)).call(M.cleanAxis);
    svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w - m.l - m.r))).call(M.cleanAxis).call((g) => g.select('.domain').remove());
    svg.append('text').attr('class', 'lbl').attr('x', (m.l + w - m.r) / 2).attr('y', h - 4).attr('text-anchor', 'middle').text('Number of groups');
    svg.append('path').datum(R).attr('fill', 'none').style('stroke', 'var(--color-fg)').attr('stroke-width', 2).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round')
      .attr('d', d3.line((r) => x(r.k), (r) => y(r.within_group_ss)));
    const tip = M.tipOf(el);
    svg.append('g').selectAll('circle').data(R).join('circle').attr('cx', (r) => x(r.k)).attr('cy', (r) => y(r.within_group_ss))
      .attr('r', (r) => (r.chosen ? 7 : 4)).style('fill', (r) => (r.chosen ? M.BRAND.red : 'var(--color-fg)')).style('stroke', 'var(--color-panel)').attr('stroke-width', 1.5)
      .on('mousemove', (ev, r) => M.showTip(el, tip, ev, r.k + (r.k === 1 ? ' group' : ' groups') + (r.chosen ? ' (chosen)' : ''), [[null, 'Within-group spread', d3.format('.1f')(r.within_group_ss)], [null, 'Separation (silhouette)', f2(r.silhouette)], [null, 'Gap statistic', f2(r.gap)]]))
      .on('mouseleave', () => M.hideTip(tip));
    const c = R.find((r) => r.chosen);
    if (c) svg.append('text').attr('class', 'lbl').attr('x', x(c.k) + 10).attr('y', y(c.within_group_ss) - 10).style('fill', M.BRAND.red).style('font-weight', '700').text('Chosen: ' + c.k + ' groups');
  });
})();
