CREATE TABLE `medical_documents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`patient_id` text NOT NULL,
	`kind` text DEFAULT 'relatorio' NOT NULL,
	`title` text NOT NULL,
	`document_date` text NOT NULL,
	`recipient` text DEFAULT '' NOT NULL,
	`purpose` text DEFAULT '' NOT NULL,
	`content` text NOT NULL,
	`cid` text DEFAULT '' NOT NULL,
	`cid_authorized` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `medical_documents_patient_date_idx` ON `medical_documents` (`patient_id`,`document_date`);