import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const exports = {};
runInNewContext(ts.transpileModule(readFileSync(new URL('../lib/analysis.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports });
const { validSite, sampleGrid, summarizeTerrain, checks, reportText } = exports;
const site = { name: 'Test', lat: -15, lon: -72, radius: 5 };
test('rejects invalid coordinates, missing values and excessive radii', () => {
  assert.equal(validSite(site), true);
  for (const invalid of [{ lat: NaN }, { lat: 91 }, { lon: 181 }, { radius: 0 }, { radius: 26 }, { name: ' ' }]) assert.equal(validSite({ ...site, ...invalid }), false);
});
test('samples stay inside the requested circle at equator, poles and date line', () => {
  for (const center of [site, { ...site, lat: 89.99, lon: 179.99, radius: 25 }, { ...site, lat: -90, lon: -180 }]) {
    const samples = sampleGrid(center); assert.equal(samples.length, 9);
    for (const s of samples) {
      assert.ok(Math.abs(s.lat) <= 90 && Math.abs(s.lon) <= 180);
      const rad = Math.PI / 180;
      const h = Math.sin((s.lat - center.lat) * rad / 2) ** 2 + Math.cos(center.lat * rad) * Math.cos(s.lat * rad) * Math.sin((s.lon - center.lon) * rad / 2) ** 2;
      const distance = 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
      assert.ok(distance <= center.radius + 0.00001);
    }
  }
});
test('missing elevations remain missing; zero elevation remains valid', () => {
  const partial = summarizeTerrain([{ elevation: 0 }, { elevation: null }, { elevation: 100 }]);
  assert.equal(partial.relief, 100); assert.equal(partial.coverage, 2 / 3);
  assert.equal(summarizeTerrain([{ elevation: null }]).relief, null);
});
test('incomplete data cannot pass research criteria', () => {
  const a = { terrain: { relief: 0, coverage: .5 }, climate: null, settings: { relief: 500, rain: 1 } };
  assert.ok(checks(a).every(c => c.value === null));
  a.terrain.coverage = 1;
  assert.equal(checks(a)[0].value, true);
});
test('export retains scientific limits and provenance', () => {
  const md = reportText({ site, settings: { target: 'Luna', task: 'Movilidad robótica', relief: 500, rain: 1 }, created: '2026-11-06', climate: null, terrain: null, warnings: ['Sin cobertura'] });
  for (const text of ['Sin datos', 'Sin cobertura', 'no una certificación', 'gravedad', 'revisión bibliográfica']) assert.ok(md.includes(text));
});

// Audited parsers: invalid units and fill values must never become measurements.
function loadPure(name) {
  const result = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL(`../lib/${name}.ts`, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: result, URLSearchParams });
  return result;
}
const { parsePower } = loadPure('power');
const { distanceKm, pointInView } = loadPure('geography');
const powerData = () => ({ header: { fill_value: -32768, range: '2001–2025' }, parameters: { T2M: { units: 'C' }, PRECTOTCORR: { units: 'mm/day' }, WS10M: { units: 'm/s' } }, properties: { parameter: { T2M: { ANN: 7.35, JAN: -32768 }, PRECTOTCORR: { ANN: 0 }, WS10M: { ANN: 2.79 } } } });
test('POWER reads annual values without converting daily mean rainfall to annual total', () => {
  const d = parsePower(powerData(), 'source');
  assert.equal(d.temperature, 7.35); assert.equal(d.precipitation, 0); assert.equal(d.wind, 2.79); assert.equal(d.months[0], null); assert.equal(d.period, '2001–2025');
});
test('POWER rejects changed or missing units and entirely missing observations', () => {
  const d = powerData(); d.parameters.T2M.units = 'K'; assert.throws(() => parsePower(d, 'source'), /unidad inesperada/);
  const empty = powerData(); empty.properties.parameter = {}; assert.throws(() => parsePower(empty, 'source'), /ausentes/);
});
test('map pixel selection respects geographic bounding box', () => {
  const center = pointInView(.5, .5, -78, -20, 12, 8); assert.equal(center.lon, -72); assert.equal(center.lat, -16);
  const corner = pointInView(0, 0, -78, -20, 12, 8); assert.equal(corner.lon, -78); assert.equal(corner.lat, -12);
});
test('two-click radius uses geodesic distance, including date line', () => {
  assert.ok(Math.abs(distanceKm({lat:0,lon:0}, {lat:0,lon:1}) - 111.195) < .01);
  assert.ok(distanceKm({lat:0,lon:179.99}, {lat:0,lon:-179.99}) < 2.3);
});

test('GIBS tile grid covers the requested area with the EPSG4326 288-degree level zero matrix', () => {
  const { gibsTiles } = loadPure('geography');
  const tiles = gibsTiles(-72.48, -15.6, .3, .2);
  assert.ok(tiles.length >= 1 && tiles.length <= 4);
  assert.equal(tiles[0].z, 7); assert.equal(tiles[0].row, 46); assert.equal(tiles[0].col, 47);
  assert.ok(tiles[0].x <= 0 && tiles[0].y <= 0);
  assert.ok(tiles[0].x + tiles[0].width >= 1000 && tiles[0].y + tiles[0].height >= 606);
});



 test('terrain summary rejects nonfinite elevations and empty coverage', () => {
   assert.equal(summarizeTerrain([]).coverage, 0);
   assert.equal(summarizeTerrain([{elevation: NaN}, {elevation: Infinity}, {elevation: 0}]).coverage, 1/3);
   assert.equal(summarizeTerrain([{elevation: NaN}]).relief, null);
 });
