import { readFile, writeFile } from "node:fs/promises";
const root=new URL("../data/",import.meta.url);
const catalog=JSON.parse(await readFile(new URL("catalog-validation.json",root),"utf8"));
const candidates=catalog.candidates.filter(site=>site.gridInside===9);
const sites=[];
for(let i=0;i<candidates.length;i+=3){
  const results=await Promise.allSettled(candidates.slice(i,i+3).map(async site=>{
    const source="https://power.larc.nasa.gov/api/temporal/monthly/point?"+new URLSearchParams({
      parameters:"TS",community:"AG",latitude:site.lat.toFixed(6),longitude:site.lon.toFixed(6),start:"2024",end:"2024",format:"JSON"
    });
    const response=await fetch(source,{signal:AbortSignal.timeout(25000)});
    if(!response.ok)throw Error(site.id+" HTTP "+response.status);
    const data=await response.json();
    const values=data.properties?.parameter?.TS;
    const [lon,lat]=data.geometry?.coordinates??[];
    if(data.parameters?.TS?.units!=="C"||!Number.isFinite(lon)||!Number.isFinite(lat)||
      Math.abs(lon-site.lon)>.001||Math.abs(lat-site.lat)>.001||data.header?.start!=="20240101"||data.header?.end!=="20241231"||
      !data.header?.sources?.includes("MERRA2")||!values)throw Error(site.id+" invalid metadata");
    const clean=value=>typeof value==="number"&&Number.isFinite(value)&&value!==data.header.fill_value&&value>-100&&value<100?value:null;
    const months=Array.from({length:12},(_,m)=>clean(values["2024"+String(m+1).padStart(2,"0")]));
    const annual=clean(values["202413"]);
    if(months.some(value=>value===null)||annual===null)throw Error(site.id+" incomplete data");
    console.log(site.id,annual);
    return {id:site.id,lat:site.lat,lon:site.lon,source,retrievedAt:new Date().toISOString(),annual,months};
  }));
  sites.push(...results.flatMap(result=>result.status==="fulfilled"?[result.value]:[]));
  for(const result of results)if(result.status==="rejected")console.error(result.reason.message);
}
if(sites.length!==candidates.length)throw Error("POWER archive incomplete; existing data preserved");
await writeFile(new URL("catalog-power-surface.json",root),JSON.stringify({product:"NASA POWER / MERRA-2",parameter:"TS",year:2024,unit:"°C",nativeResolutionDeg:[.5,.625],sites})+"\n");
