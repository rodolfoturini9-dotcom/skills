CREATE TABLE `daily_sheets` (
	`patient_id` text PRIMARY KEY NOT NULL,
	`admission` text DEFAULT '' NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	`author` text NOT NULL
);
