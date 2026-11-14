// Reuse the server calculation, preserving provider URLs, coordinates and missing values.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require = createRequire(import.meta.url), ts = require('typescript'), modules = new Map();
const root = new URL('../', import.meta.url);
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const exports = {};
  modules.set(name, exports);
  const code = ts.transpileModule(readFileSync(new URL(`${name}.ts`, root), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  runInNewContext(code, { exports, URLSearchParams, AbortSignal, setTimeout, fetch,
    require: id => id.endsWith('.json') ? require(id.replace('@/', '../')) :
      load(id.startsWith('@/') ? id.slice(2) : `${name.slice(0,name.lastIndexOf('/'))}/${id.slice(2)}`),
  });
  return exports;
}
const catalog = require('../data/catalog-validation.json');
const rows = require('../data/contrast-validation.json').flatMap(batch=>batch.results);
const { planetaryProfiles } = load('lib/planetary');
const { rankedContrasts } = load('lib/analog-search');
const { analyzeDetailedTerrain } = load('lib/detailed-terrain.server');
const observations = [];
for (const profile of planetaryProfiles) {
  for (const row of rankedContrasts(rows, profile.signature).slice(0,3)) {
    const candidate = catalog.candidates.find(c=>c.id===row.id);
    const result = await analyzeDetailedTerrain(candidate,profile,{allowArchive:false});
    observations.push(result);
    console.log(profile.id,candidate.id,result.status,result.comparison?.earth.valid,result.comparison?.reference.valid);
  }
}
if (observations.some(row=>row.status==='unavailable')) {
  throw new Error('Incomplete provider acquisition: existing archive has not been overwritten.');
}
writeFileSync(new URL('data/detailed-terrain.json',root),JSON.stringify({observations},null,2)+'\n');
