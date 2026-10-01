// Organização determinística de texto: copia conteúdo, sem gerar achados ou condutas.
import { TEMPLATE_ID } from './clinicalTemplate.js';
export function splitClinicalText(text='') {
 const sections=[]; let current=null;
 for(const line of text.split('\n')) {
  const value=line.trim();
  if(!value) continue;
  const marked=/^#{1,3}\s*(.+?)(?::\s*(.*))?$/.exec(value);
  const colon=/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ /()–-]{2,75}):\s*(.*)$/.exec(value);
  // Texto clínico em caixa alta também pode ser conteúdo; só rótulos conhecidos
  // sem # ou : são títulos. Evita perder narrativas ao organizar uma evolução.
  const uppercase=value===value.toUpperCase() && /^(hd|hmp|hma|hda|diagnosticos(?:\s*\/\s*hipoteses)?|hipoteses diagnosticas|antecedentes|historia (?:atual|medica pregressa)|exame fisico(?: direcionado)?|exames(?: complementares)?|avaliacao|condutas|plano do dia(?:\s*\/\s*condutas)?|pendencias|metas e pendencias|intercorrencias|dispositivos invasivos|sinais vitais, controles e balanco hidrico|terapias em curso e suporte organico|fast-hug modificado|resumo clinico e evolucao nas ultimas 24 horas)$/.test(value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase());
  const match=marked || colon;
  if(match || uppercase) { current={title:match?match[1]:value,lines:[]}; sections.push(current); if(match?.[2])current.lines.push(match[2]); }
  else { if(!current) {current={title:'Evolução médica',lines:[]};sections.push(current);} current.lines.push(line); }
 }
 return sections.filter(s=>s.lines.length);
}
const normalized=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function evolutionFromText(text, previous=null) {
 const sections=splitClinicalText(text);
 const payload={template:TEMPLATE_ID,texto_formatado:text.trim(),diagnosticos_atuais:[]};
 for(const s of sections) {
  const title=normalized(s.title); const lines=s.lines.map(l=>l.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean);
  if(/diagnost|hipotes|^hd$/.test(title))payload.diagnosticos_atuais.push(...lines);
  else if(/anteced|^hmp$|historia medica pregressa/.test(title))payload.antecedentes={...(payload.antecedentes||{}),comorbidades:lines.join('\n')};
  else if(/condut|plano|^cd$/.test(title))payload.condutas=[...(payload.condutas||[]),...lines];
  else if(/pendenc|metas/.test(title))payload.pendencias=[...(payload.pendencias||[]),...lines];
  else if(/resumo|historia|^hda$|^hma$/.test(title))payload.resumo_internacao=[payload.resumo_internacao,lines.join('\n')].filter(Boolean).join('\n');
 }
 return {texto:text.trim(),payload,model:'Texto registrado pelo médico',geradoEm:previous?.geradoEm||new Date().toISOString(),editadoEm:new Date().toISOString(),source:'manual',sections};
}
