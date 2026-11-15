/* Standalone runtime: provides the small `dash` API the dashboard scripts use. */
(() => {
  const DATASETS = ['precincts','precinct_elections','groups','group_age','history','precinct_maps','robustness','presidential_vs_midterm','scenario_2028','township_2028','group_2028','precinct_boundaries'];
  const store = {}; const calcs = []; const draws = new Map(); const onData = [];
  let params = {}; let ready = false;
  try { params = JSON.parse(localStorage.getItem('mt-params') || '{}'); } catch (e) { params = {}; }
  const render = () => {
    if (!ready) return;
    draws.forEach((fns, name) => document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => fns.forEach((fn) => { try { fn(el); } catch (e) { console.error(name, e); } })));
    onData.forEach((cb) => { try { cb(); } catch (e) { console.error(e); } });
  };
  window.dash = {
    data: (id) => (store[id] ? { status: 'ok', data: store[id] } : { status: 'loading', data: null }),
    calc: (name, def) => calcs.push([name, def]),
    draw: (name, fn) => { if (!draws.has(name)) draws.set(name, []); draws.get(name).push(fn); },
    params: () => ({ ...params }),
    setParams: (p) => { params = { ...params, ...p }; Object.keys(params).forEach((k) => params[k] == null && delete params[k]); try { localStorage.setItem('mt-params', JSON.stringify(params)); } catch (e) {} render(); },
    onData: (cb) => onData.push(cb),
    setLink: (name) => { try { history.replaceState(null, '', '#' + name); } catch (e) {} },
  };
  window.addEventListener('DOMContentLoaded', async () => {
    await Promise.all(DATASETS.map(async (id) => { const r = await fetch('data/' + id + '.json'); const j = await r.json(); store[id] = Array.isArray(j) ? j : (j.features ? j : (j.rows || j)); }));
    calcs.forEach(([name, def]) => { store[name] = def.fn(...def.inputs.map((i) => store[i])); });
    ready = true; render();
    window.addEventListener('hashchange', () => { const n = location.hash.slice(1); if (window.MT && MT.show && document.querySelector('[data-page="' + n + '"]')) MT.show(n); });
    let t; window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(render, 150); });
  });
})();
