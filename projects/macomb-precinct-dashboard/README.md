# Precinct Voting Patterns — Macomb Township Clerk's Office

Interactive dashboard from my Georgia Tech OMSA Practicum (ISYE 6748, Fall 2026), sponsored by the Macomb Township Clerk's Office.

- https://cheung121.github.io/analytics-portfolio/projects/macomb-precinct-dashboard/
  
The township's 24 precincts are grouped into five voting-behavior groups using k-means clustering on four elections (Aug 2024 Primary through Nov 2026 General), with a 2028 planning scenario built on each group's presidential-vs-midterm change.

**Tabs:** Overview · Phase 1 History (2002–2026) · Phase 2 Precinct groups · Phase 3 2028 planning · Method

Contains precinct-level totals only; no voter-level data.

## Run locally
The page loads its data with `fetch`, so open it through a web server rather than as a file:

```
python -m http.server 8000
```
then visit http://localhost:8000.

## Files
- `index.html` — page layout
- `mt.css`, `mt-logo.css` — styles and Township logo
- `shim.js` — small runtime that loads the data files and redraws the page when a selection changes
- `mt-core.js`, `mt-charts.js` — calculations and D3 charts
- `d3.min.js` — D3 v7
- `data/` — precinct, election, group, scenario and boundary data (JSON)

## Updating after an election
Re-export the Stats tab and turnout-by-age report, re-run the analysis scripts to regenerate the files in `data/`, and replace them here.
