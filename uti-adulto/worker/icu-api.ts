import {extractionInstructions} from "../app/clinical/prompts";
import {fichaFields} from "../app/clinical/model";
type PatientInput = Record<string, unknown>;

const clean = (value: unknown) =>
  typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();

const patientFields = [
  ["bed", "bed"], ["name", "name"], ["age", "age"], ["mrn", "mrn"],
  ["admissionAt", "admission_at"], ["icuAdmissionAt", "icu_admission_at"], ["status", "status"],
  ["diagnoses", "diagnoses"], ["medicalHistory", "medical_history"], ["summary", "summary"], ["respSupport", "resp_support"],
  ["respDetail", "resp_detail"], ["hemoSupport", "hemo_support"], ["hemoDetail", "hemo_detail"],
  ["neuroStatus", "neuro_status"], ["rass", "rass"], ["camIcu", "cam_icu"],
  ["renalDetail", "renal_detail"], ["diuresis24h", "diuresis_24h"], ["balance24h", "balance_24h"],
  ["antibiotics", "antibiotics"], ["cultures", "cultures"], ["infectionDetail", "infection_detail"],
  ["diet", "diet"], ["glucose", "glucose"], ["labs", "labs"], ["devices", "devices"],
  ["vte", "vte"], ["stressUlcer", "stress_ulcer"], ["skinMobility", "skin_mobility"],
  ["abcdef", "abcdef"], ["sofa2", "sofa2"], ["goalsOfCare", "goals_of_care"],
  ["todayGoals", "today_goals"], ["handoff", "handoff"], ["contingency", "contingency"],
] as const;

function normalizePatient(input: PatientInput) {
  const result: Record<string, string> = {};
  for (const [key] of patientFields) result[key] = clean(input[key]);
  if (!["critico", "atencao", "estavel", "transferencia"].includes(result.status)) result.status = "atencao";
  return result;
}


const patientSelect = `SELECT
  id, bed, name, age, mrn, admission_at AS admissionAt, icu_admission_at AS icuAdmissionAt,
  status, diagnoses, medical_history AS medicalHistory, summary, resp_support AS respSupport, resp_detail AS respDetail,
  hemo_support AS hemoSupport, hemo_detail AS hemoDetail, neuro_status AS neuroStatus,
  rass, cam_icu AS camIcu, renal_detail AS renalDetail, diuresis_24h AS diuresis24h,
  balance_24h AS balance24h, antibiotics, cultures, infection_detail AS infectionDetail,
  diet, glucose, labs, devices, vte, stress_ulcer AS stressUlcer, skin_mobility AS skinMobility,
  abcdef, sofa2, goals_of_care AS goalsOfCare, today_goals AS todayGoals, handoff, contingency,
  archived, created_at AS createdAt, updated_at AS updatedAt
  FROM patients ORDER BY lower(bed), lower(name), id`;

async function getSnapshot(db: any, aiAvailable = false) {
  const [patientResult, taskResult, eventResult, evolutionResult, goalResult, documentResult, prescriberResult, medicationResult] = await db.batch([
    db.prepare(patientSelect),
    db.prepare(`SELECT id, patient_id AS patientId, text, priority, due_at AS dueAt, completed,
      completed_at AS completedAt, created_at AS createdAt FROM tasks ORDER BY completed ASC, created_at DESC LIMIT 500`),
    db.prepare(`SELECT id, patient_id AS patientId, occurred_at AS occurredAt, kind, text,
      created_at AS createdAt FROM events ORDER BY occurred_at DESC, id DESC LIMIT 500`),
    db.prepare(`SELECT id, patient_id AS patientId, evolution_date AS evolutionDate, text,
      print_json AS printJson, source_version AS sourceVersion,
      created_at AS createdAt, updated_at AS updatedAt
      FROM evolutions ORDER BY evolution_date DESC, updated_at DESC, id DESC LIMIT 1000`),
    db.prepare(`SELECT id, patient_id AS patientId, goal_date AS goalDate, text, completed,
      completed_at AS completedAt, created_at AS createdAt
      FROM daily_goals ORDER BY goal_date DESC, completed ASC, id DESC LIMIT 2000`),
    db.prepare(`SELECT id, patient_id AS patientId, kind, title, document_date AS documentDate,
      recipient, purpose, content, cid, cid_authorized AS cidAuthorized,
      prescriber_name AS prescriberName, prescriber_crm AS prescriberCrm,
      created_at AS createdAt, updated_at AS updatedAt
      FROM medical_documents ORDER BY document_date DESC, updated_at DESC, id DESC LIMIT 1000`),
    db.prepare(`SELECT id, name, crm, created_at AS createdAt FROM prescribers ORDER BY lower(name), lower(crm), id`),
    db.prepare(`SELECT id, name, text, weight_based AS weightBased, unit,
      min_dose AS minDose, max_dose AS maxDose, concentration, concentration_unit AS concentrationUnit,
      formula, notes, created_at AS createdAt
      FROM custom_medications ORDER BY lower(name), id`),
  ]);

  return {
    patients: (patientResult.results as Array<Record<string, unknown>>).map((row) => ({ ...row, archived: Boolean(row.archived) })),
    tasks: (taskResult.results as Array<Record<string, unknown>>).map((row) => ({ ...row, completed: Boolean(row.completed) })),
    events: eventResult.results,
    evolutions: evolutionResult.results,
    dailyGoals: (goalResult.results as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      completed: Boolean(row.completed),
    })),
    documents: (documentResult.results as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      cidAuthorized: Boolean(row.cidAuthorized),
    })),
    prescribers: prescriberResult.results,
    customMedications: (medicationResult.results as Array<Record<string, unknown>>).map((row) => ({
      ...row,
      id: `custom-${row.id}`,
      weightBased: Boolean(row.weightBased),
    })),
    aiAvailable,
  };
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const aiPatientFields = patientFields
  .map(([key]) => key)
  .filter((key) => !["bed", "name", "age", "mrn", "admissionAt", "icuAdmissionAt", "status"].includes(key));

function responseOutputText(payload: Record<string, unknown>) {
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? (item as Record<string, unknown>).content as Array<Record<string, unknown>>
      : [];
    for (const part of content) {
      if (part.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
}

async function analyzeClinicalText(text: string, date: string, apiKey: string) {
  const patientProperties = Object.fromEntries(aiPatientFields.map((key) => [key, { type: "string" }]));
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      patient: {
        type: "object",
        additionalProperties: false,
        properties: patientProperties,
        required: aiPatientFields,
      },
      dailyGoals: { type: "array", items: { type: "string" } },
      day: {
        type: "object", additionalProperties: false,
        properties: {
          date: { type: "string" },
          cells: { type: "array", items: {
            type: "object", additionalProperties: false,
            properties: { row: { type: "integer" }, slot: { type: "integer" }, value: { type: "string" } },
            required: ["row","slot","value"],
          } },
        },
        required: ["date","cells"],
      },
    },
    required: ["patient", "dailyGoals", "day"],
  };
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5-mini",
      store: false,
      instructions: extractionInstructions + `\nData escolhida pelo usuário: ${date}. Em day.date, transcreva somente a data explícita do texto em dd/mm/aaaa; deixe vazia se ausente. Em day.cells, use índices da ficha 0 a 54 e slot 0/1 apenas para valores explícitos; sem inferências. Linhas: 0 TOT/TQT, 1 CVC/CVC, 2 PAI/SVD, 3 entradas, 4 hemocomponentes, 7 diurese, 8 diálise, 9 fezes/estase, 10 drenos, 12 balanço, 13 PAM mín/máx, 14 FC mín/máx, 15 FR mín/máx, 16 temperatura mín/máx, 17 glicemia mín/máx, 18 PIA/PIC/PVC, 19-22 ATB, 23-25 DVA, 26-29 sedação, 30 GCS/RASS/pupilas, 31 modo ventilatório, 32 volume minuto/PEEP, 33 FR/FiO2, 34 pH/BE, 35 pO2/SatO2, 36 pCO2/bicarbonato, 37 PaO2/FiO2, 38 VG/Hb, 39 leucócitos/bastões, 40 plaquetas, 41 RNI/KPTT, 42 cálcio/fibrinogênio, 43 Na/K, 44 creatinina/ureia, 45 lactato/SvO2, 46 ΔCO2/TEC, 47 PCR/Mg, 48 BT/BiD, 49 TGO/TGP, 50 amilase/Gama-GT, 51 lipase/ácido úrico, 52 D-dímero/ferritina, 53 BNP/albumina, 54 MB/troponina.`,
      input: text,
      text: { format: { type: "json_schema", name: "icu_clinical_extraction", strict: true, schema } },
    }),
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok) throw new Error("OpenAI request failed");
  const outputText = responseOutputText(payload);
  if (!outputText) throw new Error("Empty OpenAI response");
  return JSON.parse(outputText) as { patient?: Record<string, unknown>; dailyGoals?: unknown[]; day?: {date?:unknown;cells?:unknown} };
}

export async function handleIcuApi(request: Request, db: any, openAiKey = ""): Promise<Response> {
  try {


    if (request.method === "GET") return json(await getSnapshot(db, Boolean(openAiKey)));
    if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

    const body = (await request.json()) as Record<string, unknown>;
    const action = clean(body.action);

    if (action === "createPatient") {
      const input = normalizePatient((body.patient ?? {}) as PatientInput);
      if (!input.bed || !input.name) return json({ error: "Leito e nome são obrigatórios." }, 400);
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const columns = patientFields.map(([, column]) => column);
      const values = patientFields.map(([key]) => input[key]);
      const placeholders = patientFields.map(() => "?").join(", ");
      await db.batch([
        db.prepare(`INSERT INTO patients (id, ${columns.join(", ")}, created_at, updated_at)
          VALUES (?, ${placeholders}, ?, ?)` ).bind(id, ...values, now, now),
        db.prepare(`INSERT INTO events (patient_id, occurred_at, kind, text) VALUES (?, ?, ?, ?)`)
          .bind(id, now, "administrativo", "Paciente incluído no painel de acompanhamento."),
      ]);
      return json({ ok: true, id }, 201);
    }

    if (action === "updatePatient") {
      const id = clean(body.id);
      const input = normalizePatient((body.patient ?? {}) as PatientInput);
      if (!id || !input.bed || !input.name) return json({ error: "Identificação do paciente incompleta." }, 400);
      const assignments = patientFields.map(([, column]) => `${column} = ?`).join(", ");
      const values = patientFields.map(([key]) => input[key]);
      const expected=clean((body.patient as PatientInput)?.updatedAt);
      const result=await db.prepare(`UPDATE patients SET ${assignments}, updated_at = ? WHERE id = ? AND (?='' OR updated_at=?)`)
        .bind(...values, new Date().toISOString(), id,expected,expected).run();
      if(!result.meta.changes)return json({error:"Paciente alterado em outra aba. Recarregue antes de editar."},409);
      return json({ ok: true });
    }

    if (action === "updateBedContext") {
      const id=clean(body.patientId),field=clean(body.field),value=typeof body.value==='string'?body.value.trim():null;
      const expected=clean(body.expectedUpdatedAt);
      const columns:Record<string,string>={diagnoses:'diagnoses',medicalHistory:'medical_history',summary:'summary'};
      if(!id||!Object.hasOwn(columns,field)||value===null||value.length>10000||!expected)return json({error:'Campo clínico inválido.'},400);
      const current=await db.prepare(`SELECT updated_at AS updatedAt, ${columns[field]} AS previous FROM patients WHERE id=? AND archived=0`).bind(id).first<{updatedAt:string;previous:string}>();
      if(!current)return json({error:'Paciente ativo não encontrado.'},404);
      if(current.updatedAt!==expected)return json({error:'O leito mudou em outra aba. Recarregue antes de salvar.'},409);
      const updatedAt=new Date(Math.max(Date.now(),Date.parse(expected)+1)).toISOString();
      const result=await db.prepare(`UPDATE patients SET ${columns[field]}=?,updated_at=? WHERE id=? AND updated_at=? AND archived=0`).bind(value,updatedAt,id,expected).run();
      if(!result.meta.changes)return json({error:'O leito mudou em outra aba. Recarregue antes de salvar.'},409);
      await db.prepare('INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (?,?,?,?,?,?)').bind(id,`bed_context.${field}`,'Usuário autenticado',updatedAt,JSON.stringify({field,value:current.previous}),JSON.stringify({field,value})).run();
      return json({ok:true,updatedAt});
    }

    if (action === "archivePatient" || action === "restorePatient") {
      const id = clean(body.id);
      if (!id) return json({ error: "Paciente não informado." }, 400);
      await db.prepare(`UPDATE patients SET archived = ?, updated_at = ? WHERE id = ?`)
        .bind(action === "archivePatient" ? 1 : 0, new Date().toISOString(), id).run();
      return json({ ok: true });
    }

    if (action === "addTask") {
      const patientId = clean(body.patientId);
      const text = clean(body.text);
      const priority = clean(body.priority) === "critica" ? "critica" : "normal";
      const dueAt = clean(body.dueAt);
      if (!patientId || !text) return json({ error: "Paciente e pendência são obrigatórios." }, 400);
      await db.prepare(`INSERT INTO tasks (patient_id, text, priority, due_at) VALUES (?, ?, ?, ?)`)
        .bind(patientId, text, priority, dueAt).run();
      return json({ ok: true }, 201);
    }

    if (action === "toggleTask") {
      const id = Number(body.id);
      const completed = Boolean(body.completed);
      if (!Number.isInteger(id)) return json({ error: "Pendência inválida." }, 400);
      await db.prepare(`UPDATE tasks SET completed = ?, completed_at = ? WHERE id = ?`)
        .bind(completed ? 1 : 0, completed ? new Date().toISOString() : null, id).run();
      return json({ ok: true });
    }

    if (action === "addEvent") {
      const patientId = clean(body.patientId);
      const text = clean(body.text);
      const requestedKind = clean(body.kind);
      const kind = ["clinico", "procedimento", "exame", "familia"].includes(requestedKind) ? requestedKind : "clinico";
      const occurredAt = clean(body.occurredAt) || new Date().toISOString();
      if (!patientId || !text) return json({ error: "Paciente e evento são obrigatórios." }, 400);
      await db.prepare(`INSERT INTO events (patient_id, occurred_at, kind, text) VALUES (?, ?, ?, ?)`)
        .bind(patientId, occurredAt, kind, text).run();
      return json({ ok: true }, 201);
    }

    if (action === "saveEvolution") {
      const patientId = clean(body.patientId);
      const evolutionDate = clean(body.evolutionDate);
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!patientId || !/^\d{4}-\d{2}-\d{2}$/.test(evolutionDate) || !text) {
        return json({ error: "Paciente, data e texto da evolução são obrigatórios." }, 400);
      }
      if (text.length > 120000) return json({ error: "A evolução excede o limite de 120.000 caracteres." }, 400);

      const patient = await db.prepare(`SELECT id FROM patients WHERE id = ? LIMIT 1`).bind(patientId).first();
      if (!patient) return json({ error: "Paciente não encontrado." }, 404);

      const print = body.print;
      let printJson = "", sourceVersion = 0;
      if (print !== undefined) {
        const required = ["diagnoses","antecedents","summary","events","controls","systems","supports","devices","antibiotics","prophylaxis","physical","impression","plan","pending","exams","fastHug"];
        if (!print || typeof print !== "object" || Array.isArray(print) || required.some(key => typeof (print as Record<string,unknown>)[key] !== "string" || String((print as Record<string,unknown>)[key]).length > 10000)) return json({error:"Prévia de impressão inválida."},400);
        const version=Number(body.sourceVersion);
        const row=await db.prepare('SELECT data,version FROM daily_sheets WHERE patient_id=?').bind(patientId).first<{data:string;version:number}>();
        const sheet=row?JSON.parse(row.data) as {dates?:string[]}:null;
        if (!Number.isInteger(version)||!row||row.version!==version||!sheet?.dates?.includes(evolutionDate.split('-').reverse().join('/'))) return json({error:'A ficha mudou desde a geração. Gere novamente a prévia antes de salvar.'},409);
        printJson=JSON.stringify(Object.fromEntries(required.map(key=>[key,(print as Record<string,string>)[key]])));
        sourceVersion=version;
      }

      const now = new Date().toISOString();
      const before=await db.prepare('SELECT text,print_json AS printJson,updated_at AS updatedAt FROM evolutions WHERE patient_id=? AND evolution_date=?').bind(patientId,evolutionDate).first<{text:string;printJson:string;updatedAt:string}>();
      await db.prepare(`INSERT INTO evolutions (patient_id, evolution_date, text, print_json, source_version, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(patient_id, evolution_date)
        DO UPDATE SET text = excluded.text, print_json = excluded.print_json, source_version = excluded.source_version, updated_at = excluded.updated_at`)
        .bind(patientId, evolutionDate, text, printJson, sourceVersion, now, now).run();
      await db.prepare('INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (?,?,?,?,?,?)')
        .bind(patientId,'evolution.save','Usuário autenticado',now,before?JSON.stringify(before):null,JSON.stringify({text,printJson,sourceVersion,evolutionDate})).run();
      return json({ ok: true });
    }

    if (action === "addDailyGoal") {
      const patientId = clean(body.patientId);
      const goalDate = clean(body.goalDate);
      const text = clean(body.text);
      if (!patientId || !/^\d{4}-\d{2}-\d{2}$/.test(goalDate) || !text) {
        return json({ error: "Paciente, data e meta/plano são obrigatórios." }, 400);
      }
      if (text.length > 2000) return json({ error: "A meta/plano excede o limite permitido." }, 400);
      const patient = await db.prepare(`SELECT id FROM patients WHERE id = ? LIMIT 1`).bind(patientId).first();
      if (!patient) return json({ error: "Paciente não encontrado." }, 404);
      const result = await db.prepare(`INSERT INTO daily_goals (patient_id, goal_date, text) VALUES (?, ?, ?)`)
        .bind(patientId, goalDate, text).run();
      return json({ ok: true, id: result.meta.last_row_id }, 201);
    }

    if (action === "toggleDailyGoal") {
      const id = Number(body.id);
      const completed = Boolean(body.completed);
      if (!Number.isInteger(id) || id <= 0) return json({ error: "Meta/plano inválido." }, 400);
      await db.prepare(`UPDATE daily_goals SET completed = ?, completed_at = ? WHERE id = ?`)
        .bind(completed ? 1 : 0, completed ? new Date().toISOString() : null, id).run();
      return json({ ok: true });
    }

    if (action === "analyzeClinicalText") {
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!openAiKey) return json({ error: "IA interna ainda não configurada. Utilize o prompt para IA externa." }, 503);
      if (!text || text.length > 30000) return json({ error: "Envie um texto entre 1 e 30.000 caracteres." }, 400);
      const date=clean(body.date);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date)return json({error:"Selecione uma data válida."},400);
      const extracted = await analyzeClinicalText(text, date, openAiKey);
      const patient = Object.fromEntries(Object.entries(extracted.patient ?? {}).filter(([key, value]) => aiPatientFields.includes(key as typeof aiPatientFields[number]) && clean(value)));
      const dailyGoals = Array.isArray(extracted.dailyGoals)
        ? extracted.dailyGoals.map(clean).filter(Boolean).slice(0, 50)
        : [];
      const explicitDate=clean(extracted.day?.date);
      if(explicitDate && explicitDate!==date.split('-').reverse().join('/'))return json({error:"A data identificada no texto difere da data selecionada. Revise antes de aplicar."},409);
      const cells:Record<string,string[]>={};
      for(const entry of Array.isArray(extracted.day?.cells)?extracted.day.cells.slice(0,110):[]){
        if(!entry||typeof entry!=="object")continue;
        const row=Number(entry.row),slot=Number(entry.slot),value=clean(entry.value);
        if(!Number.isInteger(row)||!Number.isInteger(slot)||!fichaFields.some(f=>f.row===row&&f.key===`f_${row}_${slot}`)||!value||value.length>300)continue;
        const pair=cells[String(row)]||["",""];if(!pair[slot])pair[slot]=value;cells[String(row)]=pair;
      }
      return json({ patient, dailyGoals, days:[{date:date.split('-').reverse().join('/'),cells}] });
    }

    if (action === "saveDocument") {
      const source = (body.document ?? {}) as Record<string, unknown>;
      const patientId = clean(source.patientId);
      const id = Number(source.id);
      const requestedKind = clean(source.kind);
      const allowedKinds = ["relatorio", "transferencia", "declaracao", "atestado", "parecer", "livre"];
      const kind = allowedKinds.includes(requestedKind) ? requestedKind : "livre";
      const title = clean(source.title);
      const documentDate = clean(source.documentDate);
      const recipient = clean(source.recipient);
      const purpose = clean(source.purpose);
      const content = typeof source.content === "string" ? source.content.trim() : "";
      const cidAuthorized = Boolean(source.cidAuthorized) && kind === "atestado";
      const cid = cidAuthorized ? clean(source.cid) : "";
      const prescriberName = clean(source.prescriberName);
      const prescriberCrm = clean(source.prescriberCrm);

      if (!patientId || !title || !content || !/^\d{4}-\d{2}-\d{2}$/.test(documentDate)) {
        return json({ error: "Paciente, data, título e conteúdo são obrigatórios." }, 400);
      }
      if (title.length > 200 || recipient.length > 300 || purpose.length > 300 || cid.length > 50 || prescriberName.length > 160 || prescriberCrm.length > 50 || content.length > 120000) {
        return json({ error: "Um ou mais campos excedem o limite permitido." }, 400);
      }
      const patient = await db.prepare(`SELECT id FROM patients WHERE id = ? LIMIT 1`).bind(patientId).first();
      if (!patient) return json({ error: "Paciente não encontrado." }, 404);

      const now = new Date().toISOString();
      if (Number.isInteger(id) && id > 0) {
        const result = await db.prepare(`UPDATE medical_documents SET patient_id = ?, kind = ?, title = ?,
          document_date = ?, recipient = ?, purpose = ?, content = ?, cid = ?, cid_authorized = ?,
          prescriber_name = ?, prescriber_crm = ?, updated_at = ?
          WHERE id = ?`).bind(patientId, kind, title, documentDate, recipient, purpose, content, cid, cidAuthorized ? 1 : 0, prescriberName, prescriberCrm, now, id).run();
        if (!result.meta.changes) return json({ error: "Documento não encontrado." }, 404);
        return json({ ok: true, id });
      }

      const result = await db.prepare(`INSERT INTO medical_documents
        (patient_id, kind, title, document_date, recipient, purpose, content, cid, cid_authorized,
         prescriber_name, prescriber_crm, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(patientId, kind, title, documentDate, recipient, purpose, content, cid, cidAuthorized ? 1 : 0, prescriberName, prescriberCrm, now, now).run();
      return json({ ok: true, id: result.meta.last_row_id }, 201);
    }

    if (action === "addPrescriber") {
      const name = clean(body.name);
      const crm = clean(body.crm).toUpperCase();
      if (!name || !crm) return json({ error: "Nome e CRM são obrigatórios." }, 400);
      if (name.length > 160 || crm.length > 50) return json({ error: "Nome ou CRM excede o limite permitido." }, 400);
      const existing = await db.prepare(`SELECT id FROM prescribers WHERE lower(name) = lower(?) AND lower(crm) = lower(?) LIMIT 1`).bind(name, crm).first();
      if (existing) return json({ ok: true, id: existing.id });
      const result = await db.prepare(`INSERT INTO prescribers (name, crm) VALUES (?, ?)`).bind(name, crm).run();
      return json({ ok: true, id: result.meta.last_row_id }, 201);
    }

    if (action === "addMedication") {
      const source = (body.medication ?? {}) as Record<string, unknown>;
      const name = clean(source.name);
      const text = typeof source.text === "string" ? source.text.trim() : "";
      const weightBased = Boolean(source.weightBased);
      const allowedFormulas = ["mcg/kg/min", "mcg/kg/h", "mg/kg/h", "mg/kg/dose", "mg/kg/day"];
      const formula = weightBased && allowedFormulas.includes(clean(source.formula)) ? clean(source.formula) : null;
      const unit = formula;
      const minDose = source.minDose == null || source.minDose === "" ? null : Number(source.minDose);
      const maxDose = source.maxDose == null || source.maxDose === "" ? null : Number(source.maxDose);
      const concentration = source.concentration == null || source.concentration === "" ? null : Number(source.concentration);
      if(weightBased && clean(source.concentrationUnit) && clean(source.concentrationUnit) !== (formula?.startsWith("mcg/") ? "mcg/mL" : "mg/mL")) throw new Error("Unidade de concentração incompatível com a fórmula");
      const concentrationUnit = weightBased && formula ? (formula.startsWith("mcg/") ? "mcg/mL" : "mg/mL") : null;
      const notes = clean(source.notes);

      if (!name || !text) return json({ error: "Nome e texto da prescrição são obrigatórios." }, 400);
      if (name.length > 180 || text.length > 4000 || notes.length > 1000) return json({ error: "Um ou mais campos excedem o limite permitido." }, 400);
      if (weightBased && (!formula || !Number.isFinite(maxDose) || !Number.isFinite(concentration) || !(Number(maxDose) > 0) || !(Number(concentration) > 0))) {
        return json({ error: "Para cálculo, informe fórmula, dose máxima e concentração maiores que zero." }, 400);
      }
      if (minDose != null && (!Number.isFinite(minDose) || minDose < 0)) return json({ error: "Dose mínima inválida." }, 400);
      if (weightBased && minDose != null && minDose > Number(maxDose)) return json({ error: "A dose mínima não pode superar a máxima." }, 400);

      const result = await db.prepare(`INSERT INTO custom_medications
        (name, text, weight_based, unit, min_dose, max_dose, concentration, concentration_unit, formula, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
          name, text, weightBased ? 1 : 0, unit, minDose, weightBased ? maxDose : null,
          weightBased ? concentration : null, concentrationUnit, formula, notes,
        ).run();
      return json({ ok: true, id: `custom-${result.meta.last_row_id}` }, 201);
    }

    return json({ error: "Operação não reconhecida." }, 400);
  } catch {
    return json({ error: "Não foi possível concluir a operação." }, 500);
  }
}
