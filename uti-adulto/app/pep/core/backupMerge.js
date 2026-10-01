import {episodeEntries} from './productionBridge.js';
import {mergeDailyRecords} from './dailyHistory.js';
export function backupState(file){if(file?.format!=='uti-pep-backup-v1'||!file.tables||!Array.isArray(file.tables.pep_revisions))throw Error('Use um backup central compatível com identificadores estáveis.');const newest=[...file.tables.pep_revisions].sort((a,b)=>b.version-a.version)[0];if(!newest)throw Error('Backup sem revisão do novo sistema. Use a importação legada revisada.');const state=JSON.parse(newest.data);if(!state?.beds||!state.archivedEpisodes)throw Error('Estrutura do backup inválida.');return state;}
export function mergeBackup(current,incoming){
 const result=JSON.parse(JSON.stringify(current));const ids=new Set();
 for(const old of episodeEntries(incoming)){
  if(!old.patientId||!old.episodeId||ids.has(old.episodeId))throw Error('Internação ausente ou repetida no backup.');ids.add(old.episodeId);
  const existing=episodeEntries(result).find(b=>b.patientId===old.patientId&&b.episodeId===old.episodeId);
  if(!existing){result.archivedEpisodes[old.patientId]={...old,archived:true};continue;}
  if(existing.patientName!==old.patientName)throw Error('Nome divergente para o mesmo identificador. Revisão necessária.');
  const records=mergeDailyRecords(existing);for(const [date,record]of Object.entries(mergeDailyRecords(old))){if(!records[date]){records[date]=record;continue;}const live=records[date];for(const [key,value]of Object.entries(record.cells||{})){if(!value)continue;if(live.cells?.[key]&&live.cells[key]!==value)throw Error('Valor divergente no histórico do mesmo paciente/data. Importação bloqueada sem aplicação parcial.');live.cells={...live.cells,[key]:value};}
   const versions=[...(live.evolutionRevisions||[])];for(const v of record.evolutionRevisions||[])if(!versions.some(x=>x.texto===v.texto&&x.clinicalDate===v.clinicalDate))versions.push(v);live.evolutionRevisions=versions;if(!live.evolution)live.evolution=record.evolution;
  }existing.dailyRecords=records;
  for(const rx of old.prescriptions||[]){const saved=(existing.prescriptions||[]).find(x=>x.id===rx.id);if(saved&&JSON.stringify(saved)!==JSON.stringify(rx))throw Error('Prescrição divergente: os parâmetros originais devem ser preservados.');if(!saved)existing.prescriptions=[...(existing.prescriptions||[]),rx];}
  for(const item of old.handoff?.checklist||[])if(!existing.handoff.checklist.some(c=>c.id===item.id))existing.handoff.checklist.push(item);
  // Os valores existentes da folha ativa prevalecem; o histórico importado não muda a folha atual.
 }
 for(const m of incoming.customMedications||[])if(!(result.customMedications||[]).some(c=>c.id===m.id))result.customMedications=[...(result.customMedications||[]),m];
 result.importedLegacyBackups=[...(result.importedLegacyBackups||[]),incoming.legacyPreserved].filter(Boolean);
 return result;
}
