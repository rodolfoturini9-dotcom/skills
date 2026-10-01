import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const patients = sqliteTable("patients", {
  id: text("id").primaryKey(),
  bed: text("bed").notNull(),
  name: text("name").notNull(),
  age: text("age").notNull().default(""),
  mrn: text("mrn").notNull().default(""),
  admissionAt: text("admission_at").notNull().default(""),
  icuAdmissionAt: text("icu_admission_at").notNull().default(""),
  status: text("status").notNull().default("atencao"),
  diagnoses: text("diagnoses").notNull().default(""),
  medicalHistory: text("medical_history").notNull().default(""),
  summary: text("summary").notNull().default(""),
  respSupport: text("resp_support").notNull().default(""),
  respDetail: text("resp_detail").notNull().default(""),
  hemoSupport: text("hemo_support").notNull().default(""),
  hemoDetail: text("hemo_detail").notNull().default(""),
  neuroStatus: text("neuro_status").notNull().default(""),
  rass: text("rass").notNull().default(""),
  camIcu: text("cam_icu").notNull().default(""),
  renalDetail: text("renal_detail").notNull().default(""),
  diuresis24h: text("diuresis_24h").notNull().default(""),
  balance24h: text("balance_24h").notNull().default(""),
  antibiotics: text("antibiotics").notNull().default(""),
  cultures: text("cultures").notNull().default(""),
  infectionDetail: text("infection_detail").notNull().default(""),
  diet: text("diet").notNull().default(""),
  glucose: text("glucose").notNull().default(""),
  labs: text("labs").notNull().default(""),
  devices: text("devices").notNull().default(""),
  vte: text("vte").notNull().default(""),
  stressUlcer: text("stress_ulcer").notNull().default(""),
  skinMobility: text("skin_mobility").notNull().default(""),
  abcdef: text("abcdef").notNull().default(""),
  sofa2: text("sofa2").notNull().default(""),
  goalsOfCare: text("goals_of_care").notNull().default(""),
  todayGoals: text("today_goals").notNull().default(""),
  handoff: text("handoff").notNull().default(""),
  contingency: text("contingency").notNull().default(""),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: text("patient_id").notNull(),
  text: text("text").notNull(),
  priority: text("priority").notNull().default("normal"),
  dueAt: text("due_at").notNull().default(""),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: text("patient_id").notNull(),
  occurredAt: text("occurred_at").notNull(),
  kind: text("kind").notNull().default("clinico"),
  text: text("text").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const evolutions = sqliteTable("evolutions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: text("patient_id").notNull(),
  evolutionDate: text("evolution_date").notNull(),
  text: text("text").notNull(),
  printJson: text("print_json").notNull().default(""),
  sourceVersion: integer("source_version").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("evolutions_patient_date_unique").on(table.patientId, table.evolutionDate),
]);

export const dailyGoals = sqliteTable("daily_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: text("patient_id").notNull(),
  goalDate: text("goal_date").notNull(),
  text: text("text").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("daily_goals_patient_date_idx").on(table.patientId, table.goalDate),
]);

export const medicalDocuments = sqliteTable("medical_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  patientId: text("patient_id").notNull(),
  kind: text("kind").notNull().default("relatorio"),
  title: text("title").notNull(),
  documentDate: text("document_date").notNull(),
  recipient: text("recipient").notNull().default(""),
  purpose: text("purpose").notNull().default(""),
  content: text("content").notNull(),
  cid: text("cid").notNull().default(""),
  cidAuthorized: integer("cid_authorized", { mode: "boolean" }).notNull().default(false),
  prescriberName: text("prescriber_name").notNull().default(""),
  prescriberCrm: text("prescriber_crm").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("medical_documents_patient_date_idx").on(table.patientId, table.documentDate),
]);

export const prescribers = sqliteTable("prescribers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  crm: text("crm").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("prescribers_name_crm_unique").on(table.name, table.crm),
]);

export const customMedications = sqliteTable("custom_medications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  text: text("text").notNull(),
  weightBased: integer("weight_based", { mode: "boolean" }).notNull().default(false),
  unit: text("unit"),
  minDose: real("min_dose"),
  maxDose: real("max_dose"),
  concentration: real("concentration"),
  concentrationUnit: text("concentration_unit"),
  formula: text("formula"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("custom_medications_name_idx").on(table.name),
]);

export const clinicalRecords = sqliteTable('clinical_records', {
 sequence:integer('sequence').primaryKey({autoIncrement:true}),id:text('id').notNull(),patientId:text('patient_id').notNull(),kind:text('kind').notNull(),date:text('date').notNull(),version:integer('version').notNull(),status:text('status').notNull(),data:text('data').notNull(),author:text('author').notNull(),source:text('source').notNull(),savedAt:text('saved_at').notNull(),
},t=>[uniqueIndex('clinical_record_revision').on(t.id,t.version),index('clinical_patient_kind_date').on(t.patientId,t.kind,t.date)]);
export const clinicalAudit=sqliteTable('clinical_audit',{id:integer('id').primaryKey({autoIncrement:true}),patientId:text('patient_id').notNull().default(''),action:text('action').notNull(),author:text('author').notNull(),at:text('at').notNull(),before:text('before'),after:text('after')});
export const accessSessions=sqliteTable('access_sessions',{id:text('id').primaryKey(),expires:integer('expires').notNull(),lastSeen:integer('last_seen').notNull()});
export const accessAttempts=sqliteTable('access_attempts',{id:text('id').primaryKey(),attempts:integer('attempts').notNull(),resetAt:integer('reset_at').notNull()});
export const dailySheets=sqliteTable('daily_sheets',{
 patientId:text('patient_id').primaryKey(), admission:text('admission').notNull().default(''),
 data:text('data').notNull(), version:integer('version').notNull().default(1),
 updatedAt:text('updated_at').notNull(), author:text('author').notNull(),
});

// Revisões integrais do novo frontend; antigas tabelas e dados permanecem preservados.
export const pepRevisions=sqliteTable('pep_revisions',{
 version:integer('version').primaryKey(),operationId:text('operation_id').notNull(),
 data:text('data').notNull(),sourceData:text('source_data').notNull(),
 author:text('author').notNull(),savedAt:text('saved_at').notNull(),
},t=>[uniqueIndex('pep_operation_unique').on(t.operationId)]);
