import React from 'react';
import PatientDailyPanel from '../components/PatientDailyPanel.jsx';
import ChartOrganizer from '../components/ChartOrganizer.jsx';
import ClinicalAssistant from '../components/ClinicalAssistant.jsx';
import { useBed } from '../context/ICUContext.jsx';
import { deriveSituacao,isoToBR,referenceDay } from '../core/icuStore.js';
import { splitClinicalText } from '../services/textEvolution.js';
export function ClinicalSections({text}) {
 const sections=splitClinicalText(text);
 return <div className="clinical-grid">{sections.map((s,i)=><section className={`clinical-card ${s.lines.join('').length>450?'clinical-wide':''}`} key={i}><h3>{s.title}</h3><div>{s.lines.map((line,j)=><p key={j}>{line}</p>)}</div></section>)}</div>;
}
export default function PatientOverview({onNavigate}) {
 const {bed,handoff,update}=useBed();
 if(bed.status==='empty')return <div className="empty-state"><h2>Leito {bed.bedId} disponível</h2><p>Admita um paciente no mapa de leitos.</p><button className="primary-btn" onClick={()=>onNavigate('leitos')}>Mapa de leitos</button></div>;
 const support=deriveSituacao(bed);
 return <div className="patient-overview"><section className="patient-identity"><div><span className="eyebrow">PAINEL DO PACIENTE · LEITO {bed.bedId}</span><h2>{bed.patientName}</h2><p>{[bed.age&&`${bed.age} anos`,bed.weight.value&&`${bed.weight.value} kg${bed.weight.isEstimated?' (estimado)':''}`,bed.admissionDate&&`Admissão UTI ${isoToBR(bed.admissionDate)}`].filter(Boolean).join(' · ')}</p></div><div className="patient-actions"><button className="secondary-btn" onClick={()=>onNavigate('prescricao')}>Prescrição</button><button className="secondary-btn" onClick={()=>onNavigate('ficha')}>Preencher ficha</button><button className="primary-btn" onClick={()=>onNavigate('evolucao')}>Registrar evolução</button></div></section>
 <div className="overview-columns"><section className="overview-block"><h3>Diagnósticos e hipóteses</h3>{handoff.diagnosticos.length?<ul>{handoff.diagnosticos.map((d,i)=><li key={i}>{d}</li>)}</ul>:<p className="muted">Nenhum diagnóstico registrado.</p>}</section><section className="overview-block"><h3>Pendências do plantão</h3>{handoff.checklist.length?<ul>{handoff.checklist.map(c=><li key={c.id}><span className={c.status==='realizado'?'task-done':'task-pending'}>{c.status==='realizado'?'Concluído':'Pendente'}</span> {c.texto}</li>)}</ul>:<p className="muted">Nenhuma ação registrada no checklist.</p>}<button className="text-btn" onClick={()=>onNavigate('passagem')}>Abrir passagem de plantão</button></section></div>
 {support.length>0 && <><div className="section-heading"><h2>Ficha de referência · {isoToBR(bed.dates[referenceDay(bed)])||''}</h2><button className="text-btn" onClick={()=>onNavigate('ficha')}>Editar ficha diária</button></div><div className="clinical-grid">{support.map(s=><section className="clinical-card" key={s.titulo}><h3>{s.titulo}</h3><div>{s.itens.map((v,i)=><p key={i}>{v}</p>)}</div></section>)}</div></>}
 <ClinicalAssistant key={bed.episodeId} bed={bed}/>
 <ChartOrganizer bed={bed}/>
 <PatientDailyPanel bed={bed} onRegister={date=>{update({evolutionDate:date});onNavigate('evolucao');}}/>
 {!bed.evolucao?.clinicalDate&&<><div className="section-heading"><h2>Evolução médica</h2>{bed.evolucao&&<span className="muted">{new Date(bed.evolucao.editadoEm||bed.evolucao.geradoEm).toLocaleString('pt-BR')}</span>}</div>
 {bed.evolucao?.texto?<ClinicalSections text={bed.evolucao.texto}/>:<section className="empty-state compact"><p>A evolução será apresentada em seções após o registro.</p><button className="secondary-btn" onClick={()=>onNavigate('evolucao')}>Inserir evolução</button></section>}
 </>}
 </div>;
}
