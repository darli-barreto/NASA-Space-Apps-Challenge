// Independent offline oracle: does not import the application's scoring functions.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const base = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, base), 'utf8'));
const digest = path => createHash('sha256').update(readFileSync(new URL(path, base))).digest('hex');
const catalog = read('data/catalog-validation.json');
const batches = read('data/contrast-validation.json');
const epsilon = 1e-8;
const close = (a,b) => assert.ok(Number.isFinite(a) && Math.abs(a-b) < epsilon, `${a} != ${b}`);
function metrics(values) {
  assert.equal(values.length,9);
  assert.ok(values.every(Number.isFinite));
  const edges = [[0,1],[1,2],[3,4],[4,5],[6,7],[7,8],[0,3],[3,6],[1,4],[4,7],[2,5],[5,8]];
  const g = edges.map(([a,b]) => Math.atan(Math.abs(values[a]-values[b])/2000)*180/Math.PI).sort((a,b)=>a-b);
  return {reliefM:Math.max(...values)-Math.min(...values), p90GradientDeg:g[9]*.1+g[10]*.9};
}
function score(a,b,w=.5) {
  return w*Math.abs(a.reliefM-b.reliefM)/(a.reliefM+b.reliefM+10)+
    (1-w)*Math.abs(a.p90GradientDeg-b.p90GradientDeg)/(a.p90GradientDeg+b.p90GradientDeg+.1);
}
const measured = new Map();
for (const batch of batches) for (const [i,row] of batch.results.entries()) {
  const candidate = catalog.candidates.find(c=>c.id===row.id);
  assert.ok(candidate && candidate.gridInside===9);
  const raw = batch.raw.results.slice(i*9,i*9+9);
  raw.forEach((p,j)=>{
    assert.equal(p.dataset,'srtm90m');
    assert.equal(p.location.lat,Number(candidate.samples[j].lat.toFixed(6)));
    assert.equal(p.location.lng,Number(candidate.samples[j].lon.toFixed(6)));
    assert.equal(p.elevation,row.samples[j].elevation);
  });
  const actual = metrics(raw.map(p=>p.elevation));
  close(actual.reliefM,row.signature.reliefM);
  close(actual.p90GradientDeg,row.signature.p90GradientDeg);
  close(score(actual,read(`data/planetary/${batch.profile}.json`).signature),row.distance);
  if(measured.has(row.id)) assert.deepEqual(actual,measured.get(row.id).metrics);
  measured.set(row.id,{id:row.id,metrics:actual});
}
const references = ['moon-mons-mouton','moon-hadley','mars-insight'].map(id=>{
  const path=`data/planetary/${id}.json`, p=read(path);
  assert.equal(digest(`data/planetary/${id}.lbl`),p.labelSha256);
  const actual=metrics(p.samples.map(s=>s.elevation));
  close(actual.reliefM,p.signature.reliefM);
  close(actual.p90GradientDeg,p.signature.p90GradientDeg);
  const rank=w=>[...measured.values()].map(c=>({id:c.id,distance:score(c.metrics,actual,w)})).sort((a,b)=>a.distance-b.distance||a.id-b.id);
  return {id,sha256:digest(path),metrics:actual,ranking:rank(.5),weightSensitivity:[.25,.5,.75].map(weight=>({reliefWeight:weight,ranking:rank(weight)}))};
});
const report={generatedAt:new Date().toISOString(),scope:'Independent arithmetic audit of local archives; not field validation or upstream authenticity certification',
  archivedCandidates:catalog.candidates.length,comparable:measured.size,
  inputs:['data/catalog-validation.json','data/contrast-validation.json'].map(path=>({path,sha256:digest(path)})),references};
mkdirSync(new URL('docs/',base),{recursive:true});
writeFileSync(new URL('docs/audit-results.json',base),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({comparable:report.comparable,references:references.map(p=>({id:p.id,first:p.ranking[0],sensitivityFirst:p.weightSensitivity.map(s=>s.ranking[0].id)}))},null,2));
