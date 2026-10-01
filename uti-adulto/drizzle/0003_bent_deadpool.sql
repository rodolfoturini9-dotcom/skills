CREATE TABLE `prescribers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`crm` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prescribers_name_crm_unique` ON `prescribers` (`name`,`crm`);--> statement-breakpoint
ALTER TABLE `medical_documents` ADD `prescriber_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `medical_documents` ADD `prescriber_crm` text DEFAULT '' NOT NULL;