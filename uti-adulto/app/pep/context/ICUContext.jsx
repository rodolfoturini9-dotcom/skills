import React,{createContext,useCallback,useContext,useEffect,useMemo,useRef,useState} from 'react';
import {mergeBackup} from '../core/backupMerge.js';
import {A,BED_IDS,icuReducer,createInitialState,deriveHandoff,deriveHRIVPassagem,censusOf,referenceDay} from '../core/icuStore.js';
const ICUContext=createContext(null);
export function ICUProvider({children}){
 const [state,setState]=useState(createInitialState),[saveStatus,setSaveStatus]=useState('loading'),[error,setError]=useState(''),[sessionExpired,setSessionExpired]=useState(false),[remoteChange,setRemoteChange]=useState(false);
 const latest=useRef(state),meta=useRef(null),queue=useRef([]),sending=useRef(false),timer=useRef(null),blocked=useRef(false),pending=useRef(null);
 latest.current=state;
 const refresh=useCallback(async()=>{if(sending.current)throw Error('Aguarde a resposta do salvamento antes de recarregar.');if((queue.current.length||pending.current)&&!window.confirm('Há alterações não confirmadas. Recarregar mantém uma cópia para recuperação nesta sessão. Continuar?'))return;
  if(queue.current.length||pending.current)window.__pepUnsavedRecovery={state:latest.current,actions:[...(pending.current?.actions||[]),...queue.current]};
  const r=await fetch('/api/pep',{cache:'no-store'}),data=await r.json();if(r.status===401)setSessionExpired(true);if(!r.ok)throw Error(data.error||'Não foi possível carregar.');meta.current={version:data.version,sourceToken:data.sourceToken};queue.current=[];pending.current=null;blocked.current=false;const keep=latest.current;const next=data.state.beds?.[keep.activeBedId]&&!keep.reviewEpisodeId?{...data.state,activeBedId:keep.activeBedId}:data.state;latest.current=next;setState(next);setSaveStatus('saved');setError('');setSessionExpired(false);setRemoteChange(false);
 },[]);
 useEffect(()=>{refresh().catch(e=>{setError(e.message);setSaveStatus('error');});},[refresh]);
 const flush=useCallback(async()=>{
  if(sending.current||blocked.current||(!queue.current.length&&!pending.current)||!meta.current)return;
  sending.current=true;const batch=pending.current||{...meta.current,requestId:crypto.randomUUID(),actions:queue.current.splice(0,100)};pending.current=batch;setSaveStatus('saving');
  try{const r=await fetch('/api/pep',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(batch),keepalive:false});const data=await r.json();if(r.status===401)setSessionExpired(true);if(!r.ok)throw Error((data.error||'Falha ao salvar.')+(data.errorId?' (referência '+data.errorId+')':''));if(data.replayed&&data.savedVersion!==data.version&&queue.current.length)throw Error('A gravação anterior foi confirmada, mas há alterações em outra sessão. Preserve o rascunho e recarregue.');pending.current=null;setSessionExpired(false);meta.current={version:data.version,sourceToken:data.sourceToken};let next={...data.state,activeBedId:latest.current.activeBedId,reviewEpisodeId:latest.current.reviewEpisodeId};for(const a of queue.current)next=icuReducer(next,a);latest.current=next;setState(next);setSaveStatus(queue.current.length?'saving':'saved');setError('');
  }catch(e){blocked.current=true;setSaveStatus('error');setError(e.message+' As alterações permanecem nesta sessão; exporte o rascunho antes de recarregar.');}
  finally{sending.current=false;if(queue.current.length&&!blocked.current)timer.current=setTimeout(flush,250);}
 },[]);
 const dispatch=useCallback(action=>{
  if(action.type===A.SET_ACTIVE_BED){latest.current={...latest.current,activeBedId:action.bedId,reviewEpisodeId:null};setState(latest.current);return;}
  if(action.type==='SELECT_EPISODE'){latest.current={...latest.current,reviewEpisodeId:action.patientId};setState(latest.current);return;}
  if(!meta.current||blocked.current){setError('Conexão pendente ou conflito. Exporte seu rascunho e recarregue para continuar.');return;}
  if(action.type===A.IMPORT_CHART&&(sending.current||queue.current.length||pending.current)){setError('Aguarde a confirmação do salvamento antes de aplicar a organização.');return;}
  if(latest.current.reviewEpisodeId&&action.type!=='RESTORE_EPISODE'){setError('Histórico arquivado em consulta. Restaure para editar.');return;}
  const b=latest.current.beds[action.bedId];if(b?.status==='empty'&&action.type===A.UPDATE_BED&&[...(pending.current?.actions||[]),...queue.current].some(a=>a.type===A.UPDATE_BED&&a.bedId===action.bedId)){setError('Admissão sendo salva. Aguarde a confirmação antes de enviar novamente.');return;}const prepared={...action,patientId:b?.patientId,episodeId:b?.episodeId};
  let next;
  if(action.type===A.DISCHARGE_BED){next={...latest.current,archivedEpisodes:{...latest.current.archivedEpisodes,[b.patientId]:{...b,archived:true}},beds:{...latest.current.beds,[b.bedId]:createInitialState().beds[b.bedId]}};}
  else if(action.type==='RESTORE_EPISODE'){const old=latest.current.archivedEpisodes[action.patientId];if(!old||latest.current.beds[action.toBedId]?.status!=='empty'){setError('Selecione um leito livre.');return;}prepared.patientId=action.patientId;const archive={...latest.current.archivedEpisodes};delete archive[action.patientId];next={...latest.current,reviewEpisodeId:null,activeBedId:action.toBedId,archivedEpisodes:archive,beds:{...latest.current.beds,[action.toBedId]:{...old,bedId:action.toBedId,archived:false}}};}
  else if(action.type==='MERGE_BACKUP'){try{next=mergeBackup(latest.current,action.state);}catch(e){setError(e.message);return;}}
  else {try{next=icuReducer(latest.current,prepared);}catch(e){setError(e.message);return;}}
  // UUIDs de novas internações são atribuídos pelo servidor. Bloqueia edição até a confirmação.
  if(b?.status==='empty'&&action.type===A.UPDATE_BED)next=latest.current;
  latest.current=next;setState(next);queue.current.push(prepared);setSaveStatus('saving');clearTimeout(timer.current);timer.current=setTimeout(flush,250);
  return true;
 },[flush]);
 // Sincronização entre dispositivos: com a fila vazia, verifica periodicamente se outra sessão salvou
 // e recarrega automaticamente; com alterações locais pendentes, apenas avisa.
 useEffect(()=>{const check=async()=>{if(document.visibilityState!=='visible'||!meta.current||blocked.current)return;try{const r=await fetch('/api/pep?op=meta',{cache:'no-store'});if(r.status===401){setSessionExpired(true);return;}if(!r.ok)return;const m=await r.json();if(m.version===meta.current?.version&&m.sourceToken===meta.current?.sourceToken)return;if(sending.current||queue.current.length||pending.current){setRemoteChange(true);return;}await refresh();}catch{}};const id=setInterval(check,45000);const onVisible=()=>{if(document.visibilityState==='visible')void check();};document.addEventListener('visibilitychange',onVisible);return()=>{clearInterval(id);document.removeEventListener('visibilitychange',onVisible);};},[refresh]);
 useEffect(()=>{const warn=e=>{if(queue.current.length||pending.current||sending.current){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);const hide=()=>{if(document.visibilityState==='hidden')void flush();};document.addEventListener('visibilitychange',hide);return()=>{window.removeEventListener('beforeunload',warn);document.removeEventListener('visibilitychange',hide);clearTimeout(timer.current);};},[flush]);
 const actions=useMemo(()=>({
  setActiveBed:bedId=>dispatch({type:A.SET_ACTIVE_BED,bedId}),updateBed:(bedId,patch)=>dispatch({type:A.UPDATE_BED,bedId,patch}),setStatus:(bedId,status)=>dispatch({type:A.SET_STATUS,bedId,status}),
  setCell:(bedId,day,row,slot,value)=>dispatch({type:A.SET_CELL,bedId,day,row,slot,value}),setCells:(bedId,cells)=>dispatch({type:A.SET_CELLS,bedId,cells}),setDate:(bedId,day,value,cascade=true)=>dispatch({type:A.SET_DATE,bedId,day,value,cascade}),copyPrevDay:(bedId,day)=>dispatch({type:A.COPY_PREV_DAY,bedId,day}),clearDay:(bedId,day)=>dispatch({type:A.CLEAR_DAY,bedId,day}),
  dischargeBed:bedId=>dispatch({type:A.DISCHARGE_BED,bedId}),movePatient:(bedId,toBedId)=>dispatch({type:A.MOVE_PATIENT,bedId,toBedId}),setEvolucao:(bedId,evolucao)=>dispatch({type:A.SET_EVOLUCAO,bedId,evolucao}),
  updateHandoff:(bedId,patch)=>dispatch({type:A.UPDATE_HANDOFF,bedId,patch}),addCheck:(bedId,texto)=>dispatch({type:A.ADD_CHECK,bedId,texto}),toggleCheck:(bedId,id)=>dispatch({type:A.TOGGLE_CHECK,bedId,id}),removeCheck:(bedId,id)=>dispatch({type:A.REMOVE_CHECK,bedId,id}),saveMedication:medication=>dispatch({type:A.SAVE_MEDICATION,medication}),
  viewEpisode:patientId=>dispatch({type:'SELECT_EPISODE',patientId}),restoreEpisode:(patientId,toBedId)=>dispatch({type:'RESTORE_EPISODE',patientId,toBedId}),
  importState:state=>dispatch({type:'MERGE_BACKUP',state}),
  importChart:(bedId,document,choices,metadata,reviewVersion)=>dispatch({type:A.IMPORT_CHART,bedId,document,choices,metadata,reviewVersion}),
 }),[dispatch]);
 const exportFile=(data,name)=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));Object.assign(document.createElement('a'),{href:url,download:name}).click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const exportBackup=useCallback(async()=>{try{const r=await fetch('/api/pep?op=backup',{cache:'no-store'});if(!r.ok)throw Error('Falha no backup.');exportFile(await r.json(),'uti-backup-'+new Date().toISOString().slice(0,10)+'.json');}catch(e){setError(e.message);}},[]);
 const view=state.reviewEpisodeId&&state.archivedEpisodes?.[state.reviewEpisodeId]?{...state,activeBedId:'history',beds:{...state.beds,history:state.archivedEpisodes[state.reviewEpisodeId]}}:state;
 const activeBed=view.beds[view.activeBedId]||view.beds['01'];
 return <ICUContext.Provider value={{state:view,dispatch,actions,saveStatus,exportBackup,bedIds:BED_IDS,activeBed,passagem:deriveHRIVPassagem(state),census:censusOf(state),refresh,apiMeta:meta.current}}>
 {sessionExpired&&<div role="alert" className="inline-notice no-print">Sessão expirada por inatividade. Entre novamente em outra aba (o rascunho desta aba é preservado) e depois toque em “Tentar salvar novamente”.<a className="secondary-btn" href="/" target="_blank" rel="noopener">Entrar em nova aba</a></div>}
 {remoteChange&&!error&&<div role="status" className="inline-notice no-print">Outro dispositivo salvou alterações. Elas serão carregadas quando suas alterações forem confirmadas.<button className="secondary-btn" onClick={()=>refresh().catch(e=>setError(e.message))}>Recarregar agora</button></div>}
 {error&&<div role="alert" className="inline-notice no-print">{error}<button className="secondary-btn" onClick={()=>exportFile({state:latest.current,actions:[...(pending.current?.actions||[]),...queue.current]},'uti-rascunho-nao-confirmado.json')}>Exportar rascunho</button><button className="secondary-btn" onClick={()=>{blocked.current=false;void flush();}}>Tentar salvar novamente</button><button className="secondary-btn" onClick={()=>refresh().catch(e=>setError(e.message))}>Recarregar</button></div>}
 {meta.current?children:<div className="empty-state">{saveStatus==='error'?'Não foi possível abrir os registros.':'Carregando registros protegidos…'}</div>}
 </ICUContext.Provider>;
}
export function useICU(){const ctx=useContext(ICUContext);if(!ctx)throw Error('ICUProvider ausente');return ctx;}
export function useBed(bedId){const {state,actions}=useICU();const id=bedId??state.activeBedId;const bed=state.beds[id];return useMemo(()=>({bed,refDay:referenceDay(bed),handoff:deriveHandoff(bed),update:patch=>actions.updateBed(id,patch),setCell:(day,row,slot,value)=>actions.setCell(id,day,row,slot,value),setDate:(day,value,cascade)=>actions.setDate(id,day,value,cascade),copyPrevDay:day=>actions.copyPrevDay(id,day),clearDay:day=>actions.clearDay(id,day),setEvolucao:evolucao=>actions.setEvolucao(id,evolucao)}),[bed,id,actions]);}
