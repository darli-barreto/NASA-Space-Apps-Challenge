import {readFile,writeFile} from "node:fs/promises";
const read=async path=>JSON.parse(await readFile(new URL("../data/"+path,import.meta.url),"utf8"));
const catalog=await read("catalog-validation.json");
const pilot=await read("pilot-thermal.json");
const dates=pilot.earth.dates;
const bands=["LST_Day_1km","LST_Night_1km","QC_Day","QC_Night","Day_view_time","Night_view_time"];
const sites=catalog.candidates.filter(c=>c.gridInside===9);
async function retrieve(site){
  const source="https://modis.ornl.gov/rst/api/v1/MOD11A2/subset?"+new URLSearchParams({
    latitude:site.lat.toFixed(6),longitude:site.lon.toFixed(6),startDate:"A2026001",endDate:"A2026025",kmAboveBelow:2,kmLeftRight:2
  });
  for(let attempt=0;attempt<3;attempt++){
    try {
      const response=await fetch(source,{signal:AbortSignal.timeout(35000)});
      if(!response.ok)throw Error("HTTP "+response.status);
      const raw=await response.json();
      if(!Number.isFinite(Number(raw.latitude))||!Number.isFinite(Number(raw.longitude))||
        Math.abs(raw.latitude-site.lat)>1e-6||Math.abs(raw.longitude-site.lon)>1e-6||
        raw.nrows!==5||raw.ncols!==5||!Number.isFinite(Number(raw.cellsize))||Number(raw.cellsize)<900||Number(raw.cellsize)>1100||
        !Array.isArray(raw.subset)) throw Error("Unexpected MODIS subset");
      const rows=raw.subset.filter(r=>bands.includes(r.band)&&dates.includes(r.calendar_date));
      for(const date of dates)for(const band of bands){
        const matches=rows.filter(r=>r.calendar_date===date&&r.band===band);
        if(matches.length!==1||!Array.isArray(matches[0].data)||matches[0].data.length!==25||!matches[0].data.every(Number.isInteger))throw Error("Invalid "+band+" "+date);
      }
      console.log(site.id,rows.length);
      return {id:site.id,lat:site.lat,lon:site.lon,source,retrievedAt:new Date().toISOString(),cellM:Number(raw.cellsize),rows};
    }catch(e){if(attempt===2)throw new Error(site.id+": "+e.message,{cause:e});await new Promise(r=>setTimeout(r,900));}
  }
}
const results=await Promise.allSettled(sites.map(async site=>{
  if(site.id===pilot.candidateId){
    const params=new URL(pilot.earth.source).searchParams;
    if(Math.abs(site.lat-Number(params.get("latitude")))<1e-6 && Math.abs(site.lon-Number(params.get("longitude")))<1e-6)
      return {id:site.id,lat:site.lat,lon:site.lon,source:pilot.earth.source,retrievedAt:pilot.retrievedAt,cellM:pilot.earth.cellM,rows:pilot.earth.rows};
  }
  return retrieve(site);
}));
const result=results.flatMap(row=>row.status==="fulfilled"?[row.value]:[]);
const url=new URL("../data/catalog-thermal.json",import.meta.url);
try {
  const previous=JSON.parse(await readFile(url,"utf8"));
  for(const site of previous.sites)if(!result.some(row=>row.id===site.id))result.push(site);
}catch(error){if(error.code!=="ENOENT")throw error;}
const unavailable=sites.filter(site=>!result.some(row=>row.id===site.id)).map(site=>site.id);
console.log({count:result.length,unavailable});
await writeFile(url,JSON.stringify({product:"MOD11A2.061",dates,rows:5,cols:5,sites:result,unavailable})+"\n");
