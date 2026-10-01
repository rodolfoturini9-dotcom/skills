import React,{useState} from 'react';
import {FICHA_GROUPS,DAYS,FICHA_ROWS,slotsOf,mobileLabel,getCell,isoToBR} from '../core/icuStore.js';
export default function FichaTrends({bed}) {
 const [group,setGroup]=useState(FICHA_GROUPS.find(g=>g.rows.includes(13))?.id||FICHA_GROUPS[0].id);
 const selected=FICHA_GROUPS.find(g=>g.id===group);
 return <section className="overview-block no-print ficha-trends"><div className="section-heading"><h3>Comparativo dos seis dias</h3><label>Sistema <select aria-label="Sistema do comparativo" value={group} onChange={e=>setGroup(e.target.value)}>{FICHA_GROUPS.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label></div><p className="muted">Registros da ficha por coluna. Ganhos, perdas e sinais vitais: intervalo das 07h do dia anterior às 07h da data indicada.</p><div className="trends-scroll"><table><thead><tr><th>Parâmetro</th>{DAYS.map(d=><th key={d}>D{d+1}<small>{isoToBR(bed.dates[d])||'Sem data'}</small></th>)}</tr></thead><tbody>{selected.rows.flatMap(r=>slotsOf(r).map(s=><tr key={`${r}:${s}`}><th>{mobileLabel(r,s)}</th>{DAYS.map(d=><td key={d}>{getCell(bed,d,r,s)||'—'}</td>)}</tr>))}</tbody></table></div></section>;
}
