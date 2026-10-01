const respond=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
type Sheet={patient:string;admission:string;bed:string;dates:string[];cells:Record<string,string>;sourceText?:string};
function validSheet(s:Sheet){
 if(!s||typeof s.patient!=='string'||typeof s.bed!=='string'||typeof s.admission!=='string'||!Array.isArray(s.dates)||s.dates.length<6||s.dates.length>730||s.dates.some(x=>typeof x!=='string'||x.length>20)||(s.sourceText!==undefined&&(typeof s.sourceText!=='string'||s.sourceText.length>40000))||!s.cells||typeof s.cells!=='object'||Array.isArray(s.cells)||Object.keys(s.cells).length>80300) return false;
 return Object.entries(s.cells).every(([k,v])=>/^(0|[1-9]\d{0,2}):([0-9]|[1-4][0-9]|5[0-4]):([01])$/.test(k)&&Number(k.split(':')[0])<s.dates.length&&typeof v==='string'&&v.length<=300);
}
export async function handleSheetApi(request:Request,db:D1Database){try{
 const url=new URL(request.url),patientId=url.searchParams.get('patientId')||'';
 if(!/^[\w-]{1,100}$/.test(patientId))return respond({error:'Paciente inválido'},400);
 const patient=await db.prepare('SELECT id,name,bed,admission_at AS admission FROM patients WHERE id=?').bind(patientId).first<{id:string;name:string;bed:string;admission:string}>();
 if(!patient)return respond({error:'Paciente não encontrado'},404);
 if(request.method==='GET'){
  const row=await db.prepare('SELECT data,version FROM daily_sheets WHERE patient_id=?').bind(patientId).first<{data:string;version:number}>();
  return respond({sheet:row?JSON.parse(row.data):{patient:patient.name,admission:patient.admission,bed:patient.bed,dates:Array(6).fill(''),cells:{}},version:row?.version||0});
 }
 if(request.method!=='POST')return respond({error:'Método não permitido'},405);
 const raw=await request.text();if(raw.length>2000000)return respond({error:'Ficha excede tamanho permitido'},413);
 const input=JSON.parse(raw) as {sheet:Sheet;version:number};if(!validSheet(input.sheet)||!Number.isInteger(input.version)||input.version<0)return respond({error:'Dados da ficha inválidos'},400);
 if(input.sheet.patient!==patient.name)return respond({error:'Nome divergente do cadastro. Atualize o paciente no painel.'},409);
 const before=await db.prepare('SELECT data,version FROM daily_sheets WHERE patient_id=?').bind(patientId).first<{data:string;version:number}>();
 if((before?.version||0)!==input.version)return respond({error:'A ficha foi alterada em outra aba. Exporte sua cópia e recarregue antes de continuar.',version:before?.version||0},409);
 const now=new Date().toISOString(),version=input.version+1;
 const result=input.version===0
  ? await db.prepare('INSERT OR IGNORE INTO daily_sheets(patient_id,admission,data,version,updated_at,author) VALUES (?,?,?,?,?,?)').bind(patientId,input.sheet.admission,JSON.stringify(input.sheet),version,now,'Usuário autenticado').run()
  : await db.prepare('UPDATE daily_sheets SET admission=?,data=?,version=?,updated_at=?,author=? WHERE patient_id=? AND version=?').bind(input.sheet.admission,JSON.stringify(input.sheet),version,now,'Usuário autenticado',patientId,input.version).run();
 if(!result.meta.changes)return respond({error:'Conflito de edição. Recarregue a ficha.'},409);
 await db.prepare('INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (?,?,?,?,?,?)').bind(patientId,'ficha.save','Usuário autenticado',now,before?.data||null,JSON.stringify(input.sheet)).run();
 return respond({version,updatedAt:now});
 }catch(e){return respond({error:e instanceof SyntaxError?'JSON inválido':e instanceof Error?e.message:'Falha ao salvar ficha'},400);}}
export async function interpretSheet(request:Request,key:string){
 if(!key)return respond({error:'A interpretação integrada depende da chave de IA configurada. Use o prompt de extração e cole o JSON para revisão.'},503);
 try{
  const raw=await request.text();if(raw.length>8000000)return respond({error:'Entrada muito grande'},413);
  const body=JSON.parse(raw) as {text?:string;image?:string;day?:number};
  if(!Number.isInteger(body.day)||Number(body.day)<0||Number(body.day)>5)return respond({error:'Dia inválido'},400);
  if((!body.text||body.text.length>40000)&&!body.image)return respond({error:'Informe o texto ou a imagem'},400);
  if(body.image&&(!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(body.image)||body.image.length>7000000))return respond({error:'Imagem inválida ou acima do limite'},400);
  const schema={type:'object',additionalProperties:false,properties:{
   patient:{type:'string'},admission:{type:'string'},bed:{type:'string'},
   days:{type:'array',items:{type:'object',additionalProperties:false,properties:{
    day:{type:'integer'},date:{type:'string'},
    cells:{type:'array',items:{type:'object',additionalProperties:false,properties:{row:{type:'integer'},slot:{type:'integer'},value:{type:'string'}},required:['row','slot','value']}},
   },required:['day','date','cells']}},
  },required:['patient','admission','bed','days']};
  const content:Array<Record<string,unknown>>=[{type:'input_text',text:`Extraia somente dados explícitos da ficha de UTI. Transcreva todos os dias visíveis, preservando a posição da coluna como day de 0 a 5 (Dia 1 = 0). Se o texto não apresentar colunas, utilize somente day=${body.day}. Não invente datas, unidades ou valores, não calcule nem corrija. Deixe paciente, admissão, leito e data vazios se ilegíveis. Omita células vazias. Mapa: 0 TOT/TQT; 1 CVC/CVC; 2 PAI/SVD; 3 entradas; 4 hemocomponentes; 5-6 livres; 7 diurese; 8 diálise; 9 fezes/estase; 10 drenos; 11 livre; 12 balanço hídrico; 13 PAM mín/máx; 14 FC mín/máx; 15 FR mín/máx; 16 temperatura mín/máx; 17 glicemia mín/máx; 18 PIA/PIC/PVC; 19-22 ATB; 23-25 DVA; 26-29 sedação; 30 GCS/RASS e pupilas; 31 modo ventilatório; 32 volume minuto/PEEP; 33 FR/FiO2; 34 pH/BE; 35 pO2/SatO2; 36 pCO2/bicarbonato; 37 PaO2/FiO2; 38 VG/Hb; 39 leucócitos/bastões; 40 plaquetas; 41 RNI/KPTT; 42 cálcio/fibrinogênio; 43 Na/K; 44 creatinina/ureia; 45 lactato/SvO2; 46 ΔCO2/TEC; 47 PCR/Mg; 48 BT/BiD; 49 TGO/TGP; 50 amilase/Gama-GT; 51 lipase/ácido úrico; 52 D-dímero/ferritina; 53 BNP/albumina; 54 MB/troponina. Texto fornecido: ${body.text||''}`}];
  if(body.image)content.push({type:'input_image',image_url:body.image,detail:'high'});
  const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-5-mini',store:false,max_output_tokens:8000,input:[{role:'user',content}],text:{format:{type:'json_schema',name:'ficha_uti_extracao',strict:true,schema}}}),signal:AbortSignal.timeout(45000)});
  const payload=await response.json() as {output?:Array<{content?:Array<{type?:string;text?:string}>}>};if(!response.ok)throw Error('Falha na interpretação');
  const output=payload.output?.flatMap(x=>x.content||[]).find(x=>x.type==='output_text')?.text;
  const parsed=JSON.parse(output||'{}') as {patient?:unknown;admission?:unknown;bed?:unknown;days?:unknown};
  const days=Array.from({length:6},()=>({date:'',cells:{} as Record<string,string[]>}));
  for(const proposed of Array.isArray(parsed.days)?parsed.days.slice(0,6):[]){
   if(!proposed||typeof proposed!=='object'||!Number.isInteger(proposed.day)||proposed.day<0||proposed.day>5)continue;
   const d=proposed.day as number;
   const date=typeof proposed.date==='string'?proposed.date.trim():'';
   if(date&&/^\d{2}\/\d{2}\/\d{4}$/.test(date))days[d].date=date;
   for(const item of Array.isArray(proposed.cells)?proposed.cells.slice(0,110):[]){
    if(!item||typeof item!=='object'||!Number.isInteger(item.row)||![0,1].includes(item.slot)||!Number.isInteger(item.slot)||item.row<0||item.row>54||typeof item.value!=='string')continue;
    const row=String(item.row),value=item.value.trim().slice(0,300);
    if(!value)continue;
    const pair=days[d].cells[row]||['',''];if(!pair[item.slot])pair[item.slot]=value;days[d].cells[row]=pair;
   }
  }
  return respond({patient:typeof parsed.patient==='string'?parsed.patient.trim().slice(0,200):'',admission:typeof parsed.admission==='string'?parsed.admission.trim().slice(0,20):'',bed:typeof parsed.bed==='string'?parsed.bed.trim().slice(0,30):'',days});
 }catch(e){return respond({error:e instanceof SyntaxError?'Resposta não estruturada; revise manualmente.':'Não foi possível interpretar. Use o prompt externo ou preenchimento manual.'},502);}
}
