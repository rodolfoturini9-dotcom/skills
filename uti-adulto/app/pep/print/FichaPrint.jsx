import React, { useRef, useLayoutEffect } from 'react';
import {getCell, isoToBR,slotsOf} from '../core/icuStore.js';
import {FICHA_TEMPLATE} from './fichaReferenceTemplate.js';
import './fichaReference.css';
// Estrutura e regras físicas extraídas integralmente do modelo indicado pelo usuário.
export default function FichaPrint({bed,id='print-ficha',className=''}) {
 const root=useRef(null);
 useLayoutEffect(()=>{
  const el=root.current;
  const values={admission:isoToBR(bed.admissionDate),bed:bed.bedId,patient:bed.patientName};
  el.querySelectorAll('input').forEach(input=>{
   input.readOnly=true;input.removeAttribute('placeholder');
   if(input.dataset.dateDay!==undefined) input.value=isoToBR(bed.dates[Number(input.dataset.dateDay)]);
   else if(input.dataset.row!==undefined) {const row=Number(input.dataset.row),slot=Number(input.dataset.slot);input.value=slotsOf(row).includes(slot)?getCell(bed,Number(input.dataset.day),row,slot):'';}
   else input.value=values[input.id]||'';
  });
 },[bed]);
 return <div ref={root} id={id} className={`ficha-reference ${className}`} dangerouslySetInnerHTML={{__html:FICHA_TEMPLATE}}/>;
}
