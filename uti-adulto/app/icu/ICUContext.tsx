'use client';

import {createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';

export type Patient = {id:string;bed:string;name:string;age:string;mrn:string;admissionAt:string;icuAdmissionAt:string;diagnoses:string;medicalHistory:string;summary:string;respSupport:string;respDetail:string;hemoSupport:string;hemoDetail:string;antibiotics:string;devices:string;handoff:string;archived:boolean;updatedAt:string;[key:string]:unknown};
export type Goal = {id:number;patientId:string;goalDate:string;text:string;completed:boolean};
export type Task = {id:number;patientId:string;text:string;completed:boolean;completedAt?:string;priority:string;dueAt:string};
export type Evolution = {id:number;patientId:string;evolutionDate:string;text:string;printJson?:string;sourceVersion?:number};
export type Sheet = {patient:string;admission:string;bed:string;dates:string[];cells:Record<string,string>;sourceText?:string};
export type SheetEntry = {sheet:Sheet;version:number};
export type DayMatrix = [string,string][];
export type HandoffEntry = {patient:Patient;sheet:Sheet|null;day:number;date:string;goals:Goal[];tasks:Task[];diagnoses:string;antecedents:string;history:string;support:string;plan:string;pendingText:string};
type Snapshot = {patients:Patient[];dailyGoals:Goal[];tasks:Task[];evolutions:Evolution[];customMedications:unknown[]};
type ContextValue = {snapshot:Snapshot;sheets:Record<string,SheetEntry>;selectedId:string|null;select:(id:string|null)=>void;loading:boolean;error:string;refresh:()=>Promise<void>;mutate:(body:Record<string,unknown>)=>Promise<void>;updateSheetEntry:(id:string,entry:SheetEntry)=>void;handoff:HandoffEntry[]};

const EMPTY:Snapshot={patients:[],dailyGoals:[],tasks:[],evolutions:[],customMedications:[]};
const Context=createContext<ContextValue|null>(null);
const bedOrder=(a:Patient,b:Patient)=>a.bed.localeCompare(b.bed,'pt-BR',{numeric:true});
const dateToISO=(date:string)=>{const match=date.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);return match?`${match[3]}-${match[2]}-${match[1]}`:''};
export function latestDay(sheet:Sheet|null):number {if(!sheet)return -1;const occupied=new Set(Object.entries(sheet.cells).filter(([,value])=>value?.trim()).map(([key])=>Number(key.split(':')[0])));for(let d=sheet.dates.length-1;d>=0;d--)if(sheet.dates[d]||occupied.has(d))return d;return -1;}
export function sheetMatrix(sheet:Sheet|null):DayMatrix[]{return Array.from({length:6},(_,day)=>Array.from({length:55},(_,row)=>[sheet?.cells[`${day}:${row}:0`]||'',sheet?.cells[`${day}:${row}:1`]||''] as [string,string]));}
export function valuesFor(sheet:Sheet|null,day:number,rows:number[]):string[]{return !sheet||day<0?[]:rows.flatMap(row=>[0,1].map(slot=>sheet.cells[`${day}:${row}:${slot}`]?.trim()||'').filter(Boolean));}
export function buildHandoff(snapshot:Snapshot,sheets:Record<string,SheetEntry>):HandoffEntry[]{
 return snapshot.patients.filter(p=>!p.archived).sort(bedOrder).slice(0,10).map(patient=>{
  const sheet=sheets[patient.id]?.sheet||null,day=latestDay(sheet);
  const patientGoals=snapshot.dailyGoals.filter(g=>g.patientId===patient.id);
  const date=[dateToISO(sheet?.dates[day]||''),...patientGoals.map(g=>g.goalDate)].filter(Boolean).sort().at(-1)||'';
  const evolution=snapshot.evolutions.find(e=>e.patientId===patient.id&&e.evolutionDate===date);
  let reviewed:Partial<Record<'diagnoses'|'antecedents'|'summary'|'supports'|'devices'|'antibiotics'|'plan'|'pending',string>>={};
  if(evolution?.printJson){try{const parsed=JSON.parse(evolution.printJson) as unknown;if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))reviewed=parsed as typeof reviewed}catch{}}
  const reviewedText=(key:keyof typeof reviewed)=>typeof reviewed[key]==='string'?reviewed[key]:'';
  const goals=patientGoals.filter(g=>g.goalDate===date);
  const tasks=snapshot.tasks.filter(t=>t.patientId===patient.id&&(!t.completed||!!date&&!!t.completedAt?.startsWith(date)));
  const support=[...valuesFor(sheet,day,[0,1,2,23,24,25,26,27,28,29,31,32,33]),reviewedText('supports'),reviewedText('devices'),reviewedText('antibiotics'),patient.respSupport,patient.hemoSupport].filter(Boolean).join(' · ');
  const plan=[reviewedText('plan'),...goals.filter(g=>!g.completed).map(g=>g.text)].filter(Boolean).join(' · ');
  return {patient,sheet,day,date,goals,tasks,diagnoses:patient.diagnoses||reviewedText('diagnoses'),antecedents:patient.medicalHistory||reviewedText('antecedents'),history:patient.summary||reviewedText('summary'),support,plan,pendingText:reviewedText('pending')};
 });
}

export function ICUProvider({children}:{children:ReactNode}){
 const [snapshot,setSnapshot]=useState<Snapshot>(EMPTY),[sheets,setSheets]=useState<Record<string,SheetEntry>>({});
 const [selectedId,setSelectedId]=useState<string|null>(()=>{try{return typeof window==='undefined'?null:sessionStorage.getItem('uti-selected-bed')}catch{return null}}),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const select=useCallback((id:string|null)=>{setSelectedId(id);try{if(id)sessionStorage.setItem('uti-selected-bed',id);else sessionStorage.removeItem('uti-selected-bed');}catch{}},[]);
 const refresh=useCallback(async()=>{
  try{
   const response=await fetch('/api/icu',{cache:'no-store'});
   if(!response.ok)throw Error(response.status===401?'Sessão expirada. Entre novamente.':'Falha ao carregar os leitos.');
   const data=await response.json() as Snapshot;
   setSnapshot(data);setError('');
   const active=data.patients.filter(p=>!p.archived).sort(bedOrder).slice(0,10);
   const entries=await Promise.all(active.map(async patient=>{
    const r=await fetch(`/api/ficha?patientId=${encodeURIComponent(patient.id)}`,{cache:'no-store'});
    if(!r.ok)throw Error(`Não foi possível carregar a ficha do leito ${patient.bed}.`);
    return [patient.id,await r.json() as SheetEntry] as const;
   }));
   setSheets(Object.fromEntries(entries) as Record<string,SheetEntry>);
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar os dados.');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{const timer=window.setTimeout(()=>void refresh(),0);return()=>window.clearTimeout(timer);},[refresh]);
 const mutate=useCallback(async(body:Record<string,unknown>)=>{
  const response=await fetch('/api/icu',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const result=await response.json() as {error?:string};if(!response.ok)throw Error(result.error||'Não foi possível salvar.');await refresh();
 },[refresh]);
 const updateSheetEntry=useCallback((id:string,entry:SheetEntry)=>setSheets(current=>({...current,[id]:entry})),[]);
 const handoff=useMemo(()=>buildHandoff(snapshot,sheets),[snapshot,sheets]);
 return <Context.Provider value={{snapshot,sheets,selectedId,select,loading,error,refresh,mutate,updateSheetEntry,handoff}}>{children}</Context.Provider>;
}
export function useICU(){const value=useContext(Context);if(!value)throw Error('ICUProvider ausente');return value;}
export {dateToISO};
