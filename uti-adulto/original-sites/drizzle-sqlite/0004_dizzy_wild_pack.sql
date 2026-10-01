CREATE TABLE `custom_medications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`text` text NOT NULL,
	`weight_based` integer DEFAULT false NOT NULL,
	`unit` text,
	`min_dose` real,
	`max_dose` real,
	`concentration` real,
	`concentration_unit` text,
	`formula` text,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `custom_medications_name_idx` ON `custom_medications` (`name`);