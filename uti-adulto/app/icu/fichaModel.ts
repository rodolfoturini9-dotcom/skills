import type {Sheet} from './ICUContext';

export type FichaRow={id:number;labels:[string,string?];single:boolean;editable:boolean};
export type FichaGroup={name:string;start:number;rows:FichaRow[]};
const row=(id:number,a:string,b?:string):FichaRow=>({id,labels:[a,b],single:b===undefined,editable:id!==11});
export const FICHA_GROUPS:FichaGroup[]=[
 {name:'ACESSOS',start:0,rows:[row(0,'TOT','TQT'),row(1,'cvc.','cvc.'),row(2,'PAI','SVD')]},
 {name:'GANHOS',start:3,rows:[row(3,'TOTAL DE ENTRADAS'),row(4,'HEMOCOMPONENTES'),row(5,''),row(6,'')]},
 {name:'PERDAS',start:7,rows:[row(7,'DIURESE'),row(8,'DIÁLISE'),row(9,'FEZES','ESTASE'),row(10,'DRENOS'),row(11,''),row(12,'BALANÇO HÍDRICO')]},
 {name:'DADOS VITAIS',start:13,rows:[row(13,'PAM - min','PAM - máx'),row(14,'FC - min','FC - máx'),row(15,'FR - min','FR - máx'),row(16,'T - min','T - máx'),row(17,'GLIC. - min','GLIC. - máx'),row(18,'PIA/PIC/PVC')]},
 {name:'ATB',start:19,rows:[row(19,''),row(20,''),row(21,''),row(22,'')]},
 {name:'DVA',start:23,rows:[row(23,''),row(24,''),row(25,'')]},
 {name:'SEDAÇÃO',start:26,rows:[row(26,''),row(27,''),row(28,''),row(29,'')]},
 {name:'NEURO',start:30,rows:[row(30,'GCS/RASS','PUPÍLAS')]},
 {name:'VENTIL',start:31,rows:[row(31,'MODO VENT.'),row(32,'VOL. MÍN','PEEP'),row(33,'FR','FiO2')]},
 {name:'GASO',start:34,rows:[row(34,'pH','BE'),row(35,'pO2','SatO2'),row(36,'pCO2','bic'),row(37,'PaO2 / FiO2')]},
 {name:'HEMATO',start:38,rows:[row(38,'VG','Hb'),row(39,'LEUCO','BASTÕES'),row(40,'PLAQUETAS'),row(41,'RNI','KPTT'),row(42,'CÁLCIO','FIBRIN.')]},
 {name:'METAB.',start:43,rows:[row(43,'Na+','K+'),row(44,'CREAT','UREIA'),row(45,'LACTATO','SvO2'),row(46,'ΔCo2','TEC'),row(47,'PCR','Mg++'),row(48,'BT','BiD'),row(49,'TGO','TGP'),row(50,'AMILASE','GAMA-GT'),row(51,'LIPASE','AC. ÚRICO'),row(52,'D-DÍMERO','FERRITINA'),row(53,'BNP','Albumina')]},
 {name:'CARDIO',start:54,rows:[row(54,'MB','TROPO')]},
];
export const FICHA_ROWS=FICHA_GROUPS.flatMap(g=>g.rows);
export const cellKey=(day:number,row:number,slot:number)=>`${day}:${row}:${slot}`;
export const toBr=(iso:string)=>iso&&/^\d{4}-\d{2}-\d{2}$/.test(iso)?iso.split('-').reverse().join('/') : '';
export const fromBr=(br:string)=>/^\d{2}\/\d{2}\/\d{4}$/.test(br)?br.split('/').reverse().join('-'):'';
export function copyPrevious(sheet:Sheet,day:number):Sheet {
 if(day<1||day>=sheet.dates.length)throw Error('Selecione um dia após o primeiro.');
 const cells={...sheet.cells};for(const row of FICHA_ROWS){if(!row.editable)continue;for(let slot=0;slot<(row.single?1:2);slot++){const source=cells[cellKey(day-1,row.id,slot)];const target=cellKey(day,row.id,slot);if(source&&!cells[target]?.trim())cells[target]=source;}}
 return {...sheet,cells};
}
export function clearDay(sheet:Sheet,day:number):Sheet {
 const cells=Object.fromEntries(Object.entries(sheet.cells).filter(([key])=>!key.startsWith(`${day}:`)));
 return {...sheet,dates:sheet.dates.map((v,i)=>i===day?'':v),cells};
}
export type Extracted={patient?:string;admission?:string;bed?:string;days:Array<{date?:string;cells?:Record<string,string[]>}>};
export function mergeExtracted(sheet:Sheet,proposal:Extracted,offset=0):{sheet:Sheet;added:number;conflicts:number}{
 if(proposal.patient?.trim()&&proposal.patient.trim()!==sheet.patient.trim())throw Error('O nome extraído difere do paciente selecionado.');
 if(proposal.bed?.trim()&&proposal.bed.trim()!==sheet.bed.trim())throw Error('O leito extraído difere do cadastro.');
 let added=0,conflicts=0;const cells={...sheet.cells},dates=[...sheet.dates];
 for(let index=0;index<Math.min(6,proposal.days?.length||0);index++){
  const item=proposal.days[index];if(!item||typeof item!=='object')continue;
  const matching=item.date?dates.indexOf(item.date):-1;
  const day=matching>=0?matching:offset+index;if(day>=dates.length)continue;
  if(item.date&&/^\d{2}\/\d{2}\/\d{4}$/.test(item.date)){if(dates[day]&&dates[day]!==item.date)conflicts++;else dates[day]=item.date;}
  for(const [index,pair] of Object.entries(item.cells||{})){
   const row=Number(index),meta=FICHA_ROWS[row];if(!Number.isInteger(row)||!meta||!meta.editable||!Array.isArray(pair))continue;
   for(let slot=0;slot<(meta.single?1:2);slot++){
    const value=pair[slot];if(typeof value!=='string'||!value.trim()||value.length>300)continue;
    const key=cellKey(day,row,slot);if(cells[key]?.trim()){if(cells[key].trim()!==value.trim())conflicts++;}else {cells[key]=value.trim();added++;}
   }
  }
 }
 return {sheet:{...sheet,dates,cells},added,conflicts};
}
export function mergeBackup(sheet:Sheet,backup:unknown):{sheet:Sheet;added:number;conflicts:number}{
 if(!backup||typeof backup!=='object')throw Error('Arquivo de ficha inválido.');
 const candidate=backup as Partial<Sheet>;
 if(candidate.patient!==sheet.patient||candidate.bed!==sheet.bed)throw Error('Backup pertence a outro paciente ou leito.');
 if(!Array.isArray(candidate.dates)||candidate.dates.length<6||candidate.dates.length>730||!candidate.cells||typeof candidate.cells!=='object'||Array.isArray(candidate.cells))throw Error('Matriz de dias inválida.');
 const cells={...sheet.cells},dates=[...sheet.dates];let added=0,conflicts=0;
 while(dates.length<candidate.dates.length)dates.push('');
 for(let d=0;d<candidate.dates.length;d++){const value=candidate.dates[d];if(typeof value!=='string'||(value&&!/^\d{2}\/\d{2}\/\d{4}$/.test(value)))throw Error('Data inválida no backup.');if(value){if(dates[d]&&dates[d]!==value)conflicts++;else dates[d]=value;}}
 for(const [key,value] of Object.entries(candidate.cells)){
  const match=key.match(/^(0|[1-9]\d{0,2}):([0-9]|[1-4][0-9]|5[0-4]):([01])$/);if(!match||Number(match[1])>=candidate.dates.length||typeof value!=='string'||value.length>300)throw Error('Célula inválida no backup.');
  const row=FICHA_ROWS[Number(match[2])];if(!row.editable||(row.single&&match[3]==='1'))continue;
  if(!value.trim())continue;
  if(cells[key]?.trim()){if(cells[key].trim()!==value.trim())conflicts++;}else {cells[key]=value;added++;}
 }
 return {sheet:{...sheet,dates,cells},added,conflicts};
}
