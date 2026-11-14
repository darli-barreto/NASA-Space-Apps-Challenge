import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url);
const ts = require('typescript');

test('thermal archive covers the catalog and unavailable MODIS remains missing', async () => {
  const catalog = require('../data/catalog-validation.json').candidates.filter(site => site.gridInside === 9);
  const power = require('../data/catalog-power-surface.json');
  assert.deepEqual(power.sites.map(site => site.id).sort(), catalog.map(site => site.id).sort());
  for (const site of power.sites) {
    assert.equal(site.months.length, 12);
    assert.ok(site.months.every(Number.isFinite) && Number.isFinite(site.annual));
  }

  const load = harness(async () => new Response(null, { status: 503 }));
  const { GET } = load('app/api/analog-search/thermal/route');
  const request = id => new Request(`https://terra.test/api/analog-search/thermal?id=${id}&archived=1`);
  const andagua = await (await GET(request(55742))).json();
  assert.equal(andagua.status, 'available');
  assert.equal(andagua.modis.inRanking, false);
  assert.ok(andagua.modis.phases.every(phase => phase.strictCount <= phase.possibleCount));
  assert.deepEqual(andagua.modis.phases.map(phase => [phase.quality, phase.strictCount, phase.statistics?.count]),
    [['exploratory', 0, 100], ['exploratory', 0, 64]]);
  const missing = require('../data/catalog-thermal.json').unavailable[0];
  if (missing) {
    const unavailable = await (await GET(request(missing))).json();
    assert.equal(unavailable.status, 'unavailable');
    assert.equal(unavailable.modis, null);
  }
});

test('full-area panel safely renders when the area prop is missing or null', () => {
  const exports = {};
  const code = ts.transpileModule(readFileSync(new URL('../components/terrain-area-panel.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, {
    exports,
    require: id => {
      if (id === 'next-intl') return { useTranslations: () => key => key };
      if (id === './display-preferences') return { useLanguage: () => ({ t: (es, en) => en }) };
      if (id === './terrain-metric-table') return { default: () => null };
      return require(id);
    },
  });
  for (const props of [{}, { area: null }]) {
    assert.equal(renderToStaticMarkup(createElement(exports.default, props)), '');
  }
});

function harness(fetch) {
  const modules = new Map();
  function load(name) {
    if (modules.has(name)) return modules.get(name);
    const exports = {};
    modules.set(name, exports);
    const file = new URL(`../${name}.ts`, import.meta.url);
    const code = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    }).outputText;
    runInNewContext(code, {
      exports, fetch, Response, URL, URLSearchParams, AbortSignal, crypto, setTimeout,
      require: id => id.endsWith('.json') ? require(id.replace('@/', '../')) :
        load(id.startsWith('@/') ? id.slice(2) : `${name.slice(0, name.lastIndexOf('/'))}/${id.slice(2)}`),
    });
    return exports;
  }
  return load;
}
const input = {
  site: { name: 'Control', lat: -15, lon: -72, radius: 5 },
  settings: { target: 'Luna', task: 'Movilidad robótica', relief: 500, rain: 1 },
};
const post = body => new Request('https://terra.test/api/analyze', {
  method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
});
function power() {
  return { parameters: { T2M: {units:'C'}, PRECTOTCORR:{units:'mm/day'}, WS10M:{units:'m/s'} },
    properties:{parameter:{T2M:{ANN:8},PRECTOTCORR:{ANN:0.5},WS10M:{ANN:2}}} };
}

test('analysis rejects invalid input before accessing providers', async () => {
  const load = harness(() => { throw new Error('Provider must not run'); });
  for (const body of [null, {}, {...input, site:{...input.site,lat:91}}]) {
    assert.equal((await load('app/api/analyze/route').POST(post(body))).status,400);
  }
});
test('malformed elevation responses preserve usable climate and never fabricate terrain', async () => {
  for (const malformed of [null, {}, {status:'OK',results:[null]}]) {
    const load = harness(async url => Response.json(String(url).includes('power.larc') ? power() : malformed));
    const response = await load('app/api/analyze/route').POST(post(input));
    const body = await response.json();
    assert.equal(response.status,200);
    assert.equal(body.climate.temperature,8);
    assert.equal(body.terrain,null);
    assert.ok(body.warnings.length);
  }
});
test('mismatched coordinates are excluded and failed criteria remain unevaluated', async () => {
  const load = harness(async url => Response.json(String(url).includes('power.larc') ? power() : {
    status:'OK',results:Array.from({length:9},()=>({dataset:'srtm90m',elevation:0,location:{lat:0,lng:0}})),
  }));
  const result = await (await load('app/api/analyze/route').POST(post(input))).json();
  assert.equal(result.terrain.coverage,0);
  assert.equal(result.terrain.relief,null);
  assert.equal(load('lib/analysis').checks(result)[0].value,null);
});
test('SRTM concurrent identical requests share cached provider response', async () => {
  let calls=0;
  const load=harness(async () => { calls++; return Response.json({status:'OK',results:[]}); });
  const {srtm}=load('lib/srtm.server');
  await Promise.all([srtm('https://api.opentopodata.org/v1/srtm90m?locations=1,2'),srtm('https://api.opentopodata.org/v1/srtm90m?locations=1,2')]);
  assert.equal(calls,1);
});
test('imagery rejects arbitrary sources and invalid extents without network', async () => {
  const load=harness(() => { throw new Error('Unexpected network'); });
  for (const query of ['layer=anything','layer=MODIS_Terra_CorrectedReflectance_TrueColor&z=99&row=0&col=0']) {
    assert.equal((await load('app/api/imagery/route').GET(new Request(`https://terra.test/api/imagery?${query}`))).status,400);
  }
});
test('archived search recomputes real candidates without an upstream dependency', async () => {
  const load=harness(() => { throw new Error('Archived request must not need network'); });
  const route=load('app/api/analog-search/route');
  const response=await route.POST(post({profile:'moon-mons-mouton',ids:[55742],archivedCatalog:true}));
  const result=await response.json();
  assert.equal(response.status,200);
  assert.equal(result.archived,true);
  assert.ok(Math.abs(result.results[0].distance-0.027362675712933)<1e-10);
  assert.equal(result.results[0].samples.length,9);
  assert.ok(result.results[0].source && result.results[0].retrievedAt);
  for (const ids of [[55742,55742],[],[999999999]]) {
    assert.equal((await route.POST(post({profile:'moon-mons-mouton',ids,archivedCatalog:true}))).status,400);
  }
});
test('detailed API returns 81 real archived samples and keeps the screening route separate', async () => {
  const load=harness(()=>{throw new Error('No upstream needed');});
  const route=load('app/api/analog-search/route');
  const request={profile:'moon-mons-mouton',ids:[55742],archivedCatalog:true,detail:true};
  const response=await route.POST(post(request)), result=await response.json();
  assert.equal(response.status,200);
  assert.equal(result.status,'complete');
  assert.equal(result.archived,true);
  assert.equal(result.samples.earth.length,81);
  assert.equal(result.comparison.earth.scales.length,3);
  assert.equal((await route.POST(post({...request,ids:[55742,17758]}))).status,400);
});
test('refinement requests only the top three and respects cancellation', async () => {
  const rows=require('../data/contrast-validation.json').flatMap(batch=>batch.results);
  const profile=require('../data/planetary/moon-mons-mouton.json');
  const archive=require('../data/detailed-terrain.json');
  const requested=[], received=[];
  const load=harness(async (_url,options)=>{
    const body=JSON.parse(options.body);requested.push(body.ids[0]);
    return Response.json(archive.observations.find(r=>r.candidateId===body.ids[0]&&r.profileId===body.profile));
  });
  const {refineCandidates}=load('lib/refine-candidates');
  await refineCandidates(rows,profile,true,new AbortController().signal,row=>received.push(row));
  assert.deepEqual(requested,[55742,17758,51248]);
  assert.equal(received.length,3);
  const stopped=new AbortController();stopped.abort();
  await refineCandidates(rows,profile,true,stopped.signal,()=>assert.fail('Cancelled result'));
  assert.equal(requested.length,3);
});
