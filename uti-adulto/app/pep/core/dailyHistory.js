export function mergeDailyRecords(bed) {
 const records={...(bed.dailyRecords||{})};
 (bed.dates||[]).forEach((date,d)=>{
  if(!date)return;
  const cells=Object.fromEntries(Object.entries(bed.cells||{}).filter(([k])=>k.startsWith(`${d}:`)).map(([k,v])=>[k.slice(k.indexOf(':')+1),v]));
  records[date]={...records[date],date,cells};
 });
 return records;
}
export function dailyDates(bed,today) {
 const records=mergeDailyRecords(bed),dates=new Set(Object.keys(records));
 if(bed.evolucao?.clinicalDate)dates.add(bed.evolucao.clinicalDate);
 const start=bed.hospitalAdmissionDate||bed.admissionDate;
 if(/^\d{4}-\d{2}-\d{2}$/.test(start||'')&&start<=today){
  const first=new Date(start+'T12:00:00Z'),last=new Date(today+'T12:00:00Z');
  const span=Math.round((last-first)/86400000);
  if(span<=10000)for(let i=0;i<=span;i++)dates.add(new Date(first.getTime()+i*86400000).toISOString().slice(0,10));
 }
 return [...dates].sort();
}
export function saveDailyEvolution(bed,evolution,date) {
 const records=mergeDailyRecords(bed);const previous=records[date]||{date,cells:{}};
 return {...records,[date]:{...previous,evolution,evolutionRevisions:[...(previous.evolutionRevisions||[]),{...evolution,savedAt:new Date().toISOString()}]}};
}
