import { fichaFields, type Data } from "./model";

export type SheetState = { patient:string; admission:string; bed:string; dates:string[]; cells:Record<string,string>; sourceText?:string };
export type CellProposal = Record<string,string>;

const normalize = (value:string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
const aliases:Record<string,string> = {
  "pam min":"f_13_0","pam minima":"f_13_0","pam max":"f_13_1","pam maxima":"f_13_1",
  "fc min":"f_14_0","fc minima":"f_14_0","fc max":"f_14_1","fc maxima":"f_14_1",
  "fr min":"f_15_0","fr minima":"f_15_0","fr max":"f_15_1","fr maxima":"f_15_1",
  "temperatura min":"f_16_0","temperatura minima":"f_16_0","temperatura max":"f_16_1","temperatura maxima":"f_16_1",
  "glicemia min":"f_17_0","glicemia minima":"f_17_0","glicemia max":"f_17_1","glicemia maxima":"f_17_1",
  "diurese":"f_7_0","dialise":"f_8_0","drenos":"f_10_0","balanco hidrico":"f_12_0","bh":"f_12_0","total de entradas":"f_3_0",
  "peep":"f_32_1","fio2":"f_33_1","ph":"f_34_0","be":"f_34_1","po2":"f_35_0","sato2":"f_35_1","pco2":"f_36_0","bicarbonato":"f_36_1","pao2/fio2":"f_37_0",
  "hb":"f_38_1","hemoglobina":"f_38_1","hematocrito":"f_38_0","leucocitos":"f_39_0","bastoes":"f_39_1","plaquetas":"f_40_0",
  "rni":"f_41_0","kptt":"f_41_1","calcio":"f_42_0","fibrinogenio":"f_42_1",
  "na":"f_43_0","na+":"f_43_0","sodio":"f_43_0","k":"f_43_1","k+":"f_43_1","potassio":"f_43_1",
  "creatinina":"f_44_0","ureia":"f_44_1","lactato":"f_45_0","svo2":"f_45_1","pcr":"f_47_0","mg":"f_47_1","magnesio":"f_47_1",
  "bt":"f_48_0","bid":"f_48_1","tgo":"f_49_0","tgp":"f_49_1","amilase":"f_50_0","gama-gt":"f_50_1","lipase":"f_51_0",
  "acido urico":"f_51_1","d-dimero":"f_52_0","ferritina":"f_52_1","bnp":"f_53_0","albumina":"f_53_1","troponina":"f_54_1",
};

// Deliberately limited to explicit label/value pairs. A narrative without a clear label remains for review.
export function extractExplicitCells(text:string):CellProposal {
  const result:CellProposal={};
  for(const line of text.split(/[\n;]+/)){
    const match=line.trim().match(/^#*\s*([\p{L}\p{N}+./ −-]{1,35})\s*[:=]\s*(.{1,100})$/u);
    if(!match)continue;
    const key=aliases[normalize(match[1]).replace(/\.$/,"")];
    const value=match[2].trim();
    if(key && value && !value.includes(":") && !result[key])result[key]=value;
  }
  return result;
}

export function proposalFromDays(days:unknown,date:string):CellProposal {
  if(!Array.isArray(days))return {};
  const matching=days.filter(x=>x&&typeof x==="object"&&
    (typeof x.date==="string"&&(x.date===date||x.date===date.split("-").reverse().join("/"))));
  const day=matching.length===1?matching[0]:null;
  if(!day||!day.cells||typeof day.cells!=="object")return {};
  const result:CellProposal={};
  for(const [row,pair] of Object.entries(day.cells)){
    if(!/^(?:[0-9]|[1-4][0-9]|5[0-4])$/.test(row))continue;
    const values=Array.isArray(pair)?pair:[pair];
    for(let slot=0;slot<2;slot++){
      const value=values[slot];
      if(typeof value==="string"&&value.trim()&&value.length<=300&&fichaFields.some(f=>f.key===`f_${row}_${slot}`))result[`f_${row}_${slot}`]=value.trim();
    }
  }
  return result;
}

export function mergeFields(existing:Data,proposal:CellProposal){
  const data={...existing},conflicts:string[]=[];let added=0;
  for(const [key,value] of Object.entries(proposal)){
    if(!fichaFields.some(f=>f.key===key)||!value.trim())continue;
    if(data[key]?.trim()){if(data[key].trim()!==value.trim())conflicts.push(key);continue;}
    data[key]=value;added++;
  }
  return {data,conflicts,added};
}

export function mergeSheet(sheet:SheetState,date:string,proposal:CellProposal){
  const formatted=date.split("-").reverse().join("/");
  const day=sheet.dates.indexOf(formatted)>=0?sheet.dates.indexOf(formatted):sheet.dates.indexOf("");
  if(day<0)throw Error("Selecione ou adicione o dia na ficha antes de importar.");
  const cells={...sheet.cells},conflicts:string[]=[];let added=0;
  for(const [key,value] of Object.entries(proposal)){
    const match=key.match(/^f_(\d{1,2})_([01])$/);
    if(!match||!fichaFields.some(f=>f.key===key)||!value.trim())continue;
    const cellKey=`${day}:${match[1]}:${match[2]}`;
    if(cells[cellKey]?.trim()){if(cells[cellKey].trim()!==value.trim())conflicts.push(key);continue;}
    cells[cellKey]=value;added++;
  }
  return {sheet:{...sheet,dates:sheet.dates.map((value,index)=>index===day?formatted:value),cells},day,conflicts,added};
}
