CREATE TABLE `pep_revisions` (
	`version` integer PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`data` text NOT NULL,
	`source_data` text NOT NULL,
	`author` text NOT NULL,
	`saved_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pep_operation_unique` ON `pep_revisions` (`operation_id`);