import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url), ts = require('typescript');
const modules = {};
function load(name) {
  if (modules[name]) return modules[name];
  const exports = {}; modules[name] = exports;
  runInNewContext(ts.transpileModule(readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, { exports, URLSearchParams, require: id => id.endsWith('.json') ? require(id) : load(id.replace('./', '')) });
  return exports;
}
const { stencil, signature, terrainDistance, insideRings, interiorCenter, sampleRaster } = load('analog-math');
const { candidateFromFeature, rankedContrasts } = load('analog-search');
const { verificationBounds } = load('verification');
const { assessProtocol, fieldProtocol, readProtocolRecords, reviewKey } = load('field-protocol');
const { terrainMetrics } = load('terrain-metrics');
const { assessMobility, mobilityProfile } = load('mobility-assessment');
const { archivedElevations } = load('analog-archive');
const { detailedGrid, detailedSummary, compareDetailed } = load('detailed-terrain');

test('dense grids preserve extent and original nine nodes for all three bodies', () => {
  for (const [center, radius] of [[{lat:-15,lon:-72},6371],[{lat:-84.6,lon:31},1737.4],[{lat:4.5,lon:135.6},3396]]) {
    const dense=detailedGrid(center,radius), coarse=stencil(center,radius);
    assert.equal(dense.length,81);
    [0,4,8,36,40,44,72,76,80].forEach((index,i)=>{
      assert.ok(Math.abs(dense[index].lat-coarse[i].lat)<1e-12);
      assert.ok(Math.abs(dense[index].lon-coarse[i].lon)<1e-12);
    });
  }
});
test('dense terrain detects an interior feature omitted by the coarse stencil', () => {
  const z=Array(81).fill(0);z[10]=100;
  const summary=detailedSummary(z);
  assert.equal(summary.scales[0].metrics.relief,100);
  assert.equal(summary.scales[2].metrics.relief,0);
  z[10]=null;
  assert.equal(detailedSummary(z).valid,80);
  assert.equal(detailedSummary(z).scales[0].metrics,null);
  assert.equal(compareDetailed(z,Array(81).fill(0)).complete,false);
});
test('real dense archive reproduces all metrics and rejects shifted locations', () => {
  const archive=require('../data/detailed-terrain.json');
  const {archivedDetailedTerrain}=load('detailed-terrain-archive');
  assert.equal(archive.observations.length,9);
  for(const row of archive.observations){
    assert.equal(row.samples.earth.length,81);
    const actual=compareDetailed(row.samples.earth.map(p=>p.elevation),row.samples.reference.map(p=>p.elevation));
    assert.equal(JSON.stringify(actual),JSON.stringify(row.comparison));
    assert.equal(actual.complete,true);
    assert.match(row.provenance.earthSource,/^https:\/\/api.opentopodata.org\//);
    assert.ok(archivedDetailedTerrain(row.candidateId,row.profileId,row.samples.earth,row.samples.reference));
    const shifted=row.samples.earth.map(p=>({...p,lat:p.lat+.00001}));
    assert.equal(archivedDetailedTerrain(row.candidateId,row.profileId,shifted,row.samples.reference),null);
  }
});
test('archived SRTM covers the saved catalog only at the original sampled coordinates', () => {
  const { candidates } = require('../data/catalog-validation.json');
  const eligible = candidates.filter(candidate => candidate.gridInside === 9);
  const observations = archivedElevations(eligible);
  assert.equal(observations.length, eligible.length);
  assert.ok(observations.every(observation => observation.rows.length === 9 && observation.retrievedAt));
  const candidate = eligible[0];
  const shifted = { ...candidate, samples: candidate.samples.map(point => ({ ...point, lat: point.lat + .00001 })) };
  assert.equal(archivedElevations([shifted]), undefined);
  assert.equal(archivedElevations([{ ...candidate, id: 1 }]), undefined);
});
test('mobility scores four terrain variables and leaves unsupported dimensions pending', () => {
  const a = terrainMetrics([0, 5, 10, 0, 20, 10, 0, 5, 10], 3, 2000);
  const b = terrainMetrics(Array(9).fill(0), 3, 2000);
  const result = assessMobility(a, b);
  assert.equal(mobilityProfile.dimensions.length, 8);
  assert.equal(mobilityProfile.dimensions.reduce((total, row) => total + row.weight, 0), 100);
  assert.equal(result.variables.reduce((total, row) => total + row.weight, 0), 100);
  assert.equal(result.variables.length, 4);
  assert.equal(result.coverage, 45);
  assert.equal(result.dimensions.filter(row => row.distance === null).length, 7);
  const [low, high] = result.globalDistanceBounds;
  assert.ok(result.partialDistance > 0);
  assert.ok(Math.abs(low - result.partialDistance * .45) < 1e-9);
  assert.ok(Math.abs(high - low - .55) < 1e-9);
  assert.equal(assessMobility(null, b).partialDistance, null);
  assert.equal(assessMobility(a, a).partialDistance, 0);
});
const { terrainGrids } = load('terrain-grid');
const { comparisonFrame, comparisonImageTiles } = load('comparison-imagery');
test('orbital imagery covers real stencil coordinates on every comparison body', () => {
  const fixtures = [
    { body: 'earth', center: { lat: -15.4191, lon: -72.36447 }, radiusKm: 6371 },
    { body: 'moon', center: { lat: -84.6, lon: 31 }, radiusKm: 1737.4 },
    { body: 'mars', center: { lat: 4.50238, lon: 135.62343 }, radiusKm: 3396 },
  ];
  for (const { body, center, radiusKm } of fixtures) {
    const frame = comparisonFrame(center, radiusKm, 2);
    assert.equal(frame.project(center).x, 50);
    assert.ok(Math.abs(frame.project(center).y - 50) < 1e-9);
    const tiles = comparisonImageTiles(body, frame);
    for (const point of stencil(center, radiusKm)) {
      const { x, y } = frame.project(point);
      assert.ok(x > 0 && x < 100 && y > 0 && y < 100);
      assert.ok(tiles.some(tile => x >= tile.x && x <= tile.x + tile.width && y >= tile.y && y <= tile.y + tile.height));
    }
  }
});
test('visual terrain grids keep north at top, share a scale and preserve missing values', () => {
  const earth = stencil({ lat: -15.4, lon: -72.3 }).map((point, index) => ({
    ...point, elevation: index === 1 ? null : 3000 + index * 10,
  }));
  const mars = stencil({ lat: 4.5, lon: 135.6 }, 3396).map((point, index) => ({
    ...point, elevation: -3000 + index * 2,
  }));
  const { grids: [land, planet], maximumM } = terrainGrids([earth, mars]);
  assert.equal(land[0].lat, earth[6].lat);
  assert.equal(land[4].relativeM, 40);
  assert.equal(land[7].relativeM, null);
  assert.equal(planet[2].relativeM, 16);
  assert.equal(planet[6].relativeM, 0);
  assert.equal(maximumM, 80);
  assert.equal(terrainGrids([[]]).grids[0], null);
});
test('field protocol requires traceability and keeps each candidate and reference independent', () => {
  const reference = 'moon-mons-mouton';
  const candidate = 55742;
  const first = reviewKey(reference, candidate, fieldProtocol.criteria[0].id);
  const review = { outcome: 'met', evidence: 'Trial notes', source: 'Run 01', author: 'Reviewer', updatedAt: '2026-11-13T10:00:00Z' };
  assert.equal(assessProtocol({ [first]: { ...review, source: ' ' } }, reference, candidate).documented, 0);
  const records = Object.fromEntries(fieldProtocol.criteria.map(criterion =>
    [reviewKey(reference, candidate, criterion.id), review]));
  const parsed = readProtocolRecords(JSON.stringify({ ...records, invalid: { outcome: 'met' } }));
  assert.equal(Object.keys(parsed).length, fieldProtocol.criteria.length);
  assert.equal(assessProtocol(parsed, reference, candidate).status, 'ready-for-review');
  assert.equal(assessProtocol(parsed, 'moon-hadley', candidate).documented, 0);
  assert.equal(assessProtocol(parsed, reference, candidate + 1).documented, 0);
  assert.equal(assessProtocol({ ...parsed, [first]: { ...review, outcome: 'inconclusive' } }, reference, candidate).status, 'inconclusive');
  assert.equal(assessProtocol({ ...parsed, [first]: { ...review, outcome: 'not-met' } }, reference, candidate).status, 'criterion-not-met');
});
test('pilot mineralogy excludes lunar pixels without direct spectral coverage', () => {
  const read = name => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'));
  const { referenceId, center, grid, layers } = read('pilot-lunar-mineralogy');
  assert.deepEqual(center, read(`planetary/${referenceId}`).center);
  assert.equal(grid.counts.length, grid.rows * grid.columns);
  assert.equal(grid.counts.filter(count => count > 0).length, 14);
  assert.deepEqual(layers.map(layer => layer.id), ['plagioclase', 'olivine', 'low-calcium-pyroxene', 'high-calcium-pyroxene']);
  for (const layer of layers) {
    assert.equal(layer.values.length, grid.counts.length);
    const valid = layer.values.filter(value => value !== null);
    assert.ok(valid.length > 0);
    assert.equal(layer.validCells, valid.length);
    assert.ok(layer.values.every((value, index) => value === null || (grid.counts[index] > 0 && value >= 0 && value <= 100)));
    assert.ok(Math.abs(layer.mean - valid.reduce((sum, value) => sum + value, 0) / valid.length) < 0.0001);
  }
  assert.equal(layers.find(layer => layer.id === 'plagioclase').mean, 72.9286);
  for (const [index, count] of grid.counts.entries()) {
    const composition = layers.map(layer => layer.values[index]);
    if (count === 0) assert.ok(composition.every(value => value === null));
    else assert.ok(Math.abs(composition.reduce((total, value) => total + value, 0) - 100) < 0.01);
  }
});
test('documented control observations use distinct 2 km stencils with complete SRTM samples', () => {
  const set = JSON.parse(readFileSync(new URL('../data/terrain-controls.json', import.meta.url), 'utf8'));
  const ref = JSON.parse(readFileSync(new URL('../data/planetary/moon-hadley.json', import.meta.url), 'utf8'));
  assert.equal(set.spacingKm, 2);
  assert.equal(new Set(set.controls.map(site => site.id)).size, 3);
  for (const site of set.controls) {
    assert.deepEqual(site.samples.map(({lat,lon}) => [lat,lon]), Array.from(stencil(site.center), p => [p.lat,p.lon]));
    assert.ok(terrainDistance(signature(site.samples, set.spacingKm), ref.signature) !== null);
  }
});
test('pilot area aggregation has three complete grids at matching nominal support', () => {
  const data = JSON.parse(readFileSync(new URL('../data/pilot-terrain-aggregated.json', import.meta.url), 'utf8'));
  assert.equal(data.spacingM, 1000);
  assert.deepEqual(data.terrain.map(p => p.id).sort(), ['aw3d30', 'glo30', 'lola']);
  for (const product of data.terrain) {
    assert.equal(product.coverage.length, 9);
    assert.ok(product.coverage.every(fraction => fraction >= 1 - 1e-8 && fraction <= 1));
    assert.ok(terrainMetrics(product.values, 3, 1000));
  }
});
const { terrainSensitivity } = load('terrain-sensitivity');
test('nested-grid scenarios preserve extent, physical spacing, and missing samples', () => {
  const plane = Array.from({length:81}, (_, i) => (i % 9) * 50);
  const hole = [...plane];
  hole[0] = null;
  const scenarios = terrainSensitivity([{id:'lola', values:plane}, {id:'glo30', values:hole}], 9, 500);
  assert.equal(scenarios.length, 12);
  for (const row of scenarios) {
    assert.equal(row.indices.length, row.width ** 2);
    assert.ok(row.indices.every(i => i >= 0 && i < 81));
    assert.equal(row.extentM, row.group === 'spacing' ? 4000 : 2000);
    assert.ok(Math.abs(row.products[0].metrics.highGradient - Math.atan(.1) * 180 / Math.PI) < 1e-9);
    assert.equal(row.contrasts[0].reliefDeltaM, row.indices.includes(0) ? null : 0);
  }
  const corner = scenarios.find(row => row.offsetEastM === 1000 && row.offsetNorthM === -1000);
  assert.equal(corner.indices[0], 4);
  assert.equal(corner.indices.at(-1), 44);
});
test('LEND retains both boundary cells with observed rates and statistical errors', () => {
  const lend = JSON.parse(readFileSync(new URL('../data/pilot-lend.json', import.meta.url), 'utf8'));
  const center = lend.cells.filter(cell => lend.centerRecords.includes(cell.record));
  assert.equal(center.length, 2);
  assert.deepEqual(center.map(cell => cell.lon), [30.75, 31.25]);
  assert.ok(center.every(cell => Math.abs(cell.lat - lend.center.lat) <= .25 &&
    cell.exposureS > 0 && Number.isFinite(cell.rate) && Number.isFinite(cell.error)));
  assert.match(lend.range.sha256, /^[a-f0-9]{64}$/);
});
test('radar evidence keeps missing Mini-RF nodes and carries scene provenance', () => {
  const radar = JSON.parse(readFileSync(new URL('../data/pilot-radar.json', import.meta.url), 'utf8'));
  assert.equal(radar.candidateId, 55742);
  assert.equal(radar.referenceId, 'moon-mons-mouton');
  assert.equal(radar.miniRf.values.length, 81);
  assert.ok(radar.miniRf.values.every(value => value === null || (Number.isFinite(value) && value >= 0)));
  assert.match(radar.miniRf.range.sha256, /^[a-f0-9]{64}$/);
  assert.ok(radar.radarsat.validDisplayPixels > 0);
  assert.ok(readFileSync(new URL('../public' + radar.radarsat.preview, import.meta.url)).length > 0);
});
const { modisKelvin, thermalSummary } = load('thermal-metrics');

test('thermal conversion rejects fill values and poor MODIS quality flags', () => {
  assert.equal(modisKelvin(15000, 0), 300);
  assert.equal(modisKelvin(15000, 64), 300);
  for (const qc of [1, 2, 4, 128, undefined]) assert.equal(modisKelvin(15000, qc), null);
  assert.equal(modisKelvin(0, 0), null);
  assert.equal(modisKelvin(15000, 81), null);
  assert.equal(modisKelvin(15000, 81, true), 300);
  assert.equal(modisKelvin(15000, 2, true), null);
  assert.equal(thermalSummary([]), null);
});

test('thermal bundle preserves matched MODIS bands and Diviner cells in the pilot window', () => {
  const thermal = JSON.parse(readFileSync(new URL('../data/pilot-thermal.json', import.meta.url), 'utf8'));
  assert.equal(thermal.candidateId, 55742);
  assert.equal(thermal.earth.rows.length, 24);
  assert.ok(thermal.earth.rows.every(row => row.data.length === 25));
  assert.ok(thermal.moon.some(bin => bin.rows.length > 0));
  const { centerXY: [cx,cy], halfWidthKm, radiusKm } = thermal.lunarWindow;
  for (const bin of thermal.moon) {
    assert.match(bin.range.sha256, /^[0-9a-f]{64}$/);
    assert.ok(bin.rows.every(([x,y,,,k]) =>
      Math.abs(x-cx) <= halfWidthKm/radiusKm && Math.abs(y-cy) <= halfWidthKm/radiusKm && k > 0 && k < 450));
  }
});

test('extended terrain metrics use physical spacing and exclude missing elevations', () => {
  const plane = [0, 50, 100, 0, 50, 100, 0, 50, 100];
  const metrics = terrainMetrics(plane, 3, 500);
  assert.equal(metrics.relief, 100);
  assert.equal(metrics.localDeviation, 0);
  assert.ok(Math.abs(metrics.highGradient - Math.atan(.1) * 180 / Math.PI) < 1e-9);
  assert.equal(terrainMetrics([...plane.slice(0, 8), null], 3, 500), null);
});

test('pilot compares all three measured elevation grids with traceable sources', () => {
  const pilot = JSON.parse(readFileSync(new URL('../data/pilot-evidence.json', import.meta.url), 'utf8'));
  assert.deepEqual(pilot.terrain.map(product => product.id).sort(), ['aw3d30', 'glo30', 'lola']);
  for (const product of pilot.terrain) {
    assert.match(product.source, /^https:/);
    assert.ok(terrainMetrics(product.values, pilot.side, pilot.spacingM));
  }
  assert.equal(pilot.terrain.find(product => product.id === 'aw3d30').maskValues.length, pilot.side ** 2);
  if (pilot.sentinel) assert.equal(Object.values(pilot.sentinel.classification).reduce((a,b) => a+b), pilot.side ** 2);
});
const grid = z => stencil({lat:0,lon:0}).map((p,i) => ({...p,elevation:z(i)}));
test('verification envelopes contain perturbed terrain distances and never admit missing data', () => {
  const earth=grid(i=>i*i*3), planet=grid(i=>i*12), ref=signature(planet);
  const rows=[{id:1,signature:signature(earth)},{id:2,signature:null}];
  const bounds=verificationBounds(rows,ref,20,10);
  assert.equal(bounds.length,1);
  for(let k=0;k<200;k++) {
    const a=signature(earth.map((p,i)=>({...p,elevation:p.elevation+20*Math.sin(k*3+i*7)})));
    const b=signature(planet.map((p,i)=>({...p,elevation:p.elevation+10*Math.cos(k*5+i*11)})));
    for(const w of [.25,.5,.75]) {const d=terrainDistance(a,b,w);assert.ok(d>=bounds[0].distanceMin-1e-9 && d<=bounds[0].distanceMax+1e-9);}
  }
  assert.equal(verificationBounds(rows,ref,NaN,0).length,0);
  assert.equal(verificationBounds(rows,ref,-1,0).length,0);
});
test('zero error reproduces weight sensitivity and ties do not force unique ranks', () => {
  const ref=signature(grid(i=>i*10));
  const rows=[{id:1,signature:ref},{id:2,signature:ref},{id:3,signature:signature(grid(i=>i*100))}];
  const b=verificationBounds(rows,ref,0,0);
  assert.equal(b[0].distanceMax,0);assert.equal(b[0].rankBest,1);assert.equal(b[0].rankWorst,1);
  assert.equal(b[2].rankBest,3);assert.equal(b[2].rankWorst,3);
  const wide=verificationBounds(rows,ref,500,500);assert.equal(wide[0].rankWorst,3);
});
test('equal physical stencils use the radius of each body, including date-line wrapping', () => {
  for (const radius of [6371,1737.4,3396]) {
    const center={lat:26,lon:179.999}, nodes=stencil(center,radius);
    const rad=Math.PI/180;
    const d=2*radius*Math.asin(Math.sqrt(Math.sin((nodes[5].lat-center.lat)*rad/2)**2+Math.cos(nodes[5].lat*rad)*Math.cos(center.lat*rad)*Math.sin((nodes[5].lon-center.lon)*rad/2)**2));
    assert.ok(Math.abs(d-2)<1e-8); assert.ok(nodes.every(p=>Math.abs(p.lon)<=180));
  }
});
test('flat and analytical tilted planes yield meaningful gradients; absolute datum cancels', () => {
  const flat=signature(grid(()=>0)); assert.equal(flat.reliefM,0); assert.equal(flat.p90GradientDeg,0);
  const plane=signature(grid(i=>(i%3)*200));
  assert.equal(plane.reliefM,400); assert.ok(Math.abs(plane.p90GradientDeg-Math.atan(.1)*180/Math.PI)<1e-10);
  const shifted=signature(grid(i=>10000+(i%3)*200)); assert.equal(terrainDistance(plane,shifted),0);
});
test('distance is bounded, symmetric, self-zero, and missing data cannot rank first', () => {
  const a=signature(grid(i=>i*10)), b=signature(grid(i=>i*500));
  assert.equal(terrainDistance(a,a),0); assert.equal(terrainDistance(a,b),terrainDistance(b,a));
  assert.ok(terrainDistance(a,b)>0 && terrainDistance(a,b)<1);
  assert.equal(signature(grid(i=>i===3?null:i)),null); assert.equal(signature(grid(i=>i===1?NaN:i)),null);
  assert.equal(terrainDistance(null,a),null); assert.equal(terrainDistance(a,{...b,spacingKm:1}),null);
  assert.equal(terrainDistance(a,b,NaN),null);
  const results=rankedContrasts([{id:1,signature:null},{id:2,signature:b},{id:3,signature:a}],a);
  assert.equal(results.length,2); assert.equal(results[0].id,3);
});
test('sensitivity reports changing ranks and ties share the same competition rank', () => {
  const ref={reliefM:100,p90GradientDeg:2,medianGradientDeg:1,valid:9,spacingKm:2};
  const records=[{id:1,signature:{...ref,reliefM:110,p90GradientDeg:5}},{id:2,signature:{...ref,reliefM:300,p90GradientDeg:2.1}}];
  const ranked=rankedContrasts(records,ref); assert.ok(ranked.some(r=>r.rankMin<r.rankMax));
  const tied=rankedContrasts([{id:1,signature:ref},{id:2,signature:ref}],ref); assert.ok(tied.every(r=>r.rankMin===1&&r.rankMax===1));
});
test('holes and concave geometry cannot become false geological sample coverage', () => {
  const rings=[[[-1,-1],[1,-1],[1,1],[-1,1],[-1,-1]],[[-.2,-.2],[.2,-.2],[.2,.2],[-.2,.2],[-.2,-.2]]];
  assert.equal(insideRings({lat:0,lon:0},rings),false);
  const p=interiorCenter(rings); assert.ok(p); assert.ok(insideRings(p,rings));
  const f={attributes:{objectid:1,etiqueta:'Ca-la',subunidad:'lava'},geometry:{rings}};
  const c=candidateFromFeature(f); assert.ok(c); assert.ok(insideRings(c,rings));
  assert.equal(candidateFromFeature({...f,attributes:{...f.attributes,etiqueta:'Cal-v'}}),null); // Calderas are not lunar impact craters.
  assert.equal(candidateFromFeature({...f,geometry:{rings:[[[NaN,0],[0,0],[1,1],[NaN,0]]]}}),null);
});
test('PDS pixel registration, bilinear interpolation and lunar scale factor are applied once', () => {
  const r={north:2,west:0,ppd:1,rows:2,cols:2,values:[0,100,200,300],scale:.5};
  assert.equal(sampleRaster({lat:1,lon:1},r),75);
  assert.equal(sampleRaster({lat:1.5,lon:.5},r),0);
  assert.equal(sampleRaster({lat:3,lon:1},r),null);
  assert.equal(sampleRaster({lat:1,lon:1},{...r,values:[0,-32768,200,300]}),null);
});
for (const id of ['moon-hadley','moon-mons-mouton','mars-insight']) test(`stored ${id} reference recomputes from raw DN and has complete provenance`,()=>{
  const r=JSON.parse(readFileSync(new URL(`../data/planetary/${id}.json`,import.meta.url),'utf8'));
  const nodes=stencil(r.center,r.radiusKm).map(p=>({...p,elevation:sampleRaster(p,r.window)}));
  const actual=signature(nodes);
  assert.ok(actual); assert.ok(Math.abs(actual.reliefM-r.signature.reliefM)<1e-9); assert.ok(Math.abs(actual.p90GradientDeg-r.signature.p90GradientDeg)<1e-9);
  assert.match(r.imageUrl,/^https:\/\/pds-geosciences.wustl.edu\//); assert.match(r.sourceRange.sha256,/^[0-9a-f]{64}$/);
  assert.ok(r.sourceRange.end-r.sourceRange.start<2000000);
  if(id==='mars-insight') assert.ok(nodes.every(p=>p.elevation < -2400 && p.elevation > -2800));
});

 test('nonfinite and nonpositive grid scales cannot produce comparable scores', () => {
   assert.equal(signature(grid(i => i), Infinity), null);
   const ref=signature(grid(i => i));
   for (const spacingKm of [0, -2, Infinity, NaN]) assert.equal(terrainDistance({...ref, spacingKm}, {...ref, spacingKm}), null);
 });
 test('saved histories reject corrupt records instead of crashing comparison', () => {
   const {readSavedReports}=load('saved-reports');
   const a={id:'a',site:{name:'Test',lat:0,lon:0,radius:5},created:'2026-11-14T00:00:00Z',settings:{target:'Luna',task:'Movilidad robótica',relief:500,rain:1},warnings:[],climate:null,terrain:null};
   assert.equal(readSavedReports(JSON.stringify([a,a])).length,1);
   for(const change of [{settings:{}},{warnings:[{}]},{created:'bad'},{climate:{months:[]}},{terrain:{coverage:2}}]) assert.equal(readSavedReports(JSON.stringify([{...a,...change}])).length,0);
   assert.equal(readSavedReports('{broken').length,0);
 });
