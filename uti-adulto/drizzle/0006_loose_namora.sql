CREATE TABLE `access_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`attempts` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `access_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expires` integer NOT NULL,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `clinical_audit` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` text DEFAULT '' NOT NULL,
	`action` text NOT NULL,
	`author` text NOT NULL,
	`at` text NOT NULL,
	`before` text,
	`after` text
);
--> statement-breakpoint
CREATE TABLE `clinical_records` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`patient_id` text NOT NULL,
	`kind` text NOT NULL,
	`date` text NOT NULL,
	`version` integer NOT NULL,
	`status` text NOT NULL,
	`data` text NOT NULL,
	`author` text NOT NULL,
	`source` text NOT NULL,
	`saved_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clinical_record_revision` ON `clinical_records` (`id`,`version`);--> statement-breakpoint
CREATE INDEX `clinical_patient_kind_date` ON `clinical_records` (`patient_id`,`kind`,`date`);
--> statement-breakpoint
CREATE TRIGGER audit_patients_insert AFTER INSERT ON patients BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (NEW.id,'patients.insert','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL,json_object('id',NEW."id",'bed',NEW."bed",'name',NEW."name",'age',NEW."age",'mrn',NEW."mrn",'admission_at',NEW."admission_at",'icu_admission_at',NEW."icu_admission_at",'status',NEW."status",'diagnoses',NEW."diagnoses",'summary',NEW."summary",'resp_support',NEW."resp_support",'resp_detail',NEW."resp_detail",'hemo_support',NEW."hemo_support",'hemo_detail',NEW."hemo_detail",'neuro_status',NEW."neuro_status",'rass',NEW."rass",'cam_icu',NEW."cam_icu",'renal_detail',NEW."renal_detail",'diuresis_24h',NEW."diuresis_24h",'balance_24h',NEW."balance_24h",'antibiotics',NEW."antibiotics",'cultures',NEW."cultures",'infection_detail',NEW."infection_detail",'diet',NEW."diet",'glucose',NEW."glucose",'labs',NEW."labs",'devices',NEW."devices",'vte',NEW."vte",'stress_ulcer',NEW."stress_ulcer",'skin_mobility',NEW."skin_mobility",'abcdef',NEW."abcdef",'sofa2',NEW."sofa2",'goals_of_care',NEW."goals_of_care",'today_goals',NEW."today_goals",'handoff',NEW."handoff",'contingency',NEW."contingency",'archived',NEW."archived",'created_at',NEW."created_at",'updated_at',NEW."updated_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_patients_update AFTER UPDATE ON patients BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (NEW.id,'patients.update','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'bed',OLD."bed",'name',OLD."name",'age',OLD."age",'mrn',OLD."mrn",'admission_at',OLD."admission_at",'icu_admission_at',OLD."icu_admission_at",'status',OLD."status",'diagnoses',OLD."diagnoses",'summary',OLD."summary",'resp_support',OLD."resp_support",'resp_detail',OLD."resp_detail",'hemo_support',OLD."hemo_support",'hemo_detail',OLD."hemo_detail",'neuro_status',OLD."neuro_status",'rass',OLD."rass",'cam_icu',OLD."cam_icu",'renal_detail',OLD."renal_detail",'diuresis_24h',OLD."diuresis_24h",'balance_24h',OLD."balance_24h",'antibiotics',OLD."antibiotics",'cultures',OLD."cultures",'infection_detail',OLD."infection_detail",'diet',OLD."diet",'glucose',OLD."glucose",'labs',OLD."labs",'devices',OLD."devices",'vte',OLD."vte",'stress_ulcer',OLD."stress_ulcer",'skin_mobility',OLD."skin_mobility",'abcdef',OLD."abcdef",'sofa2',OLD."sofa2",'goals_of_care',OLD."goals_of_care",'today_goals',OLD."today_goals",'handoff',OLD."handoff",'contingency',OLD."contingency",'archived',OLD."archived",'created_at',OLD."created_at",'updated_at',OLD."updated_at"),json_object('id',NEW."id",'bed',NEW."bed",'name',NEW."name",'age',NEW."age",'mrn',NEW."mrn",'admission_at',NEW."admission_at",'icu_admission_at',NEW."icu_admission_at",'status',NEW."status",'diagnoses',NEW."diagnoses",'summary',NEW."summary",'resp_support',NEW."resp_support",'resp_detail',NEW."resp_detail",'hemo_support',NEW."hemo_support",'hemo_detail',NEW."hemo_detail",'neuro_status',NEW."neuro_status",'rass',NEW."rass",'cam_icu',NEW."cam_icu",'renal_detail',NEW."renal_detail",'diuresis_24h',NEW."diuresis_24h",'balance_24h',NEW."balance_24h",'antibiotics',NEW."antibiotics",'cultures',NEW."cultures",'infection_detail',NEW."infection_detail",'diet',NEW."diet",'glucose',NEW."glucose",'labs',NEW."labs",'devices',NEW."devices",'vte',NEW."vte",'stress_ulcer',NEW."stress_ulcer",'skin_mobility',NEW."skin_mobility",'abcdef',NEW."abcdef",'sofa2',NEW."sofa2",'goals_of_care',NEW."goals_of_care",'today_goals',NEW."today_goals",'handoff',NEW."handoff",'contingency',NEW."contingency",'archived',NEW."archived",'created_at',NEW."created_at",'updated_at',NEW."updated_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_patients_delete AFTER DELETE ON patients BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (OLD.id,'patients.delete','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'bed',OLD."bed",'name',OLD."name",'age',OLD."age",'mrn',OLD."mrn",'admission_at',OLD."admission_at",'icu_admission_at',OLD."icu_admission_at",'status',OLD."status",'diagnoses',OLD."diagnoses",'summary',OLD."summary",'resp_support',OLD."resp_support",'resp_detail',OLD."resp_detail",'hemo_support',OLD."hemo_support",'hemo_detail',OLD."hemo_detail",'neuro_status',OLD."neuro_status",'rass',OLD."rass",'cam_icu',OLD."cam_icu",'renal_detail',OLD."renal_detail",'diuresis_24h',OLD."diuresis_24h",'balance_24h',OLD."balance_24h",'antibiotics',OLD."antibiotics",'cultures',OLD."cultures",'infection_detail',OLD."infection_detail",'diet',OLD."diet",'glucose',OLD."glucose",'labs',OLD."labs",'devices',OLD."devices",'vte',OLD."vte",'stress_ulcer',OLD."stress_ulcer",'skin_mobility',OLD."skin_mobility",'abcdef',OLD."abcdef",'sofa2',OLD."sofa2",'goals_of_care',OLD."goals_of_care",'today_goals',OLD."today_goals",'handoff',OLD."handoff",'contingency',OLD."contingency",'archived',OLD."archived",'created_at',OLD."created_at",'updated_at',OLD."updated_at"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER audit_tasks_insert AFTER INSERT ON tasks BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (NEW.patient_id,'tasks.insert','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL,json_object('id',NEW."id",'patient_id',NEW."patient_id",'text',NEW."text",'priority',NEW."priority",'due_at',NEW."due_at",'completed',NEW."completed",'completed_at',NEW."completed_at",'created_at',NEW."created_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_tasks_update AFTER UPDATE ON tasks BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (NEW.patient_id,'tasks.update','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'patient_id',OLD."patient_id",'text',OLD."text",'priority',OLD."priority",'due_at',OLD."due_at",'completed',OLD."completed",'completed_at',OLD."completed_at",'created_at',OLD."created_at"),json_object('id',NEW."id",'patient_id',NEW."patient_id",'text',NEW."text",'priority',NEW."priority",'due_at',NEW."due_at",'completed',NEW."completed",'completed_at',NEW."completed_at",'created_at',NEW."created_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_tasks_delete AFTER DELETE ON tasks BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (OLD.patient_id,'tasks.delete','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'patient_id',OLD."patient_id",'text',OLD."text",'priority',OLD."priority",'due_at',OLD."due_at",'completed',OLD."completed",'completed_at',OLD."completed_at",'created_at',OLD."created_at"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER audit_events_insert AFTER INSERT ON events BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (NEW.patient_id,'events.insert','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL,json_object('id',NEW."id",'patient_id',NEW."patient_id",'occurred_at',NEW."occurred_at",'kind',NEW."kind",'text',NEW."text",'created_at',NEW."created_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_events_update AFTER UPDATE ON events BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (NEW.patient_id,'events.update','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'patient_id',OLD."patient_id",'occurred_at',OLD."occurred_at",'kind',OLD."kind",'text',OLD."text",'created_at',OLD."created_at"),json_object('id',NEW."id",'patient_id',NEW."patient_id",'occurred_at',NEW."occurred_at",'kind',NEW."kind",'text',NEW."text",'created_at',NEW."created_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_events_delete AFTER DELETE ON events BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (OLD.patient_id,'events.delete','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'patient_id',OLD."patient_id",'occurred_at',OLD."occurred_at",'kind',OLD."kind",'text',OLD."text",'created_at',OLD."created_at"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER audit_evolutions_insert AFTER INSERT ON evolutions BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (NEW.patient_id,'evolutions.insert','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL,json_object('id',NEW."id",'patient_id',NEW."patient_id",'evolution_date',NEW."evolution_date",'text',NEW."text",'created_at',NEW."created_at",'updated_at',NEW."updated_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_evolutions_update AFTER UPDATE ON evolutions BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (NEW.patient_id,'evolutions.update','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'patient_id',OLD."patient_id",'evolution_date',OLD."evolution_date",'text',OLD."text",'created_at',OLD."created_at",'updated_at',OLD."updated_at"),json_object('id',NEW."id",'patient_id',NEW."patient_id",'evolution_date',NEW."evolution_date",'text',NEW."text",'created_at',NEW."created_at",'updated_at',NEW."updated_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_evolutions_delete AFTER DELETE ON evolutions BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (OLD.patient_id,'evolutions.delete','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'patient_id',OLD."patient_id",'evolution_date',OLD."evolution_date",'text',OLD."text",'created_at',OLD."created_at",'updated_at',OLD."updated_at"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER audit_daily_goals_insert AFTER INSERT ON daily_goals BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (NEW.patient_id,'daily_goals.insert','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL,json_object('id',NEW."id",'patient_id',NEW."patient_id",'goal_date',NEW."goal_date",'text',NEW."text",'completed',NEW."completed",'completed_at',NEW."completed_at",'created_at',NEW."created_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_daily_goals_update AFTER UPDATE ON daily_goals BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (NEW.patient_id,'daily_goals.update','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'patient_id',OLD."patient_id",'goal_date',OLD."goal_date",'text',OLD."text",'completed',OLD."completed",'completed_at',OLD."completed_at",'created_at',OLD."created_at"),json_object('id',NEW."id",'patient_id',NEW."patient_id",'goal_date',NEW."goal_date",'text',NEW."text",'completed',NEW."completed",'completed_at',NEW."completed_at",'created_at',NEW."created_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_daily_goals_delete AFTER DELETE ON daily_goals BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (OLD.patient_id,'daily_goals.delete','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'patient_id',OLD."patient_id",'goal_date',OLD."goal_date",'text',OLD."text",'completed',OLD."completed",'completed_at',OLD."completed_at",'created_at',OLD."created_at"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER audit_medical_documents_insert AFTER INSERT ON medical_documents BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (NEW.patient_id,'medical_documents.insert','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL,json_object('id',NEW."id",'patient_id',NEW."patient_id",'kind',NEW."kind",'title',NEW."title",'document_date',NEW."document_date",'recipient',NEW."recipient",'purpose',NEW."purpose",'content',NEW."content",'cid',NEW."cid",'cid_authorized',NEW."cid_authorized",'created_at',NEW."created_at",'updated_at',NEW."updated_at",'prescriber_name',NEW."prescriber_name",'prescriber_crm',NEW."prescriber_crm")); END;

--> statement-breakpoint
CREATE TRIGGER audit_medical_documents_update AFTER UPDATE ON medical_documents BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (NEW.patient_id,'medical_documents.update','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'patient_id',OLD."patient_id",'kind',OLD."kind",'title',OLD."title",'document_date',OLD."document_date",'recipient',OLD."recipient",'purpose',OLD."purpose",'content',OLD."content",'cid',OLD."cid",'cid_authorized',OLD."cid_authorized",'created_at',OLD."created_at",'updated_at',OLD."updated_at",'prescriber_name',OLD."prescriber_name",'prescriber_crm',OLD."prescriber_crm"),json_object('id',NEW."id",'patient_id',NEW."patient_id",'kind',NEW."kind",'title',NEW."title",'document_date',NEW."document_date",'recipient',NEW."recipient",'purpose',NEW."purpose",'content',NEW."content",'cid',NEW."cid",'cid_authorized',NEW."cid_authorized",'created_at',NEW."created_at",'updated_at',NEW."updated_at",'prescriber_name',NEW."prescriber_name",'prescriber_crm',NEW."prescriber_crm")); END;

--> statement-breakpoint
CREATE TRIGGER audit_medical_documents_delete AFTER DELETE ON medical_documents BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (OLD.patient_id,'medical_documents.delete','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'patient_id',OLD."patient_id",'kind',OLD."kind",'title',OLD."title",'document_date',OLD."document_date",'recipient',OLD."recipient",'purpose',OLD."purpose",'content',OLD."content",'cid',OLD."cid",'cid_authorized',OLD."cid_authorized",'created_at',OLD."created_at",'updated_at',OLD."updated_at",'prescriber_name',OLD."prescriber_name",'prescriber_crm',OLD."prescriber_crm"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER audit_prescribers_insert AFTER INSERT ON prescribers BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES ('','prescribers.insert','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL,json_object('id',NEW."id",'name',NEW."name",'crm',NEW."crm",'created_at',NEW."created_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_prescribers_update AFTER UPDATE ON prescribers BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES ('','prescribers.update','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'name',OLD."name",'crm',OLD."crm",'created_at',OLD."created_at"),json_object('id',NEW."id",'name',NEW."name",'crm',NEW."crm",'created_at',NEW."created_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_prescribers_delete AFTER DELETE ON prescribers BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES ('','prescribers.delete','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'name',OLD."name",'crm',OLD."crm",'created_at',OLD."created_at"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER audit_custom_medications_insert AFTER INSERT ON custom_medications BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES ('','custom_medications.insert','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL,json_object('id',NEW."id",'name',NEW."name",'text',NEW."text",'weight_based',NEW."weight_based",'unit',NEW."unit",'min_dose',NEW."min_dose",'max_dose',NEW."max_dose",'concentration',NEW."concentration",'concentration_unit',NEW."concentration_unit",'formula',NEW."formula",'notes',NEW."notes",'created_at',NEW."created_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_custom_medications_update AFTER UPDATE ON custom_medications BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES ('','custom_medications.update','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'name',OLD."name",'text',OLD."text",'weight_based',OLD."weight_based",'unit',OLD."unit",'min_dose',OLD."min_dose",'max_dose',OLD."max_dose",'concentration',OLD."concentration",'concentration_unit',OLD."concentration_unit",'formula',OLD."formula",'notes',OLD."notes",'created_at',OLD."created_at"),json_object('id',NEW."id",'name',NEW."name",'text',NEW."text",'weight_based',NEW."weight_based",'unit',NEW."unit",'min_dose',NEW."min_dose",'max_dose',NEW."max_dose",'concentration',NEW."concentration",'concentration_unit',NEW."concentration_unit",'formula',NEW."formula",'notes',NEW."notes",'created_at',NEW."created_at")); END;

--> statement-breakpoint
CREATE TRIGGER audit_custom_medications_delete AFTER DELETE ON custom_medications BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES ('','custom_medications.delete','Usuário autenticado',strftime('%Y-%m-%dT%H:%M:%fZ','now'),json_object('id',OLD."id",'name',OLD."name",'text',OLD."text",'weight_based',OLD."weight_based",'unit',OLD."unit",'min_dose',OLD."min_dose",'max_dose',OLD."max_dose",'concentration',OLD."concentration",'concentration_unit',OLD."concentration_unit",'formula',OLD."formula",'notes',OLD."notes",'created_at',OLD."created_at"),NULL); END;

--> statement-breakpoint
CREATE TRIGGER audit_clinical_insert AFTER INSERT ON clinical_records BEGIN INSERT INTO clinical_audit(patient_id,action,author,at,before,after) VALUES (NEW.patient_id,'clinical.'||NEW.kind,NEW.author,NEW.saved_at,(SELECT data FROM clinical_records WHERE id=NEW.id AND version<NEW.version ORDER BY version DESC LIMIT 1),NEW.data); END;
