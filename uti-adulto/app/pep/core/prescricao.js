export const UNITS=['mcg/kg/min','mcg/kg/h','mg/kg/min','mg/kg/h','mcg/min','mcg/h','mg/min','mg/h','UI/kg/min','UI/kg/h','UI/min','UI/h'];
export function number(value,label='Valor') {
 const s=String(value??'').trim().replace(',','.');
 if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)) throw new Error(`${label}: informe um número válido.`);
 const n=Number(s);if(!Number.isFinite(n)||n<=0)throw new Error(`${label}: use um valor maior que zero.`);return n;
}
export function rate(dose,unit,weight,concentration,concUnit) {
 if(!UNITS.includes(unit))throw new Error('Unidade de dose não suportada.');
 if(!['mcg/mL','mg/mL','UI/mL'].includes(concUnit))throw new Error('Informe a concentração da solução final em mg/mL, mcg/mL ou UI/mL.');
 const [mass]=unit.split('/');const cm=concUnit.split('/')[0];
 if((mass==='UI')!==(cm==='UI'))throw new Error('UI não pode ser convertida em mg ou mcg.');
 const factor=mass===cm?1:mass==='mg'?1000:0.001;
 return number(dose,'Dose')*(unit.includes('/kg/')?number(weight,'Peso'):1)*(unit.endsWith('/min')?60:1)*factor/number(concentration,'Concentração');
}
export const fmt=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:4});
export function calculate(m,desired,weight) {
 const initial=number(m.dose_min,'Dose inicial'),max=number(m.dose_max,'Dose máxima'),target=number(desired,'Dose desejada');
 if(initial>max)throw new Error('A dose inicial é maior que a máxima cadastrada.');
 if(target<initial||target>max)throw new Error('A dose desejada está fora da faixa cadastrada. Revise a dose ou os limites do protocolo.');
 const args=[m.unidade,weight,m.concentracao,m.unidade_conc];
 const rates=[initial,target,max].map(d=>rate(d,...args));
 if(rates.some(r=>!Number.isFinite(r)||r<=0))throw new Error('Taxa de infusão inválida.');
 if(rates.some(r=>Number(r.toFixed(4))===0))throw new Error('Taxa inferior à precisão exibida. Revise a diluição e a programação da bomba.');
 return {initial,target,max,rates};
}
export function prescriptionText(m,result,weight) {
 if(!m.prescricao?.trim())throw new Error('Preencha a receita e a diluição.');
 if(!result)return m.prescricao.trim();
 return `${m.prescricao.trim().replace(/\s+/g,' ')} # Iniciar com ${fmt(result.rates[1])} mL/h #`;
}
export function clearance(age,weight,creatinine,sex) {
 const a=number(age,'Idade');if(a<18||a>=140)throw new Error('Cockcroft–Gault: informe idade adulta entre 18 e 139 anos.');
 if(!['M','F'].includes(sex))throw new Error('Informe o sexo para Cockcroft–Gault.');
 return ((140-a)*number(weight,'Peso'))/(72*number(creatinine,'Creatinina'))*(sex==='F'?0.85:1);
}
export async function copyText(text) {
 if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return;}catch{}}
 const el=document.createElement('textarea');el.value=text;el.style.position='fixed';el.style.opacity='0';document.body.append(el);el.select();const ok=document.execCommand('copy');el.remove();if(!ok)throw new Error('Selecione o texto e copie manualmente.');
}
